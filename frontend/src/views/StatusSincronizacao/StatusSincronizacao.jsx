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
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Painel de status de sincronização com o Uniplus (FSD seção 12.14, fluxo
// 13.10). Ver backend/app/controllers/sync.controller.js para o contrato da
// API. Visível por Admin e Acesso Limitado (FSD seção 8.5).

const STATUS_LABELS = {
  running: 'Em andamento',
  success: 'Sucesso',
  partial_error: 'Erro parcial',
  failed: 'Falhou',
};

const STATUS_COLORS = {
  running: 'default',
  success: 'success',
  partial_error: 'warning',
  failed: 'error',
};

function formatDateTime(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('pt-BR');
}

function RecordsImportedList({ recordsImported }) {
  const entries = recordsImported && typeof recordsImported === 'object' ? Object.entries(recordsImported) : [];

  if (entries.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: '#666666' }}>
        Nenhum registro importado nesta execução.
      </Typography>
    );
  }

  return (
    <List dense sx={{ paddingY: 0 }}>
      {entries.map(([entity, count]) => (
        <ListItem key={entity} disableGutters sx={{ paddingY: 0.25 }}>
          <ListItemText primary={`${entity}: ${count}`} />
        </ListItem>
      ))}
    </List>
  );
}

function ErrorsList({ errors }) {
  if (!errors) return null;

  const errorItems = Array.isArray(errors) ? errors : [errors];
  if (errorItems.length === 0) return null;

  return (
    <Box sx={{ marginTop: 2 }}>
      <Typography variant="subtitle2" sx={{ color: '#c62828', marginBottom: 1 }}>
        Erros nesta execução
      </Typography>
      <List dense sx={{ paddingY: 0 }}>
        {errorItems.map((err, idx) => (
          <ListItem key={idx} disableGutters sx={{ paddingY: 0.25 }}>
            <ListItemText
              primary={typeof err === 'string' ? err : err.message || JSON.stringify(err)}
              primaryTypographyProps={{ color: '#c62828', variant: 'body2' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default function StatusSincronizacao() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [feedback, setFeedback] = useState(null); // { severity, message }

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/sync/runs?limit=20', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar o status de sincronização');
      }

      const data = await response.json();
      setRuns(data.runs || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar o status de sincronização');
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleTriggerSync = async () => {
    try {
      setTriggering(true);
      setFeedback(null);

      const response = await fetch('/sync/run', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      if (response.status === 409) {
        setFeedback({ severity: 'warning', message: 'Sincronização já em andamento.' });
        return;
      }

      if (response.status === 202) {
        setFeedback({ severity: 'success', message: 'Sincronização iniciada.' });
        // A sincronização roda de forma assíncrona no backend — recarrega a
        // lista após alguns segundos para refletir o novo status/resultado.
        setTimeout(() => {
          loadRuns();
        }, 3000);
        return;
      }

      throw new Error('Falha ao disparar sincronização manual');
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message || 'Erro ao disparar sincronização manual' });
    } finally {
      setTriggering(false);
    }
  };

  const [latestRun, ...previousRuns] = runs;

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Sincronização Uniplus
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Status da integração com o ERP Uniplus: última execução, histórico e erros.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SyncOutlinedIcon />}
          onClick={handleTriggerSync}
          disabled={triggering}
        >
          {triggering ? 'Disparando…' : 'Sincronizar agora'}
        </Button>
      </Box>

      {feedback && (
        <Alert severity={feedback.severity} sx={{ marginBottom: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Card sx={{ padding: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Card>
      ) : runs.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhuma sincronização foi executada ainda.
          </Typography>
        </Card>
      ) : (
        <>
          {/* Última execução em destaque */}
          <Card
            sx={{
              padding: 3,
              marginBottom: 3,
              borderLeft: latestRun.status === 'failed' ? '4px solid #c62828' : '4px solid transparent',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, marginBottom: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#666666', marginBottom: 0.5 }}>
                  Última execução
                </Typography>
                <Typography variant="h6">{formatDateTime(latestRun.startedAt)}</Typography>
              </Box>
              <Chip
                label={STATUS_LABELS[latestRun.status] || latestRun.status}
                color={STATUS_COLORS[latestRun.status] || 'default'}
              />
            </Box>

            <Divider sx={{ marginBottom: 2 }} />

            <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
              Registros importados por entidade
            </Typography>
            <RecordsImportedList recordsImported={latestRun.recordsImported} />

            <ErrorsList errors={latestRun.errors} />
          </Card>

          {/* Histórico de execuções anteriores */}
          <Card>
            {previousRuns.length === 0 ? (
              <Box sx={{ padding: 4, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#666666' }}>
                  Nenhuma execução anterior.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Início</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fim</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Origem</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Erros</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previousRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>{formatDateTime(run.startedAt)}</TableCell>
                        <TableCell>{formatDateTime(run.finishedAt)}</TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[run.status] || run.status}
                            color={STATUS_COLORS[run.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{run.triggeredBy === 'manual' ? 'Manual' : 'Automática'}</TableCell>
                        <TableCell>
                          {run.errors && (Array.isArray(run.errors) ? run.errors.length > 0 : true) ? (
                            <Typography variant="body2" sx={{ color: '#c62828' }}>
                              Sim
                            </Typography>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Card>
        </>
      )}
    </Container>
  );
}
