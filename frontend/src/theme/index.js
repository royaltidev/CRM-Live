import { createTheme } from '@mui/material/styles';

// Tema customizado do Material UI (MUI), derivado dos tokens do design system
// "Admin Logic" definido em docs/Design/design.md. O tema padrão do MUI NÃO é
// usado (docs/FSD.md, seções 3 e 12) — todas as cores, tipografia, raio e
// espaçamento abaixo vêm diretamente do front-matter de docs/Design/design.md.

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f2d7b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#97378d',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ba1a1a',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f7f9fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#191c1e',
      secondary: '#444651',
    },
    divider: '#c5c5d3',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontFamily: 'Public Sans, sans-serif',
      fontSize: 24,
      fontWeight: 700,
      lineHeight: '32px',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: 'Public Sans, sans-serif',
      fontSize: 20,
      fontWeight: 600,
      lineHeight: '28px',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: 'Public Sans, sans-serif',
      fontSize: 16,
      fontWeight: 600,
      lineHeight: '24px',
    },
    body1: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 400,
      lineHeight: '24px',
    },
    body2: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: 400,
      lineHeight: '20px',
    },
    caption: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      fontWeight: 400,
      lineHeight: '18px',
    },
    button: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      fontWeight: 600,
      lineHeight: '16px',
      letterSpacing: '0.05em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 4, // 0.25rem — raio padrão de botões, campos e cards pequenos
  },
  spacing: 4, // base de 4px, conforme docs/Design/design.md
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 8 }, // containers/módulos maiores usam 0.5rem
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 9999 }, // status pills — raio total
      },
    },
  },
});

export default theme;
