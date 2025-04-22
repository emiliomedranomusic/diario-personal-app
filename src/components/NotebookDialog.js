// src/components/NotebookDialog.js
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

export default function NotebookDialog({ open, onClose, onSave }) {
  const [nombre, setNombre] = useState('');

  const handleSave = () => {
    if (nombre.trim()) {
      onSave(nombre.trim());
      setNombre(''); // Limpiar después de guardar
      // onClose(); // El padre debería llamar a onClose después de que onSave termine
    }
  };
  const handleClose = () => {
    setNombre(''); // Limpiar al cancelar
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Crear Nuevo Cuaderno</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Nombre del cuaderno"
          type="text"
          fullWidth
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={(e) => { // Allow Enter to save
              if (e.key === 'Enter' && nombre.trim()) {
                  handleSave();
              }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}> {/* Add padding */}
         {/* --- STYLED Buttons --- */}
        <Button
            onClick={handleClose}
            variant="contained" // Contained for solid background
            sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }} // GRAY
         >
             Cancelar
         </Button>
        <Button
            onClick={handleSave}
            variant="contained" // Contained for solid background
            disabled={!nombre.trim()}
            sx={{ backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }} // BLUE (Primary action)
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}