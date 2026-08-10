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
  Button,
  CircularProgress,
  Alert,
  Typography,
  TextField,
  Chip,
} from '@mui/material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de clientes elegíveis para a régua de reativação (winback) — FSD
// seção 12.5: "para a régua de reativação, consultar tela de clientes
// elegíveis por etapa, com filtro por tempo sem comprar, opção de reenvio
// manual e consulta às interações".
//
// Consome backend/app/controllers/winback.controller.js, que por sua vez
// delega para backend/app/services/time-based-rules.service.js (construído
// por outro agente em paralelo). "Consultar interações" é atendido por um
// link simples para a ficha do cliente (/clientes/:id, já existente) — não
// há necessidade de construir uma visualização de interações nova aqui.

const RESULT_LABELS = {
  sent: { severity: 'success', message: 'Mensagem de reativação reenviada com sucesso.' },
  skipped_no_consent: {
    severity: 'warning',
    message: 'O cliente não possui consentimento válido para receber mensagens — reenvio não realizado.',
  },
  skipped_duplicate: {
    severity: 'info',
    message: 'O cliente já foi notificado neste ciclo — reenvio não realizado para evitar duplicidade.',
  },
  failed: { severity: 'error', message: 'Falha ao reenviar a mensagem de reativação.' },
};

export default function ReguasWinbackElegiveis() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [minDays, setMinDays] = useState('');

  const [resendingId, setResendingId] = useState(null);
  const [resultByCustomer, setResultByCustomer] = useState({}); // { [customerId]: { severity, message } }

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

  const loadEligible = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/winback/eligible?ruleId=${encodeURIComponent(ruleId)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao carregar clientes elegíveis.');
      }

      setCustomers(data.customers || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar clientes elegíveis.');
    } finally {
      setLoading(false);
    }
  }, [ruleId, handleAuthFailure]);

  useEffect(() => {
    loadEligible();
  }, [loadEligible]);

  async function handleResend(customer) {
    try {
      setResendingId(customer.customerId);
      setResultByCustomer((prev) => {
        const next = { ...prev };
        delete next[customer.customerId];
        return next;
      });

      const response = await fetch('/winback/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ruleId, customerId: customer.customerId }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResultByCustomer((prev) => ({
          ...prev,
          [customer.customerId]: { severity: 'error', message: data.error || 'Falha ao reenviar mensagem.' },
        }));
        return;
      }

      const status = data.result?.status;
      const resultInfo = RESULT_LABELS[status] || {
        severity: 'info',
        message: `Resultado: ${status || 'desconhecido'}.`,
      };
      setResultByCustomer((prev) => ({ ...prev, [customer.customerId]: resultInfo }));

      // Se o reenvio foi de fato enviado, atualiza a lista (o cliente pode
      // deixar de ser elegível/passar a constar como "já notificado").
      if (status === 'sent') {
        await loadEligible();
      }
    } catch (err) {
      setResultByCustomer((prev) => ({
        ...prev,
        [customer.customerId]: { severity: 'error', message: err.message || 'Erro ao reenviar mensagem.' },
      }));
    } finally {
      setResendingId(null);
    }
  }

  const filteredCustomers = customers.filter((c) => {
    if (minDays === '') return true;
    const min = Number(minDays);
    if (Number.isNaN(min)) return true;
    return (c.daysSincePurchase ?? 0) >= min;
  });

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Clientes Elegíveis — Reativação
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Régua #{ruleId} · clientes que atendem à condição de dias sem comprar desta etapa.
        </Typography>
        <Button variant="text" sx={{ marginTop: 1, paddingLeft: 0 }} onClick={() => navigate('/reguas')}>
          ← Voltar para Réguas
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtro */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Mínimo de dias sem comprar"
            type="number"
            size="small"
            value={minDays}
            onChange={(e) => setMinDays(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button variant="outlined" onClick={loadEligible}>
            Atualizar lista
          </Button>
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredCustomers.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            {customers.length === 0
              ? 'Nenhum cliente elegível para esta régua no momento.'
              : 'Nenhum cliente corresponde ao filtro de dias sem comprar informado.'}
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Última compra</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Dias sem comprar</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notificado neste ciclo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const result = resultByCustomer[customer.customerId];
                  return (
                    <TableRow key={customer.customerId}>
                      <TableCell>{customer.customerName || '—'}</TableCell>
                      <TableCell>
                        {customer.lastPurchaseAt
                          ? new Date(customer.lastPurchaseAt).toLocaleDateString('pt-BR')
                          : '—'}
                      </TableCell>
                      <TableCell>{customer.daysSincePurchase ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={customer.alreadyNotifiedThisCycle ? 'Sim' : 'Não'}
                          color={customer.alreadyNotifiedThisCycle ? 'default' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={resendingId === customer.customerId}
                              onClick={() => handleResend(customer)}
                            >
                              {resendingId === customer.customerId ? (
                                <CircularProgress size={16} />
                              ) : (
                                'Reenviar'
                              )}
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              component={RouterLink}
                              to={`/clientes/${customer.customerId}`}
                            >
                              Ver ficha do cliente
                            </Button>
                          </Box>
                          {result && (
                            <Alert severity={result.severity} sx={{ padding: '0 8px' }}>
                              {result.message}
                            </Alert>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}
    </Container>
  );
}
