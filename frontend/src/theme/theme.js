// Tema customizado do Material UI.
// Baseado em docs/Design/design.md ("Admin Logic").
// Nunca usar o tema padrão do MUI.

import { createTheme } from '@mui/material/styles';

// Paleta de cores do design system.
const colors = {
  primary: '#0f2d7b',      // Azul escuro
  secondary: '#97378d',    // Roxo
  accent: '#d46a2b',       // Laranja
  success: '#2d7a5c',      // Verde
  warning: '#dba617',      // Amarelo/Ouro
  error: '#b72c2c',        // Vermelho
  background: '#f7f9fb',   // Fundo claro
  surface: '#ffffff',      // Superfícies (cards, etc)
  text_primary: '#1a1a1a',     // Texto escuro
  text_secondary: '#666666',   // Texto secundário
  border: '#e0e0e0',       // Bordas
};

// Tipografia.
const typography = {
  fontFamily: [
    'Public Sans',   // Headlines
    'Inter',         // Body
    'system-ui',
    '-apple-system',
    'sans-serif',
  ].join(','),
};

// Raio de bordas.
const spacing = 8;
const borderRadius = 8;

const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      light: '#4a5fa8',
      dark: '#0a1f54',
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary,
      light: '#c57eb0',
      dark: '#5f1f5c',
      contrastText: '#ffffff',
    },
    success: {
      main: colors.success,
      light: '#4a9876',
      dark: '#1a4d3a',
    },
    warning: {
      main: colors.warning,
      light: '#e8c84a',
      dark: '#a67e0e',
    },
    error: {
      main: colors.error,
      light: '#d45555',
      dark: '#7a1a1a',
    },
    background: {
      default: colors.background,
      paper: colors.surface,
    },
    text: {
      primary: colors.text_primary,
      secondary: colors.text_secondary,
    },
    divider: colors.border,
  },

  typography: {
    fontFamily: typography.fontFamily,
    // Headlines (Public Sans)
    h1: {
      fontFamily: 'Public Sans',
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontFamily: 'Public Sans',
      fontSize: '28px',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: 'Public Sans',
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: 'Public Sans',
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: 'Public Sans',
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: 'Public Sans',
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    // Body (Inter)
    body1: {
      fontFamily: 'Inter',
      fontSize: '16px',
      lineHeight: 1.5,
      letterSpacing: '0.15px',
    },
    body2: {
      fontFamily: 'Inter',
      fontSize: '14px',
      lineHeight: 1.43,
      letterSpacing: '0.25px',
    },
    caption: {
      fontFamily: 'Inter',
      fontSize: '12px',
      lineHeight: 1.66,
      letterSpacing: '0.4px',
    },
  },

  spacing: spacing,

  shape: {
    borderRadius: borderRadius,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: borderRadius,
          padding: '10px 16px',
        },
        containedPrimary: {
          backgroundColor: colors.primary,
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#0a1f54',
          },
        },
        outlinedPrimary: {
          borderColor: colors.primary,
          color: colors.primary,
          '&:hover': {
            borderColor: '#0a1f54',
            backgroundColor: 'rgba(15, 45, 123, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius,
            '& fieldset': {
              borderColor: colors.border,
            },
            '&:hover fieldset': {
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius,
          backgroundImage: 'none', // Remove gradiente padrão
        },
      },
    },
  },
});

export default theme;
