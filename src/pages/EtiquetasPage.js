// Página para gestionar etiquetas
import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, Box, Tooltip, ListItemIcon } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';

const EtiquetasPage = ({ availableTags, setAvailableTags }) => {
  const [newTag, setNewTag] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedTag, setEditedTag] = useState('');

  const addTag = () => {
    const tagTrim = newTag.trim();
    if (tagTrim && !availableTags.includes(tagTrim)) {
      setAvailableTags([...availableTags, tagTrim]);
      setNewTag('');
    }
  };
  const deleteTag = (index) => {
    setAvailableTags(availableTags.filter((_, i) => i !== index));
  };
  const startEdit = (index) => {
    setEditingIndex(index);
    setEditedTag(availableTags[index]);
  };
  const saveEdit = (index) => {
    const tagTrim = editedTag.trim();
    if (tagTrim) {
      const updated = [...availableTags];
      updated[index] = tagTrim;
      setAvailableTags(updated);
      setEditingIndex(null);
      setEditedTag('');
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 500, margin: '32px auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LocalOfferOutlinedIcon color="primary"/>
        <Typography variant="h5" component="h1">Gestión de Etiquetas</Typography>
      </Box>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <TextField label="Nueva etiqueta" value={newTag} onChange={e => setNewTag(e.target.value)} fullWidth />
        <Button variant="contained" color="primary" onClick={addTag}>Añadir</Button>
      </div>
      <List>
        {availableTags.map((tag, idx) => (
          <ListItem
            key={idx}
            secondaryAction={
              <>
                <Tooltip title="Editar etiqueta">
                  <IconButton edge="end" onClick={() => startEdit(idx)} size="small" sx={{ mr: 0.5 }}>
                    <EditIcon fontSize="inherit"/>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar etiqueta">
                  <IconButton edge="end" onClick={() => deleteTag(idx)} size="small">
                    <DeleteIcon fontSize="inherit"/>
                  </IconButton>
                </Tooltip>
              </>
            }
            sx={{ borderBottom: '1px solid #eee' }}
            disablePadding
          >
            <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'action.active' }}>
              <LocalOfferOutlinedIcon fontSize="small" />
            </ListItemIcon>
            {editingIndex === idx ? (
              <TextField
                value={editedTag}
                onChange={e => setEditedTag(e.target.value)}
                onBlur={() => saveEdit(idx)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit(idx)}
                size="small"
                variant="standard"
                autoFocus
                sx={{ flexGrow: 1 }}
              />
            ) : (
              <ListItemText primary={tag} />
            )}
          </ListItem>
        ))}
        {availableTags.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
            No hay etiquetas definidas.
          </Typography>
        )}
      </List>
    </Paper>
  );
};

export default EtiquetasPage;
