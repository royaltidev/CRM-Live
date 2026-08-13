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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Snackbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Réguas de relacionamento (automações) — FSD seção 6.3 e 12.5.
//
// Consome as rotas de backend/app/controllers/automation-rules.controller.js
// (CRUD de réguas, já pronto) e alimenta o campo de modelo de mensagem via
// GET /automation-rules/templates/active (só leitura — CRUD de templates é
// Fase 8).
//
// Acessível por Administrador e Acesso Limitado (FSD seção 8.5) — não há
// bloqueio de papel nesta tela.
//
// IMPORTANTE: a régua "stock_replenished" (aviso de volta ao estoque) foi
// ADIADA (decisão do responsável do projeto). O enum do banco ainda a
// contém (por isso ela aparece na tradução de rótulos, para o caso de haver
// uma régua legada com esse gatilho), mas ela NÃO é oferecida como opção no
// formulário de criação/edição.

// Tradução de todos os gatilhos possíveis no enum do banco (inclui
// stock_replenished só para exibição de eventuais réguas legadas).
const TRIGGER_TYPE_LABELS = {
  sale_created: 'Nova venda',
  days_without_purchase: 'Dias sem comprar (reativação)',
  birthday: 'Aniversário',
  stock_replenished: 'Volta ao estoque (indisponível nesta fase)',
  nps_survey: 'Pesquisa de satisfação (NPS)',
  consumption_cycle: 'Ciclo de recompra',
  first_identified_purchase: 'Incentivo ao cadastro',
  cross_sell: 'Cross-sell (produto complementar)',
};

// Gatilhos oferecidos no formulário de criação/edição — stock_replenished
// foi removido intencionalmente (ver nota acima).
const CREATABLE_TRIGGER_TYPES = [
  'sale_created',
  'days_without_purchase',
  'birthday',
  'nps_survey',
  'consumption_cycle',
  'first_identified_purchase',
  'cross_sell',
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Ativas' },
  { value: 'false', label: 'Inativas' },
];

const SALE_CREATED_OPTIONS = [
  { value: '', label: 'Qualquer venda' },
  { value: 'true', label: 'Primeira compra' },
  { value: 'false', label: 'Compra recorrente' },
];

const emptyForm = {
  name: '',
  triggerType: 'sale_created',
  messageTemplateId: '',
  days: '',
  cascadeStep: '',
  productId: '',
  isFirstPurchase: '',
  delayMinutes: '',
};

// Converte o estado do formulário no payload aceito por POST/PATCH /automation-rules.
function formToPayload(form) {
  let conditions = {};

  if (form.triggerType === 'days_without_purchase') {
    if (form.days !== '') conditions = { days: Number(form.days) };
  } else if (form.triggerType === 'consumption_cycle') {
    conditions = {};
    if (form.productId !== '') conditions.productId = Number(form.productId);
    if (form.days !== '') conditions.days = Number(form.days);
  } else if (form.triggerType === 'sale_created') {
    if (form.isFirstPurchase === 'true') conditions = { isFirstPurchase: true };
    else if (form.isFirstPurchase === 'false') conditions = { isFirstPurchase: false };
  }

  return {
    name: form.name.trim(),
    triggerType: form.triggerType,
    messageTemplateId: form.messageTemplateId || null,
    conditions,
    cascadeStep:
      form.triggerType === 'days_without_purchase' && form.cascadeStep !== ''
        ? Number(form.cascadeStep)
        : null,
    delayMinutes: form.delayMinutes !== '' ? Number(form.delayMinutes) : null,
  };
}

// Reconstrói o estado do formulário a partir de uma régua já salva (edição).
function ruleToForm(rule) {
  const conditions = rule.conditions || {};
  let isFirstPurchase = '';
  if (conditions.isFirstPurchase === true) isFirstPurchase = 'true';
  else if (conditions.isFirstPurchase === false) isFirstPurchase = 'false';

  return {
    name: rule.name || '',
    triggerType: rule.triggerType,
    messageTemplateId: rule.messageTemplateId || '',
    days: conditions.days !== undefined && conditions.days !== null ? String(conditions.days) : '',
    cascadeStep: rule.cascadeStep !== undefined && rule.cascadeStep !== null ? String(rule.cascadeStep) : '',
    productId:
      conditions.productId !== undefined && conditions.productId !== null
        ? String(conditions.productId)
        : '',
    isFirstPurchase,
    delayMinutes:
      rule.delayMinutes !== undefined && rule.delayMinutes !== null ? String(rule.delayMinutes) : '',
  };
}

// Monta um resumo textual da condição da régua para exibir na listagem.
function conditionSummary(rule) {
  const conditions = rule.conditions || {};
  const parts = [];

  if (rule.triggerType === 'days_without_purchase') {
    if (conditions.days !== undefined && conditions.days !== null) {
      parts.push(`${conditions.days} dia(s) sem comprar`);
    }
    if (rule.cascadeStep !== undefined && rule.cascadeStep !== null) {
      parts.push(`etapa ${rule.cascadeStep}`);
    }
  } else if (rule.triggerType === 'consumption_cycle') {
    if (conditions.productId !== undefined && conditions.productId !== null) {
      parts.push(`produto #${conditions.productId}`);
    }
    if (conditions.days !== undefined && conditions.days !== null) {
      parts.push(`lembrete em ${conditions.days} dia(s)`);
    }
  } else if (rule.triggerType === 'sale_created') {
    if (conditions.isFirstPurchase === true) parts.push('somente primeira compra');
    else if (conditions.isFirstPurchase === false) parts.push('somente compra recorrente');
    else parts.push('qualquer venda');
  }

  if (rule.delayMinutes) {
    parts.push(`atraso de ${rule.delayMinutes} min`);
  }

  return parts.length > 0 ? parts.join(' · ') : '—';
}

export default function Reguas() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [triggerFilter, setTriggerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [snackbar, setSnackbar] = useState(null); // { severity, message }

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

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (triggerFilter) params.set('triggerType', triggerFilter);
      if (statusFilter) params.set('active', statusFilter);

      const response = await fetch(`/automation-rules?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar réguas.');

      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar réguas.');
    } finally {
      setLoading(false);
    }
  }, [triggerFilter, statusFilter, handleAuthFailure]);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/automation-rules/templates/active', {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar modelos de mensagem.');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      // Não bloqueia a tela — o formulário mostra o aviso de "nenhum modelo".
      setTemplates([]);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function openCreateDialog() {
    setEditingRule(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(rule) {
    setEditingRule(rule);
    setForm(ruleToForm(rule));
    setFormError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditingRule(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      if (!form.name || !form.name.trim()) {
        throw new Error('Informe um nome para a régua.');
      }

      const payload = formToPayload(form);
      const isEditing = !!editingRule;
      const url = isEditing ? `/automation-rules/${editingRule.id}` : '/automation-rules';
      const method = isEditing ? 'PATCH' : 'POST';

      // triggerType não é editável após a criação (o backend ignora esse
      // campo em PATCH) — não enviamos para evitar confusão.
      const body = isEditing
        ? {
            name: payload.name,
            conditions: payload.conditions,
            messageTemplateId: payload.messageTemplateId,
            cascadeStep: payload.cascadeStep,
            delayMinutes: payload.delayMinutes,
          }
        : payload;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar a régua.');
      }

      closeFormDialog();
      await loadRules();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar régua.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(rule) {
    try {
      setTogglingId(rule.id);
      const response = await fetch(`/automation-rules/${rule.id}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !rule.active }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        // Ex.: 409 — tentativa de ativar régua sem modelo de mensagem associado.
        setSnackbar({ severity: 'error', message: data.error || 'Não foi possível atualizar o status da régua.' });
        return;
      }

      setSnackbar({
        severity: 'success',
        message: data.rule?.active ? 'Régua ativada com sucesso.' : 'Régua desativada com sucesso.',
      });
      await loadRules();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao atualizar status da régua.' });
    } finally {
      setTogglingId(null);
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Container maxWidth={false} sx={{ paddingY: 4, paddingX: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Réguas de Relacionamento
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Configure automações que disparam mensagens conforme o comportamento do cliente.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              label="Gatilho"
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {CREATABLE_TRIGGER_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {TRIGGER_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Button variant="contained" onClick={openCreateDialog}>
            Nova régua
          </Button>
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : rules.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhuma régua cadastrada ainda.
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Gatilho</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Condição</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Modelo de mensagem</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criada em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell>{TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}</TableCell>
                    <TableCell>{conditionSummary(rule)}</TableCell>
                    <TableCell>
                      {rule.templateName ? (
                        rule.templateName
                      ) : (
                        <Chip label="Nenhum" size="small" color="warning" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rule.active ? 'Ativa' : 'Inativa'}
                        color={rule.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(rule.createdAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button size="small" variant="outlined" onClick={() => openEditDialog(rule)}>
                          Editar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color={rule.active ? 'error' : 'success'}
                          disabled={togglingId === rule.id}
                          onClick={() => handleToggleActive(rule)}
                        >
                          {togglingId === rule.id ? (
                            <CircularProgress size={16} />
                          ) : rule.active ? (
                            'Desativar'
                          ) : (
                            'Ativar'
                          )}
                        </Button>
                        {rule.triggerType === 'days_without_purchase' && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => navigate(`/reguas/winback/${rule.id}`)}
                          >
                            Ver clientes elegíveis
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Diálogo de criação/edição de régua */}
      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? 'Editar Régua' : 'Nova Régua'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Nome da régua"
            fullWidth
            required
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
            select
            label="Gatilho"
            fullWidth
            required
            margin="normal"
            value={form.triggerType}
            disabled={!!editingRule}
            helperText={editingRule ? 'O gatilho não pode ser alterado após a criação.' : ' '}
            onChange={(e) => setForm({ ...emptyForm, name: form.name, triggerType: e.target.value })}
          >
            {CREATABLE_TRIGGER_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {TRIGGER_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </TextField>

          {templates.length === 0 ? (
            <Alert severity="info" sx={{ marginTop: 2, marginBottom: 1 }}>
              Nenhum modelo de mensagem cadastrado ainda. Cadastre um modelo antes de ativar esta régua.
            </Alert>
          ) : (
            <TextField
              select
              label="Modelo de mensagem"
              fullWidth
              margin="normal"
              value={form.messageTemplateId}
              onChange={(e) => setForm({ ...form, messageTemplateId: e.target.value })}
            >
              <MenuItem value="">Nenhum</MenuItem>
              {templates.map((tpl) => (
                <MenuItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Campos de condição — variam conforme o gatilho escolhido */}
          {form.triggerType === 'days_without_purchase' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Dias sem comprar"
                type="number"
                fullWidth
                margin="normal"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
              />
              <TextField
                label="Etapa da cascata (opcional)"
                type="number"
                fullWidth
                margin="normal"
                placeholder="Ex: 1, 2, 3..."
                value={form.cascadeStep}
                onChange={(e) => setForm({ ...form, cascadeStep: e.target.value })}
              />
            </Box>
          )}

          {form.triggerType === 'consumption_cycle' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="ID do produto"
                type="number"
                fullWidth
                margin="normal"
                helperText="Ainda não há um seletor de produtos disponível — informe o ID do produto no Uniplus."
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              />
              <TextField
                label="Dias para lembrete"
                type="number"
                fullWidth
                margin="normal"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
              />
            </Box>
          )}

          {form.triggerType === 'cross_sell' && (
            <Alert severity="info" sx={{ marginTop: 1, marginBottom: 1 }}>
              Sem campos de condição — dispara para qualquer produto vendido que tenha um complemento
              ativo cadastrado na tela de Cross-sell. Variáveis disponíveis no modelo de mensagem:{' '}
              <strong>{'{{nome}}'}</strong>, <strong>{'{{produto}}'}</strong>,{' '}
              <strong>{'{{complementar}}'}</strong> e <strong>{'{{desconto}}'}</strong>.
            </Alert>
          )}

          {form.triggerType === 'sale_created' && (
            <TextField
              select
              label="Aplica-se a"
              fullWidth
              margin="normal"
              value={form.isFirstPurchase}
              onChange={(e) => setForm({ ...form, isFirstPurchase: e.target.value })}
            >
              {SALE_CREATED_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Atraso de envio em minutos (opcional)"
            type="number"
            fullWidth
            margin="normal"
            helperText="Tempo de espera após o gatilho antes de enviar a mensagem. Deixe em branco para enviar imediatamente."
            value={form.delayMinutes}
            onChange={(e) => setForm({ ...form, delayMinutes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFormDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
}
