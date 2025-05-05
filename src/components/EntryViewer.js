// src/components/EntryViewer.js
import React from 'react';
import { Paper, Typography, Box, Button, Divider } from '@mui/material';
import { format } from 'date-fns'; // Opcional: para formatear fechas si son Timestamps

const EntryViewer = ({ entry, onEdit, onDelete, onClose }) => {

  if (!entry) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', minHeight: 400 }}>
        <Typography color="text.secondary">Selecciona una entrada para verla.</Typography>
      </Paper>
    );
  }

  // Formatear fecha (ajustar según cómo esté guardada)
  const formatDate = (createdAt) => {
    if (!createdAt) return 'Sin fecha';
    if (createdAt.toDate) { // Firestore Timestamp
      try {
        return format(createdAt.toDate(), 'dd/MM/yyyy'); // Ejemplo de formato
      } catch {
        return 'Fecha inválida';
      }
    }
    if (typeof createdAt === 'object') { // Objeto parcial
      return `${createdAt.day || '?'} ${createdAt.month || '?'} ${createdAt.year || '?'}`.trim();
    }
    // Añadir más casos si es necesario (string, Date object)
    return String(createdAt);
  };

  const formattedDate = formatDate(entry.createdAt);

  // *** AÑADIR CONFIRMACIÓN AL HANDLER DELETE ***
  const handleDeleteWithConfirm = () => {
      if (window.confirm(`¿Estás seguro de que quieres eliminar la entrada "${entry.title || 'Sin título'}"?`)) {
          onDelete(); // Llama a la prop onDelete solo si se confirma
      }
  };

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', minHeight: 500, boxShadow: 3, borderRadius: 2 }}>
      {/* Encabezado con Título y Fecha */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="h5" gutterBottom>
          {entry.title || 'Entrada sin título'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formattedDate}
          {entry.notebookId && entry.notebookId !== 'default' && ` | Cuaderno: ${entry.notebookId}`} {/* Opcional: mostrar cuaderno */}
        </Typography>
         {entry.tags && entry.tags.length > 0 && (
            <Typography variant="caption" display="block" color="text.secondary">
                 Etiquetas: {entry.tags.join(', ')}
            </Typography>
         )}
      </Box>
      <Divider sx={{ mb: 2, flexShrink: 0 }} />

      {/* Contenido de la Entrada (Scrollable) */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, '& img': { maxWidth: '100%', height: 'auto' }, '& p': { marginY: '0.5em' } }}>
        <Typography component="div" variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
           {/* Renderizar HTML de forma segura */}
           <span dangerouslySetInnerHTML={{ __html: entry.content || '' }} />
        </Typography>
      </Box>
      {/* --- Adjuntos tipo Gmail --- */}
      {entry.attachments && entry.attachments.length > 0 && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Adjuntos:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {entry.attachments.map((att, idx) => (
              <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120 }}>
                {att.type && att.type.startsWith('image/') ? (
                  <img src={att.url} alt={att.name} style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 4, marginBottom: 4, border: '1px solid #ccc' }} />
                ) : (
                  <Box sx={{ width: 100, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 4, border: '1px solid #ccc', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ textAlign: 'center' }}>{att.name ? att.name.split('.').pop().toUpperCase() : 'ARCHIVO'}</Typography>
                  </Box>
                )}
                <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, textDecoration: 'underline', wordBreak: 'break-all' }}>{att.name && att.name.length > 16 ? att.name.slice(0, 13) + '...' : att.name}</a>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Acciones al Final */}
      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 1, flexShrink: 0 }}>
        <Button
            variant="contained"
            onClick={onClose} // Llama a onClose directamente
            sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }} // GRAY
        >
          Cerrar
        </Button>
         <Button
            variant="contained"
            // *** LLAMA A handleDeleteWithConfirm ***
            onClick={handleDeleteWithConfirm}
            sx={{ backgroundColor: 'error.main', color: '#fff', '&:hover': { backgroundColor: 'error.dark' } }} // RED
        >
          Eliminar
        </Button>
        <Button
            variant="contained"
            onClick={onEdit} // Llama a onEdit directamente
            // *** AMARILLO/NARANJA para Editar ***
            sx={{ backgroundColor: 'warning.main', color: '#fff', '&:hover': { backgroundColor: 'warning.dark' } }}
        >
          Editar
        </Button>
      </Box>
    </Paper>
  );
};

export default EntryViewer;