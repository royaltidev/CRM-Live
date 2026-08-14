import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Card,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Chip,
  Snackbar,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Venda Inteligente — remodelada em 14/08/2026 (escopo novo, pedido
// pelo responsável do projeto). Substitui a visão anterior (listas de nomes
// por grupo de mercadoria) por agrupamento POR SITUAÇÃO DE PREJUÍZO, vindo
// do motor de situações do backend (sales-situations.service.js):
//   Crítico / Queima de estoque / Margem baixa / Parado com estoque /
//   Oportunidades de cross-sell.
// Grupo fechado mostra só o resumo; a lista de itens abre para o usuário
// ESCOLHER (checkbox) sobre quais agir, com ações em lote na própria seção
// (criar campanha pré-preenchida, exportar CSV, copiar lista).
//
// A detecção de padrões de cross-sell não fica mais aqui — a gestão completa
// é na tela de Cross-sell; este grupo só lista as sugestões pendentes com
// ação rápida de ativar/descartar.

const SITUATION_ORDER = ['critico', 'queimaEstoque', 'margemBaixa', 'parado'];

// Com dados reais os grupos chegam a centenas de itens — renderizar tudo
// trava a tela. Exibimos os N primeiros (já vêm ordenados por relevância do
// backend); "Selecionar todos" e a exportação CSV continuam cobrindo o grupo
// INTEIRO, não só o visível.
const MAX_ROWS_DISPLAYED = 50;
const MAX_CROSS_SELL_DISPLAYED = 20;

const SITUATION_META = {
  critico: {
    title: 'Crítico — atenção imediata',
    color: '#b72c2c',
    chipLabel: 'Crítico',
    description:
      'Margem negativa, parado há 90+ dias com valor relevante ou cobertura de estoque acima de 180 dias.',
  },
  queimaEstoque: {
    title: 'Queima de estoque — promoção agressiva sugerida',
    color: '#d46a2b',
    chipLabel: 'Queima',
    description:
      'Com saldo e sem venda há 60+ dias. Preços de queima calculados em −25% / −40% / −50% (em vermelho quando ficam abaixo do custo).',
  },
  margemBaixa: {
    title: 'Margem baixa — reajuste de preço sugerido',
    color: '#a67e0e',
    chipLabel: 'Margem',
    description:
      'Margem mais de 10 pontos abaixo da média do próprio grupo de mercadoria, com preço sugerido para alcançar a média.',
  },
  parado: {
    title: 'Parado com estoque — baixo giro',
    color: '#4a5fa8',
    chipLabel: 'Parado',
    description:
      'Com saldo e sem venda há 30+ dias. Itens com saldo zerado não aparecem em nenhuma lista.',
  },
};

const REASON_LABELS = {
  margem_negativa: 'margem negativa',
  parado_90d_valor_alto: 'parado 90d+ · valor alto',
  cobertura_estoque_alta: 'cobertura alta',
};

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1).replace('.', ',')}%`;
}

function formatLastSale(item) {
  if (item.daysSinceLastSale === null || item.daysSinceLastSale === undefined) return 'nunca vendeu';
  return `há ${item.daysSinceLastSale} dia(s)`;
}

// CSV para Excel pt-BR: separador ";", decimal com vírgula e BOM UTF-8.
function downloadCsv(filename, header, rows) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = ['﻿' + header.map(escape).join(';'), ...rows.map((row) => row.map(escape).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function csvNumber(value) {
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
}

export default function VendaInteligente() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [situations, setSituations] = useState(null);
  const [situationsLoading, setSituationsLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [crossSellSuggestions, setCrossSellSuggestions] = useState([]);
  const [crossSellLoading, setCrossSellLoading] = useState(true);

  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  // Seleção por grupo: { critico: Set<productId>, ... }
  const [selected, setSelected] = useState({});
  // Grupo expandido — o link do Dashboard pode abrir direto numa seção
  // (state.expandGroup).
  const [expanded, setExpanded] = useState(location.state?.expandGroup || null);

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

  const loadSituations = useCallback(async () => {
    try {
      setSituationsLoading(true);
      const [situationsResponse, overviewResponse] = await Promise.all([
        fetch('/sales-insights/situations', { credentials: 'include' }),
        fetch('/sales-insights/overview', { credentials: 'include' }),
      ]);
      if ((await handleAuthFailure(situationsResponse)) || (await handleAuthFailure(overviewResponse))) return;
      if (!situationsResponse.ok || !overviewResponse.ok) {
        throw new Error('Falha ao carregar as situações da Venda Inteligente.');
      }
      const situationsData = await situationsResponse.json();
      const overviewData = await overviewResponse.json();
      setSituations(situationsData);
      setOverview(overviewData);
    } catch (err) {
      setError(err.message || 'Erro ao carregar a Venda Inteligente.');
    } finally {
      setSituationsLoading(false);
    }
  }, [handleAuthFailure]);

  const loadCrossSellSuggestions = useCallback(async () => {
    try {
      setCrossSellLoading(true);
      const response = await fetch('/complementary-products?active=false&source=suggested', {
        credentials: 'include',
      });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar sugestões de cross-sell.');
      const data = await response.json();
      setCrossSellSuggestions(data.complementaryProducts || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar sugestões de cross-sell.');
    } finally {
      setCrossSellLoading(false);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    loadSituations();
    loadCrossSellSuggestions();
  }, [loadSituations, loadCrossSellSuggestions]);

  const groups = situations?.groups || { critico: [], queimaEstoque: [], margemBaixa: [], parado: [] };

  const selectedIdsOf = useCallback((groupKey) => selected[groupKey] || new Set(), [selected]);

  function toggleSelected(groupKey, productId) {
    setSelected((prev) => {
      const next = new Set(prev[groupKey] || []);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return { ...prev, [groupKey]: next };
    });
  }

  function toggleSelectAll(groupKey) {
    const items = groups[groupKey] || [];
    setSelected((prev) => {
      const current = prev[groupKey] || new Set();
      const allSelected = items.length > 0 && items.every((item) => current.has(item.productId));
      return { ...prev, [groupKey]: allSelected ? new Set() : new Set(items.map((item) => item.productId)) };
    });
  }

  function selectedItems(groupKey) {
    const ids = selectedIdsOf(groupKey);
    return (groups[groupKey] || []).filter((item) => ids.has(item.productId));
  }

  // --- ações em lote -------------------------------------------------------

  function handleCreateCampaign(groupKey) {
    const items = selectedItems(groupKey);
    if (items.length === 0) return;
    const meta = SITUATION_META[groupKey];
    const today = new Date().toLocaleDateString('pt-BR');
    navigate('/campanhas', {
      state: {
        smartSalesCampaign: {
          name: `${meta.chipLabel === 'Queima' ? 'Queima de estoque' : meta.title.split(' — ')[0]} — ${today}`,
          productNames: items.map((item) => item.productName),
        },
      },
    });
  }

  async function handleCopyList(groupKey) {
    const items = selectedItems(groupKey);
    if (items.length === 0) return;
    const lines = items.map((item) => {
      if (groupKey === 'queimaEstoque' && item.burnPrices?.length > 0) {
        const burn = item.burnPrices.map((tier) => `-${tier.discountPercent}%: ${formatCurrency(tier.price)}`).join(' | ');
        return `${item.productName} — ${burn}`;
      }
      if (groupKey === 'margemBaixa') {
        return `${item.productName} — atual ${formatCurrency(item.price)} → sugerido ${formatCurrency(item.suggestedPrice)}`;
      }
      return `${item.productName} — ${formatCurrency(item.price)}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setSnackbar({ severity: 'success', message: `${items.length} item(ns) copiado(s) para a área de transferência.` });
    } catch {
      setSnackbar({ severity: 'error', message: 'Não foi possível copiar — o navegador bloqueou o acesso à área de transferência.' });
    }
  }

  function handleExportCsv(groupKey) {
    const items = selectedItems(groupKey);
    if (items.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);

    if (groupKey === 'margemBaixa') {
      downloadCsv(
        `precos-sugeridos-${today}.csv`,
        ['Produto', 'Grupo', 'Margem atual (%)', 'Margem media do grupo (%)', 'Preco atual', 'Preco sugerido'],
        items.map((item) => [
          item.productName,
          item.category || '',
          csvNumber((item.margin * 100).toFixed(1)),
          csvNumber((item.groupAvgMargin * 100).toFixed(1)),
          csvNumber(item.price),
          csvNumber(item.suggestedPrice),
        ])
      );
    } else if (groupKey === 'queimaEstoque') {
      downloadCsv(
        `queima-de-estoque-${today}.csv`,
        ['Produto', 'Grupo', 'Saldo', 'Valor parado', 'Ultima venda (dias)', 'Preco atual', 'Preco -25%', 'Preco -40%', 'Preco -50%'],
        items.map((item) => [
          item.productName,
          item.category || '',
          item.stockQuantity,
          csvNumber(item.stockValue),
          item.daysSinceLastSale === null ? 'nunca vendeu' : item.daysSinceLastSale,
          csvNumber(item.price),
          ...[0, 1, 2].map((i) => csvNumber(item.burnPrices?.[i]?.price)),
        ])
      );
    } else {
      downloadCsv(
        `venda-inteligente-${groupKey}-${today}.csv`,
        ['Produto', 'Grupo', 'Saldo', 'Valor parado', 'Ultima venda (dias)', 'Preco', 'Margem (%)'],
        items.map((item) => [
          item.productName,
          item.category || '',
          item.stockQuantity,
          csvNumber(item.stockValue),
          item.daysSinceLastSale === null ? 'nunca vendeu' : item.daysSinceLastSale,
          csvNumber(item.price),
          item.margin === null ? '' : csvNumber((item.margin * 100).toFixed(1)),
        ])
      );
    }
    setSnackbar({ severity: 'success', message: `CSV com ${items.length} item(ns) exportado.` });
  }

  // --- cross-sell: ação rápida sobre sugestões pendentes -------------------

  async function handleActivateSuggestion(item) {
    try {
      const response = await fetch(`/complementary-products/${item.id}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Não foi possível ativar a sugestão.');
      setSnackbar({ severity: 'success', message: 'Oferta de cross-sell ativada.' });
      await loadCrossSellSuggestions();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao ativar.' });
    }
  }

  async function handleDismissSuggestion(item) {
    try {
      const response = await fetch(`/complementary-products/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Não foi possível descartar a sugestão.');
      setSnackbar({ severity: 'success', message: 'Sugestão descartada.' });
      await loadCrossSellSuggestions();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao descartar.' });
    }
  }

  // --- resumo por grupo (cabeçalho do accordion) ---------------------------

  const groupSummaries = useMemo(() => {
    const sum = (items, field) => items.reduce((total, item) => total + (Number(item[field]) || 0), 0);
    return {
      critico: (items) =>
        `${items.length} produto(s) · ${formatCurrency(sum(items, 'stockValue'))} em estoque · ${
          items.filter((item) => item.reasons?.includes('margem_negativa')).length
        } com margem negativa`,
      queimaEstoque: (items) => {
        const midRecovery = overview?.totals?.burnRecoveryEstimate;
        return `${items.length} produto(s) · ${formatCurrency(sum(items, 'stockValue'))} parados${
          midRecovery ? ` · recupera ~${formatCurrency(midRecovery)} a −40%` : ''
        }`;
      },
      margemBaixa: (items) => `${items.length} produto(s) abaixo da média do próprio grupo`,
      parado: (items) => `${items.length} produto(s) com saldo e sem venda há 30+ dias`,
    };
  }, [overview]);

  // --- tabelas por grupo ---------------------------------------------------

  function renderSelectableHeader(groupKey, extraCells) {
    const items = groups[groupKey] || [];
    const ids = selectedIdsOf(groupKey);
    const allSelected = items.length > 0 && items.every((item) => ids.has(item.productId));
    return (
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={ids.size > 0 && !allSelected}
            onChange={() => toggleSelectAll(groupKey)}
          />
        </TableCell>
        <TableCell>Produto</TableCell>
        {extraCells.map((label) => (
          <TableCell key={label}>{label}</TableCell>
        ))}
      </TableRow>
    );
  }

  function renderRowStart(groupKey, item) {
    return (
      <>
        <TableCell padding="checkbox">
          <Checkbox
            size="small"
            checked={selectedIdsOf(groupKey).has(item.productId)}
            onChange={() => toggleSelected(groupKey, item.productId)}
          />
        </TableCell>
        <TableCell>{item.productName}</TableCell>
      </>
    );
  }

  function renderGroupTable(groupKey) {
    const items = groups[groupKey] || [];

    if (groupKey === 'critico') {
      return (
        <Table size="small">
          <TableHead>{renderSelectableHeader(groupKey, ['Motivo', 'Saldo', 'Valor parado', 'Última venda', 'Margem'])}</TableHead>
          <TableBody>
            {items.slice(0, MAX_ROWS_DISPLAYED).map((item) => (
              <TableRow key={item.productId}>
                {renderRowStart(groupKey, item)}
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(item.reasons || []).map((reason) => (
                      <Chip key={reason} label={REASON_LABELS[reason] || reason} size="small" color="error" variant="outlined" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{item.stockQuantity}</TableCell>
                <TableCell>{formatCurrency(item.stockValue)}</TableCell>
                <TableCell>{formatLastSale(item)}</TableCell>
                <TableCell sx={{ color: item.margin !== null && item.margin < 0 ? '#b72c2c' : 'inherit' }}>
                  {formatPercent(item.margin)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (groupKey === 'queimaEstoque') {
      return (
        <Table size="small">
          <TableHead>{renderSelectableHeader(groupKey, ['Saldo', 'Valor parado', 'Última venda', 'Preços de queima'])}</TableHead>
          <TableBody>
            {items.slice(0, MAX_ROWS_DISPLAYED).map((item) => (
              <TableRow key={item.productId}>
                {renderRowStart(groupKey, item)}
                <TableCell>{item.stockQuantity}</TableCell>
                <TableCell>{formatCurrency(item.stockValue)}</TableCell>
                <TableCell>{formatLastSale(item)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(item.burnPrices || []).map((tier) => (
                      <Tooltip
                        key={tier.discountPercent}
                        title={tier.belowCost ? 'Abaixo do custo' : tier.belowCost === false ? 'Acima do custo' : 'Custo desconhecido'}
                      >
                        <Chip
                          label={`−${tier.discountPercent}%: ${formatCurrency(tier.price)}`}
                          size="small"
                          color={tier.belowCost ? 'error' : 'default'}
                          variant={tier.belowCost ? 'filled' : 'outlined'}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (groupKey === 'margemBaixa') {
      return (
        <Table size="small">
          <TableHead>
            {renderSelectableHeader(groupKey, ['Grupo', 'Margem atual', 'Média do grupo', 'Preço atual', 'Preço sugerido'])}
          </TableHead>
          <TableBody>
            {items.slice(0, MAX_ROWS_DISPLAYED).map((item) => (
              <TableRow key={item.productId}>
                {renderRowStart(groupKey, item)}
                <TableCell>{item.category || '—'}</TableCell>
                <TableCell sx={{ color: '#b72c2c', fontWeight: 600 }}>{formatPercent(item.margin)}</TableCell>
                <TableCell>{formatPercent(item.groupAvgMargin)}</TableCell>
                <TableCell>{formatCurrency(item.price)}</TableCell>
                <TableCell sx={{ color: '#2d7a5c', fontWeight: 600 }}>{formatCurrency(item.suggestedPrice)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    return (
      <Table size="small">
        <TableHead>{renderSelectableHeader(groupKey, ['Grupo', 'Saldo', 'Valor parado', 'Última venda'])}</TableHead>
        <TableBody>
          {items.slice(0, MAX_ROWS_DISPLAYED).map((item) => (
            <TableRow key={item.productId}>
              {renderRowStart(groupKey, item)}
              <TableCell>{item.category || '—'}</TableCell>
              <TableCell>{item.stockQuantity}</TableCell>
              <TableCell>{formatCurrency(item.stockValue)}</TableCell>
              <TableCell>{formatLastSale(item)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  function renderGroupActions(groupKey) {
    const count = selectedIdsOf(groupKey).size;
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 2 }}>
        <Button size="small" variant="contained" disabled={count === 0} onClick={() => handleCreateCampaign(groupKey)}>
          Criar campanha{count > 0 ? ` (${count})` : ''}
        </Button>
        <Button size="small" variant="outlined" disabled={count === 0} onClick={() => handleExportCsv(groupKey)}>
          {groupKey === 'margemBaixa' ? 'Exportar preços sugeridos' : 'Exportar CSV'}
        </Button>
        <Button size="small" variant="outlined" disabled={count === 0} onClick={() => handleCopyList(groupKey)}>
          Copiar lista
        </Button>
        {count === 0 && (
          <Typography variant="caption" sx={{ color: '#666666', alignSelf: 'center' }}>
            Selecione os itens sobre os quais quer agir.
          </Typography>
        )}
      </Box>
    );
  }

  const emptyGroupMessage = {
    critico: 'Nenhum produto em situação crítica. Bom sinal.',
    queimaEstoque: 'Nenhum produto com saldo parado há 60+ dias.',
    margemBaixa:
      'Nenhum produto abaixo da média de margem do próprio grupo — ou os custos ainda não foram sincronizados do Uniplus.',
    parado: 'Nenhum produto com saldo e sem venda há 30+ dias.',
  };

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Venda Inteligente
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Produtos agrupados por situação de prejuízo, com ações diretas — calculado sobre vendas, estoque e custos
          reais do Uniplus.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {situationsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPIs */}
          {overview && (
            <Grid container spacing={3} sx={{ marginBottom: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ padding: 3, height: '100%' }}>
                  <Typography variant="body2" sx={{ color: '#666666', marginBottom: 1 }}>
                    Capital parado em estoque sem giro
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatCurrency(overview.totals.stagnantStockValue)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666666' }}>
                    Saldo × custo dos itens sem venda há 30+ dias
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ padding: 3, height: '100%' }}>
                  <Typography variant="body2" sx={{ color: '#666666', marginBottom: 1 }}>
                    Recuperação estimada com queima
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatCurrency(overview.totals.burnRecoveryEstimate)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666666' }}>
                    Vendendo o grupo de queima a −40%
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ padding: 3, height: '100%' }}>
                  <Typography variant="body2" sx={{ color: '#666666', marginBottom: 1 }}>
                    Produtos precisando de decisão
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {overview.totals.productsNeedingDecision}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666666' }}>
                    Soma de todas as situações (sem contar duas vezes)
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Grupos por situação */}
          {SITUATION_ORDER.map((groupKey) => {
            const meta = SITUATION_META[groupKey];
            const items = groups[groupKey] || [];
            return (
              <Accordion
                key={groupKey}
                expanded={expanded === groupKey}
                onChange={(event, isExpanded) => setExpanded(isExpanded ? groupKey : null)}
                sx={{ marginBottom: 1.5, borderLeft: `4px solid ${meta.color}`, '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: '100%' }}>
                    <Chip label={meta.chipLabel} size="small" sx={{ backgroundColor: meta.color, color: '#ffffff', fontWeight: 600 }} />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {meta.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666666' }}>
                        {items.length === 0 ? emptyGroupMessage[groupKey] : groupSummaries[groupKey](items)}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
                    {meta.description}
                  </Typography>
                  {items.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#666666' }}>
                      {emptyGroupMessage[groupKey]}
                    </Typography>
                  ) : (
                    <>
                      <Box sx={{ overflowX: 'auto' }}>{renderGroupTable(groupKey)}</Box>
                      {items.length > MAX_ROWS_DISPLAYED && (
                        <Typography variant="caption" sx={{ color: '#666666', display: 'block', marginTop: 1 }}>
                          Mostrando os {MAX_ROWS_DISPLAYED} mais relevantes de {items.length}. "Selecionar todos" e a
                          exportação CSV incluem o grupo inteiro.
                        </Typography>
                      )}
                      {renderGroupActions(groupKey)}
                    </>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Cross-sell pendente */}
          <Accordion
            expanded={expanded === 'crossSell'}
            onChange={(event, isExpanded) => setExpanded(isExpanded ? 'crossSell' : null)}
            sx={{ marginBottom: 1.5, borderLeft: '4px solid #2d7a5c', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: '100%' }}>
                <Chip label="Cross-sell" size="small" sx={{ backgroundColor: '#2d7a5c', color: '#ffffff', fontWeight: 600 }} />
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Oportunidades de cross-sell — sugestões pendentes
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666666' }}>
                    {crossSellLoading
                      ? 'Carregando...'
                      : crossSellSuggestions.length === 0
                      ? 'Nenhuma sugestão pendente — use "Detectar padrões" na tela de Cross-sell.'
                      : `${crossSellSuggestions.length} sugestão(ões) aguardando decisão`}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {crossSellLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  {crossSellSuggestions.slice(0, MAX_CROSS_SELL_DISPLAYED).map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingY: 1.5,
                        borderBottom: '1px solid #e0e0e0',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Typography variant="body2">
                        <strong>{item.productName}</strong> → {item.complementaryProductName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="contained" onClick={() => handleActivateSuggestion(item)}>
                          Ativar
                        </Button>
                        <Button size="small" variant="text" color="error" onClick={() => handleDismissSuggestion(item)}>
                          Descartar
                        </Button>
                      </Box>
                    </Box>
                  ))}
                  {crossSellSuggestions.length > MAX_CROSS_SELL_DISPLAYED && (
                    <Typography variant="caption" sx={{ color: '#666666', display: 'block', marginTop: 1 }}>
                      Mostrando {MAX_CROSS_SELL_DISPLAYED} de {crossSellSuggestions.length} sugestões — a gestão em
                      lote fica na tela de Cross-sell.
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewOutlinedIcon />}
                    sx={{ marginTop: 2 }}
                    onClick={() => navigate('/cross-sell')}
                  >
                    Gestão completa na tela de Cross-sell
                  </Button>
                </>
              )}
            </AccordionDetails>
          </Accordion>
        </>
      )}

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
