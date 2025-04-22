import React, { useState, useCallback } from 'react';
import { Paper, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, Chip, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { PROFILE_TYPES } from '../data/profiles';

function highlightMentions(content, profileName) {
  if (!content) return '';
  const escaped = profileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`@${escaped}(?![\wáéíóúÁÉÍÓÚñÑ])`, 'gi');
  return content.replace(regex, match => `<span style="background: #fff59d; font-weight: bold;">${match}</span>`);
}

export default function ProfileList({ profiles, entries = [], onEdit, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [openMentions, setOpenMentions] = useState(null);
  const [openEntry, setOpenEntry] = useState(null);

  const grouped = PROFILE_TYPES.map(t => ({
    ...t,
    items: profiles.filter(p => p.tipo === t.value)
  })).filter(g => g.items.length > 0);

  // --- MODIFICADO: Mention Calculation & Retrieval (por ID) ---
  const getMentionData = useCallback((profile) => {
    if (!entries || !profile || !profile.id) {
      console.log(`getMentionData: Invalid input or no entries/profile/ID for profile:`, profile?.nombre);
      return { count: 0, mentionedEntries: [] };
    }

    const profileIdToFind = profile.id;
    // console.log(`getMentionData: Checking for profile ID '${profileIdToFind}' in ${entries.length} entries.`);

    const mentionedEntries = entries.filter(entry => {
      // console.log(`  Checking entry ${entry.id}. profileRefs:`, entry.profileRefs);
      const refs = entry.profileRefs;
      if (!Array.isArray(refs)) {
        // console.log(`    Entry ${entry.id} has no valid profileRefs array.`);
        return false;
      }
      const isMatch = refs.includes(profileIdToFind);
      // if (isMatch) {
      //     console.log(`    MATCH FOUND in entry ${entry.id}!`);
      // }
      return isMatch;
    });

    // console.log(`getMentionData: Found ${mentionedEntries.length} mentions for ID '${profileIdToFind}'.`);
    return {
      count: mentionedEntries.length,
      mentionedEntries
    };
  }, [entries]);

  const handleDeleteClick = (profile) => {
    setProfileToDelete(profile);
    setConfirmOpen(true);
  };
  const handleConfirmDelete = () => {
    if (profileToDelete) {
      onDelete(profileToDelete);
      setProfileToDelete(null);
      setConfirmOpen(false);
    }
  };
  const handleCancelDelete = () => {
    setProfileToDelete(null);
    setConfirmOpen(false);
  };

  const renderSecondaryInfo = (profile) => {
    let parts = [];
    if (profile.tipo === 'persona' && profile.genero) parts.push(`Género: ${profile.genero}`);
    if (profile.tipo === 'persona' && profile.relacion) parts.push(`Relación: ${profile.relacion}`);
    if (profile.tipo === 'persona' && profile.lugarAsociadoNombre) {
        parts.push(`Lugar: ${profile.lugarAsociadoNombre}`);
    }
    if (profile.tipo === 'lugar' && profile.tipoLugar) parts.push(`Tipo: ${profile.tipoLugar}`);
    if (profile.tipo === 'festividad' && profile.tipoFestividad) parts.push(`Tipo: ${profile.tipoFestividad}`);
    if (profile.tipo === 'festividad' && profile.fechaFestividad) parts.push(`Fecha: ${profile.fechaFestividad}`);
    if (profile.notas) parts.push(`Notas: ${profile.notas.substring(0, 100)}${profile.notas.length > 100 ? '...' : ''}`);

    return parts.join(' | ');
  };

  return (
    <Box>
      {grouped.map(group => (
        <Paper key={group.value} sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{group.label}</Typography>
          <List>
            {group.items.map(profile => (
              <ListItem key={profile.id} alignItems="flex-start" secondaryAction={
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onEdit(profile)}
                    // *** AMARILLO/NARANJA para Editar ***
                    sx={{ backgroundColor: 'warning.main', color: '#fff', '&:hover': { backgroundColor: 'warning.dark' } }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleDeleteClick(profile)}
                    // *** ROJO para Eliminar ***
                    sx={{ backgroundColor: 'error.main', color: '#fff', '&:hover': { backgroundColor: 'error.dark' } }}
                  >
                    Eliminar
                  </Button>
                </Box>
              }>
                <ListItemAvatar>
                  <Avatar src={profile.fotoUrl || profile.foto || undefined} alt={profile.nombre}>
                    {profile.nombre[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <>
                      {profile.nombre}
                      <span
                        style={{ marginLeft: 8, color: '#1976d2', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setOpenMentions(profile)}
                        title="Ver entradas donde se menciona"
                        tabIndex={0}
                        role="button"
                        onKeyPress={e => { if (e.key === 'Enter') setOpenMentions(profile); }}
                      >
                        ({getMentionData(profile).count} menciones)
                      </span>
                    </>
                  }
                  secondary={
                    <>
                      {profile.etiquetas?.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                          {profile.etiquetas.map(tag => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>
                      )}
                      {renderSecondaryInfo(profile)}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      ))}
      {grouped.length === 0 && (
        <Typography variant="body2" color="text.secondary">No hay perfiles detectados aún.</Typography>
      )}
      <Dialog open={!!openMentions} onClose={() => setOpenMentions(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Entradas donde se menciona a "{openMentions?.nombre}"</DialogTitle>
        <DialogContent>
          {openMentions && getMentionData(openMentions).mentionedEntries.length === 0 && (
            <Typography>No hay menciones en ninguna entrada.</Typography>
          )}
          {openMentions && getMentionData(openMentions).mentionedEntries.map(entry => (
            <Box
              key={entry.id}
              sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 2, cursor: 'pointer', '&:hover': { background: '#f0f0f0' },
                maxWidth: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 40
              }}
              onClick={() => setOpenEntry({ entry, profile: openMentions })}
              tabIndex={0}
              role="button"
              onKeyPress={e => { if (e.key === 'Enter') setOpenEntry({ entry, profile: openMentions }); }}
            >
              <Typography variant="subtitle2">{entry.title || 'Sin título'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {entry.createdAt?.year || ''} {entry.createdAt?.month || ''} {entry.createdAt?.day || ''}
              </Typography>
              <Box
                sx={{
                  background: '#fcfcfc',
                  padding: 1,
                  borderRadius: 1,
                  maxHeight: 60,
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
                  border: '1px solid #eee',
                  fontSize: 14,
                  mt: 0.5
                }}
                component="div"
                dangerouslySetInnerHTML={{ __html: typeof entry.content === 'string' ? entry.content.replace(/<[^>]+>/g, '').slice(0, 120) + (entry.content.length > 120 ? '...' : '') : '' }}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMentions(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!openEntry} onClose={() => setOpenEntry(null)} maxWidth="md" fullWidth>
        <DialogTitle>Entrada completa</DialogTitle>
        <DialogContent>
          {openEntry && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>{openEntry.entry.title || 'Sin título'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {openEntry.entry.createdAt?.year || ''} {openEntry.entry.createdAt?.month || ''} {openEntry.entry.createdAt?.day || ''}
              </Typography>
              <Box
                sx={{
                  background: '#fcfcfc',
                  padding: 2,
                  borderRadius: 2,
                  minHeight: 80,
                  maxHeight: 350,
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
                  border: '1px solid #eee'
                }}
                component="div"
                dangerouslySetInnerHTML={{ __html: highlightMentions(openEntry.entry.content, openEntry.profile.nombre) }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEntry(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmOpen} onClose={handleCancelDelete}>
        <DialogTitle>¿Eliminar perfil?</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que quieres eliminar este perfil? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancelar</Button>
          <Button color="error" onClick={handleConfirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
