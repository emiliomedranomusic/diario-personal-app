// src/pages/PersonasLugaresPage.js
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Button, Box, CircularProgress } from '@mui/material';
import ProfileList from '../components/ProfileList';
import ProfileDialog from '../components/ProfileDialog';
import { subscribeToUserProfiles, addProfile, updateProfile, deleteProfile } from '../services/profileService';
import SnackbarAlert from '../components/SnackbarAlert';

const PersonasLugaresPage = ({ entries = [] }) => {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Suscribirse a los perfiles de Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToUserProfiles((fetchedProfiles) => {
      setProfiles(fetchedProfiles);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- CRUD Operations (usando el servicio) ---
  const handleSaveProfile = async (profileData) => {
    setIsLoading(true);
    let message = '';
    try {
      if (profileData.id) {
        await updateProfile(profileData.id, profileData);
        message = 'Perfil actualizado correctamente.';
      } else {
        await addProfile(profileData);
        message = 'Perfil creado correctamente.';
      }
      setSnackbar({ open: true, message, severity: 'success' });
      setIsDialogOpen(false);
      setEditingProfile(null);
    } catch (error) {
      console.error("Error saving profile:", error);
      setSnackbar({ open: true, message: `Error guardando perfil: ${error.message}`, severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (profileToDelete) => {
    if (!profileToDelete || !profileToDelete.id) return;

    // Preguntar si se quieren limpiar referencias (opcional, podrías hacerlo siempre)
    const shouldClean = window.confirm(`¿Eliminar también las menciones a "${profileToDelete.nombre}" de todas las entradas? (Puede tardar un momento si hay muchas entradas)`);

    setIsLoading(true);
    try {
      // Pasar el flag `shouldClean` al servicio
      await deleteProfile(profileToDelete.id, shouldClean);
      setSnackbar({ open: true, message: `Perfil "${profileToDelete.nombre}" eliminado. ${shouldClean ? 'Referencias limpiadas.' : ''}`, severity: 'info' });
      setIsDialogOpen(false);
      setEditingProfile(null);
    } catch (error) {
      console.error("Error deleting profile:", error);
      setSnackbar({ open: true, message: `Error eliminando perfil: ${error.message}`, severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (profileToEdit) => {
    setEditingProfile(profileToEdit);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProfile({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProfile(null);
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 900, margin: '32px auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" gutterBottom>Personas y Lugares</Typography>
        <Button variant="contained" onClick={handleCreate} sx={{ backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }} > Crear Nuevo Perfil </Button>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Gestiona los perfiles asociados a tus entradas. Los datos se guardan en la nube.
      </Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ProfileList
          profiles={profiles || []}
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      {isDialogOpen && (
        <ProfileDialog open={isDialogOpen} onClose={handleCloseDialog} onSave={handleSaveProfile} onDelete={handleDelete} initialData={editingProfile || {}} isEdit={!!editingProfile?.id} />
      )}
      <SnackbarAlert {...snackbar} onClose={() => setSnackbar(s => ({ ...s, open: false }))} />
    </Paper>
  );
};

export default PersonasLugaresPage;