// src/pages/EtiquetasPage.js
import React, { useState } from 'react';
import {
    Paper, Typography, TextField, Button, List, ListItem, ListItemText,
    IconButton, Box, ListItemIcon, Avatar, Tooltip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// Importar todos los iconos posibles
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

// Mapa de componentes de icono para renderizado fácil
const ICONS_MAP = {
  WorkOutline: <WorkOutlineIcon fontSize="inherit"/>,
  School: <SchoolIcon fontSize="inherit"/>,
  FamilyRestroom: <FamilyRestroomIcon fontSize="inherit"/>,
  StarBorder: <StarBorderIcon fontSize="inherit"/>,
  FavoriteBorder: <FavoriteBorderIcon fontSize="inherit"/>,
  BookOutlined: <BookOutlinedIcon fontSize="inherit"/>,
  Church: <ChurchIcon fontSize="inherit"/>,
  Group: <GroupIcon fontSize="inherit"/>,
  LocalHospital: <LocalHospitalIcon fontSize="inherit"/>,
  AttachMoney: <AttachMoneyIcon fontSize="inherit"/>,
  Flight: <FlightIcon fontSize="inherit"/>,
  LocalOfferOutlined: <LocalOfferOutlinedIcon fontSize="inherit"/>,
};

// Lista de opciones para los selectores (ajusta según necesites)
const ICON_OPTIONS = [
    { name: 'LocalOfferOutlined', label: 'Etiqueta', icon: <LocalOfferOutlinedIcon /> },
    { name: 'WorkOutline', label: 'Trabajo', icon: <WorkOutlineIcon /> },
    { name: 'School', label: 'Estudio', icon: <SchoolIcon /> },
    { name: 'FamilyRestroom', label: 'Familia', icon: <FamilyRestroomIcon /> },
    { name: 'FavoriteBorder', label: 'Amor/Corazón', icon: <FavoriteBorderIcon /> },
    { name: 'Group', label: 'Amigos/Grupo', icon: <GroupIcon /> },
    { name: 'Flight', label: 'Viaje', icon: <FlightIcon /> },
    { name: 'AttachMoney', label: 'Dinero', icon: <AttachMoneyIcon /> },
    { name: 'LocalHospital', label: 'Salud', icon: <LocalHospitalIcon /> },
    { name: 'Church', label: 'Iglesia/Fe', icon: <ChurchIcon /> },
    { name: 'BookOutlined', label: 'Libro/Lectura', icon: <BookOutlinedIcon /> },
    { name: 'StarBorder', label: 'Importante/Estrella', icon: <StarBorderIcon /> },
];
const COLORS = ['#9e9e9e', '#2196f3', '#4caf50', '#ff9800', '#e91e63', '#673ab7', '#f44336', '#00bcd4', '#795548']; // Gris, Azul, Verde, Naranja, Rosa, Púrpura, Rojo, Cyan, Marrón

// Recibe availableTags ya normalizadas (array de objetos)
const EtiquetasPage = ({ availableTags = [], setAvailableTags }) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLORS[0]);
  const [newTagIcon, setNewTagIcon] = useState(ICON_OPTIONS[0].name);

  const [editingIndex, setEditingIndex] = useState(null); // Índice de la etiqueta en edición
  // Estado para guardar los datos *mientras* se edita
  const [editedTagData, setEditedTagData] = useState({ name: '', color: '', icon: '' });

  // Ya no necesita normalizar aquí
  // useEffect(() => { ... });

  const handleAddTag = () => {
    const tagTrim = newTagName.trim();
    if (tagTrim && !availableTags.some(t => t.name.toLowerCase() === tagTrim.toLowerCase())) {
      setAvailableTags(prev => [
          ...prev,
          { name: tagTrim, color: newTagColor, icon: newTagIcon }
      ]);
      // Resetear formulario de añadir
      setNewTagName('');
      setNewTagColor(COLORS[0]);
      setNewTagIcon(ICON_OPTIONS[0].name);
    } else if (tagTrim) {
        alert(`La etiqueta "${tagTrim}" ya existe.`); // O usar Snackbar
    }
  };

  // Eliminar etiqueta con confirmación
  const deleteTag = (index) => {
    const tagToDelete = availableTags[index];
    if (window.confirm(`¿Estás seguro de que quieres eliminar la etiqueta "${tagToDelete.name}"?`)) {
        setAvailableTags(prev => prev.filter((_, i) => i !== index));
        if (editingIndex === index) { // Si se borra la que se estaba editando
            setEditingIndex(null);
        }
    }
  };

  // Cargar datos al estado de edición al hacer clic en editar
  const startEdit = (index) => {
    setEditingIndex(index);
    setEditedTagData({ // Cargar datos actuales de la etiqueta
        name: availableTags[index].name,
        color: availableTags[index].color || COLORS[0],
        icon: availableTags[index].icon || ICON_OPTIONS[0].name
    });
  };

  // Guardar los cambios desde el estado de edición
  const saveEdit = (index) => {
    const tagTrim = editedTagData.name.trim();
    if (!tagTrim) {
        alert("El nombre de la etiqueta no puede estar vacío."); // O usar Snackbar
        return;
    }
     // Validar duplicados al editar (excluyendo la posición actual)
     const isDuplicate = availableTags.some((t, i) =>
        i !== index && t.name.toLowerCase() === tagTrim.toLowerCase()
     );
     if (isDuplicate) {
          alert(`La etiqueta "${tagTrim}" ya existe.`); // Usar Snackbar sería mejor
          return;
     }
    // Actualizar la etiqueta en la lista principal
    const updatedTags = [...availableTags];
    updatedTags[index] = { ...updatedTags[index], ...editedTagData, name: tagTrim }; // Fusionar cambios
    setAvailableTags(updatedTags);
    setEditingIndex(null); // Salir del modo edición
  };

  // Handler genérico para actualizar el estado de edición
  const handleEditDataChange = (field, value) => {
      setEditedTagData(prev => ({ ...prev, [field]: value }));
  };

  // Handlers para guardar con Enter
  const handleEditKeyDown = (e, index) => { if (e.key === 'Enter') saveEdit(index); };
  const handleNewTagKeyDown = (e) => { if (e.key === 'Enter') handleAddTag(); };

  return (
    <Paper sx={{ p: 3, maxWidth: 700, margin: '32px auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LocalOfferOutlinedIcon color="primary"/>
        <Typography variant="h5" component="h1">Gestión de Etiquetas</Typography>
      </Box>

      {/* Formulario Añadir */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #eee', pb: 2 }}>
        <TextField label="Nueva etiqueta" value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={handleNewTagKeyDown} sx={{ flexGrow: 1, minWidth: 200 }} size="small" variant='outlined' />
        {/* Selector Color para Nueva Etiqueta */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="new-tag-color-label">Color</InputLabel>
          <Select labelId="new-tag-color-label" value={newTagColor} label="Color" onChange={e => setNewTagColor(e.target.value)}>
            {COLORS.map(c => ( <MenuItem key={c} value={c}> <Box sx={{ width: 18, height: 18, bgcolor: c, borderRadius: '50%', border: '1px solid #ccc', mr: 1 }} /> </MenuItem> ))}
          </Select>
        </FormControl>
        {/* Selector Icono para Nueva Etiqueta */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="new-tag-icon-label">Icono</InputLabel>
          <Select labelId="new-tag-icon-label" value={newTagIcon} label="Icono" onChange={e => setNewTagIcon(e.target.value)}>
            {ICON_OPTIONS.map(ic => ( <MenuItem key={ic.name} value={ic.name}> <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {React.cloneElement(ic.icon, {fontSize: 'small'})} {ic.label} </Box> </MenuItem> ))}
          </Select>
        </FormControl>
        <Button variant="contained" color="primary" onClick={handleAddTag} disabled={!newTagName.trim()}>Añadir</Button>
      </Box>

      {/* Lista de Etiquetas */}
      <List>
        {availableTags.map((tag, idx) => {
          const isEditing = editingIndex === idx;
          // Obtener icono del mapa
          const IconComponent = ICONS_MAP[tag.icon] || <LocalOfferOutlinedIcon fontSize="inherit"/>;

          return (
            <ListItem
              key={tag.name || idx} // Usar nombre como key si es único, sino índice
              sx={{ borderBottom: '1px solid #eee', alignItems: 'flex-start', py: 1, minHeight: 60 }}
              disablePadding
              secondaryAction={ // Mostrar solo si NO se está editando
                !isEditing && (
                  <Box>
                    <Tooltip title="Editar etiqueta"><IconButton onClick={() => startEdit(idx)} size="small" sx={{ mr: 0.5 }}><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                    <Tooltip title="Eliminar etiqueta"><IconButton onClick={() => deleteTag(idx)} size="small"><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                  </Box>
                )
              }
            >
              {/* Icono y Avatar con Color */}
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, mt: isEditing ? 2.5 : 1 }}> {/* Ajustar margen top en edición */}
                <Tooltip title={`Icono: ${tag.icon}`}>
                    <Avatar sx={{ bgcolor: tag.color || COLORS[0], width: 32, height: 32, color: '#fff' }}>
                      {IconComponent}
                    </Avatar>
                 </Tooltip>
              </ListItemIcon>

              {/* Contenido: Edición o Vista */}
              {isEditing ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}> {/* Añadir padding top */}
                  {/* Fila de edición */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      value={editedTagData.name}
                      onChange={(e) => handleEditDataChange('name', e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, idx)}
                      size="small" variant="outlined" autoFocus sx={{ flexGrow: 1, minWidth: 150 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Color</InputLabel>
                      <Select value={editedTagData.color} label="Color" onChange={(e) => handleEditDataChange('color', e.target.value)}>
                        {COLORS.map(c => ( <MenuItem key={c} value={c}> <Box sx={{ width: 18, height: 18, bgcolor: c, borderRadius: '50%', border: '1px solid #ccc' }} /> </MenuItem> ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                       <InputLabel>Icono</InputLabel>
                       <Select value={editedTagData.icon} label="Icono" onChange={(e) => handleEditDataChange('icon', e.target.value)}>
                         {ICON_OPTIONS.map(ic => ( <MenuItem key={ic.name} value={ic.name}> <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {React.cloneElement(ic.icon, {fontSize: 'small'})} {ic.label} </Box> </MenuItem> ))}
                       </Select>
                    </FormControl>
                  </Box>
                  {/* Botones Guardar/Cancelar Edición */}
                  <Box sx={{ display: 'flex', gap: 1, alignSelf: 'flex-end' }}> {/* Alinear a la derecha */}
                    <Button variant="outlined" color="inherit" size="small" onClick={() => setEditingIndex(null)}>Cancelar</Button>
                    <Button variant="contained" color="primary" size="small" onClick={() => saveEdit(idx)} disabled={!editedTagData.name.trim()}>Guardar</Button>
                  </Box>
                </Box>
              ) : (
                // Modo Vista (Sin contador de usos)
                <ListItemText
                    primary={tag.name}
                    primaryTypographyProps={{ sx: { mt: 0.5 } }} // Ajustar margen si es necesario
                />
              )}
            </ListItem>
          );
        })}
        {/* Mensaje si no hay etiquetas */}
        {availableTags.length === 0 && ( <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}> No hay etiquetas definidas. </Typography> )}
      </List>
    </Paper>
  );
};

export default EtiquetasPage;