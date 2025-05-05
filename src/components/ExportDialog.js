import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Code as CodeIcon,
  FolderZip as FolderZipIcon,
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { ref } from 'firebase/storage';
import { storage } from '../firebase';

// Helper para timeout de promesas
function promiseTimeout(promise, ms, errorMsg) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

const ExportDialog = ({ open, onClose, entries }) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      const data = entries.map(entry => ({
        ...entry,
        attachments: entry.attachments || [],
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      saveAs(blob, `diario-export-${new Date().toISOString().split('T')[0]}.json`);
      onClose();
    } catch (error) {
      console.error('Error exporting JSON:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportTXT = async () => {
    try {
      setExporting(true);
      const zip = new JSZip();
      
      entries.forEach(entry => {
        const content = `Título: ${entry.title}\n\nFecha: ${new Date(entry.date).toLocaleString()}\n\nContenido:\n${entry.content}\n\nEtiquetas: ${entry.tags?.join(', ') || ''}`;
        zip.file(`${entry.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `diario-export-txt-${new Date().toISOString().split('T')[0]}.zip`);
      onClose();
    } catch (error) {
      console.error('Error exporting TXT:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportWithAttachments = async () => {
    try {
      setExporting(true);
      const zip = new JSZip();
      let processed = 0;
      const total = entries.length;

      for (const entry of entries) {
        setProgress({
          current: processed + 1,
          total,
          message: `Procesando: ${entry.title}`
        });

        // Carpeta para la nota
        const entryFolder = zip.folder(entry.title.replace(/[^a-z0-9]/gi, '_').toLowerCase());
        // Contenido principal como TXT
        const content = `Título: ${entry.title}\n\nFecha: ${new Date(entry.date).toLocaleString()}\n\nContenido:\n${entry.content}\n\nEtiquetas: ${entry.tags?.join(', ') || ''}`;
        entryFolder.file('contenido.txt', content);

        // Adjuntos como archivos de texto con la URL, usando el nombre original
        if (entry.attachments?.length > 0) {
          const attachmentsFolder = entryFolder.folder('adjuntos');
          for (const attachment of entry.attachments) {
            attachmentsFolder.file(
              attachment.name,
              `[Archivo adjunto: ${attachment.name}]\nURL: ${attachment.url}`
            );
          }
        }
        processed++;
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `diario-export-completo-${new Date().toISOString().split('T')[0]}.zip`);
      onClose();
    } catch (error) {
      console.error('Error exporting with attachments:', error);
    } finally {
      setExporting(false);
      setProgress({ current: 0, total: 0, message: '' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Exportar Diario</DialogTitle>
      <DialogContent>
        {exporting ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              {progress.message}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.current} de {progress.total}
            </Typography>
          </Box>
        ) : (
          <List>
            <ListItem button onClick={handleExportJSON}>
              <ListItemIcon>
                <CodeIcon sx={{ color: '#4caf50' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Exportar como JSON" 
                secondary="Exporta todas las entradas en formato JSON"
              />
            </ListItem>
            <ListItem button onClick={handleExportTXT}>
              <ListItemIcon>
                <DescriptionIcon sx={{ color: '#2196f3' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Exportar como TXT (ZIP)" 
                secondary="Exporta todas las entradas como archivos de texto en un ZIP"
              />
            </ListItem>
            <ListItem button onClick={handleExportWithAttachments}>
              <ListItemIcon>
                <FolderZipIcon sx={{ color: '#ff9800' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Exportar Completo (ZIP)" 
                secondary="Exporta todas las entradas con sus adjuntos en un ZIP"
              />
            </ListItem>
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog; 