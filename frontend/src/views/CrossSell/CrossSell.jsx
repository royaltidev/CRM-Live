import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Tooltip,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Cross-sell / produtos complementares (FSD seções 6.4, 12.9, 14.6),
// remodelada em 14/08/2026 (escopo novo, pedido pelo responsável).
//
// Duas seções:
//  1. "Padrões detectados" — as sugestões do motor de afinidade que ainda
//     aguardam decisão, com as métricas que justificam cada uma (vendas em
//     conjunto, confiança e lift) e ações EM LOTE na própria tela. A lista é
//     persistida (migration 040), então continua disponível depois de fechar
//     a tela — antes o resultado da detecção sumia junto com o diálogo.
//  2. "Ofertas de cross-sell ativas" — os pares que já viraram oferta.
//
// O cadastro MANUAL de par foi removido (decisão do responsável, diverge do
// FSD 6.4): todo par novo nasce da detecção e é aceito ou descartado aqui.
//
// A régua que efetivamente envia a mensagem pós-compra é criada na tela de
// Réguas (gatilho "Cross-sell"), com seu próprio modelo de mensagem — não há
// campo de template aqui, por design (FSD 12.9).
//
// Acessível por Admin E Acesso Limitado, sem distinção de permissão (FSD
// linha 336 da matriz) — diferente de Cupons/Giftback/Templates.

const SOURCE_LABELS = {
  manual: { label: 'Manual', color: 'default' },
  suggested: { label: 'Sugerido', color: 'info' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'true', label: 'Ativas' },
  { value: 'false', label: 'Inativas' },
];

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Nome + código do Uniplus: o catálogo real tem dezenas de produtos
// diferentes com nome idêntico (17 "LANCHEIRA SESTINE", por exemplo), então
// sem o código duas linhas ficam indistinguíveis.
function ProductLabel({ name, code }) {
  return (
    <Box>
      <Typography variant="body2">{name}</Typography>
      {code && (
        <Typography variant="caption" sx={{ color: '#666666' }}>
          cód. {code}
        </Typography>
      )}
    </Box>
  );
}

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

  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

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

  // Carrega TODOS os pares de uma vez e separa no cliente entre "sugestões
  // pendentes" e "ofertas": são poucas linhas, e assim as duas seções nunca
  // ficam fora de sincronia entre si.
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/complementary-products', { method: 'GET', credentials: 'include' });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar produtos complementares.');

      const data = await response.json();
      setItems(data.complementaryProducts || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar produtos complementares.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthFailure]);

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

  // Pendente de decisão = sugestão automática ainda não ativada nem
  // descartada. Desativar uma oferta sugerida devolve ela para cá, como uma
  // decisão a rever.
  const pendingSuggestions = useMemo(
    () => items.filter((item) => item.source === 'suggested' && !item.active && !item.dismissedAt),
    [items]
  );

  const dismissedSuggestions = useMemo(() => items.filter((item) => item.dismissedAt), [items]);

  const offers = useMemo(() => {
    const decided = items.filter(
      (item) => !item.dismissedAt && !(item.source === 'suggested' && !item.active)
    );
    if (statusFilter === '') return decided;
    return decided.filter((item) => String(item.active) === statusFilter);
  }, [items, statusFilter]);

  const lastDetectionAt = useMemo(() => {
    const dates = items.map((item) => item.detectedAt).filter(Boolean);
    return dates.length > 0 ? dates.sort().slice(-1)[0] : null;
  }, [items]);

  // A seleção guarda ids que podem sumir da lista depois de uma ação em
  // lote; sempre cruzar com as sugestões atuais antes de usar.
  const selectedPendingIds = useMemo(
    () => pendingSuggestions.filter((item) => selectedSuggestions.has(item.id)).map((item) => item.id),
    [pendingSuggestions, selectedSuggestions]
  );

  function toggleSuggestion(id) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSuggestions() {
    setSelectedSuggestions((prev) => {
      const allSelected = pendingSuggestions.length > 0 && pendingSuggestions.every((item) => prev.has(item.id));
      return allSelected ? new Set() : new Set(pendingSuggestions.map((item) => item.id));
    });
  }

  async function handleBulkActivate() {
    if (selectedPendingIds.length === 0) return;
    try {
      setBulkWorking(true);
      const response = await fetch('/complementary-products/bulk-active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedPendingIds, active: true }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível ativar as sugestões.');

      setSnackbar({ severity: 'success', message: `${data.affected} oferta(s) de cross-sell ativada(s).` });
      setSelectedSuggestions(new Set());
      await loadItems();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao ativar as sugestões.' });
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkDismiss(ids = selectedPendingIds, dismissed = true) {
    if (ids.length === 0) return;
    try {
      setBulkWorking(true);
      const response = await fetch('/complementary-products/bulk-dismiss', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids, dismissed }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar as sugestões.');

      setSnackbar({
        severity: 'success',
        message: dismissed
          ? `${data.affected} sugestão(ões) descartada(s) — não voltarão a ser sugeridas.`
          : `${data.affected} sugestão(ões) restaurada(s).`,
      });
      setSelectedSuggestions(new Set());
      await loadItems();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao atualizar as sugestões.' });
    } finally {
      setBulkWorking(false);
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

      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o percentual de desconto.');

      setDiscountPercent(data.percent);
      setDiscountEditing(false);
      setSnackbar({ severity: 'success', message: 'Percentual de desconto atualizado com sucesso.' });
    } catch (err) {
      setDiscountError(err.message || 'Erro ao salvar percentual de desconto.');
    } finally {
      setDiscountSaving(false);
    }
  }

  // Motor de detecção de padrões (ver backend/services/product-affinity.service.js).
  // Sugestões criadas entram inativas e ficam na seção de padrões detectados
  // — nada é ativado automaticamente.
  async function handleDetectPatterns() {
    try {
      setDetecting(true);
      const response = await fetch('/complementary-products/detect-patterns', {
        method: 'POST',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Não foi possível detectar padrões.');

      setDetectResult(data);
      await loadItems();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao detectar padrões.' });
    } finally {
      setDetecting(false);
    }
  }

  const allPendingSelected =
    pendingSuggestions.length > 0 && pendingSuggestions.every((item) => selectedSuggestions.has(item.id));

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Cross-sell
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Produtos que o sistema identificou serem comprados juntos, com base nas vendas reais. Ative uma sugestão
          para transformá-la em oferta automática pós-compra.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Percentual de desconto da oferta */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ marginBottom: 0.5 }}>
              Desconto da oferta automática
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666' }}>
              Percentual aplicado no cupom enviado quando a régua de cross-sell dispara.
            </Typography>
          </Box>
          {discountLoading ? (
            <CircularProgress size={24} />
          ) : discountEditing ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Desconto (%)"
                type="number"
                size="small"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                sx={{ width: 140 }}
              />
              <Button variant="contained" onClick={handleSaveDiscount} disabled={discountSaving}>
                Salvar
              </Button>
              <Button onClick={() => setDiscountEditing(false)} disabled={discountSaving}>
                Cancelar
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {discountPercent !== null ? `${discountPercent}%` : '—'}
              </Typography>
              <Button variant="outlined" size="small" onClick={openDiscountEdit}>
                Alterar
              </Button>
            </Box>
          )}
        </Box>
        {discountError && (
          <Alert severity="error" sx={{ marginTop: 2 }}>
            {discountError}
          </Alert>
        )}
      </Card>

      {/* Padrões detectados — decisão em lote */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, marginBottom: 1 }}
        >
          <Box>
            <Typography variant="h6">Padrões detectados</Typography>
            <Typography variant="body2" sx={{ color: '#666666' }}>
              {lastDetectionAt
                ? `Última detecção: ${formatDateTime(lastDetectionAt)}`
                : 'Nenhuma detecção executada ainda.'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeOutlinedIcon />}
            onClick={handleDetectPatterns}
            disabled={detecting}
          >
            {detecting ? 'Detectando...' : 'Detectar padrões'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
          Só entram pares vendidos juntos pelo menos 5 vezes, com no mínimo 30% de confiança, e cujo <strong>lift</strong>{' '}
          é ponto fora da curva em relação aos demais — ou seja, muito além do que a simples popularidade dos dois
          produtos explicaria. Pares comuns a centenas de itens não aparecem aqui.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : pendingSuggestions.length === 0 ? (
          <Alert severity="info">
            Nenhuma sugestão aguardando decisão. Use "Detectar padrões" para procurar novos padrões nas vendas.
          </Alert>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={allPendingSelected}
                        indeterminate={selectedPendingIds.length > 0 && !allPendingSelected}
                        onChange={toggleAllSuggestions}
                      />
                    </TableCell>
                    <TableCell>Quem compra…</TableCell>
                    <TableCell>…também leva</TableCell>
                    <TableCell align="right">Vendas juntas</TableCell>
                    <TableCell align="right">Confiança</TableCell>
                    <TableCell align="right">Lift</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingSuggestions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selectedSuggestions.has(item.id)}
                          onChange={() => toggleSuggestion(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <ProductLabel name={item.productName} code={item.productCode} />
                      </TableCell>
                      <TableCell>
                        <ProductLabel name={item.complementaryProductName} code={item.complementaryProductCode} />
                      </TableCell>
                      <TableCell align="right">{item.coOccurrence ?? '—'}</TableCell>
                      <TableCell align="right">
                        {item.confidence !== null && item.confidence !== undefined
                          ? `${(item.confidence * 100).toFixed(0)}%`
                          : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {item.lift !== null && item.lift !== undefined ? (
                          <Tooltip title={`${item.lift.toFixed(1)}× mais provável que o acaso`}>
                            <Chip label={`${item.lift.toFixed(1)}×`} size="small" color="success" />
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                disabled={selectedPendingIds.length === 0 || bulkWorking}
                onClick={handleBulkActivate}
              >
                Ativar como oferta{selectedPendingIds.length > 0 ? ` (${selectedPendingIds.length})` : ''}
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                disabled={selectedPendingIds.length === 0 || bulkWorking}
                onClick={() => handleBulkDismiss()}
              >
                Descartar{selectedPendingIds.length > 0 ? ` (${selectedPendingIds.length})` : ''}
              </Button>
              {selectedPendingIds.length === 0 && (
                <Typography variant="caption" sx={{ color: '#666666' }}>
                  Selecione as sugestões que quer ativar ou descartar.
                </Typography>
              )}
            </Box>
          </>
        )}

        {dismissedSuggestions.length > 0 && (
          <Box sx={{ marginTop: 3, paddingTop: 2, borderTop: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#666666' }}>
                {dismissedSuggestions.length} sugestão(ões) descartada(s) — não voltam a ser sugeridas.
              </Typography>
              <Button size="small" onClick={() => setShowDismissed((prev) => !prev)}>
                {showDismissed ? 'Ocultar' : 'Ver descartadas'}
              </Button>
            </Box>
            {showDismissed && (
              <Box sx={{ marginTop: 1 }}>
                {dismissedSuggestions.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                      paddingY: 1,
                      borderBottom: '1px solid #f0f0f0',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#666666' }}>
                      {item.productName} → {item.complementaryProductName}
                    </Typography>
                    <Button size="small" disabled={bulkWorking} onClick={() => handleBulkDismiss([item.id], false)}>
                      Restaurar
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* Ofertas já decididas */}
      <Card sx={{ padding: 3 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, marginBottom: 2 }}
        >
          <Box>
            <Typography variant="h6">Ofertas de cross-sell</Typography>
            <Typography variant="body2" sx={{ color: '#666666' }}>
              Pares já decididos. Desativar uma oferta sugerida devolve ela para "Padrões detectados".
            </Typography>
          </Box>
          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : offers.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Nenhuma oferta de cross-sell {statusFilter === '' ? 'cadastrada' : 'com esse status'}. Ative uma sugestão
            acima para criar a primeira.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Complemento</TableCell>
                  <TableCell>Origem</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {offers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <ProductLabel name={item.productName} code={item.productCode} />
                    </TableCell>
                    <TableCell>
                      <ProductLabel name={item.complementaryProductName} code={item.complementaryProductCode} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={SOURCE_LABELS[item.source]?.label || item.source}
                        color={SOURCE_LABELS[item.source]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.active ? 'Ativa' : 'Inativa'}
                        color={item.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => handleToggleActive(item)}>
                        {item.active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button size="small" color="error" onClick={() => openDeleteDialog(item)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {/* Resultado da detecção */}
      <Dialog open={Boolean(detectResult)} onClose={() => setDetectResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resultado da detecção</DialogTitle>
        <DialogContent>
          {detectResult && (
            <>
              <Typography variant="body2" sx={{ marginBottom: 2 }}>
                {detectResult.candidatesEvaluated} par(es) passaram nos limiares de incidência e{' '}
                {detectResult.suggestionsCreated} viraram sugestão.{' '}
                {detectResult.outlierAnalysisApplied
                  ? `Só entraram os pontos fora da curva: lift acima de ${Number(detectResult.liftThreshold).toFixed(1)}×.`
                  : 'Poucos candidatos para analisar a distribuição — todos os aprovados foram mantidos.'}
              </Typography>
              {detectResult.aiError && (
                <Alert severity="warning" sx={{ marginBottom: 2 }}>
                  A IA falhou ({detectResult.aiError}) — usados os candidatos estatísticos sem filtro adicional.
                </Alert>
              )}
              {detectResult.suggestions.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666666' }}>
                  Nenhum padrão novo encontrado — os pares avaliados não se destacam o suficiente dos demais.
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ color: '#666666', marginBottom: 1 }}>
                    As sugestões ficam salvas na seção "Padrões detectados" — você pode decidir agora ou depois.
                  </Typography>
                  {detectResult.suggestions.map((s, idx) => (
                    <Box key={idx} sx={{ marginBottom: 1.5, paddingBottom: 1.5, borderBottom: '1px solid #e0e0e0' }}>
                      <Typography variant="body2">
                        <strong>
                          {s.productAName} → {s.productBName}
                        </strong>{' '}
                        ({s.coOccurrence} venda(s) juntas, {(s.confidence * 100).toFixed(0)}% de confiança, lift{' '}
                        {s.lift.toFixed(1)}×){!s.created && ' — já existia'}
                      </Typography>
                      {s.description && (
                        <Typography variant="caption" sx={{ color: '#666666' }}>
                          {s.description}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetectResult(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Exclusão */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Excluir relação</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Excluir a relação entre <strong>{deletingItem?.productName}</strong> e{' '}
            <strong>{deletingItem?.complementaryProductName}</strong>? Ela pode voltar a ser sugerida numa próxima
            detecção — para removê-la de vez, use "Descartar" na lista de padrões detectados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
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
