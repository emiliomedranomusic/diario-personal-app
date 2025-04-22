// src/components/NotebookDialog.js
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

export default function NotebookDialog({
  open, onClose, onSave, existingNotebooks = [],
  initialName = '', isEditMode = false
}) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNombre(initialName || '');
      setError('');
    }
  }, [open, initialName]);

  const handleSave = () => {
    const trimmedName = nombre.trim();
    if (!trimmedName) { setError('El nombre no puede estar vacío.'); return; }
    const isDuplicate = existingNotebooks.some(nb =>
      nb.nombre.toLowerCase() === trimmedName.toLowerCase() &&
      (!isEditMode || nb.nombre.toLowerCase() !== initialName.toLowerCase())
    );
    if (isDuplicate) { setError(`El cuaderno "${trimmedName}" ya existe.`); return; }
    setError('');
    onSave(trimmedName);
  };

  const handleClose = () => { onClose(); };
  const handleChange = (e) => { setNombre(e.target.value); if (error) { setError(''); } };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEditMode ? 'Renombrar Cuaderno' : 'Crear Nuevo Cuaderno'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus margin="dense" label="Nombre del cuaderno" type="text" fullWidth
          value={nombre} onChange={handleChange}
          onKeyDown={(e) => { if (e.key === 'Enter' && !error) { handleSave(); } }}
          required error={!!error}
          helperText={error || "Introduce un nombre único."}
          sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="contained" sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }}> Cancelar </Button>
        <Button onClick={handleSave} variant="contained"
                disabled={!nombre.trim() || !!error || (isEditMode && nombre.trim() === initialName.trim())}
                sx={{ backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }}>
            {isEditMode ? 'Renombrar' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}