// src/AppLayout.js
import React, { useState } from 'react';
// Importar Button si no está
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Button } from '@mui/material';
import EntradasPage from './pages/EntradasPage';
import EtiquetasPage from './pages/EtiquetasPage';
import PersonasLugaresPage from './pages/PersonasLugaresPage';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout'; // Icono opcional para logout
import { signOut } from "firebase/auth";
import { auth } from "./firebase"; // Asumiendo que exportas auth desde firebase.js

const AppLayout = ({ availableTags, setAvailableTags }) => {
  const [tab, setTab] = useState(0);
  const handleTabChange = (e, v) => setTab(v);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // La redirección al login debería manejarse automáticamente por el listener
      // onAuthStateChanged en App.js que te redirige si user es null.
      console.log("User signed out");
    } catch (error) {
      console.error("Error signing out: ", error);
      // Opcional: Mostrar un Snackbar de error
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        {/* --- Barra Principal con Título y Logout --- */}
        <Toolbar>
          {/* Título a la izquierda */}
          <Typography variant="h6" component="div" sx={{
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'max-content',
      fontWeight: 'bold',
      letterSpacing: 1,
    }}
  >
    Diario Personal
          </Typography>

        {/* Botón cerrar sesión a la derecha */}
  <Box sx={{ flexGrow: 1 }} />
  <Button
    color="inherit"
    onClick={handleLogout}
    size="small"
    startIcon={<LogoutIcon />}
    sx={{
      color: '#fff',
      textTransform: 'none',
      '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
    }}
  >
    Cerrar sesión
  </Button>
</Toolbar>

        {/* --- Barra de Pestañas Separada (o integrada) --- */}
        {/* Mantenerla separada si te gusta visualmente */}
        <Tabs value={tab} onChange={handleTabChange} centered variant="fullWidth" textColor="inherit" indicatorColor="secondary">
          <Tab icon={<DescriptionIcon />} iconPosition="start" label="Entradas" />
          <Tab icon={<LocalOfferIcon />} iconPosition="start" label="Etiquetas" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Personas/Lugares" />
        </Tabs>
        {/* Alternativa: Integrar Tabs en el Toolbar principal si prefieres una sola barra */}
        {/* Si haces eso, quita el segundo <AppBar> y mueve <Tabs> dentro del <Toolbar> */}

      </AppBar>

      {/* ELIMINAR SEGUNDO AppBar que solo tenía el botón */}
      {/*
      <AppBar position="static">
        <Toolbar>
           ...
        </Toolbar>
      </AppBar>
      */}

      {/* Contenido Principal */}
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, flexGrow: 1, overflowY: 'auto' }}>
        {tab === 0 && <EntradasPage availableTags={availableTags} setAvailableTags={setAvailableTags} />}
        {tab === 1 && <EtiquetasPage availableTags={availableTags} setAvailableTags={setAvailableTags} />}
        {tab === 2 && <PersonasLugaresPage />}
      </Box>
    </Box>
  );
};

export default AppLayout;