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
  Autocomplete,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Giftback/Cashback (FSD seções 6.4, 12.8, 14.5).
//
// Um giftback é um crédito (percentual OU valor fixo) concedido a um
// cliente específico, com validade opcional, para uso em compra futura.
// Leitura para Admin e Acesso Limitado; criar/editar/excluir exclusivos do
// Administrador (mesmo padrão de Cupons.jsx). Crédito vencido aparece como
// "Vencido"; crédito utilizado não pode ser editado nem excluído.

const STATUS_LABELS = {
  available: { label: 'Disponível', color: 'success' },
  used: { label: 'Utilizado', color: 'default' },
  expired: { label: 'Vencido', color: 'warning' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'available', label: 'Disponíveis' },
  { value: 'used', label: 'Utilizados' },
  { value: 'expired', label: 'Vencidos' },
];

const CREDIT_TYPE_OPTIONS = [
  { value: 'percent', label: 'Percentual sobre a compra (%)' },
  { value: 'value', label: 'Valor fixo (R$)' },
];

const emptyForm = {
  customer: null, // { id, name } selecionado no Autocomplete
  creditType: 'percent',
  creditAmount: '',
  validUntil: '',
};

function toDateInputValue(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatCredit(giftback) {
  if (giftback.creditPercent !== null) return `${giftback.creditPercent}%`;
  return `R$ ${Number(giftback.creditValue).toFixed(2).replace('.', ',')}`;
}

export default function Giftback() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  const [giftbacks, setGiftbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingGiftback, setEditingGiftback] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Busca de clientes do Autocomplete (server-side, via GET /customers).
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

  const [deletingGiftback, setDeletingGiftback] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [snackbar, setSnackbar] = useState(null); // { severity, message }

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

  const loadGiftbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (customerFilter.trim()) params.set('customerName', customerFilter.trim());

      const response = await fetch(`/giftbacks?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar créditos de giftback.');

      const data = await response.json();
      setGiftbacks(data.giftbacks || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar créditos de giftback.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, customerFilter, handleAuthFailure]);

  useEffect(() => {
    loadGiftbacks();
  }, [loadGiftbacks]);

  async function searchCustomers(term) {
    if (!term || term.length < 2) {
      setCustomerOptions([]);
      return;
    }

    try {
      setCustomerSearchLoading(true);
      const response = await fetch(`/customers?search=${encodeURIComponent(term)}&pageSize=10`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) return;

      const data = await response.json();
      setCustomerOptions((data.customers || []).map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      setCustomerOptions([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingGiftback(null);
    setForm(emptyForm);
    setCustomerOptions([]);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(giftback) {
    setEditingGiftback(giftback);
    setForm({
      customer: { id: giftback.customerId, name: giftback.customerName },
      creditType: giftback.creditPercent !== null ? 'percent' : 'value',
      creditAmount:
        giftback.creditPercent !== null ? String(giftback.creditPercent) : String(giftback.creditValue),
      validUntil: toDateInputValue(giftback.validUntil),
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditingGiftback(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      const isEditing = !!editingGiftback;

      if (!isEditing && !form.customer) {
        throw new Error('Selecione o cliente que receberá o crédito.');
      }

      const payload = {
        creditPercent: form.creditType === 'percent' && form.creditAmount !== '' ? Number(form.creditAmount) : null,
        creditValue: form.creditType === 'value' && form.creditAmount !== '' ? Number(form.creditAmount) : null,
        validUntil: form.validUntil || null,
      };

      if (!isEditing) {
        payload.customerId = form.customer.id;
      }

      const url = isEditing ? `/giftbacks/${editingGiftback.id}` : '/giftbacks';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o crédito.');
      }

      closeFormDialog();
      setSnackbar({ severity: 'success', message: 'Crédito de giftback salvo com sucesso.' });
      await loadGiftbacks();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar crédito.');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(giftback) {
    setDeletingGiftback(giftback);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingGiftback) return;

    try {
      setDeleteOpen(false);
      const response = await fetch(`/giftbacks/${deletingGiftback.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível excluir o crédito.');
      }

      setSnackbar({ severity: 'success', message: 'Crédito excluído com sucesso.' });
      await loadGiftbacks();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao excluir crédito.' });
    } finally {
      setDeletingGiftback(null);
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
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Giftback / Cashback
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Créditos concedidos a clientes (percentual ou valor fixo) para uso em uma compra futura.
        </Typography>
      </Box>

      {!isAdmin && (
        <Alert severity="info" sx={{ marginBottom: 3 }}>
          Apenas o Administrador pode criar, editar ou excluir créditos de giftback. Você pode
          visualizar os créditos existentes abaixo.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Buscar por cliente"
              size="small"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
          </Box>
          {isAdmin && (
            <Button variant="contained" onClick={openCreateDialog}>
              Novo crédito
            </Button>
          )}
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : giftbacks.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhum crédito de giftback encontrado.
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Crédito</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Validade</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {giftbacks.map((giftback) => {
                  const statusInfo = STATUS_LABELS[giftback.status] || { label: giftback.status, color: 'default' };
                  return (
                    <TableRow key={giftback.id}>
                      <TableCell>{giftback.customerName}</TableCell>
                      <TableCell>{formatCredit(giftback)}</TableCell>
                      <TableCell>{giftback.validUntil ? `até ${formatDate(giftback.validUntil)}` : 'Sem prazo'}</TableCell>
                      <TableCell>
                        <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                      </TableCell>
                      <TableCell>{formatDate(giftback.createdAt)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={giftback.status === 'used'}
                              onClick={() => openEditDialog(giftback)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              disabled={giftback.status === 'used'}
                              onClick={() => openDeleteDialog(giftback)}
                            >
                              Excluir
                            </Button>
                          </Box>
                        </TableCell>
                      )}
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
        <DialogTitle>{editingGiftback ? 'Editar Crédito' : 'Novo Crédito'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}

          {editingGiftback ? (
            <TextField
              label="Cliente"
              fullWidth
              margin="normal"
              value={form.customer?.name || ''}
              disabled
              helperText="O cliente de um crédito não pode ser alterado — crie um novo crédito para outro cliente."
            />
          ) : (
            <Autocomplete
              options={customerOptions}
              getOptionLabel={(option) => option.name || ''}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={form.customer}
              loading={customerSearchLoading}
              noOptionsText="Digite ao menos 2 letras para buscar"
              onChange={(e, newValue) => setForm({ ...form, customer: newValue })}
              onInputChange={(e, newInput) => searchCustomers(newInput)}
              renderInput={(params) => (
                <TextField {...params} label="Cliente" required margin="normal" placeholder="Busque pelo nome..." />
              )}
            />
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Tipo de crédito"
              fullWidth
              required
              margin="normal"
              value={form.creditType}
              onChange={(e) => setForm({ ...form, creditType: e.target.value })}
            >
              {CREDIT_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={form.creditType === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}
              type="number"
              fullWidth
              required
              margin="normal"
              value={form.creditAmount}
              onChange={(e) => setForm({ ...form, creditAmount: e.target.value })}
            />
          </Box>

          <TextField
            label="Válido até (opcional)"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Sem data = sem expiração automática."
            value={form.validUntil}
            onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
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

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography sx={{ marginTop: 2 }}>
            Tem certeza que deseja excluir o crédito de{' '}
            <strong>{deletingGiftback ? formatCredit(deletingGiftback) : ''}</strong> do cliente{' '}
            <strong>{deletingGiftback?.customerName}</strong>?
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 2, color: '#666666' }}>
            Créditos já utilizados ou associados a campanhas não podem ser excluídos.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
}
