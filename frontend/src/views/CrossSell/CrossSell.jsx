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

// Tela de Cross-sell / produtos complementares (FSD seções 6.4, 12.9, 14.6).
//
// Cuida só de duas coisas: a relação produto -> complemento
// (`complementary_products`) e o percentual de desconto da oferta
// automática. A régua que efetivamente envia a mensagem pós-compra é criada
// na tela de Réguas (gatilho "Cross-sell"), com seu próprio modelo de
// mensagem — não há campo de template aqui, por design (FSD 12.9).
//
// Acessível por Admin E Acesso Limitado, sem distinção de permissão (FSD
// linha 336 da matriz) — diferente de Cupons/Giftback/Templates.

const SOURCE_LABELS = {
  manual: { label: 'Manual', color: 'default' },
  suggested: { label: 'Sugerido', color: 'info' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
];

const emptyForm = {
  product: null,
  complement: null,
};

export default function CrossSell() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [discountPercent, setDiscountPercent] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(true);
  const [discountEditing, setDiscountEditing] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountError, setDiscountError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [productOptions, setProductOptions] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [complementOptions, setComplementOptions] = useState([]);
  const [complementSearchLoading, setComplementSearchLoading] = useState(false);

  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('active', statusFilter);

      const response = await fetch(`/complementary-products?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar produtos complementares.');

      const data = await response.json();
      setItems(data.complementaryProducts || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar produtos complementares.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, handleAuthFailure]);

  const loadDiscountPercent = useCallback(async () => {
    try {
      setDiscountLoading(true);
      const response = await fetch('/complementary-products/settings/discount-percent', {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar percentual de desconto.');

      const data = await response.json();
      setDiscountPercent(data.percent);
    } catch (err) {
      setDiscountError(err.message || 'Erro ao carregar percentual de desconto.');
    } finally {
      setDiscountLoading(false);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadDiscountPercent();
  }, [loadDiscountPercent]);

  async function searchProducts(term, setOptions, setSearchLoading) {
    if (!term || term.length < 2) {
      setOptions([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await fetch(`/products?search=${encodeURIComponent(term)}&active=true`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) return;

      const data = await response.json();
      setOptions(data.products || []);
    } catch (err) {
      setOptions([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function openCreateDialog() {
    setForm(emptyForm);
    setProductOptions([]);
    setComplementOptions([]);
    setFormError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      if (!form.product || !form.complement) {
        throw new Error('Selecione o produto e o produto complementar.');
      }

      const response = await fetch('/complementary-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: form.product.id,
          complementaryProductId: form.complement.id,
        }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar a relação de produtos.');
      }

      closeFormDialog();
      setSnackbar({ severity: 'success', message: 'Produto complementar cadastrado com sucesso.' });
      await loadItems();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar produto complementar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item) {
    try {
      const response = await fetch(`/complementary-products/${item.id}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível alterar o status.');
      }

      await loadItems();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao alterar status.' });
    }
  }

  function openDeleteDialog(item) {
    setDeletingItem(item);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingItem) return;

    try {
      setDeleteOpen(false);
      const response = await fetch(`/complementary-products/${deletingItem.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível excluir a relação.');
      }

      setSnackbar({ severity: 'success', message: 'Relação excluída com sucesso.' });
      await loadItems();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao excluir relação.' });
    } finally {
      setDeletingItem(null);
    }
  }

  function openDiscountEdit() {
    setDiscountInput(discountPercent !== null ? String(discountPercent) : '');
    setDiscountError(null);
    setDiscountEditing(true);
  }

  async function handleSaveDiscount() {
    try {
      setDiscountSaving(true);
      setDiscountError(null);

      const response = await fetch('/complementary-products/settings/discount-percent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ percent: Number(discountInput) }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o percentual de desconto.');
      }

      setDiscountPercent(data.percent);
      setDiscountEditing(false);
      setSnackbar({ severity: 'success', message: 'Percentual de desconto atualizado com sucesso.' });
    } catch (err) {
      setDiscountError(err.message || 'Erro ao salvar percentual de desconto.');
    } finally {
      setDiscountSaving(false);
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
          Cross-sell
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Produtos complementares oferecidos automaticamente após a compra, com desconto.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" sx={{ marginBottom: 1 }}>
          Percentual de desconto da oferta
        </Typography>
        {discountLoading ? (
          <CircularProgress size={20} />
        ) : discountEditing ? (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="Percentual (%)"
              type="number"
              size="small"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              error={!!discountError}
              helperText={discountError || ' '}
            />
            <Button variant="contained" disabled={discountSaving} onClick={handleSaveDiscount}>
              Salvar
            </Button>
            <Button variant="text" disabled={discountSaving} onClick={() => setDiscountEditing(false)}>
              Cancelar
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {discountPercent !== null ? (
              <Typography variant="body1">{discountPercent}%</Typography>
            ) : (
              <Alert severity="warning" sx={{ flexGrow: 1 }}>
                Percentual ainda não configurado — nenhuma oferta de cross-sell será enviada até que
                seja definido.
              </Alert>
            )}
            <Button variant="outlined" onClick={openDiscountEdit}>
              {discountPercent !== null ? 'Editar' : 'Configurar'}
            </Button>
          </Box>
        )}
      </Card>

      <Alert severity="info" sx={{ marginBottom: 3 }}>
        Para a oferta ser enviada automaticamente, também é preciso ter uma régua ativa com o
        gatilho "Cross-sell" na tela de Réguas de Relacionamento, com um modelo de mensagem
        associado.
      </Alert>

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <Button variant="contained" onClick={openCreateDialog}>
            Novo produto complementar
          </Button>
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhum produto complementar cadastrado.
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Complemento</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Origem</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const sourceInfo = SOURCE_LABELS[item.source] || { label: item.source, color: 'default' };
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.complementaryProductName}</TableCell>
                      <TableCell>
                        <Chip label={sourceInfo.label} color={sourceInfo.color} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.active ? 'Ativo' : 'Inativo'}
                          color={item.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Button size="small" variant="outlined" onClick={() => handleToggleActive(item)}>
                            {item.active ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button size="small" variant="text" color="error" onClick={() => openDeleteDialog(item)}>
                            Excluir
                          </Button>
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

      {/* Diálogo de criação */}
      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Produto Complementar</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}

          <Autocomplete
            options={productOptions}
            getOptionLabel={(option) => option.name || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={form.product}
            loading={productSearchLoading}
            noOptionsText="Digite ao menos 2 letras para buscar"
            onChange={(e, newValue) => setForm({ ...form, product: newValue })}
            onInputChange={(e, newInput) => searchProducts(newInput, setProductOptions, setProductSearchLoading)}
            renderInput={(params) => (
              <TextField {...params} label="Produto" required margin="normal" placeholder="Busque pelo nome..." />
            )}
          />

          <Autocomplete
            options={complementOptions}
            getOptionLabel={(option) => option.name || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={form.complement}
            loading={complementSearchLoading}
            noOptionsText="Digite ao menos 2 letras para buscar"
            onChange={(e, newValue) => setForm({ ...form, complement: newValue })}
            onInputChange={(e, newInput) => searchProducts(newInput, setComplementOptions, setComplementSearchLoading)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Produto complementar"
                required
                margin="normal"
                placeholder="Busque pelo nome..."
              />
            )}
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

      {/* Diálogo de exclusão */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Excluir relação de produto complementar?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {deletingItem?.productName} deixará de oferecer {deletingItem?.complementaryProductName} como
            cross-sell. Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Excluir
          </Button>
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
