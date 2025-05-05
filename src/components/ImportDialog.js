import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { db, storage, auth } from '../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const steps = ['Seleccionar archivo', 'Vista previa', 'Importar'];

const ImportDialog = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importEntries, setImportEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Paso 1: Selección de archivo
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setLoading(true);
    setImportEntries([]);
    setSelectedEntries([]);
    let entries = [];
    try {
      if (!file.name.endsWith('.json')) {
        alert('Solo se permite importar archivos exportados en formato JSON.');
        setLoading(false);
        setSelectedFile(null);
        return;
      }
      // Parsear JSON
      const text = await file.text();
      let data = JSON.parse(text);
      if (!Array.isArray(data)) {
        // Si es un objeto individual, lo convertimos a array
        data = [data];
      }
      entries = data.map((entry, idx) => ({
        id: entry.id || `json-${idx}`,
        title: entry.title || `Nota ${idx + 1}`,
        date: entry.date || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        content: entry.content || '',
        attachments: Array.isArray(entry.attachments) ? entry.attachments : []
      }));
      setImportEntries(entries);
      setSelectedEntries(entries.map(e => e.id));
      setActiveStep(1);
    } catch (err) {
      alert('Error leyendo archivo: ' + err.message);
      setImportEntries([]);
      setSelectedEntries([]);
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Importar (simulado)
  const handleImport = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const entriesToImport = importEntries.filter(e => selectedEntries.includes(e.id));
      for (const entry of entriesToImport) {
        // Crear entrada en Firestore
        const entryRef = doc(collection(db, 'users', user.uid, 'entries'));
        // Adjuntos: si vienen como archivos (ZIP), subimos a Storage y guardamos URL
        let attachments = [];
        if (entry.attachments && entry.attachments.length > 0) {
          for (const att of entry.attachments) {
            if (att.file && typeof att.file.async === 'function') {
              // Es un archivo de ZIP
              const blob = await att.file.async('blob');
              const storagePath = `attachments/${user.uid}/${Date.now()}-${att.name}`;
              const fileRef = storageRef(storage, storagePath);
              await uploadBytes(fileRef, blob);
              const url = await getDownloadURL(fileRef);
              attachments.push({ name: att.name, url, fullPath: storagePath });
            } else if (att.url) {
              // Es un adjunto de JSON
              attachments.push(att);
            }
          }
        }
        await setDoc(entryRef, {
          title: entry.title,
          content: entry.content || '',
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          createdAt: entry.date || new Date().toISOString(),
          attachments,
          updatedAt: new Date()
        });
      }
      setActiveStep(2);
    } catch (err) {
      alert('Error importando: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEntry = (id) => {
    setSelectedEntries((prev) =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const handleBack = () => {
    if (activeStep === 0) return;
    setActiveStep(activeStep - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedFile(null);
    setImportEntries([]);
    setSelectedEntries([]);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importar Diario</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {activeStep === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Selecciona un archivo exportado previamente (<b>solo JSON</b>):
            </Typography>
            <Button variant="contained" component="label">
              Seleccionar archivo
              <input type="file" hidden accept=".json" onChange={handleFileChange} />
            </Button>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Archivo seleccionado: {selectedFile.name}
              </Typography>
            )}
          </Box>
        )}
        {activeStep === 1 && (
          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>Analizando archivo...</Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Selecciona las notas que deseas importar:
                </Typography>
                <List>
                  {importEntries.map(entry => (
                    <ListItem key={entry.id} button onClick={() => handleToggleEntry(entry.id)}>
                      <Checkbox checked={selectedEntries.includes(entry.id)} />
                      <ListItemText
                        primary={entry.title}
                        secondary={`Fecha: ${entry.date} | Adjuntos: ${Array.isArray(entry.attachments) ? entry.attachments.length : 0}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
        {activeStep === 2 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            {loading ? (
              <CircularProgress />
            ) : (
              <Typography variant="h6" color="success.main">
                ¡Importación completada!
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {activeStep > 0 && activeStep < 2 && (
          <Button onClick={handleBack} disabled={loading}>Atrás</Button>
        )}
        {activeStep === 1 && (
          <Button onClick={handleImport} variant="contained" disabled={loading || selectedEntries.length === 0}>
            Importar seleccionados
          </Button>
        )}
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog; 