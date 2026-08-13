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
  Chip,
  Snackbar,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Tela de Modelos de Mensagem (templates) — FSD seções 6.4, 12.7, 21.
//
// Leitura disponível para Admin e Acesso Limitado; criação/edição/exclusão/
// upload de imagem são exclusivos do Administrador (campos desabilitados
// para Acesso Limitado, mesmo padrão de CriteriosRfm.jsx).

const emptyForm = {
  name: '',
  bodyText: '',
  variables: [],
  linkUrl: '',
};

export default function Templates() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newVariable, setNewVariable] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/templates?includeInactive=${includeInactive}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;
      if (!response.ok) throw new Error('Falha ao carregar modelos de mensagem.');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar modelos de mensagem.');
    } finally {
      setLoading(false);
    }
  }, [includeInactive, handleAuthFailure]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Revoga a URL de prévia local ao trocar de arquivo/fechar o diálogo,
  // para não vazar memória (URL.createObjectURL).
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function openCreateDialog() {
    setEditingTemplate(null);
    setForm(emptyForm);
    setNewVariable('');
    setImageFile(null);
    setImagePreviewUrl(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(template) {
    setEditingTemplate(template);
    setForm({
      name: template.name || '',
      bodyText: template.bodyText || '',
      variables: template.variables || [],
      linkUrl: template.linkUrl || '',
    });
    setNewVariable('');
    setImageFile(null);
    setImagePreviewUrl(null);
    setFormError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    setFormOpen(false);
    setEditingTemplate(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreviewUrl(null);
    setFormError(null);
  }

  function handleAddVariable() {
    const name = newVariable.trim();
    if (!name) return;
    if (form.variables.includes(name)) {
      setNewVariable('');
      return;
    }
    setForm({ ...form, variables: [...form.variables, name] });
    setNewVariable('');
  }

  function handleRemoveVariable(name) {
    setForm({ ...form, variables: form.variables.filter((v) => v !== name) });
  }

  function handleImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImageIfNeeded(templateId) {
    if (!imageFile) return;

    const body = new FormData();
    body.append('image', imageFile);

    const response = await fetch(`/templates/${templateId}/image`, {
      method: 'POST',
      credentials: 'include',
      body,
    });

    if (await handleAuthFailure(response)) return;
    const data = await response.json();

    if (!response.ok) {
      // O modelo já foi salvo com sucesso — a imagem falhou separadamente.
      throw new Error(data.error || 'Modelo salvo, mas a imagem não pôde ser enviada.');
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setFormError(null);

      if (!form.name.trim()) {
        throw new Error('Informe um nome para o modelo.');
      }
      if (!form.bodyText.trim()) {
        throw new Error('Informe o texto do modelo.');
      }

      const isEditing = !!editingTemplate;
      const url = isEditing ? `/templates/${editingTemplate.id}` : '/templates';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          bodyText: form.bodyText.trim(),
          variables: form.variables,
          linkUrl: form.linkUrl.trim() || null,
        }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o modelo.');
      }

      // A partir daqui o modelo já existe no banco. Se o upload de imagem
      // abaixo falhar, o diálogo passa a operar em modo de edição sobre
      // este modelo (em vez de continuar em modo de criação) — assim, uma
      // nova tentativa de "Salvar" refaz só o upload (PATCH), sem criar um
      // modelo duplicado com outro POST.
      setEditingTemplate(data.template);

      await uploadImageIfNeeded(data.template.id);

      closeFormDialog();
      setSnackbar({ severity: 'success', message: 'Modelo salvo com sucesso.' });
      await loadTemplates();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar modelo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(template) {
    try {
      setTogglingId(template.id);
      const response = await fetch(`/templates/${template.id}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !template.active }),
      });

      if (await handleAuthFailure(response)) return;
      const data = await response.json();

      if (!response.ok) {
        setSnackbar({ severity: 'error', message: data.error || 'Não foi possível atualizar o status do modelo.' });
        return;
      }

      setSnackbar({
        severity: 'success',
        message: data.template?.active ? 'Modelo ativado com sucesso.' : 'Modelo desativado com sucesso.',
      });
      await loadTemplates();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao atualizar status do modelo.' });
    } finally {
      setTogglingId(null);
    }
  }

  function openDeleteDialog(template) {
    setDeletingTemplate(template);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingTemplate) return;

    try {
      setDeleteOpen(false);
      const response = await fetch(`/templates/${deletingTemplate.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (await handleAuthFailure(response)) return;

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível excluir o modelo.');
      }

      setSnackbar({ severity: 'success', message: 'Modelo excluído com sucesso.' });
      await loadTemplates();
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.message || 'Erro ao excluir modelo.' });
    } finally {
      setDeletingTemplate(null);
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
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Modelos de Mensagem
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Textos reutilizáveis com variáveis, imagem e link, usados por réguas e campanhas.
        </Typography>
      </Box>

      {!isAdmin && (
        <Alert severity="info" sx={{ marginBottom: 3 }}>
          Apenas o Administrador pode criar, editar ou excluir modelos de mensagem. Você pode
          visualizar os modelos existentes abaixo.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
            }
            label="Mostrar inativos"
          />
          {isAdmin && (
            <Button variant="contained" onClick={openCreateDialog}>
              Novo modelo
            </Button>
          )}
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Card sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            Nenhum modelo de mensagem cadastrado ainda.
          </Typography>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Imagem</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Texto</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Variáveis</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      {template.imageAttachmentId ? (
                        <Box
                          component="img"
                          src={`/templates/${template.id}/image`}
                          alt=""
                          sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: '#999999' }}>
                          Sem imagem
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{template.name}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {template.bodyText}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {template.variables.length === 0 ? (
                        '—'
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {template.variables.map((v) => (
                            <Chip key={v} label={`{{${v}}}`} size="small" variant="outlined" />
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.active ? 'Ativo' : 'Inativo'}
                        color={template.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(template.createdAt)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Button size="small" variant="outlined" onClick={() => openEditDialog(template)}>
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color={template.active ? 'error' : 'success'}
                            disabled={togglingId === template.id}
                            onClick={() => handleToggleActive(template)}
                          >
                            {togglingId === template.id ? (
                              <CircularProgress size={16} />
                            ) : template.active ? (
                              'Desativar'
                            ) : (
                              'Ativar'
                            )}
                          </Button>
                          <Button size="small" variant="text" color="error" onClick={() => openDeleteDialog(template)}>
                            Excluir
                          </Button>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Diálogo de criação/edição de modelo */}
      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ marginBottom: 2, marginTop: 1 }}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Nome do modelo"
            fullWidth
            required
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
            label="Texto da mensagem"
            fullWidth
            required
            multiline
            minRows={4}
            margin="normal"
            helperText="Use {{nome_da_variavel}} para inserir uma variável (ex.: {{nome}}, {{produto}}, {{desconto}})."
            value={form.bodyText}
            onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
          />

          <Typography variant="body2" sx={{ marginTop: 2, marginBottom: 1, fontWeight: 600 }}>
            Variáveis suportadas
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginBottom: 1 }}>
            {form.variables.length === 0 ? (
              <Typography variant="caption" sx={{ color: '#999999' }}>
                Nenhuma variável adicionada.
              </Typography>
            ) : (
              form.variables.map((v) => (
                <Chip key={v} label={`{{${v}}}`} size="small" onDelete={() => handleRemoveVariable(v)} />
              ))
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Nova variável"
              size="small"
              placeholder="Ex: nome"
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddVariable();
                }
              }}
            />
            <Button variant="outlined" onClick={handleAddVariable}>
              Adicionar
            </Button>
          </Box>

          <TextField
            label="Link (opcional)"
            type="url"
            fullWidth
            margin="normal"
            placeholder="https://..."
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
          />

          <Typography variant="body2" sx={{ marginTop: 2, marginBottom: 1, fontWeight: 600 }}>
            Imagem (opcional)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {imagePreviewUrl ? (
              <Box component="img" src={imagePreviewUrl} alt="" sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1 }} />
            ) : editingTemplate?.imageAttachmentId ? (
              <Box
                component="img"
                src={`/templates/${editingTemplate.id}/image`}
                alt=""
                sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1 }}
              />
            ) : null}
            <Button variant="outlined" component="label">
              {editingTemplate?.imageAttachmentId || imagePreviewUrl ? 'Substituir imagem' : 'Selecionar imagem'}
              <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: '#999999' }}>
            JPG, PNG ou WEBP, até 5MB.
          </Typography>
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

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography sx={{ marginTop: 2 }}>
            Tem certeza que deseja excluir o modelo <strong>{deletingTemplate?.name}</strong>?
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 2, color: '#666666' }}>
            Modelos já usados em mensagens enviadas, réguas ou campanhas não podem ser excluídos —
            desative-os em vez de excluir, nesse caso.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Excluir
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
