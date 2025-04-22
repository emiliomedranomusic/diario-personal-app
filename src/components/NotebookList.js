import React, { useState } from 'react';
import { List, ListItem, ListItemIcon, ListItemText, IconButton, Typography, Box, Button, Divider, Collapse } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

// Componente para mostrar la lista de cuadernos en la sidebar, ahora desplegable
export default function NotebookList({ notebooks, selectedNotebookId, onSelect, onCreate, onDelete }) {
  const [open, setOpen] = useState(true);
  // Cuadernos del sistema que no se pueden eliminar
  const systemNotebooks = ['all', 'default'];
  const handleSelect = (id) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };
  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', ml: 1 }}>Cuadernos</Typography>
          {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </Box>
        <IconButton size="small" onClick={onCreate} title="Nuevo cuaderno">
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List>
          {notebooks.map(nb => (
            <ListItem
              key={nb.id}
              button
              selected={nb.id === selectedNotebookId}
              onClick={() => handleSelect(nb.id)}
              sx={{ borderRadius: 1, mb: 0.5 }}
              secondaryAction={
                !systemNotebooks.includes(nb.id) && (
                  <IconButton edge="end" aria-label="eliminar" size="small" onClick={e => { e.stopPropagation(); onDelete(nb); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemIcon>
                <MenuBookIcon fontSize="small" color={nb.id === selectedNotebookId ? 'primary' : 'action'} />
              </ListItemIcon>
              <ListItemText
                primary={nb.nombre}
                secondary={nb.count !== undefined ? `${nb.count} notas` : ''}
                primaryTypographyProps={{ fontWeight: nb.id === selectedNotebookId ? 'bold' : 'normal' }}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );
}
