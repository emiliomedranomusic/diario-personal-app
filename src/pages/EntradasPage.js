// src/pages/EntradasPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Grid, Paper, Typography, Button, IconButton, FormControl, InputLabel, Select, MenuItem,
    Collapse, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Backdrop, Box,
    TextField, InputAdornment
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import EntryList from '../components/EntryList';
import NewEntry from '../components/NewEntry';
import EntryViewer from '../components/EntryViewer'; // <-- AÑADIR IMPORTACIÓN
import NotebookList from '../components/NotebookList';
import NotebookDialog from '../components/NotebookDialog';
import SnackbarAlert from '../components/SnackbarAlert';
import { getUserNotebooks, createNotebook, deleteNotebook, moveEntriesToGeneral } from '../data/notebooks';
import { auth, db } from '../firebase';
import { doc, collection, deleteDoc } from 'firebase/firestore';

const EntradasPage = ({ entries, availableTags, setAvailableTags, onUpdateEntries }) => {
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [mode, setMode] = useState('list'); // Ahora incluye 'view': 'list' | 'view' | 'edit' | 'new'
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [filter, setFilter] = useState({ tag: '', year: '', month: '', day: '' });
    const [notebooks, setNotebooks] = useState([
        { id: 'all', nombre: 'Mis Notas', count: 0 },
        { id: 'default', nombre: 'General', count: 0 }
    ]);
    const [selectedNotebookId, setSelectedNotebookId] = useState('all');
    const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
    const [notebookToDelete, setNotebookToDelete] = useState(null);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [openNotebookDialogRequest, setOpenNotebookDialogRequest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Función para Cargar y Actualizar Cuadernos ---
    const fetchAndUpdateNotebooks = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        console.log("Fetching and updating notebooks...");
        try {
            const userNotebooks = await getUserNotebooks();
            const notebooksWithCount = userNotebooks.map(nb => ({
                ...nb,
                count: entries.filter(e => (e.notebookId || 'default') === nb.id).length
            }));
            const allNotebooks = [
                { id: 'all', nombre: 'Mis Notas', count: entries.length },
                { id: 'default', nombre: 'General', count: entries.filter(e => !e.notebookId || e.notebookId === 'default').length },
                ...notebooksWithCount
            ];
            setNotebooks(allNotebooks);
            console.log("Notebooks updated:", allNotebooks);
            return allNotebooks;
        } catch (error) {
            console.error("Error fetching notebooks:", error);
            setSnackbar({ open: true, message: 'Error cargando cuadernos', severity: 'error' });
            setNotebooks(prev => [
                { id: 'all', nombre: 'Mis Notas', count: entries.length },
                { id: 'default', nombre: 'General', count: entries.filter(e => !e.notebookId || e.notebookId === 'default').length },
                ...(prev.filter(nb => nb.id !== 'all' && nb.id !== 'default'))
            ]);
            return notebooks;
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [entries]); // Depende de entries para recalcular counts


    // --- useEffect para Carga Inicial y Cambios en Entradas ---
    useEffect(() => {
        fetchAndUpdateNotebooks();
    }, [fetchAndUpdateNotebooks]);


    // --- useEffect para Limpiar Selección / Modo ---
    useEffect(() => {
        // Si estamos en modo lista, asegurar que no haya selección
        if (mode === 'list' && selectedEntry) {
            setSelectedEntry(null);
        }

        // Si la entrada seleccionada ya no está en la lista filtrada (por cambio de cuaderno/filtro), volver a lista
        if (selectedEntry && (mode === 'view' || mode === 'edit')) {
            const isEntryInFilteredList = filteredEntries.some(e => e.id === selectedEntry.id);
            if (!isEntryInFilteredList) {
                console.log(`Selected entry ${selectedEntry.id} not in filtered list. Returning to list mode.`);
                setMode('list');
                setSelectedEntry(null);
            }
        }

        // Si estamos en modo editar pero se deselecciona la entrada (ej: borrada), volver a lista
        if (mode === 'edit' && !selectedEntry) {
            console.log("In edit mode but no entry selected, switching to list.");
            setMode('list');
        }

    }, [selectedNotebookId, filter, entries, mode, selectedEntry]); // Added filter and entries to dependencies


    // --- Filtering Logic ---
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const filteredEntries = entries.filter(entry => {
        // 1. Filtro Cuaderno
        if (selectedNotebookId !== 'all' && (entry.notebookId || 'default') !== selectedNotebookId) return false;

        // 2. Filtro Etiquetas
        if (filter.tag && (!entry.tags || !entry.tags.includes(filter.tag))) return false;

        // 3. Filtro Fecha (lógica sin cambios)
        const createdAt = entry.createdAt; let entryYear = ''; let entryMonthIndex = ''; let entryDay = '';
        if (createdAt && typeof createdAt === 'object' && !(createdAt instanceof Date) && !(createdAt.toDate)) {
            entryYear = createdAt.year || ''; const monthName = createdAt.month || ''; const monthIndex = meses.findIndex(m => m.toLowerCase() === monthName.toLowerCase()); entryMonthIndex = monthIndex > 0 ? String(monthIndex) : ''; entryDay = createdAt.day || '';
        } else if (createdAt?.toDate) { const d = createdAt.toDate(); entryYear = String(d.getFullYear()); entryMonthIndex = String(d.getMonth() + 1); entryDay = String(d.getDate());
        } else if (createdAt instanceof Date) { const d = createdAt; entryYear = String(d.getFullYear()); entryMonthIndex = String(d.getMonth() + 1); entryDay = String(d.getDate()); }
        if (filter.year) { if (filter.year === 'Indefinido') { if(entryYear || entryMonthIndex || entryDay) return false; } else if (entryYear !== filter.year) return false; }
        if (filter.month && entryMonthIndex !== filter.month) return false;
        if (filter.day && entryDay !== filter.day) return false;

        // *** 4. FILTRO BÚSQUEDA TEXTO ***
        if (searchTerm && searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            const titleMatch = entry.title?.toLowerCase().includes(term);

            const contentHtmlMatch = entry.content?.toLowerCase().includes(term);

            let contentTextMatch = false;
            if (entry.content) {
                try {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = entry.content;
                    contentTextMatch = tempDiv.textContent?.toLowerCase().includes(term);
                } catch (e) {
                    console.warn("Could not parse entry content for search:", e);
                    contentTextMatch = false;
                }
            }
            if (!(titleMatch || contentTextMatch || contentHtmlMatch)) {
                return false;
            }
        }
        return true;
    });

    // --- Handlers ---
    const handleSelectEntry = useCallback((entry) => {
        console.log("Selecting entry for view:", entry?.id);
        setSelectedEntry(entry);
        setMode('view'); // <-- CAMBIO: Ir a modo VISTA primero
    }, []);

    const handleNew = useCallback(() => {
        setSelectedEntry(null);
        setMode('new');
    }, []);

    // Llamado desde EntryViewer o NewEntry para volver a la lista
    const handleReturnToList = useCallback(() => {
        console.log("Returning to list mode");
        setSelectedEntry(null);
        setMode('list');
    }, []);

    // Llamado desde EntryViewer para ir a editar
    const handleGoToEdit = useCallback(() => {
        if (selectedEntry) {
            console.log("Switching to edit mode for:", selectedEntry.id);
            setMode('edit');
        }
    }, [selectedEntry]);

    // (handleDeleteEntry sigue igual, se llama desde EntryViewer o NewEntry)
    const handleDeleteEntry = useCallback(async (entryToDelete) => {
        if (!entryToDelete || !entryToDelete.id) { setSnackbar({ open: true, message: 'Error: No se pudo identificar la entrada a eliminar.', severity: 'error' }); return; }
        setLoading(true);
        try {
            const user = auth.currentUser; if (!user) throw new Error("Usuario no autenticado");
            const entryRef = doc(db, 'users', user.uid, 'entries', entryToDelete.id);
            await deleteDoc(entryRef);
            setSnackbar({ open: true, message: 'Entrada eliminada correctamente', severity: 'success' });
            handleReturnToList(); // Volver a la lista después de borrar
        } catch (error) {
            console.error("Error deleting entry:", error);
            setSnackbar({ open: true, message: `Error eliminando entrada: ${error.message}`, severity: 'error' });
            handleReturnToList(); // Volver a lista incluso si falla
        } finally { setLoading(false); }
    }, [handleReturnToList]);

    // *** MODIFICADO: handleDeleteNotebook ***
    const handleDeleteNotebook = async (notebook) => {
        if (!notebook || ['all', 'default'].includes(notebook.id)) return;

        // *** Confirmación Adicional (Opcional pero buena idea) ***
        if (!window.confirm(`¿Seguro que quieres eliminar el cuaderno "${notebook.nombre}"? Sus notas pasarán a "General".`)) {
            setNotebookToDelete(null); // Cerrar diálogo si cancela
            return;
        }

        setLoading(true); // Iniciar loading
        setNotebookToDelete(null); // Cerrar diálogo de confirmación inmediatamente

        try {
            // Mover entradas PRIMERO y esperar a que termine
            await moveEntriesToGeneral(notebook.id);
            console.log("Entries moved to general for notebook:", notebook.id);

            // Eliminar el cuaderno DESPUÉS de mover las entradas
            await deleteNotebook(notebook.id);
            console.log("Notebook document deleted:", notebook.id);

            setSnackbar({ open: true, message: `Cuaderno "${notebook.nombre}" eliminado`, severity: 'info' });

            if (selectedNotebookId === notebook.id) {
                setSelectedNotebookId('all');
            }
        } catch (error) {
            console.error("Error deleting notebook:", error);
            setSnackbar({ open: true, message: `Error eliminando cuaderno: ${error.message}`, severity: 'error' });
        } finally {
            setLoading(false); // Terminar loading
        }
    };

    const requestOpenNotebookDialog = (callback = null) => { // Sigue igual
        console.log("Request to open notebook dialog received. Callback:", callback);
        setOpenNotebookDialogRequest({ callback }); setNotebookDialogOpen(true);
    };

    // *** AÑADIR ESTA FUNCIÓN DE NUEVO ***
    const handleCreateNotebook = async (nombre) => {
        setLoading(true);
        let newNotebookId = null;
        try {
            const newNotebook = await createNotebook(nombre);
            newNotebookId = newNotebook.id;
            setSnackbar({ open: true, message: `Cuaderno "${nombre}" creado`, severity: 'success' });
            setNotebookDialogOpen(false); // Cerrar diálogo
            await fetchAndUpdateNotebooks(false); // Refrescar lista de cuadernos
            if (openNotebookDialogRequest?.callback) {
                openNotebookDialogRequest.callback(newNotebookId);
                setOpenNotebookDialogRequest(null);
            }
        } catch (error) {
            console.error("Error creating notebook:", error);
            setSnackbar({ open: true, message: `Error creando cuaderno: ${error.message}`, severity: 'error' });
            setOpenNotebookDialogRequest(null);
        } finally {
            setLoading(false);
        }
    };
    // *** FIN FUNCIÓN AÑADIDA ***

    // --- UI Elements ---
    const currentYear = new Date().getFullYear();

    return (
        <React.Fragment>
            <Backdrop open={loading} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: '#fff' }}>
                <CircularProgress color="inherit" />
                <Typography sx={{ ml: 2 }}>Actualizando...</Typography>
            </Backdrop>

            <Grid container spacing={2}>
                {/* --- Sidebar Area (sin cambios estructurales) --- */}
                <Grid item xs={12} md={4} lg={3} sx={{ borderRight: { md: '1px solid #e0e0e0' }, pr: { md: 1 } }}>
                    <Paper sx={{ p: 1, mb: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            placeholder="Buscar en entradas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Paper>
                    <NotebookList notebooks={notebooks} selectedNotebookId={selectedNotebookId} onSelect={setSelectedNotebookId} onCreate={() => requestOpenNotebookDialog()} onDelete={nb => setNotebookToDelete(nb)} />
                    <Button variant="contained" fullWidth sx={{ mb: 2, backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }} onClick={handleNew} disabled={mode !== 'list'} > NUEVA ENTRADA </Button>
                    <Paper sx={{ p: 1, mb: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setFiltersOpen(o => !o)}> <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Filtros</Typography> {filtersOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />} </Paper>
                    <Collapse in={filtersOpen}>
                        <Paper sx={{ p: 2, mb: 2 }}>
                            {/* Filtros (sin cambios) */}
                            <FormControl fullWidth sx={{ mb: 2 }} size="small"> <InputLabel id="filtro-etiqueta-label">Etiqueta</InputLabel> <Select labelId="filtro-etiqueta-label" value={filter.tag} label="Etiqueta" onChange={(e) => setFilter({ ...filter, tag: e.target.value })}><MenuItem value="">Todas</MenuItem>{availableTags.map((tag, index) => (<MenuItem key={index} value={tag}>{tag}</MenuItem>))}</Select></FormControl>
                            <FormControl fullWidth sx={{ mb: 2 }} size="small"> <InputLabel id="filtro-ano-label">Año</InputLabel> <Select labelId="filtro-ano-label" value={filter.year} label="Año" onChange={(e) => setFilter({ ...filter, year: e.target.value })}><MenuItem value="">Todos</MenuItem><MenuItem value="Indefinido">Indefinido</MenuItem>{Array.from({ length: currentYear - 1925 + 1 }, (_, i) => currentYear - i).map((year) => (<MenuItem key={year} value={String(year)}>{year}</MenuItem>))}</Select></FormControl>
                            <FormControl fullWidth sx={{ mb: 2 }} size="small"> <InputLabel id="filtro-mes-label">Mes</InputLabel> <Select labelId="filtro-mes-label" value={filter.month} label="Mes" onChange={(e) => setFilter({ ...filter, month: e.target.value })}><MenuItem value="">Todos</MenuItem>{meses.slice(1).map((mes, i) => (<MenuItem key={i + 1} value={String(i + 1)}>{mes}</MenuItem> ))}</Select></FormControl>
                            <FormControl fullWidth size="small"> <InputLabel id="filtro-dia-label">Día</InputLabel> <Select labelId="filtro-dia-label" value={filter.day} label="Día" onChange={(e) => setFilter({ ...filter, day: e.target.value })}><MenuItem value="">Todos</MenuItem>{Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (<MenuItem key={day} value={String(day)}>{day}</MenuItem>))}</Select></FormControl>
                        </Paper>
                    </Collapse>
                </Grid>

                {/* --- Main Content Area --- */}
                <Grid item xs={12} md={8} lg={9}>
                    {/* --- Renderizado Condicional por Modo --- */}
                    {mode === 'list' && (
                        <Paper sx={{ p: 2, minHeight: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', bgcolor: '#f8fafc', boxShadow: 1, borderRadius: 2 }}>
                            {filteredEntries.length > 0 ? ( <EntryList entries={filteredEntries} onSelect={handleSelectEntry} selectedEntry={null} /> ) : ( <Typography sx={{textAlign: 'center', mt: 4, color: 'text.secondary'}}> No hay entradas para mostrar {selectedNotebookId !== 'all' || filter.tag || filter.year || filter.month || filter.day ? 'con los filtros actuales' : ''}. </Typography> )}
                        </Paper>
                    )}

                    {/* --- MODO VISTA --- */}
                    {mode === 'view' && selectedEntry && (
                        <EntryViewer
                            entry={selectedEntry}
                            onEdit={handleGoToEdit} // Función para pasar a modo edición
                            onDelete={() => handleDeleteEntry(selectedEntry)} // Función para eliminar
                            onClose={handleReturnToList} // Función para volver a la lista
                        />
                    )}

                    {/* --- MODO EDICIÓN --- */}
                    {mode === 'edit' && selectedEntry && (
                        <NewEntry
                            key={selectedEntry.id} // Clave para forzar re-montaje si cambia la entrada
                            entry={selectedEntry}
                            availableTags={availableTags}
                            setSnackbar={setSnackbar}
                            resetEntry={handleReturnToList} // Volver a lista al guardar/cancelar
                            handleDeleteEntry={handleDeleteEntry}
                            currentNotebooks={notebooks.filter(nb => nb.id !== 'all')}
                            onRequestOpenNotebookDialog={requestOpenNotebookDialog}
                        />
                    )}

                    {/* --- MODO NUEVO --- */}
                    {mode === 'new' && (
                        <NewEntry
                            key="new-entry" // Clave fija para nueva entrada
                            entry={null} // Sin entrada inicial
                            availableTags={availableTags}
                            setSnackbar={setSnackbar}
                            resetEntry={handleReturnToList} // Volver a lista al guardar/cancelar
                            handleDeleteEntry={handleDeleteEntry} // No debería poder borrar aquí, pero la pasamos
                            currentNotebooks={notebooks.filter(nb => nb.id !== 'all')}
                            onRequestOpenNotebookDialog={requestOpenNotebookDialog}
                        />
                    )}
                </Grid>
            </Grid>

            {/* --- Dialogs (sin cambios) --- */}
            <NotebookDialog
                open={notebookDialogOpen}
                onClose={() => { setNotebookDialogOpen(false); setOpenNotebookDialogRequest(null); }}
                onSave={handleCreateNotebook}
                existingNotebooks={notebooks} // <-- AÑADIDO
            />
            {notebookToDelete && (
                <Dialog open={!!notebookToDelete} onClose={() => setNotebookToDelete(null)}>
                    <DialogTitle>Eliminar Cuaderno</DialogTitle>
                    <DialogContent> <Typography> ¿Seguro que quieres eliminar el cuaderno "{notebookToDelete.nombre}"? Sus {notebookToDelete.count || 0} notas {notebookToDelete.count === 1 ? 'pasará' : 'pasarán'} a "General". Esta acción no se puede deshacer. </Typography> </DialogContent>
                    <DialogActions> <Button onClick={() => setNotebookToDelete(null)} variant="contained" sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }}> Cancelar </Button> <Button onClick={() => handleDeleteNotebook(notebookToDelete)} variant="contained" sx={{ backgroundColor: '#e53935', color: '#fff', '&:hover': { backgroundColor: '#b71c1c' } }} > Eliminar </Button> </DialogActions>
                </Dialog>
            )}
            <SnackbarAlert open={snackbar.open} onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} message={snackbar.message} />
        </React.Fragment>
    );
};

export default EntradasPage;