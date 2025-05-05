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
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReactDiffViewer from 'react-diff-viewer';

const steps = ['Seleccionar archivo', 'Vista previa', 'Importar'];

const ImportDialog = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importEntries, setImportEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [applyToAllAction, setApplyToAllAction] = useState(null);
  const [applyToAllChecked, setApplyToAllChecked] = useState(false);

  // Paso 1: Selección de archivo
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    setSelectedFile(files.length === 1 ? files[0] : null);
    setLoading(true);
    setImportEntries([]);
    setSelectedEntries([]);
    let allEntries = [];
    try {
      for (const file of files) {
        if (!file.name.endsWith('.json')) {
          alert('Solo se permite importar archivos exportados en formato JSON.');
          setLoading(false);
          setSelectedFile(null);
          return;
        }
        const text = await file.text();
        let data = JSON.parse(text);
        if (!Array.isArray(data)) {
          data = [data];
        }
        const entries = data.map((entry, idx) => ({
          id: entry.id || `json-${idx}`,
          title: entry.title || `Nota ${idx + 1}`,
          date: entry.date || '',
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          content: entry.content || '',
          attachments: Array.isArray(entry.attachments) ? entry.attachments : []
        }));
        allEntries = allEntries.concat(entries);
      }
      setImportEntries(allEntries);
      setSelectedEntries(allEntries.map(e => e.id));
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
      let skipAllConflicts = false;
      let actionForAll = null;
      for (let i = 0; i < entriesToImport.length; i++) {
        const entry = entriesToImport[i];
        // Buscar conflicto por título usando la SDK moderna
        const entriesRef = collection(db, 'users', user.uid, 'entries');
        const q = query(entriesRef, where('title', '==', entry.title));
        const querySnapshot = await getDocs(q);
        let existing = null;
        querySnapshot.forEach(docSnap => { existing = { id: docSnap.id, ...docSnap.data() }; });
        if (existing) {
          // Comparar contenido
          const isSameContent = (existing.content || '') === (entry.content || '');
          let action = actionForAll;
          if (!skipAllConflicts) {
            // Mostrar diálogo y esperar acción
            // Usar una promesa con un estado local para evitar warnings de función en bucle
            // eslint-disable-next-line no-loop-func
            await new Promise(resolve => {
              const handleResolve = (userAction, applyToAll) => {
                action = userAction;
                if (applyToAll) {
                  skipAllConflicts = true;
                  actionForAll = userAction;
                }
                setConflict(null);
                resolve();
              };
              setConflict({
                importedNote: entry,
                existingNote: existing,
                showDiff: !isSameContent,
                resolve: handleResolve,
                applyToAll: applyToAllChecked,
                setApplyToAll: setApplyToAllChecked
              });
            });
          }
          if (action === 'replace') {
            // Sobrescribir la nota existente
            const entryRef = doc(db, 'users', user.uid, 'entries', existing.id);
            let attachments = [];
            if (entry.attachments && entry.attachments.length > 0) {
              for (const att of entry.attachments) {
                if (att.file && typeof att.file.async === 'function') {
                  const blob = await att.file.async('blob');
                  const storagePath = `attachments/${user.uid}/${Date.now()}-${att.name}`;
                  const fileRef = storageRef(storage, storagePath);
                  await uploadBytes(fileRef, blob);
                  const url = await getDownloadURL(fileRef);
                  attachments.push({ name: att.name, url, fullPath: storagePath });
                } else if (att.url) {
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
          } else if (action === 'duplicate') {
            // Obtener título incremental
            const newTitle = await getNextDuplicateTitle(entry.title, user);
            const entryRef = doc(collection(db, 'users', user.uid, 'entries'));
            let attachments = [];
            if (entry.attachments && entry.attachments.length > 0) {
              for (const att of entry.attachments) {
                if (att.file && typeof att.file.async === 'function') {
                  const blob = await att.file.async('blob');
                  const storagePath = `attachments/${user.uid}/${Date.now()}-${att.name}`;
                  const fileRef = storageRef(storage, storagePath);
                  await uploadBytes(fileRef, blob);
                  const url = await getDownloadURL(fileRef);
                  attachments.push({ name: att.name, url, fullPath: storagePath });
                } else if (att.url) {
                  attachments.push(att);
                }
              }
            }
            await setDoc(entryRef, {
              title: newTitle,
              content: entry.content || '',
              tags: Array.isArray(entry.tags) ? entry.tags : [],
              createdAt: entry.date || new Date().toISOString(),
              attachments,
              updatedAt: new Date()
            });
          } else if (action === 'skip') {
            // Si es la última nota, continuar al paso de éxito
            if (i === entriesToImport.length - 1) {
              setActiveStep(2);
              setLoading(false);
              return;
            }
            continue;
          }
          continue;
        }
        // Si no hay conflicto, importar normalmente
        const entryRef = doc(collection(db, 'users', user.uid, 'entries'));
        let attachments = [];
        if (entry.attachments && entry.attachments.length > 0) {
          for (const att of entry.attachments) {
            if (att.file && typeof att.file.async === 'function') {
              const blob = await att.file.async('blob');
              const storagePath = `attachments/${user.uid}/${Date.now()}-${att.name}`;
              const fileRef = storageRef(storage, storagePath);
              await uploadBytes(fileRef, blob);
              const url = await getDownloadURL(fileRef);
              attachments.push({ name: att.name, url, fullPath: storagePath });
            } else if (att.url) {
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
              Selecciona uno o varios archivos exportados previamente (<b>solo JSON</b>):
            </Typography>
            <Button variant="contained" component="label">
              Seleccionar archivo(s)
              <input type="file" hidden accept=".json" multiple onChange={handleFileChange} />
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
        {conflict && (
          <ConflictDialog
            open={!!conflict}
            importedNote={conflict.importedNote}
            existingNote={conflict.existingNote}
            showDiff={conflict.showDiff}
            onAction={action => conflict.resolve(action, applyToAllChecked)}
            applyToAll={applyToAllChecked}
            setApplyToAll={setApplyToAllChecked}
          />
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

const ConflictDialog = ({ open, importedNote, existingNote, onAction, showDiff, applyToAll, setApplyToAll }) => (
  <Dialog open={open} maxWidth="md" fullWidth>
    <DialogTitle>Conflicto de Importación</DialogTitle>
    <DialogContent>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Ya existe una nota con el mismo título: <b>{importedNote.title}</b>
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        ¿Qué deseas hacer?
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Comparación de contenido:</Typography>
        {showDiff ? (
          <ReactDiffViewer
            oldValue={existingNote.content || ''}
            newValue={importedNote.content || ''}
            splitView={true}
            leftTitle="Existente"
            rightTitle="A importar"
            showDiffOnly={false}
            styles={{ variables: { light: { diffViewerBackground: '#f8f8f8' } } }}
          />
        ) : (
          <Box>
            <Typography variant="caption">No hay diferencias de contenido.</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={() => onAction('replace')}>Reemplazar</Button>
        <Button variant="contained" color="warning" onClick={() => onAction('duplicate')}>Duplicar ("copia")</Button>
        <Button variant="contained" color="inherit" onClick={() => onAction('skip')}>Omitir</Button>
        <Box sx={{ ml: 2 }}>
          <Checkbox checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)} />
          <Typography variant="caption">Aplicar a todos los siguientes</Typography>
        </Box>
      </Box>
    </DialogContent>
  </Dialog>
);

const getNextDuplicateTitle = async (baseTitle, user) => {
  const entriesRef = collection(db, 'users', user.uid, 'entries');
  const q = query(entriesRef, where('title', ">=", baseTitle), where('title', "<=", baseTitle + '\uf8ff'));
  const querySnapshot = await getDocs(q);
  let max = 0;
  querySnapshot.forEach(docSnap => {
    const t = docSnap.data().title;
    const match = t.match(new RegExp(`^${baseTitle} \\((\\d+)\\)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    } else if (t === baseTitle) {
      if (max === 0) max = 1;
    }
  });
  return max === 0 ? `${baseTitle} (1)` : `${baseTitle} (${max + 1})`;
};

export default ImportDialog; 