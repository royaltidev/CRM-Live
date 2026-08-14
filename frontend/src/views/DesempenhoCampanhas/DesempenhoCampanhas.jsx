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

// Relatório consolidado de desempenho de campanhas (FSD 22.2). Leitura
// disponível a Admin e Acesso Limitado (mesma permissão do resto de
// Campanhas, FSD linha 332 da matriz) — reaproveita o mesmo cálculo por
// campanha já usado no "Ver resultado" da tela de Campanhas (Fase 8), aqui
// consolidado para TODAS as campanhas já enviadas. Ver
// backend/app/services/campaigns.service.js#listCampaignPerformance.
//
// PDF fica para a Fase 11 — Parte 3 (fora do escopo desta tela).

const STATUS_LABELS = {
  draft: { label: 'Rascunho', color: 'default' },
  scheduled: { label: 'Agendada', color: 'info' },
  sending: { label: 'Enviando', color: 'warning' },
  sent: { label: 'Enviada', color: 'success' },
  canceled: { label: 'Cancelada', color: 'default' },
};

function formatDateTime(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('pt-BR');
}

function formatCurrency(value) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

export default function DesempenhoCampanhas() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [campaignId, setCampaignId] = useState('');

  const [campaignOptions, setCampaignOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (campaignId) params.set('campaignId', campaignId);
    return params;
  }, [startDate, endDate, campaignId]);

  const loadCampaignOptions = useCallback(async () => {
    try {
      const response = await fetch('/campaigns', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      setCampaignOptions(data.campaigns || []);
    } catch {
      // Select de campanha específica não é essencial — o relatório funciona sem ele.
    }
  }, []);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/campaigns/performance-report?${buildFilterParams().toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar o relatório de desempenho de campanhas');
      }

      const data = await response.json();
      setRows(data.campaigns || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar o relatório de desempenho de campanhas');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, logout, navigate]);

  useEffect(() => {
    loadCampaignOptions();
  }, [loadCampaignOptions]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleFilter = () => {
    loadReport();
  };

  // Usa fetch + blob (não window.open/<a href>) — uma navegação de página
  // inteira manda "Accept: text/html", e o proxy do Vite trata isso como
  // navegação de tela React para qualquer prefixo de API (bypassHtmlNavigation
  // em vite.config.js), servindo o index.html em vez do CSV. Mesmo padrão de
  // frontend/src/views/NPS/NPS.jsx#handleExport.
  const handleExport = async () => {
    try {
      const response = await fetch(`/campaigns/performance-report/export?${buildFilterParams().toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao exportar o relatório de desempenho de campanhas');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'desempenho-campanhas.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Erro ao exportar o relatório de desempenho de campanhas');
    }
  };

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Desempenho de Campanhas
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Resultado consolidado de todas as campanhas já enviadas (FSD 22.2).
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={handleExport}>
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
            helperText="Data de envio da campanha"
          />
          <TextField
            label="Período - até"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            select
            label="Campanha"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas as campanhas</MenuItem>
            {campaignOptions.map((campaign) => (
              <MenuItem key={campaign.id} value={campaign.id}>
                {campaign.name}
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
        ) : rows.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhuma campanha enviada encontrada com os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Campanha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Enviada em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Enviadas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Entregues</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Respondidas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Vendas atribuídas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Receita gerada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((campaign) => {
                  const statusInfo = STATUS_LABELS[campaign.status] || { label: campaign.status, color: 'default' };
                  const attribution = campaign.results?.attribution;
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>{campaign.name}</TableCell>
                      <TableCell>
                        <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                      </TableCell>
                      <TableCell>{formatDateTime(campaign.sentAt)}</TableCell>
                      <TableCell align="right">{campaign.results?.byStatus?.sent ?? 0}</TableCell>
                      <TableCell align="right">{campaign.results?.byStatus?.delivered ?? 0}</TableCell>
                      <TableCell align="right">{campaign.results?.byStatus?.responded ?? 0}</TableCell>
                      <TableCell align="right">
                        {attribution ? attribution.attributedSales : (
                          <Typography variant="caption" sx={{ color: '#999999' }}>
                            Não disponível
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {attribution ? formatCurrency(attribution.attributedRevenue) : (
                          <Typography variant="caption" sx={{ color: '#999999' }}>
                            Não disponível
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {!loading && rows.some((campaign) => !campaign.results?.attribution) && (
        <Alert severity="info" sx={{ marginTop: 3 }}>
          "Vendas atribuídas" e "Receita gerada" ficam "Não disponível" enquanto o período de atribuição de venda a
          campanha (parâmetro `campaign_attribution_days`) não for configurado pelo Administrador.
        </Alert>
      )}
    </Container>
  );
}
