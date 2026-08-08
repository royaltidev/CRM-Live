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
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// CRUD simples de tags (etiquetas aplicáveis a clientes).
export default function Tags() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingTag, setEditingTag] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deletingTag, setDeletingTag] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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

  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/tags', { method: 'GET', credentials: 'include' });

      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        throw new Error('Falha ao carregar tags');
      }

      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        const data = await response.json();
        throw new Error(data.error || 'Falha ao criar tag');
      }

      setNewTagName('');
      await loadTags();
    } catch (err) {
      setError(err.message || 'Erro ao criar tag');
    } finally {
      setCreating(false);
    }
  }

  function openEditDialog(tag) {
    setEditingTag(tag);
    setEditingName(tag.name);
    setEditDialogOpen(true);
  }

  async function confirmEdit() {
    try {
      setError(null);
      const response = await fetch(`/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        const data = await response.json();
        throw new Error(data.error || 'Falha ao atualizar tag');
      }

      setEditDialogOpen(false);
      setEditingTag(null);
      await loadTags();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar tag');
      setEditDialogOpen(false);
    }
  }

  function openDeleteDialog(tag) {
    setDeletingTag(tag);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    try {
      setDeleteError(null);
      const response = await fetch(`/tags/${deletingTag.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        if (handleUnauthorized(response)) return;
        const data = await response.json();
        // Mostra o erro amigável do backend (ex: "tag em uso") dentro do próprio diálogo.
        setDeleteError(data.error || 'Falha ao excluir tag');
        return;
      }

      setDeleteDialogOpen(false);
      setDeletingTag(null);
      await loadTags();
    } catch (err) {
      setDeleteError(err.message || 'Erro ao excluir tag');
    }
  }

  return (
    <Container maxWidth="md" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Tags
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Etiquetas aplicáveis a clientes para segmentação manual.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Criar nova tag */}
      <Card sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 700 }}>
          Nova Tag
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Nome da tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <Button variant="contained" onClick={handleCreateTag} disabled={creating || !newTagName.trim()}>
            {creating ? 'Criando...' : 'Criar'}
          </Button>
        </Box>
      </Card>

      {/* Lista de tags */}
      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : tags.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              Nenhuma tag cadastrada ainda.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.name}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => openEditDialog(tag)} sx={{ marginRight: 1 }}>
                        Editar
                      </Button>
                      <Button size="small" color="error" onClick={() => openDeleteDialog(tag)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {/* Diálogo de edição */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Editar Tag</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome da tag"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            fullWidth
            sx={{ marginTop: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmEdit} variant="contained" disabled={!editingName.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography sx={{ marginTop: 2 }}>
            Tem certeza que deseja excluir a tag <strong>{deletingTag?.name}</strong>?
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
