import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  Typography,
  Button,
  Grid,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Dashboard geral de relacionamento (FSD 6.7, 22.1) + atalhos para os
// módulos do sistema. Disponível a Admin e Acesso Limitado (ambos
// visualizam) — ver backend/services/dashboard-report.service.js para as
// fórmulas de cada indicador.

const QUICK_LINKS = [
  {
    title: 'Clientes',
    description: 'Busque clientes, abra a ficha 360º e edite campos complementares (aniversário, preferências, tags).',
    path: '/clientes',
  },
  {
    title: 'Segmentação',
    description: 'Configure os critérios de classificação RFM e crie segmentos dinâmicos combinando filtros.',
    path: '/segmentacao',
  },
  {
    title: 'Vendedores',
    description: 'Cadastre vendedores e acompanhe a fila de rodízio usada no encaminhamento de leads.',
    path: '/vendedores',
  },
  {
    title: 'Tags',
    description: 'Gerencie as etiquetas usadas para classificar e segmentar clientes.',
    path: '/tags',
  },
];

// Blocos do card de Venda Inteligente: cada um abre a tela dedicada já no
// grupo correspondente (via location.state.expandGroup). As chaves batem com
// as do motor de situações (backend/app/services/sales-situations.service.js).
const SMART_SALES_TILES = [
  {
    key: 'critico',
    label: 'Críticos',
    color: '#b72c2c',
    caption: (overview) => `${formatCurrency(overview.totals.criticoStockValue)} em estoque`,
  },
  {
    key: 'queimaEstoque',
    label: 'Queima de estoque',
    color: '#d46a2b',
    caption: () => 'sem giro há 60+ dias',
  },
  {
    key: 'margemBaixa',
    label: 'Margem baixa',
    color: '#dba617',
    caption: () => 'abaixo da média do grupo',
  },
  {
    key: 'parado',
    label: 'Parados c/ estoque',
    color: '#4a5fa8',
    caption: () => 'saldo > 0, sem venda 30d',
  },
  {
    key: 'crossSellPending',
    // O grupo de cross-sell tem outra chave na tela dedicada (não vem do
    // motor de situações, e sim de `complementary_products`).
    expandGroup: 'crossSell',
    label: 'Cross-sell pendente',
    color: '#2d7a5c',
    caption: () => 'sugestões a revisar',
  },
];

function formatPercent(value) {
  return value === null || value === undefined ? 'Não disponível' : `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

function MetricCard({ title, value, caption }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card sx={{ padding: 3, height: '100%' }}>
        <Typography variant="body2" sx={{ color: '#666666', marginBottom: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" sx={{ color: '#666666' }}>
            {caption}
          </Typography>
        )}
      </Card>
    </Grid>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [smartSalesOverview, setSmartSalesOverview] = useState(null);
  const [smartSalesFailed, setSmartSalesFailed] = useState(false);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params;
  }, [startDate, endDate]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/reports/dashboard?${buildFilterParams().toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar o dashboard');
      }

      const data = await response.json();
      setDashboard(data.dashboard);
    } catch (err) {
      setError(err.message || 'Erro ao carregar o dashboard');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, logout, navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Card de resumo da Venda Inteligente (remodelado em 14/08/2026): números
  // por situação de prejuízo vindos do motor de situações
  // (/sales-insights/overview), cada um clicável abrindo a tela dedicada já
  // no grupo certo, mais o destaque de capital parado com ação direta.
  useEffect(() => {
    async function loadSmartSalesSummary() {
      try {
        const response = await fetch('/sales-insights/overview', { credentials: 'include' });
        if (!response.ok) throw new Error('Falha ao carregar o resumo.');
        setSmartSalesOverview(await response.json());
      } catch {
        // Card de resumo não é essencial — o resto do Dashboard funciona sem
        // ele. Mas precisa sair do estado de carregamento, senão o card fica
        // com um spinner eterno em vez de dizer o que houve.
        setSmartSalesFailed(true);
      }
    }
    loadSmartSalesSummary();
  }, []);

  const handleExport = async () => {
    try {
      const response = await fetch(`/reports/dashboard/export?${buildFilterParams().toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao exportar o dashboard');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dashboard-geral.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Erro ao exportar o dashboard');
    }
  };

  const unclassifiedCaption = () => {
    if (!dashboard || dashboard.activeVsInactive.status !== 'ok') return '';
    return `${dashboard.activeVsInactive.unclassified} cliente(s) ainda não classificado(s)`;
  };

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Bem-vindo, {user?.name || user?.email}!
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Dashboard geral de relacionamento (FSD 22.1).
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={handleExport} disabled={!dashboard}>
          Exportar CSV
        </Button>
      </Box>

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Período - de"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            helperText="Padrão: últimos 30 dias"
          />
          <TextField
            label="Período - até"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Button variant="contained" onClick={loadDashboard}>
            Filtrar
          </Button>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ padding: 3, marginBottom: 3, backgroundColor: '#0f2d7b', color: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
          <AutoAwesomeOutlinedIcon fontSize="large" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Venda Inteligente
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {smartSalesFailed
                ? 'Não foi possível carregar o resumo agora.'
                : smartSalesOverview === null
                ? 'Analisando vendas, estoque e custos...'
                : 'Produtos que precisam de decisão, agrupados por situação. Clique num número para abrir a lista.'}
            </Typography>
          </Box>
        </Box>

        {smartSalesFailed ? (
          <Button
            variant="contained"
            sx={{ backgroundColor: '#ffffff', color: '#0f2d7b' }}
            onClick={() => navigate('/venda-inteligente')}
          >
            Abrir Venda Inteligente
          </Button>
        ) : smartSalesOverview === null ? (
          <CircularProgress size={24} sx={{ color: '#ffffff' }} />
        ) : (
          <>
            <Grid container spacing={2} sx={{ marginBottom: 2 }}>
              {SMART_SALES_TILES.map((tile) => (
                <Grid item xs={6} sm={4} md={2.4} key={tile.key}>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/venda-inteligente', { state: { expandGroup: tile.expandGroup || tile.key } })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate('/venda-inteligente', { state: { expandGroup: tile.expandGroup || tile.key } });
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      padding: 2,
                      borderRadius: 2,
                      borderTop: `4px solid ${tile.color}`,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      transition: 'background-color 120ms',
                      '&:hover, &:focus-visible': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {smartSalesOverview.counts[tile.key]}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {tile.label}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {tile.caption(smartSalesOverview)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                padding: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
              }}
            >
              <Typography variant="body2">
                {smartSalesOverview.totals.stagnantStockValue > 0 ? (
                  <>
                    <strong>Maior oportunidade:</strong>{' '}
                    {formatCurrency(smartSalesOverview.totals.stagnantStockValue)} imobilizados em produtos sem giro —
                    uma queima a −40% recupera cerca de {formatCurrency(smartSalesOverview.totals.burnRecoveryEstimate)}.
                  </>
                ) : (
                  <>Nenhum capital relevante parado em estoque no momento.</>
                )}
              </Typography>
              <Button
                variant="contained"
                sx={{ backgroundColor: '#ffffff', color: '#0f2d7b' }}
                onClick={() => navigate('/venda-inteligente', { state: { expandGroup: 'queimaEstoque' } })}
              >
                Criar campanha de queima
              </Button>
            </Box>
          </>
        )}
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        dashboard && (
          <Grid container spacing={3} sx={{ marginBottom: 4 }}>
            <MetricCard
              title="Taxa de recompra"
              value={formatPercent(dashboard.repurchaseRate)}
              caption={`Clientes com mais de 1 compra no período`}
            />
            <MetricCard title="Ticket médio" value={formatCurrency(dashboard.avgTicket)} caption={`${dashboard.salesCount} venda(s) no período`} />
            <MetricCard
              title="Frequência de compra"
              value={dashboard.purchaseFrequency !== null ? dashboard.purchaseFrequency.toFixed(2) : '—'}
              caption="Vendas por cliente que comprou no período"
            />
            <MetricCard
              title="NPS médio"
              value={dashboard.npsAverage !== null ? `${dashboard.npsAverage.toFixed(1)} / 10` : 'Não disponível'}
              caption={`${dashboard.npsResponseCount} resposta(s) no período`}
            />
            <MetricCard
              title="Clientes ativos"
              value={dashboard.activeVsInactive.status === 'ok' ? dashboard.activeVsInactive.active : '—'}
              caption={
                dashboard.activeVsInactive.status === 'pending_configuration'
                  ? 'Critérios RFM não configurados (tela de Segmentação)'
                  : unclassifiedCaption()
              }
            />
            <MetricCard
              title="Clientes inativos"
              value={dashboard.activeVsInactive.status === 'ok' ? dashboard.activeVsInactive.inactive : '—'}
              caption={
                dashboard.activeVsInactive.status === 'pending_configuration'
                  ? 'Critérios RFM não configurados (tela de Segmentação)'
                  : unclassifiedCaption()
              }
            />
          </Grid>
        )
      )}

      <Grid container spacing={3}>
        {QUICK_LINKS.map((link) => (
          <Grid item xs={12} sm={6} md={3} key={link.path}>
            <Card
              sx={{
                padding: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ marginBottom: 1, fontWeight: 700 }}>
                  {link.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
                  {link.description}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => navigate(link.path)}
              >
                Acessar
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
