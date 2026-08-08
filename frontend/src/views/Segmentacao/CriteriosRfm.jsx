import React, { useEffect, useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Seção de configuração dos critérios de classificação RFM (FSD seção 20).
//
// A EDIÇÃO dos critérios globais é exclusiva do Administrador — usuários com
// papel "limitado" veem os critérios em modo somente leitura (ou mensagem, se
// ainda não configurados). O botão "Recalcular agora" fica disponível para
// qualquer usuário autenticado (ver decisão documentada em
// backend/app/controllers/segments.routes.md).

const DEFAULT_SEGMENT_TEMPLATE = [
  { name: 'vip', label: 'VIP', maxDaysSinceLastPurchase: 30, minPurchaseCount: 5, minTotalSpent: 1000 },
  { name: 'fiel', label: 'Fiel', maxDaysSinceLastPurchase: 60, minPurchaseCount: 3, minTotalSpent: 300 },
  { name: 'em_risco', label: 'Em risco', maxDaysSinceLastPurchase: 120, minPurchaseCount: 1, minTotalSpent: 0 },
  { name: 'inativo', label: 'Inativo', maxDaysSinceLastPurchase: null, minPurchaseCount: 0, minTotalSpent: 0 },
];

export default function CriteriosRfm() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  const [configured, setConfigured] = useState(false);
  const [segments, setSegments] = useState(DEFAULT_SEGMENT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalcError, setRecalcError] = useState(null);

  useEffect(() => {
    loadCriteria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAuthFailure(response) {
    if (response.status === 401) {
      logout();
      navigate('/login');
      return true;
    }
    return false;
  }

  async function loadCriteria() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/segments/rfm/criteria', {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar critérios RFM.');

      const data = await response.json();
      setConfigured(!!data.configured);
      if (data.configured && data.criteria?.segments) {
        setSegments(data.criteria.segments);
      } else {
        setSegments(DEFAULT_SEGMENT_TEMPLATE);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar critérios RFM.');
    } finally {
      setLoading(false);
    }
  }

  function updateSegmentField(index, field, value) {
    setSegments((prev) =>
      prev.map((seg, i) => {
        if (i !== index) return seg;
        return { ...seg, [field]: value };
      })
    );
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      const payload = {
        segments: segments.map((seg) => ({
          name: seg.name,
          label: seg.label,
          maxDaysSinceLastPurchase:
            seg.maxDaysSinceLastPurchase === '' || seg.maxDaysSinceLastPurchase === null
              ? null
              : Number(seg.maxDaysSinceLastPurchase),
          minPurchaseCount: Number(seg.minPurchaseCount) || 0,
          minTotalSpent: Number(seg.minTotalSpent) || 0,
        })),
      };

      const response = await fetch('/segments/rfm/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar os critérios.');
      }

      setConfigured(true);
      setSaveMessage('Critérios de classificação RFM salvos com sucesso.');
    } catch (err) {
      setError(err.message || 'Erro ao salvar critérios RFM.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRecalculate() {
    try {
      setRecalculating(true);
      setRecalcError(null);
      setRecalcResult(null);

      const response = await fetch('/segments/rfm/recalculate', {
        method: 'POST',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível recalcular a classificação RFM.');
      }

      setRecalcResult(data);
    } catch (err) {
      setRecalcError(err.message || 'Erro ao recalcular RFM.');
    } finally {
      setRecalculating(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ marginBottom: 1 }}>
        Critérios de classificação RFM
      </Typography>
      <Typography variant="body2" sx={{ color: '#666666', marginBottom: 3 }}>
        Define os limites usados para classificar automaticamente os clientes em faixas (VIP,
        fiel, em risco, inativo etc.) com base em recência, frequência e valor gasto.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}
      {saveMessage && (
        <Alert severity="success" sx={{ marginBottom: 3 }}>
          {saveMessage}
        </Alert>
      )}

      {!configured && (
        <Alert severity="warning" sx={{ marginBottom: 3 }}>
          Os critérios de classificação RFM ainda não foram configurados. Até que o Administrador
          salve os critérios abaixo, a classificação RFM permanece pendente e nenhum cliente é
          classificado.
        </Alert>
      )}

      {!isAdmin && (
        <Alert severity="info" sx={{ marginBottom: 3 }}>
          Apenas o Administrador pode editar os critérios de classificação RFM. Você pode
          visualizar os valores atuais abaixo.
        </Alert>
      )}

      <Card sx={{ marginBottom: 3 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                <TableCell sx={{ fontWeight: 700 }}>Identificador</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nome de exibição</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Máx. dias sem comprar</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mín. compras</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mín. valor gasto (R$)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {segments.map((seg, index) => (
                <TableRow key={seg.name || index}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={seg.name || ''}
                      disabled={!isAdmin}
                      onChange={(e) => updateSegmentField(index, 'name', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={seg.label || ''}
                      disabled={!isAdmin}
                      onChange={(e) => updateSegmentField(index, 'label', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="Sem limite"
                      value={seg.maxDaysSinceLastPurchase ?? ''}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        updateSegmentField(
                          index,
                          'maxDaysSinceLastPurchase',
                          e.target.value === '' ? null : e.target.value
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={seg.minPurchaseCount ?? 0}
                      disabled={!isAdmin}
                      onChange={(e) => updateSegmentField(index, 'minPurchaseCount', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={seg.minTotalSpent ?? 0}
                      disabled={!isAdmin}
                      onChange={(e) => updateSegmentField(index, 'minTotalSpent', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {isAdmin && (
        <Box sx={{ marginBottom: 4 }}>
          <Typography variant="body2" sx={{ color: '#666666', marginBottom: 1 }}>
            Os segmentos são avaliados na ordem acima (do mais exigente para o mais frouxo); o
            cliente recebe o primeiro segmento cujos três critérios ele satisfaz. Deixe "Máx. dias
            sem comprar" em branco no último segmento para que ele funcione como padrão (ex.:
            "Inativo").
          </Typography>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Salvar critérios'}
          </Button>
        </Box>
      )}

      <Card sx={{ padding: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, marginBottom: 1 }}>
          Recálculo manual
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
          Nesta fase, sem sincronização automática com o Uniplus, o recálculo da classificação RFM
          de todos os clientes é disparado manualmente. Qualquer usuário autenticado pode executar
          esta ação.
        </Typography>
        <Button variant="outlined" onClick={handleRecalculate} disabled={recalculating}>
          {recalculating ? <CircularProgress size={20} /> : 'Recalcular agora'}
        </Button>

        {recalcError && (
          <Alert severity="error" sx={{ marginTop: 2 }}>
            {recalcError}
          </Alert>
        )}
        {recalcResult && recalcResult.status === 'pending_configuration' && (
          <Alert severity="warning" sx={{ marginTop: 2 }}>
            {recalcResult.message || 'Critérios de classificação RFM ainda não configurados.'}
          </Alert>
        )}
        {recalcResult && recalcResult.status === 'ok' && (
          <Alert severity="success" sx={{ marginTop: 2 }}>
            Classificação RFM recalculada para {recalcResult.updated} cliente(s).
          </Alert>
        )}
      </Card>
    </Box>
  );
}
