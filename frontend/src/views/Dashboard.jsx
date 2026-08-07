import React from 'react';
import {
  Box,
  Container,
  Card,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ marginBottom: 1 }}>
            Bem-vindo, {user?.name || user?.email}!
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Dashboard do CRM Live — Fase 3: Autenticação Implementada ✓
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isAdmin && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/users')}
            >
              Gestão de Usuários
            </Button>
          )}
          <Button
            variant="outlined"
            color="primary"
            onClick={handleLogout}
          >
            Sair
          </Button>
        </Box>
      </Box>

      {/* Status da Autenticação */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ padding: 3 }}>
            <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 700 }}>
              Status de Autenticação
            </Typography>
            <Box sx={{ marginBottom: 2 }}>
              <Typography variant="body2" sx={{ color: '#666666' }}>
                <strong>E-mail:</strong> {user?.email}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666666', marginTop: 1 }}>
                <strong>Papel:</strong>{' '}
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor:
                      user?.role === 'admin' ? '#0f2d7b' : '#97378d',
                    color: '#ffffff',
                    borderRadius: 1,
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {user?.role === 'admin' ? 'Administrador' : 'Acesso Limitado'}
                </Box>
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#999999' }}>
              Seu token de sessão será renovado automaticamente se você ficar ativo.
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ padding: 3 }}>
            <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 700 }}>
              Fase 3: Implementado ✓
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 1 }}>
              ✓ Login via Google OAuth 2.0
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 1 }}>
              ✓ Sessão com token JWT (12h)
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 1 }}>
              ✓ Middleware RBAC (Administrador/Acesso Limitado)
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 1 }}>
              ✓ Log de segurança (`security_events`)
            </Typography>
            <Typography variant="body2">
              ✓ Tela de gestão de usuários (Admin only)
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ padding: 3 }}>
            <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 700 }}>
              Próxima Fase
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 2 }}>
              Fase 4 será a integração com o Uniplus (sincronização de dados de clientes, vendas, produtos e estoque).
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666' }}>
              ⚠️ <strong>Nota:</strong> Fase 4 está bloqueada até que o mapeamento do schema do Uniplus seja fornecido.
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
