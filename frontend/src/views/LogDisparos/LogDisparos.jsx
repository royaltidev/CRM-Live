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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de log de disparos (mensagens outbound/inbound). Ver
// backend/app/controllers/messages.routes.md para o contrato da API.
// Visível por Admin e Acesso Limitado (FSD seção 8.5).

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'queued', label: 'Na fila' },
  { value: 'sent', label: 'Enviada' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'read', label: 'Lida' },
  { value: 'failed', label: 'Falhou' },
];

const TRIGGER_SOURCE_LABELS = {
  automation: 'Automação',
  campaign: 'Campanha',
  manual: 'Manual',
  customer: 'Cliente',
};

const STATUS_COLORS = {
  queued: 'default',
  sent: 'info',
  delivered: 'primary',
  read: 'success',
  failed: 'error',
};

function truncate(text, maxLength = 80) {
  if (!text) return '—';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export default function LogDisparos() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pageSize = 50;

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const response = await fetch(`/messages?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar log de disparos');
      }

      const data = await response.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Erro ao carregar log de disparos');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, page, logout, navigate]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleFilter = () => {
    setPage(1);
    loadMessages();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Log de Disparos
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Histórico de mensagens enviadas e recebidas via WhatsApp.
        </Typography>
      </Box>

      {/* Filtros */}
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
        ) : messages.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhuma mensagem encontrada com os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mensagem</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Origem</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Enviada em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criada em</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>{message.customer_name || '—'}</TableCell>
                    <TableCell>{truncate(message.body)}</TableCell>
                    <TableCell>{TRIGGER_SOURCE_LABELS[message.trigger_source] || message.trigger_source}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_OPTIONS.find((o) => o.value === message.status)?.label || message.status}
                        color={STATUS_COLORS[message.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(message.sent_at)}</TableCell>
                    <TableCell>{formatDateTime(message.created_at)}</TableCell>
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
