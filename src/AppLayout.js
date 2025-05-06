// src/AppLayout.js
import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Button, IconButton } from '@mui/material';
// Importar useNavigate para la navegación
import { useNavigate } from 'react-router-dom'; // <-- AÑADIR ESTA LÍNEA
import EntradasPage from './pages/EntradasPage';
import EtiquetasPage from './pages/EtiquetasPage';
import PersonasLugaresPage from './pages/PersonasLugaresPage';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

// NO necesitas importar el logo si está en /public

const AppLayout = ({ availableTags, setAvailableTags }) => {
  const [tab, setTab] = useState(0);
  const navigate = useNavigate(); // <-- Hook para navegación

  const handleTabChange = (e, v) => setTab(v);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out");
      // La redirección al login es manejada por el listener en App.js
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleLogoClick = () => {
    // Navegar a la ruta principal (o la que consideres "Home")
    // Si tu ruta principal es "/", esto te lleva a EntradasPage (tab 0)
    navigate('/');
    setTab(0); // Opcional: Asegurar que la pestaña Entradas esté activa
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          {/* Contenedor para Logo y Título */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {/* LOGO (Clickeable) */}
            {/* Usar un IconButton o un simple Box/img con onClick */}
            <IconButton
              onClick={handleLogoClick}
              color="inherit" // Para que los efectos hover sean consistentes
              aria-label="Ir a inicio"
              sx={{ p: 0.5, mr: 1 }} // Ajustar padding y margen
            >
              <img
                // La ruta es relativa a la raíz del sitio si está en /public
                src="/favicon.svg" // <-- CAMBIA "logo.png" por el nombre EXACTO de tu archivo de logo en /public
                alt="Moments Logo"
                style={{
                  height: '32px', // Ajusta el tamaño
                  display: 'block' // Para evitar espacio extra debajo
                }}
              />
            </IconButton>

            {/* TÍTULO */}
            <Typography
              variant="h6"
              component="div"
              onClick={handleLogoClick} // Hacer el título clickeable también
              sx={{
                cursor: 'pointer', // Indicar que es clickeable
                // fontWeight: 'bold',
                // letterSpacing: 1,
              }}
            >
              Moments
            </Typography>
          </Box>

          {/* Botón Cerrar Sesión */}
          <Button
            color="inherit"
            onClick={handleLogout}
            size="small"
            startIcon={<LogoutIcon />}
            sx={{
                 color: '#ffffff',
                 textTransform: 'none',
                 '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
             }}
          >
            Cerrar sesión
          </Button>
        </Toolbar>

        {/* Pestañas */}
        <Tabs value={tab} onChange={handleTabChange} centered variant="fullWidth" textColor="inherit" indicatorColor="secondary">
          <Tab icon={<DescriptionIcon />} iconPosition="start" label="Entradas" />
          <Tab icon={<LocalOfferIcon />} iconPosition="start" label="Etiquetas" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Personas/Lugares" />
        </Tabs>
      </AppBar>

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