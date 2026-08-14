import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Switch,
  FormControlLabel,
  Autocomplete,
  TextField,
  Snackbar,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Configurações (FSD 12.13) — exclusiva do Administrador.
//
// Hoje cuida só do parâmetro de classificação de intenção de lead na caixa
// de entrada (Fase 9): liga/desliga a classificação via IA (DeepSeek) e, se
// desligada, as palavras-chave que decidem "intenção de compra" ou "dúvida"
// na resposta do cliente — ver backend/app/services/lead-intent.service.js.

export default function Configuracoes() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const [aiDeepseekEnabled, setAiDeepseekEnabled] = useState(true);
  const [purchaseIntentKeywords, setPurchaseIntentKeywords] = useState([]);
  const [doubtKeywords, setDoubtKeywords] = useState([]);

  const [smartSalesAiEnabled, setSmartSalesAiEnabled] = useState(true);
  const [smartSalesSaving, setSmartSalesSaving] = useState(false);

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

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/settings/lead-intent-classification', {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;

      if (response.status === 403) {
        throw new Error('Esta tela é exclusiva do Administrador.');
      }
      if (!response.ok) throw new Error('Falha ao carregar configurações.');

      const data = await response.json();
      setAiDeepseekEnabled(data.aiDeepseekEnabled);
      setPurchaseIntentKeywords(data.keywords?.purchaseIntent || []);
      setDoubtKeywords(data.keywords?.doubt || []);

      const smartSalesResponse = await fetch('/settings/smart-sales-ai', {
        method: 'GET',
        credentials: 'include',
      });
      if (smartSalesResponse.ok) {
        const smartSalesData = await smartSalesResponse.json();
        setSmartSalesAiEnabled(smartSalesData.aiEnabled);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthFailure]);

  async function handleToggleSmartSalesAi(checked) {
    try {
      setSmartSalesSaving(true);
      const response = await fetch('/settings/smart-sales-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ aiEnabled: checked }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');

      setSmartSalesAiEnabled(data.aiEnabled);
      setSnackbar({ severity: 'success', message: 'Configuração de Venda Inteligente salva.' });
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao salvar configuração.' });
    } finally {
      setSmartSalesSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/settings/lead-intent-classification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aiDeepseekEnabled,
          keywords: {
            purchaseIntent: purchaseIntentKeywords,
            doubt: doubtKeywords,
          },
        }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar as configurações.');
      }

      setAiDeepseekEnabled(data.aiDeepseekEnabled);
      setPurchaseIntentKeywords(data.keywords?.purchaseIntent || []);
      setDoubtKeywords(data.keywords?.doubt || []);
      setSnackbar({ severity: 'success', message: 'Configurações salvas com sucesso.' });
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ paddingY: 4 }}>
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Configurações
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Parâmetros técnicos e operacionais de escopo global do sistema.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ padding: 3 }}>
          <Typography variant="h6" sx={{ marginBottom: 1 }}>
            Classificação de intenção de lead (Caixa de Entrada)
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
            Ao receber uma resposta de um cliente, o sistema decide se ela demonstra intenção de
            compra ou dúvida — e, se sim, encaminha o lead a um vendedor.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={aiDeepseekEnabled}
                onChange={(e) => setAiDeepseekEnabled(e.target.checked)}
              />
            }
            label={aiDeepseekEnabled ? 'Classificar via IA (DeepSeek)' : 'Classificar por palavras-chave'}
          />

          {aiDeepseekEnabled ? (
            <Alert severity="info" sx={{ marginTop: 2 }}>
              A mensagem recebida é enviada à API do DeepSeek para decidir a classificação. Se a IA
              falhar (erro de rede, chave inválida, etc.), o sistema tenta classificar pelas
              palavras-chave abaixo antes de desistir.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ marginTop: 2 }}>
              A IA está desativada — a classificação usa exclusivamente as palavras-chave abaixo.
              Mensagens sem nenhuma palavra-chave configurada não serão encaminhadas.
            </Alert>
          )}

          <Divider sx={{ marginY: 3 }} />

          <Typography variant="subtitle1" sx={{ marginBottom: 1, fontWeight: 600 }}>
            Palavras-chave — intenção de compra
          </Typography>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={purchaseIntentKeywords}
            onChange={(e, newValue) => setPurchaseIntentKeywords(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Digite uma palavra ou frase e pressione Enter"
                size="small"
              />
            )}
          />

          <Typography variant="subtitle1" sx={{ marginTop: 3, marginBottom: 1, fontWeight: 600 }}>
            Palavras-chave — dúvida
          </Typography>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={doubtKeywords}
            onChange={(e, newValue) => setDoubtKeywords(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Digite uma palavra ou frase e pressione Enter"
                size="small"
              />
            )}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </Box>
        </Card>
      )}

      {!loading && (
        <Card sx={{ padding: 3, marginTop: 3 }}>
          <Typography variant="h6" sx={{ marginBottom: 1 }}>
            Venda Inteligente — detecção de produtos comprados juntos
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
            Ao detectar padrões de compra (tela de Cross-sell), o sistema calcula os candidatos
            estatisticamente com base no histórico de vendas. Esta opção controla só o refinamento
            opcional por IA sobre os candidatos já calculados (filtra coincidências e sugere uma
            descrição) — a detecção em si nunca depende da IA.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={smartSalesAiEnabled}
                onChange={(e) => handleToggleSmartSalesAi(e.target.checked)}
                disabled={smartSalesSaving}
              />
            }
            label={smartSalesAiEnabled ? 'Refinar sugestões via IA (DeepSeek)' : 'Usar apenas os candidatos estatísticos'}
          />
        </Card>
      )}

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
