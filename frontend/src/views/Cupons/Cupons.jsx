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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Cupons (FSD seções 6.4, 12.8, 14.5).
//
// Leitura para Admin e Acesso Limitado; criar/editar/excluir exclusivos do
// Administrador (mesmo padrão de Templates.jsx). Cupom vencido aparece com
// status "Vencido" e cupom utilizado mostra por quem/quando.

const STATUS_LABELS = {
  active: { label: 'Ativo', color: 'success' },
  used: { label: 'Utilizado', color: 'default' },
  expired: { label: 'Vencido', color: 'warning' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'used', label: 'Utilizados' },
  { value: 'expired', label: 'Vencidos' },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percent', label: 'Percentual (%)' },
  { value: 'fixed', label: 'Valor fixo (R$)' },
];

const emptyForm = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  validFrom: '',
  validUntil: '',
};

// Converte um timestamp do banco para o formato aceito por
// <input type="date"> (YYYY-MM-DD), no fuso local.
function toDateInputValue(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDiscount(coupon) {
  if (coupon.discountType === 'percent') return `${coupon.discountValue}%`;
  return `R$ ${Number(coupon.discountValue).toFixed(2).replace('.', ',')}`;
}

export default function Cupons() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deletingCoupon, setDeletingCoupon] = useState(null);
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

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (codeFilter.trim()) params.set('code', codeFilter.trim());

      const response = await fetch(`/coupons?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar cupons.');

      const data = await response.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, codeFilter, handleAuthFailure]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  function openCreateDialog() {
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percent',
      discountValue: coupon.discountValue !== null ? String(coupon.discountValue) : '',
      validFrom: toDateInputValue(coupon.validFrom),
      validUntil: toDateInputValue(coupon.validUntil),
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      const isEditing = !!editingCoupon;
      const url = isEditing ? `/coupons/${editingCoupon.id}` : '/coupons';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: form.code.trim(),
          description: form.description.trim() || null,
          discountType: form.discountType,
          discountValue: form.discountValue !== '' ? Number(form.discountValue) : null,
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
        }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o cupom.');
      }

      closeFormDialog();
      setSnackbar({ severity: 'success', message: 'Cupom salvo com sucesso.' });
      await loadCoupons();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar cupom.');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(coupon) {
    setDeletingCoupon(coupon);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingCoupon) return;

    try {
      setDeleteOpen(false);
      const response = await fetch(`/coupons/${deletingCoupon.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível excluir o cupom.');
      }

      setSnackbar({ severity: 'success', message: 'Cupom excluído com sucesso.' });
      await loadCoupons();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao excluir cupom.' });
    } finally {
      setDeletingCoupon(null);
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
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Cupons
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Códigos de desconto de uso único, com validade, associáveis a campanhas.
        </Typography>
      </Box>

      {!isAdmin && (
        <Alert severity="info" sx={{ marginBottom: 3 }}>
          Apenas o Administrador pode criar, editar ou excluir cupons. Você pode visualizar os
          cupons existentes abaixo.
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
              label="Buscar por código"
              size="small"
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
            />
          </Box>
          {isAdmin && (
            <Button variant="contained" onClick={openCreateDialog}>
              Novo cupom
            </Button>
          )}
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : coupons.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhum cupom encontrado.
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Desconto</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Validade</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Utilizado por</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {coupons.map((coupon) => {
                  const statusInfo = STATUS_LABELS[coupon.status] || { label: coupon.status, color: 'default' };
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {coupon.code}
                        </Typography>
                        {coupon.description && (
                          <Typography variant="caption" sx={{ color: '#999999' }}>
                            {coupon.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatDiscount(coupon)}</TableCell>
                      <TableCell>
                        {coupon.validUntil
                          ? `${coupon.validFrom ? `${formatDate(coupon.validFrom)} a ` : 'até '}${formatDate(coupon.validUntil)}`
                          : 'Sem prazo'}
                      </TableCell>
                      <TableCell>
                        <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                      </TableCell>
                      <TableCell>
                        {coupon.usedByCustomerName ? (
                          <>
                            {coupon.usedByCustomerName}
                            {coupon.redeemedAt && (
                              <Typography variant="caption" sx={{ display: 'block', color: '#999999' }}>
                                em {formatDate(coupon.redeemedAt)}
                              </Typography>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(coupon.createdAt)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={coupon.status === 'used'}
                              onClick={() => openEditDialog(coupon)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              disabled={coupon.status === 'used'}
                              onClick={() => openDeleteDialog(coupon)}
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

      {/* Diálogo de criação/edição de cupom */}
      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Código do cupom"
            fullWidth
            required
            margin="normal"
            placeholder="Ex: PROMO10"
            helperText="O código é único e será salvo em maiúsculas."
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />

          <TextField
            label="Descrição (opcional)"
            fullWidth
            margin="normal"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Tipo de desconto"
              fullWidth
              required
              margin="normal"
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            >
              {DISCOUNT_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={form.discountType === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}
              type="number"
              fullWidth
              required
              margin="normal"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Válido a partir de (opcional)"
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            />
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
          </Box>
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
            Tem certeza que deseja excluir o cupom <strong>{deletingCoupon?.code}</strong>?
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 2, color: '#666666' }}>
            Cupons já utilizados ou associados a campanhas não podem ser excluídos.
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
