import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Users() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Redireciona se não for admin.
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Carrega lista de usuários.
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/users', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Falha ao carregar usuários');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(user) {
    setSelectedUser(user);
    setConfirmDialogOpen(true);
  }

  async function confirmDeactivate() {
    try {
      setConfirmDialogOpen(false);

      const response = await fetch(`/users/${selectedUser.id}/deactivate`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Falha ao desativar usuário');
      }

      // Atualiza lista.
      await loadUsers();
      setSelectedUser(null);
    } catch (err) {
      setError(err.message || 'Erro ao desativar usuário');
      setSelectedUser(null);
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Gestão de Usuários
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Lista de usuários autenticados no CRM Live. Apenas o Administrador pode desativar acessos.
        </Typography>
      </Box>

      {/* Erro */}
      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabela de usuários */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f7f9fb' }}>
                <TableCell sx={{ fontWeight: 700 }}>E-mail</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Papel</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Primeiro Acesso</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Último Acesso</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name || '—'}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor:
                          user.role === 'admin'
                            ? '#0f2d7b'
                            : '#97378d',
                        color: '#ffffff',
                        borderRadius: 1,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {user.role === 'admin' ? 'Admin' : 'Limitado'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: user.active
                          ? '#2d7a5c'
                          : '#999999',
                        color: '#ffffff',
                        borderRadius: 1,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {user.active ? 'Ativo' : 'Inativo'}
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                  <TableCell>
                    {user.active && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeactivate(user)}
                        disabled={user.role === 'admin'} // Não permite desativar a si mesmo
                      >
                        Desativar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Diálogo de confirmação */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirmar Desativação</DialogTitle>
        <DialogContent>
          <Typography sx={{ marginTop: 2 }}>
            Tem certeza que deseja desativar o usuário <strong>{selectedUser?.email}</strong>?
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 2, color: '#666666' }}>
            Esse usuário não poderá mais fazer login no CRM Live até ser reativado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={confirmDeactivate}
            color="error"
            variant="contained"
          >
            Desativar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
