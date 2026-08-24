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
// Cuida do parâmetro de classificação de intenção de lead na caixa de
// entrada (Fase 9): liga/desliga a classificação via IA (DeepSeek) e, se
// desligada, as palavras-chave que decidem "intenção de compra" ou "dúvida"
// na resposta do cliente — ver backend/app/services/lead-intent.service.js.
// Também cuida da IA de Venda Inteligente e dos parâmetros do Piloto
// Automático da Loja / Radar da Loja (backend/app/services/
// autonomous-offers.service.js) — todos ficam "pending_configuration"
// (recurso pausado) até o Administrador preencher aqui.

// Valores de dav.tipodocumento confirmados em produção (16/08/2026) — ver
// docs/uniplus-schema/04-colunas-confirmadas.md § dav. A lista não é
// travada no backend (aceita qualquer código inteiro), mas aqui só
// oferecemos os confirmados para reduzir erro de digitação.
const DAV_TIPO_OPTIONS = [
  { value: 1, label: '1 — Pré-venda' },
  { value: 2, label: '2 — Orçamento' },
  { value: 4, label: '4 — Pedido de Venda' },
  { value: 6, label: '6 — Pedido de Faturamento' },
  { value: 7, label: '7 — Orçamento de Faturamento' },
];

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

  const [whatsappIntervalInput, setWhatsappIntervalInput] = useState('');
  const [davTiposValue, setDavTiposValue] = useState([]);
  const [davTouched, setDavTouched] = useState(false);
  const [etapa2DelayInput, setEtapa2DelayInput] = useState('');
  const [conversionWindowInput, setConversionWindowInput] = useState('');
  const [defaultLeadTimeInput, setDefaultLeadTimeInput] = useState('');
  const [pilotoSaving, setPilotoSaving] = useState(false);

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

      const pilotoResponse = await fetch('/settings/piloto-automatico', {
        method: 'GET',
        credentials: 'include',
      });
      if (pilotoResponse.ok) {
        const pilotoData = await pilotoResponse.json();
        setWhatsappIntervalInput(
          pilotoData.whatsappMinIntervalSeconds !== null ? String(pilotoData.whatsappMinIntervalSeconds) : ''
        );
        setDavTiposValue(
          Array.isArray(pilotoData.davTiposConsideradosVenda) ? pilotoData.davTiposConsideradosVenda : []
        );
        setDavTouched(pilotoData.davTiposConsideradosVenda !== null);
        setEtapa2DelayInput(pilotoData.etapa2DelayMinutes !== null ? String(pilotoData.etapa2DelayMinutes) : '');
        setConversionWindowInput(
          pilotoData.conversionWindowDays !== null ? String(pilotoData.conversionWindowDays) : ''
        );
        setDefaultLeadTimeInput(String(pilotoData.defaultLeadTimeDays));
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

  // Só inclui no corpo da requisição os campos preenchidos (ou a lista de
  // tipos de dav, se já configurada ou tocada nesta sessão) — deixar um
  // campo em branco não apaga um valor já salvo em outro campo do mesmo
  // formulário (atualização parcial, ver settings.controller.js).
  async function handleSavePiloto() {
    try {
      setPilotoSaving(true);

      const body = {};
      if (whatsappIntervalInput.trim() !== '') {
        body.whatsappMinIntervalSeconds = Number(whatsappIntervalInput);
      }
      if (davTouched) {
        body.davTiposConsideradosVenda = davTiposValue;
      }
      if (etapa2DelayInput.trim() !== '') {
        body.etapa2DelayMinutes = Number(etapa2DelayInput);
      }
      if (conversionWindowInput.trim() !== '') {
        body.conversionWindowDays = Number(conversionWindowInput);
      }
      if (defaultLeadTimeInput.trim() !== '') {
        body.defaultLeadTimeDays = Number(defaultLeadTimeInput);
      }

      const response = await fetch('/settings/piloto-automatico', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');

      setWhatsappIntervalInput(
        data.whatsappMinIntervalSeconds !== null ? String(data.whatsappMinIntervalSeconds) : ''
      );
      setDavTiposValue(Array.isArray(data.davTiposConsideradosVenda) ? data.davTiposConsideradosVenda : []);
      setDavTouched(data.davTiposConsideradosVenda !== null);
      setEtapa2DelayInput(data.etapa2DelayMinutes !== null ? String(data.etapa2DelayMinutes) : '');
      setConversionWindowInput(data.conversionWindowDays !== null ? String(data.conversionWindowDays) : '');
      setDefaultLeadTimeInput(String(data.defaultLeadTimeDays));
      setSnackbar({ severity: 'success', message: 'Configurações do Piloto Automático salvas.' });
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao salvar configurações.' });
    } finally {
      setPilotoSaving(false);
    }
  }

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

      {!loading && (
        <Card sx={{ padding: 3, marginTop: 3 }}>
          <Typography variant="h6" sx={{ marginBottom: 1 }}>
            Piloto Automático da Loja
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
            Cascata de cross-sell disparada em tempo real logo após uma venda ser confirmada no
            Uniplus (WhatsApp para o cliente e para o vendedor). Cada parâmetro abaixo fica pausado
            enquanto não for preenchido — nenhum valor é assumido pelo sistema.
          </Typography>

          <TextField
            label="Intervalo mínimo entre envios de WhatsApp (segundos)"
            type="number"
            size="small"
            fullWidth
            value={whatsappIntervalInput}
            onChange={(e) => setWhatsappIntervalInput(e.target.value)}
            helperText="Protege o número contra bloqueio por padrão de envio. Em branco = disparo pausado."
            sx={{ marginBottom: 3 }}
          />

          <Typography variant="subtitle1" sx={{ marginBottom: 1, fontWeight: 600 }}>
            Tipos de dav considerados venda
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666', marginBottom: 1 }}>
            Um dav (pré-venda, orçamento, pedido) que ainda não virou nota fiscal também é
            considerado venda se o tipo de documento estiver nesta lista — vale tanto para o Piloto
            Automático quanto para a sincronização em lote comum. Lista vazia = nenhum dav conta
            como venda (decisão deliberada, diferente de deixar em branco).
          </Typography>
          <Autocomplete
            multiple
            options={DAV_TIPO_OPTIONS}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            value={DAV_TIPO_OPTIONS.filter((option) => davTiposValue.includes(option.value))}
            onChange={(e, newValue) => {
              setDavTiposValue(newValue.map((option) => option.value));
              setDavTouched(true);
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Selecione os tipos de dav" size="small" />
            )}
            sx={{ marginBottom: 3 }}
          />
          {!davTouched && (
            <Alert severity="warning" sx={{ marginBottom: 3 }}>
              Ainda não configurado — nenhum dav é considerado venda (nem no Piloto Automático, nem
              na sincronização em lote) até essa lista ser definida.
            </Alert>
          )}

          <TextField
            label="Atraso da Etapa 2 — reposição de categoria (minutos)"
            type="number"
            size="small"
            fullWidth
            value={etapa2DelayInput}
            onChange={(e) => setEtapa2DelayInput(e.target.value)}
            helperText="Tempo entre o complemento imediato (Etapa 1) e o aviso de reposição (Etapa 2). Em branco = Etapa 2 pausada."
            sx={{ marginBottom: 3 }}
          />

          <TextField
            label="Janela de conversão de oferta autônoma (dias)"
            type="number"
            size="small"
            fullWidth
            value={conversionWindowInput}
            onChange={(e) => setConversionWindowInput(e.target.value)}
            helperText="Prazo para contar uma nova compra do produto ofertado como conversão da oferta."
            sx={{ marginBottom: 3 }}
          />

          <TextField
            label="Antecedência do alerta de compra sazonal — Radar da Loja (dias)"
            type="number"
            size="small"
            fullWidth
            value={defaultLeadTimeInput}
            onChange={(e) => setDefaultLeadTimeInput(e.target.value)}
            helperText="Padrão: 30 dias (pelo menos um mês de antecedência)."
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
            <Button variant="contained" onClick={handleSavePiloto} disabled={pilotoSaving}>
              {pilotoSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </Box>
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
