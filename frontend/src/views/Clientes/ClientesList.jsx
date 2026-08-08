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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  Typography,
  TablePagination,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Lista de clientes: busca por nome/telefone, filtro por tag e segmento RFM, paginação.
// A base de clientes só é populada via sincronização com o Uniplus (Fase 4), então uma
// lista vazia é um estado esperado, não um erro.
export default function ClientesList() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [tagId, setTagId] = useState('');
  const [rfmSegment, setRfmSegment] = useState('');
  const [tags, setTags] = useState([]);

  const [page, setPage] = useState(0); // TablePagination é 0-indexed
  const [pageSize, setPageSize] = useState(20);

  // Carrega tags disponíveis para o filtro.
  useEffect(() => {
    async function loadTags() {
      try {
        const response = await fetch('/tags', { method: 'GET', credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags || []);
        }
      } catch (err) {
        // Falha ao carregar tags não deve travar a tela — apenas o filtro fica vazio.
        console.error('Erro ao carregar tags:', err);
      }
    }
    loadTags();
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tagId) params.set('tagId', tagId);
      if (rfmSegment) params.set('rfmSegment', rfmSegment);
      params.set('page', String(page + 1));
      params.set('pageSize', String(pageSize));

      const response = await fetch(`/customers?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar clientes');
      }

      const data = await response.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [search, tagId, rfmSegment, page, pageSize, logout, navigate]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Clientes
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Base de clientes sincronizada do Uniplus. Clique em um cliente para ver a ficha 360º.
        </Typography>
      </Box>

      {/* Filtros */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Buscar por nome ou telefone"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            sx={{ minWidth: 260 }}
            size="small"
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="tag-filter-label">Tag</InputLabel>
            <Select
              labelId="tag-filter-label"
              label="Tag"
              value={tagId}
              onChange={(e) => {
                setPage(0);
                setTagId(e.target.value);
              }}
            >
              <MenuItem value="">Todas</MenuItem>
              {tags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="rfm-filter-label">Segmento RFM</InputLabel>
            <Select
              labelId="rfm-filter-label"
              label="Segmento RFM"
              value={rfmSegment}
              onChange={(e) => {
                setPage(0);
                setRfmSegment(e.target.value);
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="champions">Champions</MenuItem>
              <MenuItem value="loyal">Fiéis</MenuItem>
              <MenuItem value="at_risk">Em risco</MenuItem>
              <MenuItem value="lost">Perdidos</MenuItem>
              <MenuItem value="new">Novos</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Erro */}
      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabela */}
      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : customers.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhum cliente sincronizado ainda.
            </Typography>
            <Typography variant="body2" sx={{ color: '#999999', marginTop: 1 }}>
              Assim que a sincronização com o Uniplus for concluída, os clientes aparecerão aqui.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Telefone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Segmento RFM</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ticket Médio</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Última Compra</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/clientes/${customer.id}`)}
                    >
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.phone_e164 || '—'}</TableCell>
                      <TableCell>
                        {customer.rfm_segment ? (
                          <Chip label={customer.rfm_segment} size="small" />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(customer.average_ticket)}</TableCell>
                      <TableCell>{formatDate(customer.last_purchase_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Por página"
            />
          </>
        )}
      </Card>
    </Container>
  );
}
