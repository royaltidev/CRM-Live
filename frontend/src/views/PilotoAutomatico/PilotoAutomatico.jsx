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
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de monitoramento do Piloto Automático da Loja — log de
// autonomous_offers (disparos de cross-sell em tempo real após uma venda
// confirmada, ver docs artifact "Piloto Automático da Loja"). Mesmo padrão
// de LogDisparos.jsx. Visível por Admin e Acesso Limitado (mesmo critério
// de Log de Disparos/Sincronização Uniplus — ver
// backend/app/controllers/autonomous-offers.routes.md).

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'queued', label: 'Na fila' },
  { value: 'sent', label: 'Enviada' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'read', label: 'Lida' },
  { value: 'failed', label: 'Falhou' },
  { value: 'skipped', label: 'Não enviada' },
];

const STATUS_COLORS = {
  queued: 'default',
  sent: 'info',
  delivered: 'primary',
  read: 'success',
  failed: 'error',
  skipped: 'warning',
};

const CASCADE_STEP_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'etapa_1', label: 'Etapa 1 — complemento imediato' },
  { value: 'etapa_2', label: 'Etapa 2 — reposição de categoria' },
  { value: 'aviso_vendedor', label: 'Aviso ao vendedor' },
];

const CASCADE_STEP_LABELS = {
  etapa_1: 'Complemento imediato',
  etapa_2: 'Reposição de categoria',
  aviso_vendedor: 'Aviso ao vendedor',
};

const RECIPIENT_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'vendedor', label: 'Vendedor' },
];

function truncate(text, maxLength = 60) {
  if (!text) return '—';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export default function PilotoAutomatico() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [cascadeStep, setCascadeStep] = useState('');
  const [recipientType, setRecipientType] = useState('');
  const [offers, setOffers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pageSize = 50;

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status) params.set('status', status);
      if (cascadeStep) params.set('cascadeStep', cascadeStep);
      if (recipientType) params.set('recipientType', recipientType);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const response = await fetch(`/piloto-automatico/offers?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar o log do Piloto Automático.');
      }

      const data = await response.json();
      setOffers(data.offers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Erro ao carregar o log do Piloto Automático.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, cascadeStep, recipientType, page, logout, navigate]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleFilter = () => {
    setPage(1);
    loadOffers();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Piloto Automático da Loja
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Disparos de cross-sell feitos automaticamente em tempo real, logo após uma venda
          confirmada — para o cliente (complemento imediato e reposição de categoria) e para o
          vendedor (lista de sugestões). Parâmetros em Configurações.
        </Typography>
      </Box>

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Etapa"
            value={cascadeStep}
            onChange={(e) => setCascadeStep(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          >
            {CASCADE_STEP_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Destinatário"
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            {RECIPIENT_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
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
        ) : offers.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhum disparo encontrado com os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Destinatário</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Etapa</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Produto sugerido</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Motivo da sugestão</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Detalhe do status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Enviada em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criada em</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      {offer.recipient_type === 'vendedor'
                        ? `${offer.seller_name || '—'} (vendedor)`
                        : offer.customer_name || '—'}
                    </TableCell>
                    <TableCell>{CASCADE_STEP_LABELS[offer.cascade_step] || offer.cascade_step}</TableCell>
                    <TableCell>{offer.product_name || '—'}</TableCell>
                    <TableCell>
                      <Tooltip title={offer.rule_reason || ''}>
                        <span>{truncate(offer.rule_reason)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_OPTIONS.find((o) => o.value === offer.status)?.label || offer.status}
                        color={STATUS_COLORS[offer.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={offer.status_reason || ''}>
                        <span>{truncate(offer.status_reason)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatDateTime(offer.sent_at)}</TableCell>
                    <TableCell>{formatDateTime(offer.created_at)}</TableCell>
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
