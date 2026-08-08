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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Vendedores e fila de rodízio (FSD tela 12.11).
//
// Escopo desta fase: CRUD de vendedores + visualização de quem seria o
// próximo da fila de rodízio. O encaminhamento efetivo de leads pela fila
// é implementado na Fase 9 e não faz parte desta tela.

const emptyForm = { name: '', whatsappPhone: '', uniplusSellerId: '' };

export default function Vendedores() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [sellers, setSellers] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [nextInRotation, setNextInRotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Diálogo de criação/edição.
  const [formOpen, setFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Diálogo de confirmação de ativar/desativar.
  const [confirmSeller, setConfirmSeller] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    loadAll();
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

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const [sellersRes, nextRes] = await Promise.all([
        fetch(`/sellers?includeInactive=${includeInactive}`, {
          method: 'GET',
          credentials: 'include',
        }),
        fetch('/sellers/rotation/next', {
          method: 'GET',
          credentials: 'include',
        }),
      ]);

      if (await handleAuthFailure(sellersRes)) return;
      if (!sellersRes.ok) throw new Error('Falha ao carregar vendedores.');

      const sellersData = await sellersRes.json();
      setSellers(sellersData.sellers || []);

      if (nextRes.ok) {
        const nextData = await nextRes.json();
        setNextInRotation(nextData.seller || null);
      } else {
        setNextInRotation(null);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar vendedores.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingSeller(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(seller) {
    setEditingSeller(seller);
    setForm({
      name: seller.name || '',
      whatsappPhone: seller.whatsappPhone || '',
      uniplusSellerId: seller.uniplusSellerId || '',
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditingSeller(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      const isEditing = !!editingSeller;
      const url = isEditing ? `/sellers/${editingSeller.id}` : '/sellers';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          whatsappPhone: form.whatsappPhone || null,
          uniplusSellerId: form.uniplusSellerId || null,
        }),
      });

      if (await handleAuthFailure(response)) return;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o vendedor.');
      }

      closeFormDialog();
      await loadAll();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar vendedor.');
    } finally {
      setSaving(false);
    }
  }

  function handleToggleActiveClick(seller) {
    setConfirmSeller(seller);
    setConfirmOpen(true);
  }

  async function confirmToggleActive() {
    if (!confirmSeller) return;

    try {
      setConfirmOpen(false);
      const nextActive = !confirmSeller.active;

      const response = await fetch(`/sellers/${confirmSeller.id}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: nextActive }),
      });

      if (await handleAuthFailure(response)) return;

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível atualizar o status do vendedor.');
      }

      await loadAll();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar status do vendedor.');
    } finally {
      setConfirmSeller(null);
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Vendedores
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Cadastro de vendedores e visualização da fila de rodízio para encaminhamento de leads.
          </Typography>
        </Box>
        <Button variant="contained" onClick={openCreateDialog}>
          Novo Vendedor
        </Button>
      </Box>

      {/* Destaque: próximo da fila de rodízio */}
      <Card sx={{ marginBottom: 3, padding: 2, backgroundColor: '#f0f4ff', border: '1px solid #0f2d7b' }}>
        <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f2d7b' }}>
          Próximo da fila de rodízio: {nextInRotation ? nextInRotation.name : 'Nenhum vendedor ativo disponível'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666', marginTop: 0.5 }}>
          Este é apenas o vendedor que seria escolhido caso um lead precisasse ser encaminhado agora.
          O encaminhamento automático de leads será implementado em uma fase futura.
        </Typography>
      </Card>

      {/* Erro */}
      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtro: incluir inativos */}
      <Box sx={{ marginBottom: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
          }
          label="Mostrar vendedores inativos"
        />
      </Box>

      {/* Tabela de vendedores */}
      {sellers.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhum vendedor cadastrado ainda.
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>WhatsApp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Último lead recebido pela fila</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell>{seller.name}</TableCell>
                    <TableCell>{seller.whatsappPhone || '—'}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: seller.active ? '#2d7a5c' : '#999999',
                          color: '#ffffff',
                          borderRadius: 1,
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {seller.active ? 'Ativo' : 'Inativo'}
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(seller.rotationLastAssignedAt)}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(seller)} sx={{ marginRight: 1 }}>
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color={seller.active ? 'error' : 'success'}
                        onClick={() => handleToggleActiveClick(seller)}
                      >
                        {seller.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Diálogo de criação/edição */}
      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}
          <TextField
            label="Nome"
            fullWidth
            required
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="WhatsApp"
            fullWidth
            margin="normal"
            placeholder="+55 11 91234-5678"
            value={form.whatsappPhone}
            onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
          />
          <TextField
            label="Vínculo com vendedor Uniplus (opcional)"
            fullWidth
            margin="normal"
            value={form.uniplusSellerId}
            onChange={(e) => setForm({ ...form, uniplusSellerId: e.target.value })}
          />
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

      {/* Diálogo de confirmação de ativar/desativar */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {confirmSeller?.active ? 'Confirmar Desativação' : 'Confirmar Ativação'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ marginTop: 2 }}>
            Tem certeza que deseja {confirmSeller?.active ? 'desativar' : 'ativar'} o vendedor{' '}
            <strong>{confirmSeller?.name}</strong>?
          </Typography>
          {confirmSeller?.active && (
            <Typography variant="body2" sx={{ marginTop: 2, color: '#666666' }}>
              Um vendedor inativo não participa da fila de rodízio de leads.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button
            onClick={confirmToggleActive}
            color={confirmSeller?.active ? 'error' : 'success'}
            variant="contained"
          >
            {confirmSeller?.active ? 'Desativar' : 'Ativar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
