// src/components/EntryViewer.js
import React from 'react';
import { Paper, Typography, Box, Button, Divider } from '@mui/material';
import { format } from 'date-fns'; // Opcional: para formatear fechas si son Timestamps
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getStorage, ref as storageRef, getBlob, deleteObject, getBytes, getDownloadURL } from 'firebase/storage';
import { uploadImageToStorage } from '../utils/uploadImageToStorage';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Snackbar from '@mui/material/Snackbar';
import { auth } from '../firebase';
import { Avatar, Chip } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import SchoolIcon from '@mui/icons-material/School';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import ChurchIcon from '@mui/icons-material/Church';
import GroupIcon from '@mui/icons-material/Group';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import FlightIcon from '@mui/icons-material/Flight';

const EntryViewer = ({ entry, onEdit, onDelete, onClose, availableTags = [], notebooks = []}) => {
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'info' });
  const [isResubmitting, setIsResubmitting] = React.useState(false);
  const [attachmentUrls, setAttachmentUrls] = React.useState([]);
  const [attachmentLoading, setAttachmentLoading] = React.useState([]);
  const [attachmentErrors, setAttachmentErrors] = React.useState([]);
  const notebookName = notebooks.find(nb => nb.id === entry.notebookId)?.nombre || entry.notebookId || 'General';
  const ICONS = {
    WorkOutline: <WorkOutlineIcon />, School: <SchoolIcon />, FamilyRestroom: <FamilyRestroomIcon />, StarBorder: <StarBorderIcon />, FavoriteBorder: <FavoriteBorderIcon />, BookOutlined: <BookOutlinedIcon />, Church: <ChurchIcon />, Group: <GroupIcon />, LocalHospital: <LocalHospitalIcon />, AttachMoney: <AttachMoneyIcon />, Flight: <FlightIcon />, LocalOfferOutlined: <LocalOfferOutlinedIcon />
  };

  const renderTags = (tags, tagsList = []) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
      {tags.map((name) => {
        const tag = (tagsList || []).find(t => t.name === name) || { name };
        return (
          <Chip
            key={tag.name}
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Avatar sx={{ bgcolor: tag.color, width: 20, height: 20, mr: 0.5 }}>
                {ICONS[tag.icon] || <LocalOfferOutlinedIcon />}
              </Avatar>
              <span>{tag.name}</span>
            </Box>}
            size="small"
            sx={{ bgcolor: tag.color, color: '#fff', fontWeight: 500 }}
          />
        );
      })}
    </Box>
  );

  React.useEffect(() => {
    if (!entry || !entry.attachments) return;
    let isMounted = true;
    setAttachmentUrls(Array(entry.attachments.length).fill(null));
    setAttachmentLoading(Array(entry.attachments.length).fill(true));
    setAttachmentErrors(Array(entry.attachments.length).fill(null));
    entry.attachments.forEach((att, idx) => {
      if (att.fullPath) {
        getDownloadURL(storageRef(getStorage(), att.fullPath))
          .then(url => {
            if (isMounted) {
              setAttachmentUrls(prev => {
                const arr = [...prev];
                arr[idx] = url;
                return arr;
              });
              setAttachmentLoading(prev => {
                const arr = [...prev];
                arr[idx] = false;
                return arr;
              });
            }
          })
          .catch(err => {
            if (isMounted) {
              setAttachmentErrors(prev => {
                const arr = [...prev];
                arr[idx] = err.message || 'Error al obtener URL';
                return arr;
              });
              setAttachmentLoading(prev => {
                const arr = [...prev];
                arr[idx] = false;
                return arr;
              });
            }
          });
      } else {
        // Fallback: use att.url if no fullPath (legacy attachments)
        setAttachmentUrls(prev => {
          const arr = [...prev];
          arr[idx] = att.url || null;
          return arr;
        });
        setAttachmentLoading(prev => {
          const arr = [...prev];
          arr[idx] = false;
          return arr;
        });
        setAttachmentErrors(prev => {
          const arr = [...prev];
          arr[idx] = att.url ? null : 'Sin URL';
          return arr;
        });
      }
    });
    return () => { isMounted = false; };
  }, [entry]);

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

  // Exportar como TXT
  const handleExportTxt = () => {
    let txt = `Título: ${entry.title || 'Sin título'}\n`;
    txt += `Fecha: ${formatDate(entry.createdAt)}\n`;
    if (entry.tags && entry.tags.length > 0) txt += `Etiquetas: ${entry.tags.join(', ')}\n`;
    txt += `\n${entry.content ? entry.content.replace(/<[^>]+>/g, '') : ''}\n`;
    if (entry.attachments && entry.attachments.length > 0) {
      txt += '\nAdjuntos:\n';
      entry.attachments.forEach(att => {
        txt += `- ${att.name}: ${att.url}\n`;
      });
    }
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${entry.title || 'nota'}.txt`);
  };

  // Exportar como JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
    saveAs(blob, `${entry.title || 'nota'}.json`);
  };

  // Detectar adjuntos antiguos
  const oldAttachments = entry.attachments?.filter(att => !att.fullPath) || [];
  const hasOldAttachments = oldAttachments.length > 0;

  // Re-subir adjuntos antiguos y eliminar los viejos
  const handleResubmitOldAttachments = async () => {
    setIsResubmitting(true);
    let updatedAttachments = [...(entry.attachments || [])];
    let successCount = 0;
    let deletedCount = 0;
    for (const att of oldAttachments) {
      try {
        // Descargar el archivo antiguo
        const response = await fetch(att.url);
        const blob = await response.blob();
        // Crear un File para uploadImageToStorage
        const file = new File([blob], att.name, { type: att.type || blob.type });
        // Subir de nuevo
        const result = await uploadImageToStorage(file, 'attachments');
        // Reemplazar en la lista de adjuntos
        updatedAttachments = updatedAttachments.map(a =>
          a === att ? { ...result } : a
        );
        successCount++;
        // Intentar eliminar el archivo antiguo de Storage
        try {
          // Extraer el path de la URL
          const url = new URL(att.url);
          const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
          const storage = getStorage();
          const oldRef = storageRef(storage, path);
          await deleteObject(oldRef);
          deletedCount++;
        } catch (delErr) {
          // Si falla, solo ignorar
        }
      } catch (e) {
        // Si falla, dejar el adjunto como estaba
      }
    }
    // Actualizar la nota en Firestore
    try {
      const entryRef = doc(db, 'users', entry.userId || entry.uid, 'entries', entry.id);
      await updateDoc(entryRef, { attachments: updatedAttachments });
      setSnackbar({ open: true, message: `Re-subidos ${successCount} adjuntos antiguos. Eliminados ${deletedCount} archivos antiguos.`, severity: 'success' });
      window.location.reload(); // Refrescar para ver los cambios
    } catch (e) {
      setSnackbar({ open: true, message: 'Error actualizando la nota tras re-subir adjuntos.', severity: 'error' });
    } finally {
      setIsResubmitting(false);
    }
  };

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

  // Exportar como ZIP (TXT + adjuntos)
  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      let txt = `Título: ${entry.title || 'Sin título'}\n`;
      txt += `Fecha: ${formatDate(entry.createdAt)}\n`;
      if (entry.tags && entry.tags.length > 0) txt += `Etiquetas: ${entry.tags.join(', ')}\n`;
      txt += `\n${entry.content ? entry.content.replace(/<[^>]+>/g, '') : ''}\n`;
      if (entry.attachments && entry.attachments.length > 0) {
        txt += '\nAdjuntos:\n';
        entry.attachments.forEach(att => {
          txt += `- ${att.name}: ${att.url}\n`;
        });
      }
      zip.file(`${entry.title || 'nota'}.txt`, txt);
      
      // Adjuntos
      let skipped = [];
      let exported = [];
      if (entry.attachments && entry.attachments.length > 0) {
        const storage = getStorage();
        for (const att of entry.attachments) {
          try {
            if (att.fullPath) {
              console.log(`[ZIP] Intentando exportar adjunto: ${att.name} con fullPath: ${att.fullPath}`);
              // Por ahora solo añadimos el nombre del archivo al ZIP
              zip.file(att.name, `[Archivo adjunto: ${att.name}]\nURL: ${att.url}`);
              exported.push(att.name);
            } else {
              console.warn(`[ZIP] Adjunto sin fullPath: ${att.name}`);
              skipped.push(att.name);
            }
          } catch (e) {
            console.error(`[ZIP] Error exportando adjunto: ${att.name}`, e);
            skipped.push(att.name);
          }
        }
      }
      
      if (exported.length > 0) {
        setSnackbar({ open: true, message: `Adjuntos incluidos: ${exported.join(', ')}`, severity: 'success' });
      }
      if (skipped.length > 0) {
        setSnackbar({ open: true, message: `No se pudieron incluir: ${skipped.join(', ')}`, severity: 'warning' });
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${entry.title || 'nota'}.zip`);
    } catch (err) {
      console.error('[ZIP] Error crítico en la exportación:', err);
      setSnackbar({ open: true, message: `Error crítico exportando ZIP: ${err.message || err}`, severity: 'error' });
    }
  };

  if (entry && entry.attachments && entry.attachments.length > 0) {
    console.log('UID actual:', auth.currentUser?.uid);
    entry.attachments.forEach(att => {
      // Extraer el UID de la ruta fullPath
      const match = att.fullPath ? att.fullPath.match(/^attachments\/(.*?)\//) : null;
      const uidInPath = match ? match[1] : 'NO_UID';
      console.log('Adjunto:', att.name, 'fullPath:', att.fullPath, 'UID en path:', uidInPath);
    });
  }

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', minHeight: 500, boxShadow: 3, borderRadius: 2 }}>
      {/* Encabezado con Título y Fecha */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="h5" gutterBottom>
          {entry.title || 'Entrada sin título'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formattedDate}
          {entry.notebookId && (
    <> | Cuaderno: {notebookName}</>
  )}
        </Typography>
         {entry.tags && entry.tags.length > 0 && (
            <Box sx={{ mt: 1 }}>{renderTags(entry.tags, availableTags)}</Box>
         )}
        {/* Botones de exportación */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleExportTxt}
            sx={{ backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }}
          >
            Exportar TXT
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleExportJson}
            sx={{ backgroundColor: '#43a047', color: '#fff', '&:hover': { backgroundColor: '#388e3c' } }}
          >
            Exportar JSON
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleExportZip}
            sx={{ backgroundColor: '#fb8c00', color: '#fff', '&:hover': { backgroundColor: '#ef6c00' } }}
          >
            Exportar ZIP (con adjuntos)
          </Button>
        </Box>
        {hasOldAttachments && (
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography color="warning.main" variant="body2">
              Algunos adjuntos fueron subidos antes de la actualización y no pueden exportarse como archivos reales.<br />
              <b>Re-súbelos</b> para poder exportarlos correctamente.
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              color="warning"
              onClick={handleResubmitOldAttachments}
              disabled={isResubmitting}
              sx={{ mt: 1 }}
            >
              {isResubmitting ? 'Re-subiendo...' : 'Re-subir adjuntos antiguos'}
            </Button>
          </Box>
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
                {attachmentLoading[idx] ? (
                  <Box sx={{ width: 100, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 4, border: '1px solid #ccc', mb: 0.5 }}>
                    <Typography variant="caption">Cargando...</Typography>
                  </Box>
                ) : attachmentErrors[idx] ? (
                  <Box sx={{ width: 100, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#ffeaea', borderRadius: 4, border: '1px solid #e57373', mb: 0.5 }}>
                    <Typography variant="caption" color="error">No disponible</Typography>
                  </Box>
                ) : att.type && att.type.startsWith('image/') ? (
                  <img src={attachmentUrls[idx]} alt={att.name} style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 4, marginBottom: 4, border: '1px solid #ccc' }} />
                ) : (
                  <Box sx={{ width: 100, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 4, border: '1px solid #ccc', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ textAlign: 'center' }}>{att.name ? att.name.split('.').pop().toUpperCase() : 'ARCHIVO'}</Typography>
                  </Box>
                )}
                {attachmentLoading[idx] ? (
                  <Typography variant="caption" sx={{ fontSize: 12 }}>Cargando enlace...</Typography>
                ) : attachmentErrors[idx] ? (
                  <Typography variant="caption" color="error" sx={{ fontSize: 12 }}>{attachmentErrors[idx]}</Typography>
                ) : (
                  <a href={attachmentUrls[idx]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, textDecoration: 'underline', wordBreak: 'break-all' }}>{att.name && att.name.length > 16 ? att.name.slice(0, 13) + '...' : att.name}</a>
                )}
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
};

export default EntryViewer;