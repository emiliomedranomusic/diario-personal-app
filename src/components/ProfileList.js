// src/components/ProfileList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText,
    Chip, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
    ListItemIcon, // Asegurar ListItemIcon
    IconButton, // Asegurar IconButton
    CircularProgress, // Añadir CircularProgress
    ListItemButton // Añadir ListItemButton para diálogo de menciones
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PROFILE_TYPES } from '../data/profiles';
// Importar funciones necesarias de Firestore y config
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore'; // Añadir getDocs
import { orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

// highlightMentions (si se usa en diálogo detalle)
function highlightMentions(content = '', profileName = '') {
    if (!content || !profileName) return content;
    try {
      const escapedName = profileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@(${escapedName})(?![wáéíóúÁÉÍÓÚñÑ])`, 'gi');
      return content.replace(regex, (match, p1) => `<span style="background-color: #fff59d; font-weight: bold; padding: 1px 3px; border-radius: 3px;">@${p1}</span>`);
    } catch (e) { console.error("Error highlighting mentions:", e); return content; }
}

// --- Componente ProfileListItem ---
const ProfileListItem = ({ profile, onEdit, onDeleteClick, onShowMentions }) => { // Recibe onShowMentions
    const [mentionCount, setMentionCount] = useState(null);
    const [isLoadingCount, setIsLoadingCount] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setIsLoadingCount(true);
        setMentionCount(null); // Resetear count mientras carga

     const fetchMentionCount = async () => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!isMounted || !userId || !profile || !profile.id) {
            if (isMounted) { setMentionCount(0); setIsLoadingCount(false); } return;
        }
        const entriesRef = collection(db, 'users', userId, 'entries');
        const q = query(entriesRef, where('profileRefs', 'array-contains', profile.id));
        try {
            const snapshot = await getDocs(q);
            let totalMentions = 0;
            snapshot.docs.forEach(doc => {
                const content = doc.data().content || '';
                const regex = new RegExp(`@${profile.nombre}\\b`, 'gi');
                const matches = content.match(regex);
                totalMentions += matches ? matches.length : 0;
            });
            if (isMounted) { setMentionCount(totalMentions); }
        } catch (error) {
            console.error(`Error getting mention count for ${profile.nombre}:`, error);
            if (isMounted) { setMentionCount(0); }
        } finally {
            if (isMounted) { setIsLoadingCount(false); }
        }
    };

    fetchMentionCount(); // <-- ¡Llama aquí la función!

    return () => { isMounted = false; };
}, [profile.id]);

    const renderSecondaryInfo = (p) => {
        let parts = [];
        if (p.tipo === 'persona' && p.genero) parts.push(`Género: ${p.genero}`);
        if (p.tipo === 'persona' && p.relacion) parts.push(`Relación: ${p.relacion}`);
        if (p.tipo === 'persona' && p.lugarAsociadoNombre) parts.push(`Lugar: ${p.lugarAsociadoNombre}`);
        if (p.tipo === 'lugar' && p.tipoLugar) parts.push(`Tipo: ${p.tipoLugar}`);
        if (p.tipo === 'festividad' && p.tipoFestividad) parts.push(`Tipo: ${p.tipoFestividad}`);
        if (p.tipo === 'festividad' && p.fechaFestividad) parts.push(`Fecha: ${p.fechaFestividad}`);
        if (p.notas) parts.push(`Notas: ${p.notas.substring(0, 50)}${p.notas.length > 50 ? '...' : ''}`);
        return parts.join(' | ') || 'Sin detalles adicionales';
     };

    return (
         <ListItem
            alignItems="flex-start"
            divider
            // *** JSX COMPLETO para secondaryAction ***
            secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Editar Perfil">
                        <IconButton edge="end" aria-label="editar" size="small" onClick={() => onEdit(profile)}>
                            <EditIcon fontSize="small" sx={{ color: 'warning.main' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar Perfil">
                    <IconButton edge="end" aria-label="eliminar" size="small" onClick={() => onDeleteClick(profile)}>
    <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
</IconButton>
                    </Tooltip>
                </Box>
            }
            sx={{ py: 1.5 }}
        >
            <ListItemAvatar>
                 <Avatar src={profile.fotoUrl || undefined} alt={profile.nombre} sx={{ width: 40, height: 40 }}>
                     {profile.nombre?.[0]?.toUpperCase() || '?'}
                 </Avatar>
             </ListItemAvatar>
            <ListItemText
                primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" component="span" sx={{ fontWeight: 500 }}>{profile.nombre}</Typography>
                        {isLoadingCount ? ( <CircularProgress size={14} sx={{ ml: 1 }}/> )
                         : ( mentionCount !== null && mentionCount > 0 ? (
                                <Tooltip title="Ver entradas mencionadas">
                                    <Chip
                                      label={`${mentionCount} ${mentionCount === 1 ? 'mención' : 'menciones'}`}
                                        size="small"
                                        clickable // <-- Clickable
                                        onClick={() => onShowMentions(profile)} // <-- onClick llama a onShowMentions
                                        sx={{ cursor: 'pointer', ml: 1 }}
                                    />
                                </Tooltip>
                             ) : <Typography variant="caption" sx={{ml: 1}}>(0 menciones)</Typography>
                        )}
                    </Box>
                }
                // *** JSX COMPLETO para secondary ***
                secondary={
                    <>
                        {Array.isArray(profile.etiquetas) && profile.etiquetas.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 0.5 }}>
                                {profile.etiquetas.map(tag => ( <Chip key={tag} label={tag} size="small" variant="outlined" /> ))}
                            </Box>
                        )}
                        <Typography variant="body2" color="text.secondary" component="span">
                             {renderSecondaryInfo(profile)}
                         </Typography>
                    </>
                }
                sx={{ mr: 1 }}
            />
        </ListItem>
    );
};
function getMentionContext(content, mention, chars = 30) {
  if (!content || !mention) return '';
  const regex = new RegExp(`@${mention}\\b`, 'i');
  const match = regex.exec(content);
  if (!match) return '';
  const start = Math.max(0, match.index - chars);
  const end = Math.min(content.length, match.index + match[0].length + chars);
  let before = content.substring(start, match.index);
  let mentionText = content.substring(match.index, match.index + match[0].length);
  let after = content.substring(match.index + match[0].length, end);
  return (
    <>
      {before}
      <mark style={{ background: '#ffe082', fontWeight: 'bold' }}>{mentionText}</mark>
      {after}
    </>
  );
}
function getAllMentionContexts(content, mention, chars = 30) {
  if (!content || !mention) return [];
  const regex = new RegExp(`@${mention}\\b`, 'gi');
  let match;
  const contexts = [];
  while ((match = regex.exec(content)) !== null) {
    const start = Math.max(0, match.index - chars);
    const end = Math.min(content.length, match.index + match[0].length + chars);
    let before = content.substring(start, match.index);
    let mentionText = content.substring(match.index, match.index + match[0].length);
    let after = content.substring(match.index + match[0].length, end);
    contexts.push(
      <span key={match.index}>
        {before}
        <mark style={{ background: '#ffe082', fontWeight: 'bold' }}>{mentionText}</mark>
        {after}
        <br />
      </span>
    );
  }
  return contexts;
}
// --- Componente ProfileList Principal ---
// *** Recibe 'entries' de nuevo ***
export default function ProfileList({ profiles, entries = [], onEdit, onDelete }) {

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState(null);
    // Estados para diálogo de menciones
    const [mentionsDialogOpen, setMentionsDialogOpen] = useState(false);
    const [profileForMentions, setProfileForMentions] = useState(null);
    const [mentionedEntriesList, setMentionedEntriesList] = useState([]); // Lista de entradas para mostrar
    const [loadingMentions, setLoadingMentions] = useState(false); // Loading para diálogo menciones
    // Estados para diálogo detalle entrada
    const [entryDetailOpen, setEntryDetailOpen] = useState(false);
    const [entryToShow, setEntryToShow] = useState(null);


    const groupedProfiles = PROFILE_TYPES.map(typeInfo => ({
        ...typeInfo,
        items: profiles.filter(p => p.tipo === typeInfo.value).sort((a, b) => a.nombre.localeCompare(b.nombre))
    })).filter(group => group.items.length > 0);

    // Handlers diálogo confirmación borrado
    const handleDeleteClick = (profile) => { setProfileToDelete(profile); setConfirmDeleteOpen(true); };
    const handleConfirmDelete = () => { if (profileToDelete && onDelete) { onDelete(profileToDelete); } setConfirmDeleteOpen(false); setProfileToDelete(null); };
    const handleCancelDelete = () => { setConfirmDeleteOpen(false); setProfileToDelete(null); };

    // *** NUEVA Lógica Asíncrona para Mostrar Menciones ***
    const handleShowMentions = useCallback(async (profile) => {
        if (!profile || !profile.id) return;
        setProfileForMentions(profile);
        setMentionedEntriesList([]); // Limpiar lista anterior
        setLoadingMentions(true); // Mostrar loading en diálogo
        setMentionsDialogOpen(true); // Abrir diálogo

        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) { setLoadingMentions(false); return; }

        const entriesRef = collection(db, 'users', userId, 'entries');
        const q = query(entriesRef, where('profileRefs', 'array-contains', profile.id), orderBy('updatedAt', 'desc')); // Ordenar por fecha

        try {
            const snapshot = await getDocs(q);
            const fetchedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMentionedEntriesList(fetchedEntries);
        } catch (error) {
            console.error("Error fetching mentioned entries:", error);
            // Quizás mostrar snackbar de error
        } finally {
            setLoadingMentions(false);
        }
    }, []); // No necesita dependencias si solo usa auth.currentUser

    const handleCloseMentionsDialog = () => {
        setMentionsDialogOpen(false);
        setTimeout(() => { // Retrasar limpieza para transición
            setProfileForMentions(null);
            setMentionedEntriesList([]);
        }, 300);
    };

    const handleOpenEntryDialog = (entry) => {
        setEntryToShow(entry);
        setEntryDetailOpen(true);
    };
    const handleCloseEntryDialog = () => {
        setEntryDetailOpen(false);
        setTimeout(() => setEntryToShow(null), 300);
    };

function stripHtmlTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '');
}
  return (
    <Box>
      {groupedProfiles.map(group => (
        <Paper key={group.value} sx={{ mb: 3, p: 2, boxShadow: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 1 }}>{group.label}</Typography>
          <List disablePadding>
            {group.items.map(profile => (
              <ProfileListItem
                  key={profile.id}
                  profile={profile}
                  onEdit={onEdit}
                  onDeleteClick={handleDeleteClick}
                  onShowMentions={handleShowMentions} // Pasar el nuevo handler
              />
            ))}
          </List>
        </Paper>
      ))}
      {groupedProfiles.length === 0 && ( <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}> No hay perfiles creados... </Typography> )}

      {/* --- Diálogo Menciones (Con Loading y Consulta) --- */}
      <Dialog open={mentionsDialogOpen} onClose={handleCloseMentionsDialog} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle>Entradas mencionando a "{profileForMentions?.nombre}"</DialogTitle>
        <DialogContent dividers>
          {loadingMentions ? (
              <Box sx={{display: 'flex', justifyContent: 'center', p: 3}}><CircularProgress /></Box>
          ) : mentionedEntriesList.length === 0 ? (
              <Typography sx={{p: 2}}>No se encontraron menciones.</Typography>
          ) : (
                 <List dense>
                    {mentionedEntriesList.map(entry => (
                        <ListItemButton
                            key={entry.id}
                            divider
                            onClick={() => handleOpenEntryDialog(entry)}
                        >
                           <ListItemText
  primary={entry.title || 'Entrada sin título'}
  secondary={
    <>
      {getAllMentionContexts(stripHtmlTags(entry.content), profileForMentions?.nombre)}
    </>
  }
/>
                        </ListItemButton>
                    ))}
                 </List>
           )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMentionsDialog} variant="contained" sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }}> Cerrar </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Detalle Entrada (sin cambios) */}
     <Dialog open={entryDetailOpen} onClose={handleCloseEntryDialog} maxWidth="md" fullWidth scroll="paper">
  <DialogTitle>{entryToShow?.title || 'Entrada sin título'}</DialogTitle>
  <DialogContent>
    <Typography
      variant="body2"
      component="div"
      sx={{ whiteSpace: 'pre-line' }}
      dangerouslySetInnerHTML={{ __html: entryToShow?.content || '' }}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={handleCloseEntryDialog}>Cerrar</Button>
  </DialogActions>
         {/* ... Contenido Detalle Entrada ... */}
       </Dialog>

      {/* Diálogo Confirmación Borrado */}
      <Dialog open={confirmDeleteOpen} onClose={handleCancelDelete}>
  <DialogTitle>¿Eliminar perfil?</DialogTitle>
  <DialogContent>
    <Typography>
      ¿Estás seguro de que quieres eliminar el perfil "{profileToDelete?.nombre}"? Esta acción no se puede deshacer.
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleCancelDelete} variant="outlined">Cancelar</Button>
    <Button onClick={handleConfirmDelete} color="error" variant="contained">Eliminar</Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}