// src/components/NewEntry.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, updateDoc, query, getCountFromServer } from 'firebase/firestore';
import {
    TextField, Button, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
    OutlinedInput, Chip, Grid, Dialog, DialogTitle, DialogContent,
    List, ListItem, ListItemButton, ListItemText, IconButton,
    Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { extractMentions } from '../data/profiles'; 
import ProfileDialog from './ProfileDialog';
import NotebookSelector from './NotebookSelector';
import { subscribeToUserProfiles, addProfile, findProfileByNameExact } from '../services/profileService';

// --- CONSTANTES FUERA DEL COMPONENTE ---
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1925 + 1 }, (_, i) => 1925 + i).reverse();
const MONTHS = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const parseFecha = (entryData) => {
    if (!entryData || !entryData.createdAt) return { year: '', month: '', day: '' };
    const createdAt = entryData.createdAt;
    if (typeof createdAt === 'object' && !(createdAt instanceof Date) && !(createdAt.toDate)) {
        let monthValue = '';
        if (createdAt.month) { const idx = MONTHS.findIndex(m => m.toLowerCase() === String(createdAt.month).toLowerCase()); monthValue = idx > 0 ? String(idx) : ''; }
        return { year: createdAt.year || '', month: monthValue, day: createdAt.day || '' };
    }
    let d;
    if (createdAt.toDate) { d = createdAt.toDate(); }
    else { try { d = new Date(createdAt); if (isNaN(d.getTime())) throw new Error("Invalid Date"); } catch (e) { console.warn("Could not parse date:", createdAt, e); return { year: '', month: '', day: '' }; } }
    return { year: String(d.getFullYear()), month: String(d.getMonth() + 1), day: String(d.getDate()) };
};

const NewEntry = ({
    entry,
    availableTags,
    setSnackbar = () => {},
    resetEntry = () => {},
    handleDeleteEntry = async () => {},
    currentNotebooks = [{ id: 'default', nombre: 'General' }],
    onRequestOpenNotebookDialog = () => {}
}) => {
    // --- State ---
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [fecha, setFecha] = useState({ year: '', month: '', day: '' });
    const [allProfiles, setAllProfiles] = useState([]); 
    const [isMentionModalOpen, setIsMentionModalOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [filteredProfiles, setFilteredProfiles] = useState([]);
    const [mentionPosition, setMentionPosition] = useState(null);
    const [notebookId, setNotebookId] = useState('default');
    const quillRef = useRef(null);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [profileDialogData, setProfileDialogData] = useState({});
    const [profileDialogEdit, setProfileDialogEdit] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const isNewEntryMode = useRef(!entry);

    const parseFechaStable = useCallback(parseFecha, []);

    // --- Effects ---
    useEffect(() => {
        const unsubscribe = subscribeToUserProfiles((fetchedProfiles) => {
            setAllProfiles(fetchedProfiles);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        console.log("NewEntry useEffect [entry] running. Loading data for:", entry?.id || 'new entry');
        isNewEntryMode.current = !entry;
        setTitle(entry?.title || '');
        setContent(entry?.content || '');
        setSelectedTags(entry?.tags || []);
        setFecha(parseFechaStable(entry));
        const initialNotebookId = entry?.notebookId || 'default';
        setNotebookId(initialNotebookId);
        if (isNewEntryMode.current && quillRef.current) { const editor = quillRef.current.getEditor(); editor.setContents([], 'silent'); }
    }, [entry, parseFechaStable]);

    useEffect(() => {
        const notebookExists = currentNotebooks.some(nb => nb.id === notebookId);
        if (!notebookExists && notebookId !== 'default') { setNotebookId('default'); }
    }, [currentNotebooks, notebookId]);

    // --- Handlers ---
    const handleTagsChange = (event) => { setSelectedTags(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value); };
    const quillModules = { toolbar: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], ['blockquote', 'code-block'], [{ 'color': [] }, { 'background': [] }], ['link'], ['clean']] };
    const quillFormats = [ 'header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'align', 'blockquote', 'code-block', 'color', 'background', 'link', 'clean'];

    const handleMentionLogic = useCallback(() => {
         if (quillRef.current) {
             const quillInstance = quillRef.current.getEditor(); const selection = quillInstance.getSelection(); if (selection && selection.length === 0) { const cursorIndex = selection.index; const textBeforeCursor = quillInstance.getText(Math.max(0, cursorIndex - 1), 1); if (textBeforeCursor === '@') { const [leaf] = quillInstance.getLeaf(cursorIndex); let isAlreadyMention = false; if (leaf && leaf.parent && (leaf.parent.domNode.tagName === 'A' || leaf.parent.statics.blotName === 'mention')) { isAlreadyMention = true; } if (isAlreadyMention) return; const prevChar = quillInstance.getText(Math.max(0, cursorIndex - 2), 1); if (cursorIndex === 1 || /\s/.test(prevChar) || prevChar === '' ) { setMentionPosition(cursorIndex - 1); setMentionQuery(''); setFilteredProfiles(allProfiles); setIsMentionModalOpen(true); } } }
         }
     }, [allProfiles, setIsMentionModalOpen, setMentionPosition, setMentionQuery, setFilteredProfiles]);

    const handleContentChange = useCallback((newContent, delta, source, editor) => {
         if (source === 'user') {
            setContent(newContent);
            if (quillRef.current) { try { const quillInstance = quillRef.current.getEditor(); const selection = quillInstance.getSelection(); if (selection && selection.length === 0) { const textBeforeCursor = quillInstance.getText(Math.max(0, selection.index - 1), 1); if (textBeforeCursor === '@') { handleMentionLogic(); } } } catch (error) { console.error("Error during mention detection inline:", error); } }
         }
    }, [handleMentionLogic]);

    const handleMentionQueryChange = (e) => { const query = e.target.value; setMentionQuery(query); setFilteredProfiles( query ? allProfiles.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase())) : allProfiles ); };

    const handleCloseMentionModal = useCallback(() => { setIsMentionModalOpen(false); setMentionQuery(''); setFilteredProfiles([]); setMentionPosition(null); if (quillRef.current) { quillRef.current.focus(); } }, []);

    const handleSelectProfile = useCallback((profile) => { if (quillRef.current && mentionPosition !== null) { const editor = quillRef.current.getEditor(); const profileName = profile.nombre; const replaceLength = mentionQuery.length + 1; const startIndex = mentionPosition; editor.deleteText(startIndex, replaceLength, 'user'); editor.insertText(startIndex, `@${profileName} `, 'user'); const newEditorContent = editor.root.innerHTML; setContent(newEditorContent); editor.setSelection(startIndex + profileName.length + 2, 0, 'user'); } handleCloseMentionModal(); }, [mentionPosition, mentionQuery, handleCloseMentionModal]);

    const handleCreateProfileFromMention = useCallback((nombre) => {
        if (!nombre || !nombre.trim()) {
            setSnackbar({ open: true, message: 'Escribe un nombre válido para crear el perfil.', severity: 'warning' });
            return;
        }
        setProfileDialogData({ nombre: nombre.trim(), tipo: 'persona' });
        setProfileDialogEdit(false);
        setIsMentionModalOpen(false);
        setIsProfileDialogOpen(true);
    }, [setSnackbar]);

    const handleSaveProfileDialog = useCallback(async (profileDataFromDialog) => {
        if (!profileDialogEdit) {
            setIsSaving(true);
            try {
                const newProfile = await addProfile(profileDataFromDialog);
                setSnackbar({ open: true, message: 'Perfil creado correctamente.', severity: 'success' });
                setIsProfileDialogOpen(false);
                // Insertar la mención en el editor Quill después de guardar el perfil
                if (mentionPosition !== null && newProfile && newProfile.nombre) {
                    handleSelectProfile(newProfile);
                } else {
                    setMentionQuery('');
                    setFilteredProfiles([]);
                    setMentionPosition(null);
                }
            } catch (error) {
                console.error("Error creating profile from dialog:", error);
                setSnackbar({ open: true, message: `Error creando perfil: ${error.message}`, severity: 'error' });
            } finally {
                setIsSaving(false);
                if (mentionPosition !== null){
                    setMentionPosition(null);
                    setMentionQuery('');
                }
            }
        } else {
            setIsProfileDialogOpen(false);
        }
    }, [profileDialogEdit, mentionPosition, handleSelectProfile, setSnackbar]);

    const saveEntry = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            const user = auth.currentUser; if (!user) throw new Error("Usuario no autenticado");
            const userDocRef = doc(db, 'users', user.uid); const entriesRef = collection(userDocRef, 'entries');
            let dateToSave = null; if (fecha.year || fecha.month || fecha.day) { let monthText = ''; if (fecha.month && !isNaN(fecha.month)) { monthText = MONTHS[parseInt(fecha.month)] || ''; } dateToSave = { year: fecha.year || '', month: monthText, day: fecha.day || '' }; }

            // 1. Extraer nombres mencionados del contenido ACTUAL del editor
            const mentionedNames = extractMentions(content);
            const uniqueMentionedNames = [...new Set(mentionedNames)];

            // 2. Buscar/Crear perfiles y obtener IDs para las menciones ACTUALES
            const currentDetectedProfileRefs = new Set();
            for (const name of uniqueMentionedNames) {
                if (!name || !name.trim()) continue;
                const trimmedName = name.trim();
                let profile = await findProfileByNameExact(trimmedName);
                if (!profile) {
                    // Mantener creación automática por ahora (o quitar si se prefiere ignorar)
                    console.log(`Profile '${trimmedName}' not found while saving, creating...`);
                    try {
                        const newProfileData = { nombre: trimmedName, tipo: 'persona' };
                        profile = await addProfile(newProfileData);
                        if (!profile || !profile.id) { throw new Error(`Failed to get ID for newly created profile: ${trimmedName}`); }
                        console.log(`Created profile '${trimmedName}' with ID: ${profile.id}`);
                    } catch (creationError) { console.error(`Error auto-creating profile for '${trimmedName}':`, creationError); continue; }
                }
                if (profile && profile.id) {
                    currentDetectedProfileRefs.add(profile.id);
                }
            }

            // 3. *** CORREGIDO: Determinar el array final de profileRefs CON FUSIÓN ***
            let finalProfileRefs = [];
            const detectedRefsArray = Array.from(currentDetectedProfileRefs); // Convertir Set a Array

            if (entry && entry.id) { // Si estamos EDITANDO
                // Obtener los IDs que YA estaban en la entrada original (del prop 'entry')
                const existingProfileRefs = entry.profileRefs || [];
                // *** FUSIONAR: Combinar existentes + detectados ahora, sin duplicados ***
                const combinedRefs = new Set([...existingProfileRefs, ...detectedRefsArray]);
                finalProfileRefs = Array.from(combinedRefs);
                console.log("Updating entry. Existing Refs:", existingProfileRefs, "Detected Refs:", detectedRefsArray, "Final Refs (Merged):", finalProfileRefs);
            } else { // Si estamos CREANDO una nueva entrada
                finalProfileRefs = detectedRefsArray; // Solo los detectados ahora
                console.log("Creating new entry. Final Refs:", finalProfileRefs);
            }

            // 4. Preparar datos de la entrada (título, contenido, etc.)
            let titleToSave = title.trim(); if (!titleToSave && !entry?.id) { try { const q = query(entriesRef); const snapshot = await getCountFromServer(q); const count = snapshot.data().count; titleToSave = `Nota ${count + 1}`; } catch (countError) { console.error("Error getting entry count:", countError); titleToSave = `Entrada ${new Date().toLocaleTimeString()}`; } } else if (!titleToSave && entry?.id) { titleToSave = "Entrada sin título"; }

            // 5. GUARDAR 'finalProfileRefs' (El array combinado o nuevo)
            const entryData = {
                title: titleToSave,
                content,
                tags: selectedTags,
                createdAt: dateToSave,
                profileRefs: finalProfileRefs, // Guardar array de IDs combinado/final
                notebookId: notebookId || 'default',
                updatedAt: new Date()
             };

            // 6. Guardar/Actualizar entrada en Firestore
            if (entry && entry.id) {
                await updateDoc(doc(entriesRef, entry.id), entryData);
                setSnackbar({ open: true, message: 'Entrada actualizada', severity: 'success' });
            } else {
                await addDoc(entriesRef, entryData);
                setSnackbar({ open: true, message: 'Entrada guardada', severity: 'success' });
            }
            resetEntry();
        } catch (error) { console.error("Error saving entry:", error); setSnackbar({ open: true, message: 'Error guardando entrada: ' + error.message, severity: 'error' }); }
        finally { setIsSaving(false); }
    };

    const triggerDeleteEntry = async () => { if (!entry || !entry.id) return; if (window.confirm(`¿Estás seguro de que quieres eliminar la entrada "${entry.title || 'Sin título'}"?`)) { await handleDeleteEntry(entry); } };

    const handleCancel = () => { resetEntry(); };

    // --- Render ---
   return (
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', minHeight: 500, boxShadow: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1, flexShrink: 0 }}> {entry ? 'Editar Entrada' : 'Nueva Entrada'} </Typography>
            <TextField id="new-entry-title" fullWidth label="Título" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2, flexShrink: 0 }} variant="outlined" size="small" />
            <Box sx={{ flexGrow: 1, mb: 2, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 250 }}>
                 <ReactQuill ref={quillRef} theme="snow" value={content} onChange={handleContentChange} modules={quillModules} formats={quillFormats} style={{ flexGrow: 1, border: 'none', display: 'flex', flexDirection: 'column' }} className="quill-editor-container" />
            </Box>
            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #eee', flexShrink: 0 }}>
                 <Grid container spacing={2} alignItems="center">
                    {/* Controles */}
                    <Grid item xs={12} sm={6} md={3}> <FormControl fullWidth size="small"> <InputLabel id="tags-label">Etiquetas</InputLabel> <Select labelId="tags-label" multiple value={selectedTags} onChange={handleTagsChange} input={<OutlinedInput label="Etiquetas" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => (<Chip key={value} label={value} size="small" />))}</Box>)}> {availableTags.map((tag) => (<MenuItem key={tag} value={tag}>{tag}</MenuItem>))} </Select> </FormControl> </Grid>
                    <Grid item xs={12} sm={6} md={3}> <FormControl fullWidth size="small"> <InputLabel>Año</InputLabel> <Select value={fecha?.year || ''} label="Año" onChange={e => setFecha(f => ({ ...f, year: e.target.value }))}> <MenuItem value="">Indefinido</MenuItem> {years.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)} </Select> </FormControl> </Grid>
                    <Grid item xs={12} sm={6} md={3}> <FormControl fullWidth size="small"> <InputLabel>Mes</InputLabel> <Select value={fecha?.month || ''} label="Mes" onChange={e => setFecha(f => ({ ...f, month: e.target.value }))}> <MenuItem value="">Indefinido</MenuItem> {MONTHS.slice(1).map((m, i) => <MenuItem key={i+1} value={String(i+1)}>{m}</MenuItem>)} </Select> </FormControl> </Grid>
                    <Grid item xs={12} sm={6} md={3}> <FormControl fullWidth size="small"> <InputLabel>Día</InputLabel> <Select value={fecha?.day || ''} label="Día" onChange={e => setFecha(f => ({ ...f, day: e.target.value }))}> <MenuItem value="">Indefinido</MenuItem> {days.map(d => <MenuItem key={d} value={String(d)}>{d}</MenuItem>)} </Select> </FormControl> </Grid>
                    <Grid item xs={12} md={entry ? 4 : 6} sx={{mt: 1}}> <NotebookSelector notebooks={currentNotebooks} value={notebookId} onChange={setNotebookId} onAddNewNotebookRequest={() => { onRequestOpenNotebookDialog((newId) => { if (newId) { setNotebookId(newId); } }); }} /> </Grid>
                    {/* Botones */}
                    <Grid item xs={12} md={entry ? 8 : 6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1, alignItems: 'center' }}>
                         {entry && entry.id && (<Button variant="contained" onClick={triggerDeleteEntry} size="medium" disabled={isSaving} sx={{ backgroundColor: '#e53935', color: '#fff', '&:hover': { backgroundColor: '#b71c1c' } }}> Eliminar </Button> )}
                         <Button variant="contained" onClick={handleCancel} size="medium" disabled={isSaving} sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }}> Cancelar </Button>
                         {/* El botón saveEntry/Actualizar usa el estado isSaving */}
                         <Button variant="contained" onClick={saveEntry} size="medium" disabled={isSaving} sx={{ backgroundColor: '#43a047', color: '#fff', '&:hover': { backgroundColor: '#388e3c' } }}> {isSaving ? 'Guardando...' : (entry ? 'Actualizar' : 'Guardar')} </Button>
                     </Grid>
                 </Grid>
            </Box>
            {/* Dialogs */}
             <Dialog open={isMentionModalOpen} onClose={handleCloseMentionModal} maxWidth="xs" fullWidth>
                 <DialogTitle> Selecciona o crea un perfil <IconButton onClick={handleCloseMentionModal} sx={{ position: 'absolute', right: 8, top: 8 }}> <CloseIcon /> </IconButton> </DialogTitle>
                 <DialogContent>
                     <TextField autoFocus margin="dense" label="Buscar o escribir nombre nuevo" fullWidth value={mentionQuery} onChange={handleMentionQueryChange} sx={{ mb: 2 }} />
                     <List dense sx={{ maxHeight: 250, overflow: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 1 }}>
                         {filteredProfiles.map(profile => {
                             let secondaryInfo = [];
                             if (profile.tipo) {
                                 secondaryInfo.push(profile.tipo.charAt(0).toUpperCase() + profile.tipo.slice(1));
                             }
                             // Lógica específica para Persona
                             if (profile.tipo === 'persona') {
                                 if (profile.relacion) { secondaryInfo.push(`Rel: ${profile.relacion}`); }
                                 // Añadir lugar asociado si existe
                                 if (profile.lugarAsociadoNombre) {
                                     secondaryInfo.push(`Lugar: ${profile.lugarAsociadoNombre}`);
                                 }
                             }
                             else if (profile.tipo === 'lugar' && profile.tipoLugar) {
                                 secondaryInfo.push(`Tipo: ${profile.tipoLugar}`);
                             } else if (profile.tipo === 'festividad' && profile.tipoFestividad) {
                                 secondaryInfo.push(`Tipo: ${profile.tipoFestividad}`);
                             } else if (profile.tipo === 'festividad' && profile.fechaFestividad) {
                                 secondaryInfo.push(`Fecha: ${profile.fechaFestividad}`);
                             }
                             if (secondaryInfo.length <= 1 && profile.notas) {
                                secondaryInfo.push(`Notas: ${profile.notas.substring(0, 30)}...`);
                             }
                             const secondaryText = secondaryInfo.join(' | ');
                             return (
                                 <ListItemButton key={profile.id} onClick={() => handleSelectProfile(profile)}>
                                     <ListItemText
                                         primary={profile.nombre}
                                         secondary={secondaryText || 'Sin detalles'}
                                         primaryTypographyProps={{ fontWeight: 500 }}
                                         secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                     />
                                 </ListItemButton>
                             );
                         })}
                     </List>
                     <Button variant="contained" color="primary" fullWidth onClick={() => handleCreateProfileFromMention(mentionQuery)} disabled={!mentionQuery.trim()} sx={{ textTransform: 'none'}}> Crear perfil: "{mentionQuery.trim() || '...'}" </Button>
                 </DialogContent>
             </Dialog>
             <ProfileDialog
                 open={isProfileDialogOpen}
                 onClose={() => setIsProfileDialogOpen(false)}
                 onSave={handleSaveProfileDialog}
                 onDelete={() => {}}
                 initialData={profileDialogData}
                 isEdit={profileDialogEdit}
             />
        </Paper>
    );
// *** FIN DEL COMPONENTE NewEntry ***
}; // <--- ASEGÚRATE QUE ESTA LLAVE ESTÉ ANTES DEL EXPORT

// *** EXPORT ESTÁ FUERA Y DESPUÉS ***
export default NewEntry;