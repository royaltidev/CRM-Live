import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Divider,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Caixa de Entrada (FSD 12.10, fluxo 13.7) — exclusiva do
// Administrador. Lista de conversas à esquerda (priorizando as aguardando
// atendimento humano), thread + resposta manual à direita.

const STATUS_LABELS = {
  automated: { label: 'Automática', color: 'default' },
  awaiting_human: { label: 'Aguardando atendimento', color: 'warning' },
  answered: { label: 'Respondida', color: 'success' },
  closed: { label: 'Encerrada', color: 'default' },
};

const REASON_LABELS = {
  purchase_intent: 'Intenção de compra',
  doubt: 'Dúvida',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'awaiting_human', label: 'Aguardando atendimento' },
  { value: 'answered', label: 'Respondida' },
  { value: 'closed', label: 'Encerrada' },
];

function formatDateTime(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CaixaEntrada() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');
  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

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

  const loadConversations = useCallback(async () => {
    try {
      setListLoading(true);
      setListError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('pageSize', '100');

      const response = await fetch(`/inbox/conversations?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (response.status === 403) throw new Error('Esta tela é exclusiva do Administrador.');
      if (!response.ok) throw new Error('Falha ao carregar conversas.');

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setListError(err.message || 'Erro ao carregar conversas.');
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, handleAuthFailure]);

  const loadConversationDetail = useCallback(
    async (id) => {
      try {
        setDetailLoading(true);
        setDetailError(null);

        const response = await fetch(`/inbox/conversations/${id}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (await handleAuthFailure(response)) return;
        if (!response.ok) throw new Error('Falha ao carregar conversa.');

        const data = await response.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);
      } catch (err) {
        setDetailError(err.message || 'Erro ao carregar conversa.');
      } finally {
        setDetailLoading(false);
      }
    },
    [handleAuthFailure]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadConversationDetail(selectedId);
    }
  }, [selectedId, loadConversationDetail]);

  function selectConversation(id) {
    setSelectedId(id);
    setReplyBody('');
  }

  async function handleSendReply() {
    if (!replyBody.trim() || !selectedId) return;

    try {
      setSending(true);

      const response = await fetch(`/inbox/conversations/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: replyBody.trim() }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível enviar a resposta.');
      }

      setReplyBody('');
      setSnackbar({ severity: 'success', message: 'Resposta enviada com sucesso.' });
      await loadConversationDetail(selectedId);
      await loadConversations();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao enviar resposta.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Caixa de Entrada
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Conversas com clientes que exigem atenção humana.
          </Typography>
        </Box>
        <IconButton onClick={loadConversations} title="Atualizar lista">
          <RefreshOutlinedIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 220px)', minHeight: 480 }}>
        {/* Lista de conversas */}
        <Card sx={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ padding: 2 }}>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              fullWidth
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Divider />

          <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
            {listError && (
              <Alert severity="error" sx={{ margin: 2 }}>
                {listError}
              </Alert>
            )}

            {listLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : conversations.length === 0 ? (
              <Box sx={{ padding: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666666' }}>
                  Nenhuma conversa encontrada.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {conversations.map((conv) => {
                  const statusInfo = STATUS_LABELS[conv.status] || { label: conv.status, color: 'default' };
                  return (
                    <ListItemButton
                      key={conv.id}
                      selected={conv.id === selectedId}
                      onClick={() => selectConversation(conv.id)}
                      sx={{ borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {conv.customer_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#999999', flexShrink: 0 }}>
                              {formatDateTime(conv.last_message_at || conv.created_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" sx={{ color: '#666666' }} noWrap>
                              {conv.last_message_body || '(sem mensagens)'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, marginTop: 0.5, flexWrap: 'wrap' }}>
                              <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                              {conv.forwarded_seller_name && (
                                <Chip
                                  label={`${REASON_LABELS[conv.forwarded_reason] || 'Encaminhado'}: ${conv.forwarded_seller_name}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </Card>

        {/* Detalhe da conversa */}
        <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedId ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body1" sx={{ color: '#999999' }}>
                Selecione uma conversa para ver os detalhes.
              </Typography>
            </Box>
          ) : detailLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : detailError ? (
            <Alert severity="error" sx={{ margin: 2 }}>
              {detailError}
            </Alert>
          ) : (
            <>
              <Box sx={{ padding: 2, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="h6">{conversation?.customer_name}</Typography>
                <Typography variant="body2" sx={{ color: '#666666' }}>
                  {conversation?.customer_phone}
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {messages.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#999999', textAlign: 'center', marginTop: 4 }}>
                    Nenhuma mensagem nesta conversa ainda.
                  </Typography>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <Box
                        key={msg.id}
                        sx={{
                          alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          backgroundColor: isOutbound ? '#0f2d7b' : '#f0f0f0',
                          color: isOutbound ? '#ffffff' : '#1a1a1a',
                          borderRadius: 2,
                          padding: 1.5,
                        }}
                      >
                        <Typography variant="body2">{msg.body}</Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', marginTop: 0.5, opacity: 0.7, textAlign: 'right' }}
                        >
                          {formatDateTime(msg.created_at)}
                          {msg.status === 'failed' && ' · falhou'}
                        </Typography>
                      </Box>
                    );
                  })
                )}
              </Box>

              <Divider />

              <Box sx={{ padding: 2, display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={4}
                  placeholder="Digite uma resposta..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  endIcon={<SendOutlinedIcon />}
                  onClick={handleSendReply}
                  disabled={sending || !replyBody.trim()}
                >
                  Enviar
                </Button>
              </Box>
            </>
          )}
        </Card>
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar && (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Container>
  );
}
