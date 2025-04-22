// src/components/ProfileDialog.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Grid, Avatar, Tooltip, Box, Chip,
    // Typography // <-- ELIMINADA (si no se usa realmente)
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import LabelIcon from '@mui/icons-material/Label';
import EventIcon from '@mui/icons-material/Event';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SnackbarAlert from './SnackbarAlert';
// import { uploadImageToStorage } from '../utils/uploadImageToStorage'; // <-- ELIMINADA (si no se usa realmente)

const tipos = [
    { value: 'persona', label: 'Persona', icon: <PersonIcon fontSize="small"/> },
    { value: 'lugar', label: 'Lugar', icon: <PlaceIcon fontSize="small"/> },
    { value: 'festividad', label: 'Festividad', icon: <EventIcon fontSize="small"/> },
    { value: 'otro', label: 'Otro', icon: <LabelIcon fontSize="small"/> }
];

export default function ProfileDialog({ open, onClose, onSave, onDelete, initialData = {}, isEdit = false }) {
    // --- State ---
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState('persona');
    const [fotoUrl, setFotoUrl] = useState('');
    const [notas, setNotas] = useState('');
    const [etiquetas, setEtiquetas] = useState([]);
    const [genero, setGenero] = useState('');
    const [relacion, setRelacion] = useState('');
    const [tipoLugar, setTipoLugar] = useState('');
    const [fechaFestividad, setFechaFestividad] = useState('');
    const [tipoFestividad, setTipoFestividad] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    // const [isUploading, setIsUploading] = useState(false); // <-- ELIMINADA (si no se usa upload)
    const [currentEtiquetaInput, setCurrentEtiquetaInput] = useState('');

    // --- Effect to update state when initialData changes ---
    useEffect(() => {
        if (open) {
            setNombre(initialData?.nombre || ''); setTipo(initialData?.tipo || 'persona'); setFotoUrl(initialData?.fotoUrl || initialData?.foto || ''); setNotas(initialData?.notas || ''); setEtiquetas(initialData?.etiquetas || []); setGenero(initialData?.genero || ''); setRelacion(initialData?.relacion || ''); setTipoLugar(initialData?.tipoLugar || ''); const formattedDate = initialData?.fechaFestividad ? initialData.fechaFestividad.split('T')[0] : ''; setFechaFestividad(formattedDate); setTipoFestividad(initialData?.tipoFestividad || ''); setCurrentEtiquetaInput('');
            // setIsUploading(false); // <-- ELIMINADA (si no se usa upload)
        }
    }, [initialData, open, isEdit]);

    // --- Handlers ---
    const handleAddEtiqueta = (e) => { if (e.key === 'Enter') { e.preventDefault(); const newTag = currentEtiquetaInput.trim(); if (newTag && !etiquetas.includes(newTag)) { setEtiquetas([...etiquetas, newTag]); setCurrentEtiquetaInput(''); } } };
    const handleRemoveEtiqueta = (tagToRemove) => { setEtiquetas(tags => tags.filter(t => t !== tagToRemove)); };
    const handleSave = () => { if (!nombre.trim()) { setSnackbar({ open: true, message: 'El nombre es obligatorio.', severity: 'warning' }); return; } const data = { ...(isEdit && initialData.id && { id: initialData.id }), nombre: nombre.trim(), tipo, fotoUrl, notas, etiquetas, ...(tipo === 'persona' && { genero, relacion }), ...(tipo === 'lugar' && { tipoLugar }), ...(tipo === 'festividad' && { fechaFestividad, tipoFestividad }) }; console.log("ProfileDialog saving data:", data); onSave(data); };
    const handleDelete = () => { if (window.confirm(`¿Estás seguro de eliminar el perfil "${nombre}"? Esta acción no se puede deshacer.`)) { if (onDelete && initialData.id) { onDelete(initialData); } else { console.error("Delete handler not provided or profile has no ID."); setSnackbar({ open: true, message: 'Error al intentar eliminar.', severity: 'error' }); } } };
    // Comentar o eliminar si la subida de fotos no se va a usar por ahora
    /* const handlePhotoUpload = async (event) => { ... }; */

    // --- Variables limpias para los botones ---
    // const isUploadingPhoto = isUploading;
    const isSaveDisabled = !nombre.trim(); // || isUploadingPhoto;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? `Editar Perfil: ${initialData?.nombre || nombre}` : 'Crear Nuevo Perfil'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} alignItems="flex-start" sx={{ pt: 1 }}>
                     <Grid item xs={12} sm={8}> <TextField label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required fullWidth autoFocus helperText="Nombre del perfil (obligatorio)" size="small" /> </Grid>
                     <Grid item xs={12} sm={4}> <TextField select label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} fullWidth size="small"> {tipos.map(option => ( <MenuItem key={option.value} value={option.value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {React.isValidElement(option.icon) ? React.cloneElement(option.icon) : null} {option.label} </MenuItem> ))} </TextField> </Grid>
                     <Grid item xs={12}>
                         <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                              <TextField label="Foto (URL)" value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} fullWidth size="small" InputProps={{ endAdornment: fotoUrl ? (<Tooltip title="Ver imagen"><Avatar src={fotoUrl} sx={{ width: 24, height: 24, ml: 1, cursor: 'pointer' }} onClick={() => window.open(fotoUrl, '_blank')} /></Tooltip>) : (<PhotoCamera sx={{ color: 'action.active', mr: 0.5 }} />) }} />
                              {/* Comentado Botón Subir Foto */}
                              {/* <Button variant="outlined" component="label" startIcon={<PhotoCamera />} size="small" disabled={isUploadingPhoto} sx={{ mt: 0, whiteSpace: 'nowrap' }}> {isUploadingPhoto ? 'Subiendo...' : 'Subir Foto'} <input hidden accept="image/*" type="file" onChange={handlePhotoUpload} /> </Button> */}
                         </Box>
                         {/* Comentado Helper Text si no se usa upload */}
                         {/* <Typography variant="caption" display="block" sx={{mt: 0.5}}>Máximo 5MB</Typography> */}
                     </Grid>
                     {tipo === 'persona' && ( <> <Grid item xs={12} sm={6}> <TextField label="Género" select value={genero} onChange={e => setGenero(e.target.value)} fullWidth size="small"> <MenuItem value="">Sin especificar</MenuItem> <MenuItem value="masculino">Masculino</MenuItem> <MenuItem value="femenino">Femenino</MenuItem> <MenuItem value="otro">Otro</MenuItem> </TextField> </Grid> <Grid item xs={12} sm={6}> <TextField label="Relación (ej: mamá, amigo)" value={relacion} onChange={e => setRelacion(e.target.value)} fullWidth size="small"/> </Grid> </> )}
                     {tipo === 'lugar' && ( <Grid item xs={12} sm={6}> <TextField label="Tipo de lugar" value={tipoLugar} onChange={e => setTipoLugar(e.target.value)} fullWidth placeholder="Ciudad, país, restaurante, etc." size="small"/> </Grid> )}
                     {tipo === 'festividad' && ( <> <Grid item xs={12} sm={6}> <TextField label="Fecha de celebración" type="date" value={fechaFestividad} onChange={e => setFechaFestividad(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} size="small"/> </Grid> <Grid item xs={12} sm={6}> <TextField label="Tipo de festividad" value={tipoFestividad} onChange={e => setTipoFestividad(e.target.value)} fullWidth placeholder="Nacional, religiosa, personal, etc." size="small"/> </Grid> </> )}
                     <Grid item xs={12}> <TextField label="Notas" value={notas} onChange={e => setNotas(e.target.value)} fullWidth multiline minRows={2} maxRows={4} helperText="Notas adicionales sobre este perfil." size="small" /> </Grid>
                     <Grid item xs={12}> <TextField label="Etiquetas (Enter para añadir)" fullWidth value={currentEtiquetaInput} onChange={(e) => setCurrentEtiquetaInput(e.target.value)} onKeyDown={handleAddEtiqueta} InputProps={{ startAdornment: ( <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mr: 1 }}> {etiquetas.map(tag => (<Chip key={tag} label={tag} size="small" onDelete={() => handleRemoveEtiqueta(tag)} sx={{ mr: 0.5, mb: 0.5 }} />))} </Box> ) }} helperText="Palabras clave para buscar este perfil." size="small" /> </Grid>
                </Grid>
            </DialogContent>
             <DialogActions sx={{ p: 2 }}>
                {isEdit && (<Button onClick={handleDelete} variant="contained" disabled={!initialData?.id} sx={{ backgroundColor: '#e53935', color: '#fff', '&:hover': { backgroundColor: '#b71c1c' }, mr: 'auto' }}> Eliminar </Button>)}
                <Button onClick={onClose} variant="contained" sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }}> Cancelar </Button>
                <Button onClick={handleSave} variant="contained" disabled={isSaveDisabled} sx={{ backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }}> Guardar </Button>
             </DialogActions>
            <SnackbarAlert {...snackbar} onClose={() => setSnackbar(s => ({ ...s, open: false }))} />
        </Dialog>
    );
}