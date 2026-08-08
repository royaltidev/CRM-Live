import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import LocalOfferIcon from '@mui/icons-material/LocalOfferOutlined';
import DonutSmallIcon from '@mui/icons-material/DonutSmallOutlined';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccountsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 260;

// Itens do menu principal. `adminOnly: true` só aparece para o perfil Administrador,
// conforme a matriz de permissões do FSD (seção 8.5).
const MENU_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
  { label: 'Clientes', path: '/clientes', icon: PeopleIcon },
  { label: 'Segmentação', path: '/segmentacao', icon: DonutSmallIcon },
  { label: 'Vendedores', path: '/vendedores', icon: StorefrontIcon },
  { label: 'Tags', path: '/tags', icon: LocalOfferIcon },
  { label: 'Gestão de Usuários', path: '/users', icon: ManageAccountsIcon, adminOnly: true },
];

// Layout compartilhado por todas as telas autenticadas: menu lateral fixo +
// cabeçalho com dados do usuário e logout. As telas internas são renderizadas
// via <Outlet /> (rotas aninhadas do React Router).
export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const visibleItems = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f7f9fb' }}>
      {/* Cabeçalho superior */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          marginLeft: `${DRAWER_WIDTH}px`,
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {visibleItems.find((item) => isActive(item.path))?.label || 'CRM Live'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {user?.name || user?.email}
              </Typography>
              <Chip
                label={isAdmin ? 'Administrador' : 'Acesso Limitado'}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '10px',
                  fontWeight: 600,
                  backgroundColor: isAdmin ? '#0f2d7b' : '#97378d',
                  color: '#ffffff',
                }}
              />
            </Box>
            <Avatar sx={{ bgcolor: '#0f2d7b', width: 36, height: 36 }}>
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </Avatar>
            <IconButton onClick={handleLogout} title="Sair" size="small">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Menu lateral */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: '#0f2d7b',
            color: '#ffffff',
            border: 'none',
          },
        }}
      >
        <Box sx={{ padding: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <img src="/icone.svg" alt="" style={{ height: 32 }} onError={(e) => { e.target.style.display = 'none'; }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
            CRM Live
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

        <List sx={{ paddingTop: 2 }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}
                selected={active}
                sx={{
                  marginX: 1.5,
                  marginBottom: 0.5,
                  borderRadius: 2,
                  color: active ? '#0f2d7b' : 'rgba(255,255,255,0.85)',
                  backgroundColor: active ? '#ffffff' : 'transparent',
                  '&:hover': {
                    backgroundColor: active ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#ffffff',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: '#ffffff',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '14px', fontWeight: active ? 700 : 500 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      {/* Conteúdo da página atual */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginLeft: `${DRAWER_WIDTH}px`,
          marginTop: '64px', // altura do AppBar
          padding: 0,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
