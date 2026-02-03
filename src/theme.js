import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#ff1744', // Crimson Red
    },
    secondary: {
      main: '#d50000', // Dark Red
    },
    error: {
      main: '#ff5252', // Light Red
    },
    background: {
      default: '#000000', // Pure Black
      paper: 'rgba(255, 0, 0, 0.08)', // Red-tinted glassmorphism
    },
    text: {
      primary: '#ffffff',
      secondary: '#ffcdd2',
    },
  },
  typography: {
    fontFamily: 'Rajdhani, Fira Code, sans-serif',
    h1: {
      textShadow: '0 0 3px #e0e0e0',
    },
    h2: {
      textShadow: '0 0 3px #e0e0e0',
    },
    body1: {
      textShadow: '0 0 3px #a0a0c0',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: '0 0 5px #ff1744',
          '&:hover': {
            boxShadow: '0 0 10px #ff1744',
          },
        },
      },
    },
  },
});

export default theme;