// src/components/NewEntry.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, updateDoc, query, getCountFromServer } from 'firebase/firestore';
import {
    TextField, Button, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
    OutlinedInput, Chip, Grid, Dialog, DialogTitle, DialogContent,
    List, ListItemButton, ListItemText, IconButton,
    Box, Avatar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { extractMentions } from '../data/profiles'; 
import ProfileDialog from './ProfileDialog';
import NotebookSelector from './NotebookSelector';
import { subscribeToUserProfiles, addProfile, findProfileByNameExact } from '../services/profileService';
import { uploadImageToStorage } from '../utils/uploadImageToStorage';
import DeleteIcon from '@mui/icons-material/Delete';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
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

// --- REGISTRO DEL MÓDULO (después de todos los imports) ---
Quill.register('modules/imageResize', ImageResize);

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

const ICONS = {
    WorkOutline: <WorkOutlineIcon />, School: <SchoolIcon />, FamilyRestroom: <FamilyRestroomIcon />, StarBorder: <StarBorderIcon />, FavoriteBorder: <FavoriteBorderIcon />, BookOutlined: <BookOutlinedIcon />, Church: <ChurchIcon />, Group: <GroupIcon />, LocalHospital: <LocalHospitalIcon />, AttachMoney: <AttachMoneyIcon />, Flight: <FlightIcon />, LocalOfferOutlined: <LocalOfferOutlinedIcon />
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
    const [imageUploadProgress, setImageUploadProgress] = useState(0);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB por archivo
    const ALLOWED_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'audio/mpeg', 'audio/mp3', 'audio/wav',
        'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const parseFechaStable = useCallback(parseFecha, []);

    // Helper para obtener el objeto de etiqueta por nombre (ahora sí tiene acceso a availableTags)
    const getTagObj = (name) => availableTags.find(t => t.name === name) || { name };

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
        let tags = entry?.tags || [];
        // Siempre convertir a array de strings (soporte legacy)
        if (tags.length > 0 && typeof tags[0] === 'object') {
            tags = tags.map(t => t.name || t);
        }
        setSelectedTags(tags);
        setFecha(parseFechaStable(entry));
        const initialNotebookId = entry?.notebookId || 'default';
        setNotebookId(initialNotebookId);
        setAttachments(entry?.attachments || []);
        if (isNewEntryMode.current && quillRef.current) { const editor = quillRef.current.getEditor(); editor.setContents([], 'silent'); }
    }, [entry, parseFechaStable]);

    useEffect(() => {
        const notebookExists = currentNotebooks.some(nb => nb.id === notebookId);
        if (!notebookExists && notebookId !== 'default') { setNotebookId('default'); }
    }, [currentNotebooks, notebookId]);

    // --- Handlers ---
    const handleTagsChange = (event) => { setSelectedTags(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value); };

    const quillModules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['blockquote', 'code-block'],
                [{ 'color': [] }, { 'background': [] }],
                ['link'],
                ['clean']
            ]
        },
        imageResize: {
            parchment: Quill.import('parchment'),
            modules: [ 'Resize', 'DisplaySize', 'Toolbar' ]
        }
    }), []);
    const quillFormats = [ 'header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'align', 'blockquote', 'code-block', 'color', 'background', 'link', 'image', 'clean'];

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

    // Al crear perfil desde mención, solo toma la primera palabra
    const handleCreateProfileFromMention = useCallback((nombre) => {
        if (!nombre || !nombre.trim()) {
            setSnackbar({ open: true, message: 'Escribe un nombre válido para crear el perfil.', severity: 'warning' });
            return;
        }
        // Solo la primera palabra
        const cleanName = nombre.trim().split(/\s|\.|,|;|:|\(|\)|\[|\]|\{|\}|\n|\r|\t/)[0];
        setProfileDialogData({ nombre: cleanName, tipo: 'persona' });
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

    // --- Nuevo: Eliminar adjunto individual ---
    const handleRemoveAttachment = async (idx) => {
        const att = attachments[idx];
        if (att && att.fullPath) {
            try {
                await deleteObject(storageRef(storage, att.fullPath));
                setSnackbar({ open: true, message: `Adjunto eliminado: ${att.name}`, severity: 'success' });
            } catch (err) {
                setSnackbar({ open: true, message: `Error eliminando archivo: ${att.name}`, severity: 'error' });
            }
        }
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const handleAttachFiles = async (event) => {
        const files = Array.from(event.target.files);
        let newAttachments = [];
        for (const file of files) {
            if (file.size > MAX_ATTACHMENT_SIZE) {
                setSnackbar({ open: true, message: `El archivo '${file.name}' excede el límite de 10MB.`, severity: 'error' });
                continue;
            }
            if (!ALLOWED_TYPES.some(type => file.type.startsWith(type.split('/')[0]))) {
                setSnackbar({ open: true, message: `Tipo de archivo no permitido: ${file.name}`, severity: 'error' });
                continue;
            }
            try {
                const result = await uploadImageToStorage(file, 'attachments');
                newAttachments.push({
                    name: result.name,
                    url: result.url,
                    type: result.type,
                    fullPath: result.fullPath
                });
            } catch (err) {
                setSnackbar({ open: true, message: `Error subiendo '${file.name}': ${err.message}`, severity: 'error' });
            }
        }
        setAttachments(prev => [...prev, ...newAttachments]);
        event.target.value = null;
    };

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
                    try {
                        const newProfileData = { nombre: trimmedName, tipo: 'persona' };
                        profile = await addProfile(newProfileData);
                        if (!profile || !profile.id) { throw new Error(`Failed to get ID for newly created profile: ${trimmedName}`); }
                    } catch (creationError) { continue; }
                }
                if (profile && profile.id) {
                    currentDetectedProfileRefs.add(profile.id);
                }
            }

            // 3. FUSIONAR refs existentes y detectadas (si editando)
            let finalProfileRefs = [];
            const detectedRefsArray = Array.from(currentDetectedProfileRefs);
            if (entry && entry.id) {
                const existingProfileRefs = entry.profileRefs || [];
                finalProfileRefs = Array.from(new Set([...existingProfileRefs, ...detectedRefsArray]));
            } else {
                finalProfileRefs = detectedRefsArray;
            }

            // 4. Guardar solo etiquetas válidas como strings
            const cleanSelectedTags = selectedTags.filter(
                t => typeof t === 'string' && t.trim() && availableTags.some(tag => tag.name === t)
            );

            // 4.1. Título seguro: si está vacío, poner "Nota N"
            let titleToSave = title.trim();
            if (!titleToSave) {
                // Contar cuántas notas existen
                let count = 0;
                try {
                    const q = query(entriesRef);
                    const snapshot = await getCountFromServer(q);
                    count = snapshot.data().count || 0;
                } catch (e) {}
                titleToSave = `Nota ${count + 1}`;
            }

            const entryData = {
                title: titleToSave,
                titleLower: titleToSave.toLowerCase(),
                content,
                tags: cleanSelectedTags, // solo strings
                createdAt: dateToSave,
                profileRefs: finalProfileRefs,
                notebookId: notebookId || 'default',
                updatedAt: new Date(),
                attachments: attachments || []
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
            <Box sx={{ flexGrow: 1, mb: 2, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 250, position: 'relative' }}>
                 <ReactQuill ref={quillRef} theme="snow" value={content} onChange={handleContentChange} modules={quillModules} formats={quillFormats} style={{ flexGrow: 1, border: 'none', display: 'flex', flexDirection: 'column' }} className="quill-editor-container" />
                 {isImageUploading && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>Subiendo imagen... {Math.round(imageUploadProgress)}%</Typography>
                        <Box sx={{ width: '60%', height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                            <Box sx={{ width: `${imageUploadProgress}%`, height: '100%', background: '#1976d2', transition: 'width 0.2s' }} />
                        </Box>
                    </Box>
                 )}
            </Box>
            {/* --- Adjuntos tipo Gmail --- */}
            <Box sx={{ mt: 2, mb: 2 }}>
                <Button 
                  variant="contained" 
                  component="label" 
                  size="small" 
                  sx={{ mb: 1, backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }}
                >
                    Adjuntar archivo
                    <input hidden multiple type="file" onChange={handleAttachFiles} />
                </Button>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {attachments.map((att, idx) => (
                        <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120, position: 'relative' }}>
                            <IconButton size="small" sx={{ position: 'absolute', top: 0, right: 0, zIndex: 2, bgcolor: '#fff', border: '1px solid #ccc', p: 0.5 }} onClick={() => handleRemoveAttachment(idx)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
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
            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #eee', flexShrink: 0 }}>
                 <Grid container spacing={2} alignItems="center">
                    {/* Controles */}
                    <Grid item xs={12} sm={6} md={3}> 
                        <FormControl fullWidth size="small">
                            <InputLabel id="tags-label">Etiquetas</InputLabel>
                            <Select
                                labelId="tags-label"
                                multiple
                                value={selectedTags}
                                onChange={handleTagsChange}
                                input={<OutlinedInput label="Etiquetas" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((name) => {
                                            const tag = getTagObj(name);
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
                                )}
                            >
                                {availableTags.map((tag) => (
                                    <MenuItem key={tag.name} value={tag.name}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: tag.color, width: 20, height: 20, mr: 1 }}>
                                                {ICONS[tag.icon] || <LocalOfferOutlinedIcon />}
                                            </Avatar>
                                            <Typography variant="body2">{tag.name}</Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
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