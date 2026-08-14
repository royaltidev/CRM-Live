import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Grid,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela dedicada de "Venda Inteligente" (Parte 3 — escopo novo, fora das 11
// fases do FSD original, pedido pelo responsável do projeto). Reúne as
// duas partes anteriores: produtos comprados juntos (Parte 1 — gestão da
// oportunidade acontece aqui, embora a origem dos dados continue sendo
// `complementary_products`/Cross-sell) e jornadas de compra + itens sem
// venda (Parte 2 — só leitura, backend-only até aqui). Disponível a Admin
// e Acesso Limitado, mesma permissão do resto da iniciativa.

export default function VendaInteligente() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [journeys, setJourneys] = useState([]);
  const [journeysLoading, setJourneysLoading] = useState(true);
  const [slowMovers, setSlowMovers] = useState([]);
  const [slowMoversLoading, setSlowMoversLoading] = useState(true);
  const [slowMoversStartDate, setSlowMoversStartDate] = useState('');
  const [slowMoversEndDate, setSlowMoversEndDate] = useState('');

  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState(null);

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

  const loadSuggestions = useCallback(async () => {
    try {
      setSuggestionsLoading(true);
      const response = await fetch('/complementary-products?active=false&source=suggested', {
        credentials: 'include',
      });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar sugestões de produtos comprados juntos.');
      const data = await response.json();
      setSuggestions(data.complementaryProducts || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar sugestões.');
    } finally {
      setSuggestionsLoading(false);
    }
  }, [handleAuthFailure]);

  const loadJourneys = useCallback(async () => {
    try {
      setJourneysLoading(true);
      const response = await fetch('/sales-insights/journeys', { credentials: 'include' });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar jornadas de compra.');
      const data = await response.json();
      setJourneys(data.journeys || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar jornadas de compra.');
    } finally {
      setJourneysLoading(false);
    }
  }, [handleAuthFailure]);

  const loadSlowMovers = useCallback(async () => {
    try {
      setSlowMoversLoading(true);
      const params = new URLSearchParams();
      if (slowMoversStartDate) params.set('startDate', slowMoversStartDate);
      if (slowMoversEndDate) params.set('endDate', slowMoversEndDate);
      const response = await fetch(`/sales-insights/slow-movers?${params.toString()}`, { credentials: 'include' });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar itens sem venda.');
      const data = await response.json();
      setSlowMovers(data.slowMovers || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar itens sem venda.');
    } finally {
      setSlowMoversLoading(false);
    }
  }, [handleAuthFailure, slowMoversStartDate, slowMoversEndDate]);

  useEffect(() => {
    loadSuggestions();
    loadJourneys();
  }, [loadSuggestions, loadJourneys]);

  useEffect(() => {
    loadSlowMovers();
  }, [loadSlowMovers]);

  async function handleDetectPatterns() {
    try {
      setDetecting(true);
      const response = await fetch('/complementary-products/detect-patterns', {
        method: 'POST',
        credentials: 'include',
      });
      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível detectar padrões.');

      setDetectResult(data);
      if (data.suggestionsCreated > 0) {
        await loadSuggestions();
      }
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao detectar padrões.' });
    } finally {
      setDetecting(false);
    }
  }

  async function handleActivate(item) {
    try {
      const response = await fetch(`/complementary-products/${item.id}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Não foi possível ativar a sugestão.');
      setSnackbar({ severity: 'success', message: 'Oferta de cross-sell ativada.' });
      await loadSuggestions();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao ativar.' });
    }
  }

  async function handleDismiss(item) {
    try {
      const response = await fetch(`/complementary-products/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Não foi possível descartar a sugestão.');
      setSnackbar({ severity: 'success', message: 'Sugestão descartada.' });
      await loadSuggestions();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao descartar.' });
    }
  }

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Venda Inteligente
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Oportunidades comerciais identificadas a partir do histórico real de vendas.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<AutoAwesomeOutlinedIcon />} onClick={handleDetectPatterns} disabled={detecting}>
          {detecting ? 'Detectando...' : 'Detectar padrões automaticamente'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Produtos comprados juntos — gestão da oportunidade */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" sx={{ marginBottom: 1 }}>
          Produtos comprados juntos — sugestões pendentes
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
          Detectadas automaticamente a partir de vendas reais. Ativar transforma a sugestão numa oferta
          de cross-sell de verdade (visível também na tela de Cross-sell); descartar remove a sugestão.
        </Typography>

        {suggestionsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : suggestions.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Nenhuma sugestão pendente. Clique em "Detectar padrões automaticamente" para procurar novas.
          </Typography>
        ) : (
          suggestions.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingY: 1.5,
                borderBottom: '1px solid #eee',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="body2">
                <strong>{item.productName}</strong> → {item.complementaryProductName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="contained" onClick={() => handleActivate(item)}>
                  Ativar
                </Button>
                <Button size="small" variant="text" color="error" onClick={() => handleDismiss(item)}>
                  Descartar
                </Button>
              </Box>
            </Box>
          ))
        )}
      </Card>

      <Grid container spacing={3}>
        {/* Jornadas de compra */}
        <Grid item xs={12} md={6}>
          <Card sx={{ padding: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ marginBottom: 1 }}>
              Jornadas de compra
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
              Por categoria: o que mais aparece junto no carrinho de quem compra algo dessa categoria.
            </Typography>

            {journeysLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : journeys.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#666666' }}>
                Nenhum padrão encontrado ainda — precisa de vendas com múltiplos produtos no histórico.
              </Typography>
            ) : (
              journeys.map((group) => (
                <Box key={group.category} sx={{ marginBottom: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, marginBottom: 0.5 }}>
                    {group.category}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.items.map((item) => (
                      <Chip key={item.productId} label={`${item.productName} (${item.coOccurrenceCount})`} size="small" />
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Card>
        </Grid>

        {/* Itens sem venda */}
        <Grid item xs={12} md={6}>
          <Card sx={{ padding: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ marginBottom: 1 }}>
              Itens sem venda
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
              Por categoria, produtos com menos saída (menos vendido primeiro). Sem período, considera
              todo o histórico.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, marginBottom: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Período - de"
                type="date"
                size="small"
                value={slowMoversStartDate}
                onChange={(e) => setSlowMoversStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Período - até"
                type="date"
                size="small"
                value={slowMoversEndDate}
                onChange={(e) => setSlowMoversEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="outlined" size="small" onClick={loadSlowMovers}>
                Filtrar
              </Button>
            </Box>

            {slowMoversLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : slowMovers.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#666666' }}>
                Nenhum produto ativo cadastrado.
              </Typography>
            ) : (
              slowMovers.map((group) => (
                <Box key={group.category} sx={{ marginBottom: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, marginBottom: 0.5 }}>
                    {group.category}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.items.map((item) => (
                      <Chip
                        key={item.productId}
                        label={`${item.productName} (${item.salesCount})`}
                        size="small"
                        color={item.salesCount === 0 ? 'error' : 'default'}
                      />
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Resultado da detecção de padrões */}
      <Dialog open={Boolean(detectResult)} onClose={() => setDetectResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resultado da detecção de padrões</DialogTitle>
        <DialogContent>
          {detectResult && (
            <>
              <Typography variant="body2" sx={{ marginBottom: 2 }}>
                {detectResult.candidatesEvaluated} candidato(s) avaliado(s), {detectResult.suggestionsCreated}{' '}
                nova(s) sugestão(ões) criada(s).{' '}
                {detectResult.aiUsed ? 'Refinado por IA (DeepSeek).' : 'IA não usada — só candidatos estatísticos.'}
              </Typography>
              {detectResult.aiError && (
                <Alert severity="warning" sx={{ marginBottom: 2 }}>
                  A IA falhou ({detectResult.aiError}) — usados os candidatos estatísticos sem filtro adicional.
                </Alert>
              )}
              {detectResult.suggestions.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666666' }}>
                  Nenhum padrão novo encontrado.
                </Typography>
              ) : (
                detectResult.suggestions.map((s, idx) => (
                  <Box key={idx} sx={{ marginBottom: 1.5, paddingBottom: 1.5, borderBottom: '1px solid #eee' }}>
                    <Typography variant="body2">
                      <strong>
                        {s.productAName} → {s.productBName}
                      </strong>{' '}
                      ({s.coOccurrence} venda(s) juntas, {(s.confidence * 100).toFixed(0)}% de confiança)
                      {!s.created && ' — já existia'}
                    </Typography>
                    {s.description && (
                      <Typography variant="caption" sx={{ color: '#666666' }}>
                        {s.description}
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetectResult(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

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
