// src/components/ProfileDialog.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Grid, Avatar, Tooltip, Box, Chip,
    Typography // Asegúrate que Typography esté importado si lo usas abajo
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import LabelIcon from '@mui/icons-material/Label';
import EventIcon from '@mui/icons-material/Event';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SnackbarAlert from './SnackbarAlert';
import { uploadImageToStorage } from '../utils/uploadImageToStorage'; // Importar tu función

const tipos = [
    { value: 'persona', label: 'Persona', icon: <PersonIcon /> },
    { value: 'lugar', label: 'Lugar', icon: <PlaceIcon /> },
    { value: 'festividad', label: 'Festividad', icon: <EventIcon /> },
    { value: 'etiqueta', label: 'Etiqueta', icon: <LabelIcon /> }, // Asumo que 'otro' se convirtió en 'etiqueta' aquí
];

export default function ProfileDialog({ open, onClose, onSave, onDelete, initialData = {}, isEdit = false }) {
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState('persona');
    const [fotoUrl, setFotoUrl] = useState(''); // Este estado guardará la URL de la imagen
    const [notas, setNotas] = useState('');
    const [etiquetas, setEtiquetas] = useState([]);
    // Estados específicos de Persona
    const [genero, setGenero] = useState('');
    const [relacion, setRelacion] = useState('');
    const [lugarAsociadoNombre, setLugarAsociadoNombre] = useState('');
    // Estados específicos de Lugar
    const [tipoLugar, setTipoLugar] = useState('');
    // Estados específicos de Festividad
    const [fechaFestividad, setFechaFestividad] = useState('');
    const [tipoFestividad, setTipoFestividad] = useState('');
    // Otros estados
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [currentEtiquetaInput, setCurrentEtiquetaInput] = useState('');
    const [nombreError, setNombreError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (open) {
            setNombre(initialData?.nombre || '');
            setTipo(initialData?.tipo || 'persona');
            setFotoUrl(initialData?.fotoUrl || initialData?.foto || ''); // Compatibilidad con 'foto' si aún existe
            setNotas(initialData?.notas || '');
            setEtiquetas(initialData?.etiquetas || []);
            setGenero(initialData?.genero || '');
            setRelacion(initialData?.relacion || '');
            setLugarAsociadoNombre(initialData?.lugarAsociadoNombre || '');
            setTipoLugar(initialData?.tipoLugar || '');
            const formattedDate = initialData?.fechaFestividad ? initialData.fechaFestividad.split('T')[0] : '';
            setFechaFestividad(formattedDate);
            setTipoFestividad(initialData?.tipoFestividad || '');
            setCurrentEtiquetaInput('');
            setNombreError('');
            setIsUploading(false); // Resetear estado de subida
            setUploadProgress(0);  // Resetear progreso
        }
    }, [initialData, open, isEdit]);

    const handleAddEtiqueta = (e) => {
        if (e.key === 'Enter' && currentEtiquetaInput.trim()) {
            if (!etiquetas.includes(currentEtiquetaInput.trim())) {
                setEtiquetas([...etiquetas, currentEtiquetaInput.trim()]);
            }
            setCurrentEtiquetaInput('');
        }
    };
    const handleRemoveEtiqueta = (tagToRemove) => {
        setEtiquetas(etiquetas.filter(tag => tag !== tagToRemove));
    };

    // Validación y guardado
    const attemptSaveProfile = () => {
        const trimmedName = nombre.trim();
        if (!trimmedName) {
            setNombreError('El nombre es obligatorio.');
            return;
        }
        setNombreError(''); // Limpiar error si es válido

        const data = {
            ...(isEdit && initialData.id && { id: initialData.id }),
            nombre: trimmedName,
            tipo,
            fotoUrl, // Usar el estado fotoUrl
            notas,
            etiquetas,
            ...(tipo === 'persona' && { genero, relacion, lugarAsociadoNombre: lugarAsociadoNombre.trim() }),
            ...(tipo === 'lugar' && { tipoLugar }),
            ...(tipo === 'festividad' && { fechaFestividad, tipoFestividad })
        };
        onSave(data);
    };

    const handleNombreChange = (e) => {
        setNombre(e.target.value);
        if (nombreError && e.target.value.trim()) {
            setNombreError('');
        }
    }

    const handleDelete = () => {
        if (window.confirm(`¿Estás seguro de eliminar el perfil "${nombre || initialData?.nombre}"? Esta acción no se puede deshacer.`)) {
            if (typeof onDelete === 'function' && initialData?.id) {
                onDelete(initialData);
            } else {
                setSnackbar({ open: true, message: 'Error interno al intentar eliminar.', severity: 'error' });
            }
        }
    };

    // Handler para subir foto de perfil
    const handlePhotoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setSnackbar({ open: true, message: 'La imagen debe ser menor a 5MB', severity: 'error' });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setSnackbar({ open: true, message: 'Subiendo foto de perfil...', severity: 'info' });

        try {
            // uploadImageToStorage ahora devuelve un objeto { url, fullPath, name, type }
            const uploadResult = await uploadImageToStorage(
                file,
                'profile_pics', // Ruta específica para fotos de perfil
                (progress) => setUploadProgress(progress) // Callback de progreso
            );

            // *** CORRECCIÓN: Usar uploadResult.url para setFotoUrl ***
            if (uploadResult && uploadResult.url) {
                setFotoUrl(uploadResult.url); // Establecer la URL de descarga en el estado
                setSnackbar({ open: true, message: 'Foto subida correctamente', severity: 'success' });
            } else {
                // Esto podría pasar si uploadImageToStorage falla silenciosamente o devuelve un formato inesperado
                throw new Error("No se recibió URL válida de la imagen subida.");
            }
        } catch (err) {
            console.error("Error en handlePhotoUpload:", err);
            setSnackbar({ open: true, message: `Error subiendo foto: ${err.message || 'Error desconocido'}`, severity: 'error' });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            // Limpiar el valor del input para permitir resubir el mismo archivo si es necesario
            if (event.target) {
                event.target.value = null;
            }
        }
    };

    const isSaveDisabled = !nombre.trim() || !!nombreError || isUploading;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? `Editar Perfil: ${initialData?.nombre || nombre}` : 'Crear Nuevo Perfil'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} alignItems="flex-start" sx={{ pt: 1 }}>
                    {/* Nombre */}
                    <Grid item xs={12} sm={8}>
                        <TextField label="Nombre" value={nombre} onChange={handleNombreChange} required fullWidth autoFocus error={!!nombreError} helperText={nombreError || "Nombre del perfil (obligatorio)"} size="small" />
                    </Grid>
                    {/* Tipo */}
                    <Grid item xs={12} sm={4}>
                        <TextField select label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} fullWidth size="small">
                            {tipos.map(option => ( <MenuItem key={option.value} value={option.value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {React.isValidElement(option.icon) ? React.cloneElement(option.icon, { fontSize: 'small'}) : null} {option.label} </MenuItem> ))}
                        </TextField>
                    </Grid>
                    {/* Foto URL y Upload */}
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <TextField label="Foto (URL)" value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} fullWidth size="small"
                                InputProps={{ endAdornment: fotoUrl ? ( <Tooltip title="Ver imagen"><Avatar src={fotoUrl} sx={{ width: 24, height: 24, ml: 1, cursor: 'pointer' }} onClick={() => window.open(fotoUrl, '_blank')} /></Tooltip> ) : ( <PhotoCamera sx={{ color: 'action.active', mr: 0.5 }} /> ) }}
                            />
                            <Button variant="outlined" component="label" startIcon={<PhotoCamera />} size="small" disabled={isUploading} sx={{ mt: 0, whiteSpace: 'nowrap' }} >
                                {isUploading ? 'Subiendo...' : 'Subir Foto'}
                                <input hidden accept="image/*" type="file" onChange={handlePhotoUpload} />
                            </Button>
                        </Box>
                        {/* Barra de Progreso */}
                        {isUploading && (
                            <Box sx={{ width: '100%', mt: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: '100%', mr: 1, height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                                        <Box sx={{ width: `${uploadProgress}%`, height: '100%', background: '#1976d2', transition: 'width 0.2s' }} />
                                    </Box>
                                    <Box sx={{ minWidth: 35 }}>
                                        <Typography variant="body2" color="text.secondary">{`${Math.round(uploadProgress)}%`}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                        <Typography variant="caption" display="block" sx={{mt: isUploading ? 0 : 0.5}}>Máximo 5MB</Typography>
                    </Grid>

                    {/* Campos Específicos por Tipo */}
                    {tipo === 'persona' && (
                        <>
                            <Grid item xs={12} sm={6}> <TextField label="Género" select value={genero} onChange={e => setGenero(e.target.value)} fullWidth size="small"> <MenuItem value="">Sin especificar</MenuItem> <MenuItem value="masculino">Masculino</MenuItem> <MenuItem value="femenino">Femenino</MenuItem> <MenuItem value="otro">Otro</MenuItem> </TextField> </Grid>
                            <Grid item xs={12} sm={6}> <TextField label="Relación (ej: mamá, amigo)" value={relacion} onChange={e => setRelacion(e.target.value)} fullWidth size="small"/> </Grid>
                            <Grid item xs={12} sm={6}> <TextField label="Lugar Asociado (Opcional)" value={lugarAsociadoNombre} onChange={e => setLugarAsociadoNombre(e.target.value)} fullWidth size="small" helperText="¿Dónde conociste/interactúas?" /> </Grid>
                        </>
                    )}
                    {tipo === 'lugar' && ( <Grid item xs={12} sm={6}> <TextField label="Tipo de lugar" value={tipoLugar} onChange={e => setTipoLugar(e.target.value)} fullWidth placeholder="Ciudad, país, restaurante, etc." size="small"/> </Grid> )}
                    {tipo === 'festividad' && ( <> <Grid item xs={12} sm={6}> <TextField label="Fecha de celebración" type="date" value={fechaFestividad} onChange={e => setFechaFestividad(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} size="small"/> </Grid> <Grid item xs={12} sm={6}> <TextField label="Tipo de festividad" value={tipoFestividad} onChange={e => setTipoFestividad(e.target.value)} fullWidth placeholder="Nacional, religiosa, personal, etc." size="small"/> </Grid> </> )}

                    {/* Notas y Etiquetas */}
                    <Grid item xs={12}> <TextField label="Notas" value={notas} onChange={e => setNotas(e.target.value)} fullWidth multiline minRows={2} maxRows={4} helperText="Notas adicionales sobre este perfil." size="small" /> </Grid>
                    <Grid item xs={12}> <TextField label="Etiquetas (Enter para añadir)" fullWidth value={currentEtiquetaInput} onChange={(e) => setCurrentEtiquetaInput(e.target.value)} onKeyDown={handleAddEtiqueta} InputProps={{ startAdornment: ( <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mr: 1 }}> {etiquetas.map(tag => ( <Chip key={tag} label={tag} size="small" onDelete={() => handleRemoveEtiqueta(tag)} sx={{ mr: 0.5, mb: 0.5 }} /> ))} </Box> ) }} helperText="Palabras clave para buscar este perfil." size="small" /> </Grid>
                </Grid>
            </DialogContent>
             <DialogActions sx={{ p: 2 }}>
                {isEdit && (<Button onClick={handleDelete} variant="contained" disabled={!initialData?.id || isUploading} sx={{ backgroundColor: '#e53935', color: '#fff', '&:hover': { backgroundColor: '#b71c1c' }, mr: 'auto' }}>Eliminar</Button>)}
                <Button onClick={onClose} variant="contained" disabled={isUploading} sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }}>Cancelar</Button>
                <Button onClick={attemptSaveProfile} variant="contained" disabled={isSaveDisabled} sx={{ backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }}>Guardar</Button>
             </DialogActions>
            <SnackbarAlert {...snackbar} onClose={() => setSnackbar(s => ({ ...s, open: false }))} />
        </Dialog>
    );
}