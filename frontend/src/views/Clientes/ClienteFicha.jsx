import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  Typography,
  Tabs,
  Tab,
  Chip,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Ficha 360º do cliente: dados cadastrais, tags, campos complementares editáveis
// e linha do tempo de interações (vendas + mensagens).
export default function ClienteFicha() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);

  // Campos complementares (formulário editável).
  const [birthDate, setBirthDate] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('');
  const [preferencesText, setPreferencesText] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Adição de tag.
  const [selectedTagToAdd, setSelectedTagToAdd] = useState('');

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

  const loadCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/customers/${id}`, { method: 'GET', credentials: 'include' });

      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        if (response.status === 404) {
          throw new Error('Cliente não encontrado.');
        }
        throw new Error('Falha ao carregar dados do cliente');
      }

      const data = await response.json();
      setCustomer(data.customer);
      setBirthDate(data.customer.birth_date ? data.customer.birth_date.substring(0, 10) : '');
      setPreferredChannel(data.customer.preferred_channel || '');
      setPreferencesText(JSON.stringify(data.customer.preferences || {}, null, 2));
    } catch (err) {
      setError(err.message || 'Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  }, [id, handleUnauthorized]);

  const loadTimeline = useCallback(async () => {
    try {
      const response = await fetch(`/customers/${id}/timeline`, { method: 'GET', credentials: 'include' });
      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        return;
      }
      const data = await response.json();
      setTimeline(data.timeline || []);
    } catch (err) {
      console.error('Erro ao carregar timeline:', err);
    }
  }, [id, handleUnauthorized]);

  const loadAllTags = useCallback(async () => {
    try {
      const response = await fetch('/tags', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.tags || []);
      }
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
    }
  }, []);

  useEffect(() => {
    loadCustomer();
    loadTimeline();
    loadAllTags();
  }, [loadCustomer, loadTimeline, loadAllTags]);

  async function handleAddTag() {
    if (!selectedTagToAdd) return;
    try {
      const response = await fetch(`/customers/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tagId: selectedTagToAdd }),
      });
      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        const data = await response.json();
        throw new Error(data.error || 'Falha ao adicionar tag');
      }
      setSelectedTagToAdd('');
      await loadCustomer();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar tag');
    }
  }

  async function handleRemoveTag(tagId) {
    try {
      const response = await fetch(`/customers/${id}/tags/${tagId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        throw new Error('Falha ao remover tag');
      }
      await loadCustomer();
    } catch (err) {
      setError(err.message || 'Erro ao remover tag');
    }
  }

  async function handleSaveComplementaryFields() {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      let preferences;
      try {
        preferences = preferencesText.trim() ? JSON.parse(preferencesText) : {};
      } catch (parseErr) {
        throw new Error('Preferências deve ser um JSON válido (ex: {"cor_favorita": "azul"}).');
      }

      const response = await fetch(`/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          birthDate: birthDate || null,
          preferredChannel: preferredChannel || null,
          preferences,
        }),
      });

      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        const data = await response.json();
        throw new Error(data.error || 'Falha ao salvar campos complementares');
      }

      setSaveSuccess(true);
      await loadCustomer();
    } catch (err) {
      setSaveError(err.message || 'Erro ao salvar campos complementares');
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !customer) {
    return (
      <Container maxWidth="lg" sx={{ paddingY: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!customer) {
    return null;
  }

  const availableTagsToAdd = allTags.filter(
    (tag) => !customer.tags.some((custTag) => custTag.id === tag.id)
  );

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          {customer.name}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          {customer.phone_e164 || 'Sem telefone'} · {customer.email || 'Sem e-mail'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tags */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 700 }}>
          Tags
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginBottom: 2 }}>
          {customer.tags.length === 0 && (
            <Typography variant="body2" sx={{ color: '#999999' }}>
              Nenhuma tag associada.
            </Typography>
          )}
          {customer.tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} onDelete={() => handleRemoveTag(tag.id)} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="add-tag-label">Adicionar tag</InputLabel>
            <Select
              labelId="add-tag-label"
              label="Adicionar tag"
              value={selectedTagToAdd}
              onChange={(e) => setSelectedTagToAdd(e.target.value)}
            >
              {availableTagsToAdd.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleAddTag} disabled={!selectedTagToAdd}>
            Adicionar
          </Button>
        </Box>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} sx={{ borderBottom: '1px solid #eeeeee' }}>
          <Tab label="Visão Geral" />
          <Tab label="Histórico" />
          <Tab label="Campos Complementares" />
        </Tabs>

        {/* Aba: Visão Geral */}
        {tabIndex === 0 && (
          <Box sx={{ padding: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Documento</Typography>
                <Typography variant="body1">{customer.document || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>WhatsApp validado</Typography>
                <Typography variant="body1">{customer.whatsapp_validated ? 'Sim' : 'Não'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Segmento RFM</Typography>
                <Typography variant="body1">{customer.rfm_segment || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Ticket Médio</Typography>
                <Typography variant="body1">{formatCurrency(customer.average_ticket)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Frequência de Compra</Typography>
                <Typography variant="body1">
                  {customer.purchase_frequency_days ? `${customer.purchase_frequency_days} dias` : '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Primeira Compra</Typography>
                <Typography variant="body1">{formatDate(customer.first_purchase_at)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Última Compra</Typography>
                <Typography variant="body1">{formatDate(customer.last_purchase_at)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Canal Preferido</Typography>
                <Typography variant="body1">{customer.preferred_channel || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" sx={{ color: '#666666' }}>Aniversário</Typography>
                <Typography variant="body1">{formatDate(customer.birth_date)}</Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Aba: Histórico (timeline) */}
        {tabIndex === 1 && (
          <Box sx={{ padding: 3 }}>
            {timeline.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#999999' }}>
                Nenhuma interação registrada para este cliente ainda.
              </Typography>
            ) : (
              timeline.map((event, index) => (
                <Box key={`${event.type}-${event.data.id}-${index}`}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, paddingY: 1.5 }}>
                    <Chip
                      label={event.type === 'sale' ? 'Venda' : 'Mensagem'}
                      size="small"
                      sx={{
                        backgroundColor: event.type === 'sale' ? '#2d7a5c' : '#0f2d7b',
                        color: '#ffffff',
                        fontWeight: 600,
                        minWidth: 90,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      {event.type === 'sale' ? (
                        <Typography variant="body2">
                          Venda de {formatCurrency(event.data.total_amount)}
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          {event.data.direction === 'outbound' ? 'Enviada' : 'Recebida'} ·{' '}
                          {event.data.body ? event.data.body.substring(0, 140) : '(sem conteúdo)'}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: '#999999' }}>
                        {formatDateTime(event.date)}
                      </Typography>
                    </Box>
                  </Box>
                  {index < timeline.length - 1 && <Divider />}
                </Box>
              ))
            )}
          </Box>
        )}

        {/* Aba: Campos Complementares */}
        {tabIndex === 2 && (
          <Box sx={{ padding: 3 }}>
            {saveError && (
              <Alert severity="error" sx={{ marginBottom: 2 }}>
                {saveError}
              </Alert>
            )}
            {saveSuccess && (
              <Alert severity="success" sx={{ marginBottom: 2 }}>
                Campos complementares atualizados com sucesso.
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Aniversário"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Canal Preferido"
                  value={preferredChannel}
                  onChange={(e) => setPreferredChannel(e.target.value)}
                  placeholder="ex: whatsapp, email, telefone"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Preferências (JSON)"
                  value={preferencesText}
                  onChange={(e) => setPreferencesText(e.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                  helperText='Formato livre, ex: {"cor_favorita": "azul", "tamanho": "M"}'
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" onClick={handleSaveComplementaryFields} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Campos Complementares'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Card>
    </Container>
  );
}
