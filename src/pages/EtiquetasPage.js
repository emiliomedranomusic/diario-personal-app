// src/pages/EtiquetasPage.js
import React, { useState } from 'react';
import {
    Paper, Typography, TextField, Button, List, ListItem, ListItemText,
    IconButton, Box, ListItemIcon, Avatar, Tooltip, FormControl, InputLabel, Select, MenuItem,
    ListItemSecondaryAction // Asegurar que esté importado
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
// *** Importar funciones de servicio ***
import { updateTagInEntries, removeTagFromEntries } from '../services/entryService'; // Ajusta la ruta si es necesario

// --- Constantes ---
const COLOR_NAMES = { '#9e9e9e': 'Gris', '#2196f3': 'Azul', '#4caf50': 'Verde', '#ff9800': 'Naranja', '#e91e63': 'Rosa', '#673ab7': 'Púrpura', '#f44336': 'Rojo', '#00bcd4': 'Cyan', '#795548': 'Marrón' };
const COLORS = ['#9e9e9e', '#2196f3', '#4caf50', '#ff9800', '#e91e63', '#673ab7', '#f44336', '#00bcd4', '#795548'];
const ICONS_MAP = { WorkOutline: <WorkOutlineIcon fontSize="inherit"/>, School: <SchoolIcon fontSize="inherit"/>, FamilyRestroom: <FamilyRestroomIcon fontSize="inherit"/>, StarBorder: <StarBorderIcon fontSize="inherit"/>, FavoriteBorder: <FavoriteBorderIcon fontSize="inherit"/>, BookOutlined: <BookOutlinedIcon fontSize="inherit"/>, Church: <ChurchIcon fontSize="inherit"/>, Group: <GroupIcon fontSize="inherit"/>, LocalHospital: <LocalHospitalIcon fontSize="inherit"/>, AttachMoney: <AttachMoneyIcon fontSize="inherit"/>, Flight: <FlightIcon fontSize="inherit"/>, LocalOfferOutlined: <LocalOfferOutlinedIcon fontSize="inherit"/> };
const ICON_OPTIONS = [ { name: 'LocalOfferOutlined', label: 'Etiqueta', icon: <LocalOfferOutlinedIcon /> }, { name: 'WorkOutline', label: 'Trabajo', icon: <WorkOutlineIcon /> }, { name: 'School', label: 'Estudio', icon: <SchoolIcon /> }, { name: 'FamilyRestroom', label: 'Familia', icon: <FamilyRestroomIcon /> }, { name: 'FavoriteBorder', label: 'Amor/Corazón', icon: <FavoriteBorderIcon /> }, { name: 'Group', label: 'Amigos/Grupo', icon: <GroupIcon /> }, { name: 'Flight', label: 'Viaje', icon: <FlightIcon /> }, { name: 'AttachMoney', label: 'Dinero', icon: <AttachMoneyIcon /> }, { name: 'LocalHospital', label: 'Salud', icon: <LocalHospitalIcon /> }, { name: 'Church', label: 'Iglesia/Fe', icon: <ChurchIcon /> }, { name: 'BookOutlined', label: 'Libro/Lectura', icon: <BookOutlinedIcon /> }, { name: 'StarBorder', label: 'Importante/Estrella', icon: <StarBorderIcon /> } ];
const DEFAULT_ICON_NAME = ICON_OPTIONS[0]?.name || 'LocalOfferOutlined';
const DEFAULT_COLOR = COLORS[0] || '#9e9e9e';


const EtiquetasPage = ({ availableTags = [], setAvailableTags }) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLOR);
  const [newTagIcon, setNewTagIcon] = useState(DEFAULT_ICON_NAME);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedTagData, setEditedTagData] = useState({ name: '', color: '', icon: '' });
  const [isUpdating, setIsUpdating] = useState(false); // Estado para indicar operación en progreso

  // --- Handlers ---
  const handleAddTag = () => {
    const tagTrim = newTagName.trim();
    if (tagTrim && !availableTags.some(t => t.name.toLowerCase() === tagTrim.toLowerCase())) {
      setAvailableTags(prev => [ ...prev, { name: tagTrim, color: newTagColor, icon: newTagIcon } ]);
      setNewTagName(''); setNewTagColor(DEFAULT_COLOR); setNewTagIcon(DEFAULT_ICON_NAME);
    } else if (tagTrim) { alert(`La etiqueta "${tagTrim}" ya existe.`); }
  };

  // *** deleteTag AHORA LLAMA A removeTagFromEntries ***
  const deleteTag = async (index) => { // <--- async
    const tagToDelete = availableTags[index];
    if (!tagToDelete || !tagToDelete.name) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar la etiqueta "${tagToDelete.name}"? Esto la quitará de todas las entradas.`)) {
        setIsUpdating(true); // Indicar que se está procesando
        try {
            console.log(`Attempting to remove tag "${tagToDelete.name}" from entries...`);
            // 1. Llamar a la función para limpiar las entradas y ESPERAR
            await removeTagFromEntries(tagToDelete.name);
            console.log(`Tag "${tagToDelete.name}" removed from entries.`);

            // 2. SI la limpieza fue exitosa, actualizar el estado global/Firestore
            setAvailableTags(prev => prev.filter((_, i) => i !== index));

            if (editingIndex === index) { setEditingIndex(null); }
             // Opcional: Snackbar de éxito
             // setSnackbar({ open: true, message: `Etiqueta "${tagToDelete.name}" eliminada.`, severity: 'success' });

        } catch (error) {
            console.error(`Failed to remove tag "${tagToDelete.name}" from entries or update global list:`, error);
            alert(`Error al eliminar la etiqueta de las entradas: ${error.message}`); // O usar Snackbar
        } finally {
            setIsUpdating(false); // Quitar indicador de carga
        }
    }
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditedTagData({ name: availableTags[index].name, color: availableTags[index].color || DEFAULT_COLOR, icon: availableTags[index].icon || DEFAULT_ICON_NAME });
  };

  // saveEdit llama a updateTagInEntries si el nombre cambia
  const saveEdit = async (index) => { // <-- async
    const tagTrim = editedTagData.name.trim();
    if (!tagTrim) { alert("El nombre..."); return; }
    const isDuplicate = availableTags.some((t, i) => i !== index && t.name.toLowerCase() === tagTrim.toLowerCase());
    if (isDuplicate) { alert(`La etiqueta "${tagTrim}" ya existe.`); return; }

    const oldTagData = availableTags[index];
    const oldName = oldTagData.name;
    const newTagData = { ...editedTagData, name: tagTrim };

    let stateUpdateSuccessful = false;
    // 1. Actualizar estado global (que llama a updateUserTags en Firestore)
    setAvailableTags(prev => {
        try {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...newTagData };
            stateUpdateSuccessful = true;
            return updated;
        } catch (e) { console.error("Error setting available tags state:", e); return prev; }
    });

    setEditingIndex(null);

    // 2. Actualizar en cascada si el nombre cambió y el paso anterior fue bien
    if (stateUpdateSuccessful && oldName !== newTagData.name) {
        console.log(`Tag name changed from "${oldName}" to "${newTagData.name}". Updating entries...`);
        setIsUpdating(true); // Indicar carga
        try {
            await updateTagInEntries(oldName, newTagData.name);
            console.log(`Entries update process triggered for tag rename: ${oldName} -> ${newTagData.name}`);
        } catch (error) {
            console.error(`Error updating entries for tag rename ${oldName}:`, error);
            alert(`Error actualizando entradas para la etiqueta: ${error.message}`);
        } finally {
             setIsUpdating(false);
        }
    } else if (oldName !== newTagData.name) {
         console.error("State update for availableTags failed, skipping cascade update for entries.");
         alert("Error guardando el cambio de etiqueta, no se actualizaron las entradas.");
    }
  };

  const handleEditDataChange = (field, value) => { setEditedTagData(prev => ({ ...prev, [field]: value })); };
  const handleEditKeyDown = (e, index) => { if (e.key === 'Enter') saveEdit(index); };
  const handleNewTagKeyDown = (e) => { if (e.key === 'Enter') handleAddTag(); };


  // --- Render ---
  return (
    <Paper sx={{ p: 3, maxWidth: 700, margin: '32px auto' }}>
      {/* Título */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LocalOfferOutlinedIcon color="primary"/>
        <Typography variant="h5" component="h1">Gestión de Etiquetas</Typography>
      </Box>

      {/* Formulario Añadir */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #eee', pb: 2 }}>
        <TextField label="Nueva etiqueta" value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={handleNewTagKeyDown} sx={{ flexGrow: 1, minWidth: 200 }} size="small" variant='outlined' />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="new-tag-color-label">Color</InputLabel>
          <Select labelId="new-tag-color-label" value={newTagColor} label="Color" onChange={e => setNewTagColor(e.target.value)}>
            {COLORS.map(c => ( <MenuItem key={c} value={c}> <Box sx={{ width: 18, height: 18, bgcolor: c, borderRadius: '50%', border: '1px solid #ccc', mr: 1 }} /> {COLOR_NAMES[c] || c} </MenuItem> ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="new-tag-icon-label">Icono</InputLabel>
          <Select labelId="new-tag-icon-label" value={newTagIcon} label="Icono" onChange={e => setNewTagIcon(e.target.value)}>
            {ICON_OPTIONS.map(ic => ( <MenuItem key={ic.name} value={ic.name}> <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {React.cloneElement(ic.icon, {fontSize: 'small'})} {ic.label} </Box> </MenuItem> ))}
          </Select>
        </FormControl>
        <Button variant="contained" color="primary" onClick={handleAddTag} disabled={!newTagName.trim() || isUpdating}>Añadir</Button>
      </Box>

      {/* Lista de Etiquetas */}
      <List>
        {availableTags.map((tag, idx) => {
          const isEditing = editingIndex === idx;
          const IconComponent = ICONS_MAP[tag.icon] || <LocalOfferOutlinedIcon fontSize="inherit"/>;

          return (
            <ListItem key={tag.name || idx} sx={{ borderBottom: '1px solid #eee', alignItems: 'flex-start', py: 1, minHeight: 60 }} disablePadding secondaryAction={ !isEditing && ( <ListItemSecondaryAction> <Tooltip title="Editar etiqueta"><IconButton edge="end" onClick={() => startEdit(idx)} size="small" disabled={isUpdating}><EditIcon fontSize="inherit"/></IconButton></Tooltip> <Tooltip title="Eliminar etiqueta"><IconButton edge="end" onClick={() => deleteTag(idx)} size="small" disabled={isUpdating}><DeleteIcon fontSize="inherit"/></IconButton></Tooltip> </ListItemSecondaryAction> ) }>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, mt: isEditing ? 2.5 : 1 }}>
                <Tooltip title={`Icono: ${tag.icon}`}> <Avatar sx={{ bgcolor: tag.color || DEFAULT_COLOR, width: 32, height: 32, color: '#fff' }}>{IconComponent}</Avatar> </Tooltip>
              </ListItemIcon>
              {isEditing ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5, pr: {xs: 0, sm: 6} }}>
                  {/* ... Fila de edición (TextField, Selects) ... */}
                   <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}> <TextField value={editedTagData.name} onChange={(e) => handleEditDataChange('name', e.target.value)} onKeyDown={(e) => handleEditKeyDown(e, idx)} size="small" variant="outlined" autoFocus sx={{ flexGrow: 1, minWidth: 150 }} /> <FormControl size="small" sx={{ minWidth: 100 }}> <InputLabel>Color</InputLabel> <Select value={editedTagData.color} label="Color" onChange={(e) => handleEditDataChange('color', e.target.value)}> {COLORS.map(c => ( <MenuItem key={c} value={c}> <Box sx={{ width: 18, height: 18, bgcolor: c, borderRadius: '50%', border: '1px solid #ccc', mr: 1 }} /> {COLOR_NAMES[c] || c} </MenuItem> ))} </Select> </FormControl> <FormControl size="small" sx={{ minWidth: 150 }}> <InputLabel>Icono</InputLabel> <Select value={editedTagData.icon} label="Icono" onChange={(e) => handleEditDataChange('icon', e.target.value)}> {ICON_OPTIONS.map(ic => ( <MenuItem key={ic.name} value={ic.name}> <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {React.cloneElement(ic.icon, {fontSize: 'small'})} {ic.label} </Box> </MenuItem> ))} </Select> </FormControl> </Box>
                  {/* Botones Guardar/Cancelar */}
                  <Box sx={{ display: 'flex', gap: 1, alignSelf: 'flex-end' }}>
                    <Button variant="outlined" color="inherit" size="small" onClick={() => setEditingIndex(null)} disabled={isUpdating}>Cancelar</Button>
                    <Button variant="contained" color="primary" size="small" onClick={() => saveEdit(idx)} disabled={!editedTagData.name.trim() || isUpdating}>{isUpdating ? 'Guardando...' : 'Guardar'}</Button>
                  </Box>
                </Box>
              ) : (
                <ListItemText primary={tag.name} primaryTypographyProps={{ sx: { mt: 0.5 } }}/>
              )}
            </ListItem>
          );
        })}
        {availableTags.length === 0 && ( <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}> No hay etiquetas definidas. </Typography> )}
      </List>
       {/* Opcional: Añadir un Backdrop o similar si isUpdating es true */}
       {/* <Backdrop open={isUpdating} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}><CircularProgress color="inherit" /></Backdrop> */}
    </Paper>
  );
};

export default EtiquetasPage;