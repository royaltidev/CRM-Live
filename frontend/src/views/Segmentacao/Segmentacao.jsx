import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Chip,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CriteriosRfm from './CriteriosRfm';

// Tela de Segmentação de clientes (FSD seção 6.2, tela 12.4).
//
// Combina duas áreas em uma única tela, via abas:
// - "Segmentos dinâmicos": CRUD de filtros combináveis salvos (dynamic_segments).
// - "Critérios RFM": configuração dos limites de classificação RFM, exclusiva
//   do Administrador para edição (implementada em CriteriosRfm.jsx).
//
// Segmentação (segmentos dinâmicos) é editável por Admin E Acesso limitado
// (FSD seção 8.5) — por isso esta tela não bloqueia acesso por papel.

const emptyForm = {
  name: '',
  productCategory: '',
  ticketMin: '',
  ticketMax: '',
  dateFrom: '',
  dateTo: '',
  tags: '',
  rfmSegment: '',
};

// Converte o estado do formulário no formato filter_criteria aceito pelo backend.
function formToFilterCriteria(form) {
  const criteria = {};

  if (form.productCategory && form.productCategory.trim()) {
    criteria.productCategory = form.productCategory.trim();
  }

  if (form.ticketMin !== '' || form.ticketMax !== '') {
    criteria.averageTicket = {
      min: form.ticketMin !== '' ? Number(form.ticketMin) : null,
      max: form.ticketMax !== '' ? Number(form.ticketMax) : null,
    };
  }

  if (form.dateFrom || form.dateTo) {
    criteria.purchaseDateRange = {
      from: form.dateFrom || null,
      to: form.dateTo || null,
    };
  }

  if (form.tags && form.tags.trim()) {
    criteria.tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }

  if (form.rfmSegment && form.rfmSegment.trim()) {
    criteria.rfmSegment = form.rfmSegment.trim();
  }

  return criteria;
}

// Converte um filter_criteria salvo de volta para o estado do formulário (edição).
function filterCriteriaToForm(name, criteria = {}) {
  return {
    name: name || '',
    productCategory: criteria.productCategory || '',
    ticketMin: criteria.averageTicket?.min ?? '',
    ticketMax: criteria.averageTicket?.max ?? '',
    dateFrom: criteria.purchaseDateRange?.from || '',
    dateTo: criteria.purchaseDateRange?.to || '',
    tags: Array.isArray(criteria.tags) ? criteria.tags.join(', ') : '',
    rfmSegment: criteria.rfmSegment || '',
  };
}

// Monta chips de resumo do filtro para exibir na listagem.
function filterSummaryChips(criteria = {}) {
  const chips = [];
  if (criteria.productCategory) chips.push(`Categoria: ${criteria.productCategory}`);
  if (criteria.averageTicket && (criteria.averageTicket.min != null || criteria.averageTicket.max != null)) {
    const min = criteria.averageTicket.min ?? '—';
    const max = criteria.averageTicket.max ?? '—';
    chips.push(`Ticket: ${min} a ${max}`);
  }
  if (criteria.purchaseDateRange && (criteria.purchaseDateRange.from || criteria.purchaseDateRange.to)) {
    chips.push(`Período: ${criteria.purchaseDateRange.from || '—'} a ${criteria.purchaseDateRange.to || '—'}`);
  }
  if (Array.isArray(criteria.tags) && criteria.tags.length > 0) {
    chips.push(`Tags: ${criteria.tags.join(', ')}`);
  }
  if (criteria.rfmSegment) chips.push(`RFM: ${criteria.rfmSegment}`);
  return chips;
}

export default function Segmentacao() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [tab, setTab] = useState(0);

  const [segments, setSegments] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Contagem de clientes calculada sob demanda por segmento.
  const [counts, setCounts] = useState({}); // { [segmentId]: number | 'loading' | 'error' }

  // Diálogo de criação/edição.
  const [formOpen, setFormOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Pré-visualização dentro do diálogo.
  const [previewResult, setPreviewResult] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Diálogo de confirmação de ativar/desativar/excluir.
  const [confirmSegment, setConfirmSegment] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'toggle' | 'delete'
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    loadSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  async function handleAuthFailure(response) {
    if (response.status === 401) {
      logout();
      navigate('/login');
      return true;
    }
    return false;
  }

  async function loadSegments() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/segments?includeInactive=${includeInactive}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar segmentos.');

      const data = await response.json();
      setSegments(data.segments || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar segmentos.');
    } finally {
      setLoading(false);
    }
  }

  async function calculateCount(segment) {
    setCounts((prev) => ({ ...prev, [segment.id]: 'loading' }));
    try {
      const response = await fetch('/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filterCriteria: segment.filterCriteria || segment.filter_criteria }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Falha ao calcular.');

      setCounts((prev) => ({ ...prev, [segment.id]: data.total }));
    } catch (err) {
      setCounts((prev) => ({ ...prev, [segment.id]: 'error' }));
    }
  }

  function openCreateDialog() {
    setEditingSegment(null);
    setForm(emptyForm);
    setFormError(null);
    setPreviewResult(null);
    setPreviewError(null);
    setFormOpen(true);
  }

  function openEditDialog(segment) {
    setEditingSegment(segment);
    setForm(filterCriteriaToForm(segment.name, segment.filterCriteria || segment.filter_criteria));
    setFormError(null);
    setPreviewResult(null);
    setPreviewError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditingSegment(null);
    setForm(emptyForm);
    setFormError(null);
    setPreviewResult(null);
    setPreviewError(null);
  }

  async function handlePreview() {
    try {
      setPreviewing(true);
      setPreviewError(null);

      const response = await fetch('/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filterCriteria: formToFilterCriteria(form) }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Falha ao pré-visualizar.');

      setPreviewResult(data);
    } catch (err) {
      setPreviewError(err.message || 'Erro ao pré-visualizar segmento.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      if (!form.name || !form.name.trim()) {
        throw new Error('Informe um nome para o segmento.');
      }

      const isEditing = !!editingSegment;
      const url = isEditing ? `/segments/${editingSegment.id}` : '/segments';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          filterCriteria: formToFilterCriteria(form),
        }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o segmento.');
      }

      closeFormDialog();
      await loadSegments();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar segmento.');
    } finally {
      setSaving(false);
    }
  }

  function handleToggleActiveClick(segment) {
    setConfirmSegment(segment);
    setConfirmAction('toggle');
    setConfirmOpen(true);
  }

  function handleDeleteClick(segment) {
    setConfirmSegment(segment);
    setConfirmAction('delete');
    setConfirmOpen(true);
  }

  async function confirmDialogAction() {
    if (!confirmSegment) return;

    try {
      setConfirmOpen(false);

      if (confirmAction === 'toggle') {
        const nextActive = !confirmSegment.active;
        const response = await fetch(`/segments/${confirmSegment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ active: nextActive }),
        });
        if (await handleAuthFailure(response)) return;
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Não foi possível atualizar o status do segmento.');
        }
      } else if (confirmAction === 'delete') {
        const response = await fetch(`/segments/${confirmSegment.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (await handleAuthFailure(response)) return;
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Não foi possível excluir o segmento.');
        }
      }

      await loadSegments();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar segmento.');
    } finally {
      setConfirmSegment(null);
      setConfirmAction(null);
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Segmentação de Clientes
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Monte segmentos dinâmicos combinando filtros e acompanhe a classificação RFM dos clientes.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ marginBottom: 3 }}>
        <Tab label="Segmentos dinâmicos" />
        <Tab label="Critérios RFM" />
      </Tabs>

      {tab === 0 && (
        <>
          {error && (
            <Alert severity="error" sx={{ marginBottom: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              }
              label="Mostrar segmentos inativos"
            />
            <Button variant="contained" onClick={openCreateDialog}>
              Novo segmento
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : segments.length === 0 ? (
            <Card sx={{ padding: 4, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#666666' }}>
                Nenhum segmento cadastrado ainda.
              </Typography>
            </Card>
          ) : (
            <Card>
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Filtros</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Clientes</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {segments.map((segment) => {
                      const criteria = segment.filterCriteria || segment.filter_criteria || {};
                      const chips = filterSummaryChips(criteria);
                      const count = counts[segment.id];

                      return (
                        <TableRow key={segment.id}>
                          <TableCell>{segment.name}</TableCell>
                          <TableCell>
                            {chips.length === 0 ? (
                              <Typography variant="body2" sx={{ color: '#999999' }}>
                                Sem filtros (todos os clientes)
                              </Typography>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {chips.map((c) => (
                                  <Chip key={c} label={c} size="small" />
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            {count === undefined && (
                              <Button size="small" onClick={() => calculateCount(segment)}>
                                Calcular
                              </Button>
                            )}
                            {count === 'loading' && <CircularProgress size={16} />}
                            {count === 'error' && (
                              <Typography variant="body2" color="error">
                                Erro
                              </Typography>
                            )}
                            {typeof count === 'number' && <strong>{count}</strong>}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                backgroundColor: segment.active ? '#2d7a5c' : '#999999',
                                color: '#ffffff',
                                borderRadius: 1,
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {segment.active ? 'Ativo' : 'Inativo'}
                            </Box>
                          </TableCell>
                          <TableCell>{formatDate(segment.createdAt || segment.created_at)}</TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined" onClick={() => openEditDialog(segment)} sx={{ marginRight: 1, marginBottom: 0.5 }}>
                              Editar
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color={segment.active ? 'error' : 'success'}
                              onClick={() => handleToggleActiveClick(segment)}
                              sx={{ marginRight: 1, marginBottom: 0.5 }}
                            >
                              {segment.active ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button size="small" variant="text" color="error" onClick={() => handleDeleteClick(segment)}>
                              Excluir
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          )}
        </>
      )}

      {tab === 1 && <CriteriosRfm />}

      {/* Diálogo de criação/edição de segmento */}
      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSegment ? 'Editar Segmento' : 'Novo Segmento'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}
          <TextField
            label="Nome do segmento"
            fullWidth
            required
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Divider sx={{ marginY: 2 }} />
          <Typography variant="subtitle2" sx={{ color: '#666666', marginBottom: 1 }}>
            Filtros (todos opcionais, combinam-se em "E")
          </Typography>

          <TextField
            label="Categoria de produto comprada"
            fullWidth
            margin="normal"
            placeholder="Ex: Calçados"
            value={form.productCategory}
            onChange={(e) => setForm({ ...form, productCategory: e.target.value })}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Ticket médio mínimo (R$)"
              type="number"
              fullWidth
              margin="normal"
              value={form.ticketMin}
              onChange={(e) => setForm({ ...form, ticketMin: e.target.value })}
            />
            <TextField
              label="Ticket médio máximo (R$)"
              type="number"
              fullWidth
              margin="normal"
              value={form.ticketMax}
              onChange={(e) => setForm({ ...form, ticketMax: e.target.value })}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Última compra a partir de"
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.dateFrom}
              onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
            />
            <TextField
              label="Última compra até"
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.dateTo}
              onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
            />
          </Box>

          <TextField
            label="Tags (separadas por vírgula)"
            fullWidth
            margin="normal"
            placeholder="Ex: vip, aniversariante"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />

          <TextField
            label="Segmento RFM"
            fullWidth
            margin="normal"
            placeholder="Ex: vip, fiel, em_risco, inativo"
            value={form.rfmSegment}
            onChange={(e) => setForm({ ...form, rfmSegment: e.target.value })}
          />

          <Divider sx={{ marginY: 2 }} />

          <Button variant="outlined" onClick={handlePreview} disabled={previewing}>
            {previewing ? <CircularProgress size={20} /> : 'Pré-visualizar'}
          </Button>

          {previewError && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {previewError}
            </Alert>
          )}

          {previewResult && (
            <Alert severity="info" sx={{ marginTop: 2 }}>
              {previewResult.total} cliente(s) correspondem a este filtro.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFormDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {confirmAction === 'delete'
            ? 'Confirmar Exclusão'
            : confirmSegment?.active
            ? 'Confirmar Desativação'
            : 'Confirmar Ativação'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ marginTop: 2 }}>
            Tem certeza que deseja{' '}
            {confirmAction === 'delete' ? 'excluir' : confirmSegment?.active ? 'desativar' : 'ativar'} o
            segmento <strong>{confirmSegment?.name}</strong>?
          </Typography>
          {confirmAction === 'delete' && (
            <Typography variant="body2" sx={{ marginTop: 2, color: '#666666' }}>
              Se este segmento estiver em uso por alguma campanha, a exclusão será bloqueada.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDialogAction} color="error" variant="contained">
            {confirmAction === 'delete' ? 'Excluir' : confirmSegment?.active ? 'Desativar' : 'Ativar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
