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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Relatório de vendas sem cliente identificado (customer_id IS NULL).
// Ajuda a acompanhar vendas que não foram vinculadas a nenhum cliente na sincronização.
export default function RelatorioVendasSemCliente() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/customers/reports/sales-without-customer?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar relatório');
      }

      const data = await response.json();
      setSales(data.sales || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, logout, navigate]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR');
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
          Vendas Sem Cliente
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Vendas sincronizadas do Uniplus que não puderam ser vinculadas a um cliente.
        </Typography>
      </Box>

      {/* Filtro de período */}
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
          <Button variant="contained" onClick={loadSales}>
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
        ) : sales.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhuma venda sem cliente encontrada no período selecionado.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Data da Venda</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Valor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Produtos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDateTime(sale.sale_date)}</TableCell>
                    <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                    <TableCell>
                      {sale.items && sale.items.length > 0
                        ? sale.items.map((item) => item.productName || 'Produto').join(', ')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    </Container>
  );
}
