import React, { useEffect, useState, useCallback } from 'react';
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
  MenuItem,
  Chip,
  Snackbar,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Campanhas manuais (FSD seções 6.4, 12.6, 13.6) — última parte da
// Fase 8. Acessível por Admin e Acesso Limitado, sem distinção (FSD linha
// 332 da matriz) — igual a Réguas e Cross-sell.
//
// Escopo desta tela (decisão de simplicidade, registrada em docs/STATUS.md):
// o segmento de uma campanha é sempre um segmento SALVO (tela de
// Segmentação) — sem construtor de filtro ad-hoc duplicado aqui. Quem quiser
// uma campanha com um filtro específico cria/ajusta o segmento salvo antes.
//
// Cupom e giftback são OPCIONAIS por campanha (FSD 13.6, "se aplicável").
// Giftback usa emissão em massa: os parâmetros (percentual OU valor,
// validade) ficam na própria campanha; uma linha por destinatário elegível
// é criada em giftback_credits no disparo (ver campaigns.service.js).

const STATUS_LABELS = {
  draft: { label: 'Rascunho', color: 'default' },
  scheduled: { label: 'Agendada', color: 'info' },
  sending: { label: 'Enviando', color: 'warning' },
  sent: { label: 'Enviada', color: 'success' },
  canceled: { label: 'Cancelada', color: 'default' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'scheduled', label: 'Agendadas' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'canceled', label: 'Canceladas' },
];

const RECIPIENT_STATUS_LABELS = {
  pending: 'Aguardando envio',
  sent: 'Enviadas',
  delivered: 'Entregues',
  responded: 'Respondidas',
  failed: 'Falhas',
  suppressed: 'Suprimidas (sem consentimento)',
};

const emptyForm = {
  name: '',
  segmentId: '',
  messageTemplateId: '',
  couponId: '',
  giftbackEnabled: false,
  giftbackCreditType: 'percent',
  giftbackCreditAmount: '',
  giftbackValidUntil: '',
  scheduledAt: '',
};

// Converte um timestamp do banco para o formato aceito por
// <input type="datetime-local"> (YYYY-MM-DDTHH:mm), no fuso local.
function toDatetimeLocalValue(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInputValue(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Campanhas() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [segments, setSegments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [coupons, setCoupons] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formPreview, setFormPreview] = useState(null);
  const [formPreviewLoading, setFormPreviewLoading] = useState(false);

  const [sendDialog, setSendDialog] = useState(null); // { campaign, preview, loading }
  const [cancelDialog, setCancelDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [resultsDialog, setResultsDialog] = useState(null);

  const [snackbar, setSnackbar] = useState(null);

  const handleAuthFailure = useCallback(
    async (response) => {
      if (response.status === 401) {
        logout();
        navigate('/login');
        return true;
      }
      return false;
    },
    [logout, navigate]
  );

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/campaigns?${params.toString()}`, { method: 'GET', credentials: 'include' });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar campanhas.');

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar campanhas.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, handleAuthFailure]);

  const loadPickerData = useCallback(async () => {
    try {
      const [segmentsRes, templatesRes, couponsRes] = await Promise.all([
        fetch('/segments', { credentials: 'include' }),
        fetch('/templates', { credentials: 'include' }),
        fetch('/coupons?status=active', { credentials: 'include' }),
      ]);

      if (await handleAuthFailure(segmentsRes)) return;

      const segmentsData = await segmentsRes.json();
      const templatesData = await templatesRes.json();
      const couponsData = await couponsRes.json();

      setSegments(segmentsData.segments || []);
      setTemplates(templatesData.templates || []);
      setCoupons(couponsData.coupons || []);
    } catch (err) {
      // Silencioso — os selects ficam vazios e o formulário avisa ao salvar.
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    loadPickerData();
  }, [loadPickerData]);

  async function previewBySegmentId(segmentId) {
    if (!segmentId) {
      setFormPreview(null);
      return;
    }

    try {
      setFormPreviewLoading(true);
      const response = await fetch('/campaigns/preview-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ segmentId }),
      });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) return;
      const data = await response.json();
      setFormPreview(data);
    } catch (err) {
      setFormPreview(null);
    } finally {
      setFormPreviewLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingCampaign(null);
    setForm(emptyForm);
    setFormPreview(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(campaign) {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name,
      segmentId: campaign.segmentId ? String(campaign.segmentId) : '',
      messageTemplateId: campaign.messageTemplateId ? String(campaign.messageTemplateId) : '',
      couponId: campaign.couponId ? String(campaign.couponId) : '',
      giftbackEnabled: campaign.giftbackCreditPercent !== null || campaign.giftbackCreditValue !== null,
      giftbackCreditType: campaign.giftbackCreditPercent !== null ? 'percent' : 'value',
      giftbackCreditAmount:
        campaign.giftbackCreditPercent !== null
          ? String(campaign.giftbackCreditPercent)
          : campaign.giftbackCreditValue !== null
            ? String(campaign.giftbackCreditValue)
            : '',
      giftbackValidUntil: toDateInputValue(campaign.giftbackValidUntil),
      scheduledAt: toDatetimeLocalValue(campaign.scheduledAt),
    });
    setFormPreview(null);
    setFormError(null);
    setFormOpen(true);
    if (campaign.segmentId) previewBySegmentId(campaign.segmentId);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditingCampaign(null);
    setForm(emptyForm);
    setFormPreview(null);
    setFormError(null);
  }

  function handleSegmentChange(segmentId) {
    setForm({ ...form, segmentId });
    previewBySegmentId(segmentId);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      if (!form.name.trim()) throw new Error('Informe o nome da campanha.');
      if (!form.messageTemplateId) throw new Error('Selecione um modelo de mensagem.');

      const payload = {
        name: form.name.trim(),
        segmentId: form.segmentId ? Number(form.segmentId) : null,
        messageTemplateId: Number(form.messageTemplateId),
        couponId: form.couponId ? Number(form.couponId) : null,
        giftbackCreditPercent:
          form.giftbackEnabled && form.giftbackCreditType === 'percent' && form.giftbackCreditAmount !== ''
            ? Number(form.giftbackCreditAmount)
            : null,
        giftbackCreditValue:
          form.giftbackEnabled && form.giftbackCreditType === 'value' && form.giftbackCreditAmount !== ''
            ? Number(form.giftbackCreditAmount)
            : null,
        giftbackValidUntil: form.giftbackEnabled && form.giftbackValidUntil ? form.giftbackValidUntil : null,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      };

      const isEditing = !!editingCampaign;
      const url = isEditing ? `/campaigns/${editingCampaign.id}` : '/campaigns';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a campanha.');

      closeFormDialog();
      setSnackbar({ severity: 'success', message: 'Campanha salva com sucesso.' });
      await loadCampaigns();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar campanha.');
    } finally {
      setSaving(false);
    }
  }

  async function openSendDialog(campaign) {
    setSendDialog({ campaign, preview: null, loading: true });
    try {
      const response = await fetch('/campaigns/preview-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ segmentFilter: campaign.segmentFilter }),
      });
      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      setSendDialog({ campaign, preview: response.ok ? data : null, loading: false });
    } catch (err) {
      setSendDialog({ campaign, preview: null, loading: false });
    }
  }

  async function confirmSend() {
    if (!sendDialog) return;
    const { campaign } = sendDialog;

    try {
      const response = await fetch(`/campaigns/${campaign.id}/send`, { method: 'POST', credentials: 'include' });
      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível disparar a campanha.');

      setSnackbar({ severity: 'success', message: `Campanha disparada: ${data.result.dispatched} mensagem(ns) enfileirada(s).` });
      setSendDialog(null);
      await loadCampaigns();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao disparar campanha.' });
    }
  }

  async function confirmCancel() {
    if (!cancelDialog) return;
    try {
      const response = await fetch(`/campaigns/${cancelDialog.id}/cancel`, { method: 'POST', credentials: 'include' });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível cancelar a campanha.');
      }
      setSnackbar({ severity: 'success', message: 'Campanha cancelada.' });
      setCancelDialog(null);
      await loadCampaigns();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao cancelar campanha.' });
    }
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    try {
      const response = await fetch(`/campaigns/${deleteDialog.id}`, { method: 'DELETE', credentials: 'include' });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível excluir a campanha.');
      }
      setSnackbar({ severity: 'success', message: 'Campanha excluída.' });
      setDeleteDialog(null);
      await loadCampaigns();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao excluir campanha.' });
    }
  }

  async function openResultsDialog(campaign) {
    try {
      const response = await fetch(`/campaigns/${campaign.id}`, { credentials: 'include' });
      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      setResultsDialog(data.campaign);
    } catch (err) {
      setSnackbar({ severity: 'error', message: 'Erro ao carregar resultado da campanha.' });
    }
  }

  const isEditable = (campaign) => campaign.status === 'draft' || campaign.status === 'scheduled';

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Campanhas
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Campanhas manuais para segmentos de clientes, com modelo de mensagem, cupom/giftback e agendamento.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={openCreateDialog}>
            Nova campanha
          </Button>
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : campaigns.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhuma campanha encontrada.
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Modelo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Agendada / Enviada</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((campaign) => {
                  const statusInfo = STATUS_LABELS[campaign.status] || { label: campaign.status, color: 'default' };
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>{campaign.name}</TableCell>
                      <TableCell>{campaign.templateName || '—'}</TableCell>
                      <TableCell>
                        <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                      </TableCell>
                      <TableCell>
                        {campaign.status === 'sent'
                          ? formatDateTime(campaign.sentAt)
                          : campaign.scheduledAt
                            ? formatDateTime(campaign.scheduledAt)
                            : '—'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {isEditable(campaign) && (
                            <>
                              <Button size="small" variant="outlined" onClick={() => openEditDialog(campaign)}>
                                Editar
                              </Button>
                              <Button size="small" variant="contained" onClick={() => openSendDialog(campaign)}>
                                Enviar agora
                              </Button>
                              <Button size="small" variant="text" color="error" onClick={() => setCancelDialog(campaign)}>
                                Cancelar
                              </Button>
                              <Button size="small" variant="text" color="error" onClick={() => setDeleteDialog(campaign)}>
                                Excluir
                              </Button>
                            </>
                          )}
                          {(campaign.status === 'sent' || campaign.status === 'sending') && (
                            <Button size="small" variant="outlined" onClick={() => openResultsDialog(campaign)}>
                              Ver resultado
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Diálogo de criação/edição */}
      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Nome da campanha"
            fullWidth
            required
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
            select
            label="Segmento (opcional — sem segmento, atinge todos os clientes)"
            fullWidth
            margin="normal"
            value={form.segmentId}
            onChange={(e) => handleSegmentChange(e.target.value)}
          >
            <MenuItem value="">Nenhum (todos os clientes)</MenuItem>
            {segments.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          {formPreviewLoading ? (
            <CircularProgress size={18} sx={{ marginBottom: 1 }} />
          ) : formPreview ? (
            <Alert severity="info" sx={{ marginBottom: 1 }}>
              {formPreview.eligibleCount} de {formPreview.totalCandidates} cliente(s) elegível(is) (com
              consentimento válido). {formPreview.suppressedCount} seria(m) suprimido(s).
            </Alert>
          ) : null}

          {templates.length === 0 ? (
            <Alert severity="warning" sx={{ marginTop: 1, marginBottom: 1 }}>
              Nenhum modelo de mensagem ativo cadastrado. Cadastre um em Modelos de Mensagem antes de criar a
              campanha.
            </Alert>
          ) : (
            <TextField
              select
              label="Modelo de mensagem"
              fullWidth
              required
              margin="normal"
              value={form.messageTemplateId}
              onChange={(e) => setForm({ ...form, messageTemplateId: e.target.value })}
            >
              {templates.map((tpl) => (
                <MenuItem key={tpl.id} value={String(tpl.id)}>
                  {tpl.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            label="Cupom (opcional)"
            fullWidth
            margin="normal"
            value={form.couponId}
            onChange={(e) => setForm({ ...form, couponId: e.target.value })}
          >
            <MenuItem value="">Nenhum</MenuItem>
            {coupons.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.code} —{' '}
                {c.discountType === 'percent' ? `${c.discountValue}%` : `R$ ${Number(c.discountValue).toFixed(2)}`}
              </MenuItem>
            ))}
          </TextField>

          <Divider sx={{ marginY: 2 }} />

          <FormControlLabel
            control={
              <Checkbox
                checked={form.giftbackEnabled}
                onChange={(e) => setForm({ ...form, giftbackEnabled: e.target.checked })}
              />
            }
            label="Emitir giftback para cada destinatário elegível"
          />

          {form.giftbackEnabled && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Tipo de crédito"
                sx={{ minWidth: 200 }}
                margin="normal"
                value={form.giftbackCreditType}
                onChange={(e) => setForm({ ...form, giftbackCreditType: e.target.value })}
              >
                <MenuItem value="percent">Percentual (%)</MenuItem>
                <MenuItem value="value">Valor fixo (R$)</MenuItem>
              </TextField>
              <TextField
                label={form.giftbackCreditType === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}
                type="number"
                fullWidth
                margin="normal"
                value={form.giftbackCreditAmount}
                onChange={(e) => setForm({ ...form, giftbackCreditAmount: e.target.value })}
              />
              <TextField
                label="Válido até (opcional)"
                type="date"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                value={form.giftbackValidUntil}
                onChange={(e) => setForm({ ...form, giftbackValidUntil: e.target.value })}
              />
            </Box>
          )}

          <Divider sx={{ marginY: 2 }} />

          <TextField
            label="Agendar para (opcional — sem data, fica como rascunho até enviar manualmente)"
            type="datetime-local"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFormDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação de disparo */}
      <Dialog open={!!sendDialog} onClose={() => setSendDialog(null)}>
        <DialogTitle>Confirmar disparo de "{sendDialog?.campaign?.name}"?</DialogTitle>
        <DialogContent>
          {sendDialog?.loading ? (
            <CircularProgress size={20} />
          ) : sendDialog?.preview ? (
            <>
              <Typography variant="body2" sx={{ marginBottom: 1 }}>
                <strong>{sendDialog.preview.eligibleCount}</strong> de {sendDialog.preview.totalCandidates}{' '}
                cliente(s) receberão a mensagem agora.
              </Typography>
              {sendDialog.preview.suppressedCount > 0 && (
                <Alert severity="warning">
                  {sendDialog.preview.suppressedCount} cliente(s) serão removidos automaticamente por falta de
                  consentimento válido.
                </Alert>
              )}
              {sendDialog.preview.eligibleCount === 0 && (
                <Alert severity="error" sx={{ marginTop: 1 }}>
                  Nenhum destinatário elegível — não é possível confirmar o disparo.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="error">Não foi possível calcular os destinatários.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialog(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={confirmSend}
            disabled={sendDialog?.loading || !sendDialog?.preview || sendDialog?.preview?.eligibleCount === 0}
          >
            Confirmar disparo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de cancelamento */}
      <Dialog open={!!cancelDialog} onClose={() => setCancelDialog(null)}>
        <DialogTitle>Cancelar a campanha "{cancelDialog?.name}"?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Uma campanha cancelada não pode mais ser enviada.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(null)}>Voltar</Button>
          <Button variant="contained" color="error" onClick={confirmCancel}>
            Cancelar campanha
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de exclusão */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Excluir a campanha "{deleteDialog?.name}"?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Esta ação não pode ser desfeita.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de resultado */}
      <Dialog open={!!resultsDialog} onClose={() => setResultsDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resultado — {resultsDialog?.name}</DialogTitle>
        <DialogContent>
          {resultsDialog && (
            <>
              <Table size="small" sx={{ marginBottom: 2 }}>
                <TableBody>
                  {Object.entries(RECIPIENT_STATUS_LABELS).map(([key, label]) => (
                    <TableRow key={key}>
                      <TableCell>{label}</TableCell>
                      <TableCell align="right">{resultsDialog.results?.byStatus?.[key] ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
                Vendas atribuídas
              </Typography>
              {resultsDialog.results?.attribution ? (
                <Typography variant="body2">
                  {resultsDialog.results.attribution.attributedSales} venda(s), R${' '}
                  {resultsDialog.results.attribution.attributedRevenue.toFixed(2).replace('.', ',')} em receita.
                </Typography>
              ) : (
                <Alert severity="info">
                  Período de atribuição de venda a campanha ainda não configurado pelo Administrador — este número
                  fica disponível assim que for definido.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsDialog(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar && (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Container>
  );
}
