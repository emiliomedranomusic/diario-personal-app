// Página para gestionar etiquetas
import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, List, ListItem, ListItemText, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
      <Typography variant="h5" gutterBottom>Gestión de Etiquetas</Typography>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <TextField label="Nueva etiqueta" value={newTag} onChange={e => setNewTag(e.target.value)} fullWidth />
        <Button variant="contained" color="primary" onClick={addTag}>Añadir</Button>
      </div>
      <List>
        {availableTags.map((tag, idx) => (
          <ListItem key={idx} secondaryAction={
            <>
              <IconButton edge="end" onClick={() => startEdit(idx)}><EditIcon /></IconButton>
              <IconButton edge="end" onClick={() => deleteTag(idx)}><DeleteIcon /></IconButton>
            </>
          }>
            {editingIndex === idx ? (
              <TextField value={editedTag} onChange={e => setEditedTag(e.target.value)} onBlur={() => saveEdit(idx)} onKeyDown={e => e.key === 'Enter' && saveEdit(idx)} size="small" />
            ) : (
              <ListItemText primary={tag} />
            )}
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default EtiquetasPage;
