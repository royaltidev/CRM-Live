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
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  MenuItem,
  Chip,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de gestão de satisfação / NPS (FSD 6.8, 12.12, 22.6).
// Leitura disponível a Admin e Acesso Limitado; ações sobre a nota
// (mensagem padronizada, desconto/voucher, histórico de tratamento) ficam
// para a Parte 3 do backend/services/nps.service.js.

const BAND_OPTIONS = [
  { value: '', label: 'Todas as faixas' },
  { value: 'detractor', label: 'Detrator (0–6)' },
  { value: 'neutral', label: 'Neutro (7–8)' },
  { value: 'promoter', label: 'Promotor (9–10)' },
];

const STATUS_LABELS = {
  pending: 'Aguardando resposta',
  answered: 'Respondida',
  low_score_open: 'Nota baixa — não tratada',
  low_score_treated: 'Nota baixa — tratada',
};

const STATUS_COLORS = {
  pending: 'default',
  answered: 'info',
  low_score_open: 'error',
  low_score_treated: 'success',
};

function scoreColor(score) {
  if (score === null || score === undefined) return 'default';
  if (score <= 6) return 'error';
  if (score <= 8) return 'warning';
  return 'success';
}

export default function NPS() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [scoreBand, setScoreBand] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [productCategory, setProductCategory] = useState('');

  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [responses, setResponses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pageSize = 50;

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (scoreBand) params.set('scoreBand', scoreBand);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (sellerId) params.set('sellerId', sellerId);
    if (productCategory) params.set('productCategory', productCategory);
    return params;
  }, [scoreBand, dateFrom, dateTo, sellerId, productCategory]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [sellersRes, categoriesRes] = await Promise.all([
        fetch('/sellers', { credentials: 'include' }),
        fetch('/products/categories', { credentials: 'include' }),
      ]);

      if (sellersRes.ok) {
        const data = await sellersRes.json();
        setSellers(data.sellers || []);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
    } catch {
      // Filtros de apoio não são essenciais — a listagem funciona sem eles.
    }
  }, []);

  const loadResponses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = buildFilterParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const response = await fetch(`/nps/responses?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar as notas de satisfação');
      }

      const data = await response.json();
      setResponses(data.responses || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Erro ao carregar as notas de satisfação');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, page, logout, navigate]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  const handleFilter = () => {
    setPage(1);
    loadResponses();
  };

  // Usa fetch + blob (não window.open/<a href>) porque uma navegação de
  // página inteira manda "Accept: text/html", e o proxy do Vite trata
  // qualquer requisição assim para um prefixo de API como navegação de tela
  // React (ver bypassHtmlNavigation em vite.config.js) — serviria o
  // index.html do app em vez do CSV.
  const handleExport = async () => {
    try {
      const params = buildFilterParams();
      const response = await fetch(`/nps/responses/export?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao exportar as notas de satisfação');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nps.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Erro ao exportar as notas de satisfação');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Gestão de NPS
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Notas de satisfação respondidas pelos clientes, agrupadas por faixa.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={handleExport}>
          Exportar CSV
        </Button>
      </Box>

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Faixa"
            value={scoreBand}
            onChange={(e) => setScoreBand(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            {BAND_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Período - de"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Período - até"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            select
            label="Vendedor"
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos os vendedores</MenuItem>
            {sellers.map((seller) => (
              <MenuItem key={seller.id} value={seller.id}>
                {seller.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Categoria de produto"
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas as categorias</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={handleFilter}>
            Filtrar
          </Button>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : responses.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhuma nota de satisfação encontrada com os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nota</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Pesquisa enviada em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Respondida em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Produto/Categoria</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Vendedor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {responses.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={row.status === 'low_score_open' ? { backgroundColor: 'rgba(211, 47, 47, 0.06)' } : undefined}
                  >
                    <TableCell>{row.customer_name || '—'}</TableCell>
                    <TableCell>
                      {row.score === null || row.score === undefined ? (
                        '—'
                      ) : (
                        <Chip label={row.score} color={scoreColor(row.score)} size="small" />
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(row.survey_sent_at)}</TableCell>
                    <TableCell>{formatDateTime(row.responded_at)}</TableCell>
                    <TableCell>{row.product_categories || '—'}</TableCell>
                    <TableCell>{row.seller_name || '—'}</TableCell>
                    <TableCell>
                      <Chip label={STATUS_LABELS[row.status] || row.status} color={STATUS_COLORS[row.status] || 'default'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {!loading && total > pageSize && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3, alignItems: 'center' }}>
          <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <Typography variant="body2">
            Página {page} de {Math.ceil(total / pageSize)}
          </Typography>
          <Button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </Box>
      )}
    </Container>
  );
}
