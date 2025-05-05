import React, { useState } from 'react';
import { List, ListItem, ListItemIcon, ListItemText, IconButton, Typography, Box, Button, Divider, Collapse } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import Tooltip from '@mui/material/Tooltip';

// Componente para mostrar la lista de cuadernos en la sidebar, ahora desplegable
export default function NotebookList({ notebooks, selectedNotebookId, onSelect, onCreate, onDelete, onEdit }) {
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
        <Box display="flex" alignItems="center" sx={{ cursor: 'pointer', gap: 0.5 }} onClick={() => setOpen(o => !o)}>
          <LibraryBooksIcon fontSize="small" sx={{ color: 'action.active' }}/>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Cuadernos</Typography>
          {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </Box>
        <Tooltip title="Nuevo cuaderno">
          <IconButton size="small" onClick={onCreate}> <AddIcon fontSize="small" /> </IconButton>
        </Tooltip>
      </Box>
      <Divider sx={{ mb: 1 }}/>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List>
          {notebooks.map(nb => (
            <ListItem
              key={nb.id}
              selected={nb.id === selectedNotebookId}
              onClick={() => handleSelect(nb.id)}
              sx={{ borderRadius: 1, mb: 0.5 }}
              secondaryAction={
                !systemNotebooks.includes(nb.id) && (
                  <Box>
                    <Tooltip title="Renombrar cuaderno">
                      <IconButton edge="end" aria-label="editar" size="small" sx={{ mr: 0.5 }}
                        onClick={e => { e.stopPropagation(); if (onEdit) onEdit(nb); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar cuaderno">
                      <IconButton edge="end" aria-label="eliminar" size="small"
                        onClick={e => { e.stopPropagation(); if (onDelete) onDelete(nb); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
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
