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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'opted_in', label: 'Consentiu' },
  { value: 'opted_out', label: 'Saiu' },
  { value: 'never_contacted', label: 'Nunca contatado' },
];

const STATUS_META = {
  opted_in: { label: 'Consentiu', color: 'success' },
  opted_out: { label: 'Saiu', color: 'error' },
  never_contacted: { label: 'Nunca contatado', color: 'default' },
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

// Tela de relatório de Consentimento e LGPD (FSD seção 6.6, tela 12.15).
export default function Consentimento() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleUnauthorized = useCallback(
    (response) => {
      if (response.status === 401) {
        logout();
        navigate('/login');
        return true;
      }
      return false;
    },
    [logout, navigate]
  );

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/consent/report?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        throw new Error('Falha ao carregar relatório de consentimento');
      }

      const data = await response.json();
      setReport(data.report || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar relatório de consentimento');
    } finally {
      setLoading(false);
    }
  }, [status, startDate, endDate, handleUnauthorized]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Consentimento e LGPD
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Relatório de status de consentimento dos clientes para envio de mensagens.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Data inicial"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Data final"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Button variant="contained" onClick={loadReport}>
            Filtrar
          </Button>
        </Box>
      </Card>

      {/* Tabela */}
      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : report.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhum cliente encontrado para os filtros selecionados.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Telefone</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Última alteração</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.map((row) => {
                  const meta = STATUS_META[row.status] || STATUS_META.never_contacted;
                  const lastChange = row.status === 'opted_out' ? row.opted_out_at : row.opted_in_at;

                  return (
                    <TableRow key={row.customer_id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.phone_e164 || '-'}</TableCell>
                      <TableCell>
                        <Chip label={meta.label} color={meta.color} size="small" />
                      </TableCell>
                      <TableCell>{formatDate(lastChange)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    </Container>
  );
}
