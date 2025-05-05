// src/pages/EntradasPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Grid, Paper, Typography, Button, FormControl, InputLabel, Select, MenuItem,
    Collapse, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Backdrop, Box,
    TextField, InputAdornment
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import EntryList from '../components/EntryList';
import NewEntry from '../components/NewEntry';
import EntryViewer from '../components/EntryViewer';
import NotebookList from '../components/NotebookList';
import NotebookDialog from '../components/NotebookDialog';
import SnackbarAlert from '../components/SnackbarAlert';
import { getUserNotebooks, createNotebook, deleteNotebook, moveEntriesToGeneral, updateNotebookName } from '../data/notebooks';
import { collection, query, orderBy, limit, onSnapshot, getCountFromServer, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getMoreEntries, deleteEntryById, PAGE_SIZE } from '../services/entryService';
import ExportDialog from '../components/ExportDialog';
import ImportDialog from '../components/ImportDialog';

const EntradasPage = ({ availableTags, setAvailableTags }) => {
    const [entries, setEntries] = useState([]);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [mode, setMode] = useState('list');
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [filter, setFilter] = useState({ tag: '', year: '', month: '', day: '' });
    const [notebooks, setNotebooks] = useState([]);
    const [selectedNotebookId, setSelectedNotebookId] = useState('all');
    const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
    const [notebookToDelete, setNotebookToDelete] = useState(null);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [openNotebookDialogRequest, setOpenNotebookDialogRequest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditNotebookDialogOpen, setIsEditNotebookDialogOpen] = useState(false);
    const [notebookToEdit, setNotebookToEdit] = useState(null);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    useEffect(() => {
        setLoadingInitial(true);
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            setLoadingInitial(false);
            setEntries([]);
            setHasMore(false);
            return;
        }
        const entriesRef = collection(db, 'users', userId, 'entries');
        const q = query(entriesRef, orderBy('updatedAt', 'desc'), limit(PAGE_SIZE));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const firstBatchEntries = [];
            querySnapshot.forEach((doc) => {
                firstBatchEntries.push({ id: doc.id, ...doc.data() });
            });
            setEntries(firstBatchEntries);
            const currentLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            setLastVisible(currentLastVisible);
            setHasMore(firstBatchEntries.length === PAGE_SIZE);
            setLoadingInitial(false);
            console.log(`Firestore listener updated: Received ${firstBatchEntries.length} entries for the first batch.`);
        }, (error) => {
            setSnackbar({ open: true, message: 'Error al cargar entradas.', severity: 'error' });
            setLoadingInitial(false);
            setEntries([]);
            setHasMore(false);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const loadMoreEntries = useCallback(async () => {
        if (loadingMore || !hasMore || !lastVisible) return;
        setLoadingMore(true);
        try {
            const { entries: newEntries, lastVisible: newLastVisible, hasMore: newHasMore } = await getMoreEntries(lastVisible);
            if (newEntries.length > 0) {
                setEntries(prevEntries => [...prevEntries, ...newEntries]);
            }
            setLastVisible(newLastVisible || lastVisible);
            setHasMore(newHasMore);
        } catch (error) {
            setSnackbar({ open: true, message: 'Error cargando más entradas.', severity: 'error' });
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    }, [lastVisible, hasMore, loadingMore, setSnackbar]);

    const fetchAndUpdateNotebooks = useCallback(async (showLoading = true) => {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        if (!userId) {
            setNotebooks([
                { id: 'all', nombre: 'Mis Notas', count: 0 },
                { id: 'default', nombre: 'General', count: 0 }
            ]);
            return;
        }
        if (showLoading) setLoading(true);
        try {
            const userNotebooks = await getUserNotebooks();
            const entriesRef = collection(db, 'users', userId, 'entries');
            const calculateCount = async (notebookId) => {
                let q;
                if (notebookId === 'all') {
                    q = query(entriesRef);
                } else if (notebookId === 'default') {
                    q = query(entriesRef, where('notebookId', '==', 'default'));
                } else {
                    q = query(entriesRef, where('notebookId', '==', notebookId));
                }
                try {
                    const snapshot = await getCountFromServer(q);
                    return snapshot.data().count;
                } catch (error) {
                    console.error(`Error getting count for notebook ${notebookId}:`, error);
                    return 0;
                }
            };
            const countPromises = [
                calculateCount('all'),
                calculateCount('default'),
                ...userNotebooks.map(nb => calculateCount(nb.id))
            ];
            const counts = await Promise.all(countPromises);
            const totalCount = counts[0];
            const defaultExplicitCount = counts[1];
            const userNotebookCounts = counts.slice(2);
            let countInUserNotebooks = 0;
            const updatedUserNotebooks = userNotebooks.map((nb, index) => {
                countInUserNotebooks += userNotebookCounts[index];
                return { ...nb, count: userNotebookCounts[index] };
            });
            const generalImplicitCount = totalCount - countInUserNotebooks;
            const finalNotebooks = [
                { id: 'all', nombre: 'Mis Notas', count: totalCount },
                { id: 'default', nombre: 'General', count: generalImplicitCount },
                ...updatedUserNotebooks
            ];
            setNotebooks(finalNotebooks);
            return finalNotebooks;
        } catch (error) {
            setNotebooks([
                { id: 'all', nombre: 'Mis Notas', count: 0 },
                { id: 'default', nombre: 'General', count: 0 }
            ]);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndUpdateNotebooks();
    }, [fetchAndUpdateNotebooks]);

    useEffect(() => {
        if (mode === 'list' && selectedEntry) { setSelectedEntry(null); }
        if (selectedEntry && (mode === 'view' || mode === 'edit')) {
            const isEntryStillLoaded = entries.some(e => e.id === selectedEntry.id);
            if (!isEntryStillLoaded) {
                setMode('list');
                setSelectedEntry(null);
            }
        }
        if (mode === 'edit' && !selectedEntry) { setMode('list'); }
    }, [entries, mode, selectedEntry, filter, selectedNotebookId]);

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
            const entryIdToDelete = entryToDelete.id;
            await deleteEntryById(entryIdToDelete);
            setSnackbar({ open: true, message: 'Entrada eliminada correctamente', severity: 'success' });
            handleReturnToList(); // Volver a la lista después de borrar
        } catch (error) {
            console.error("Error deleting entry:", error);
            setSnackbar({ open: true, message: `Error eliminando entrada: ${error.message}`, severity: 'error' });
            handleReturnToList(); // Volver a lista incluso si falla
        } finally { setLoading(false); }
    }, [handleReturnToList]);

    // *** MODIFICADO: handleDeleteNotebook ***
    const handleCreateNotebook = async (nombre) => {
        setLoading(true);
        let newNotebookId = null;
        let success = false;
        try {
            const newNotebook = await createNotebook(nombre);
            newNotebookId = newNotebook.id;
            success = true;
            setSnackbar({ open: true, message: `Cuaderno "${nombre}" creado`, severity: 'success' });
            setNotebookDialogOpen(false);
            if (openNotebookDialogRequest?.callback) {
                openNotebookDialogRequest.callback(newNotebookId);
                setOpenNotebookDialogRequest(null);
            }
        } catch (error) {
            setOpenNotebookDialogRequest(null);
        } finally {
            setLoading(false);
            if (success) {
                fetchAndUpdateNotebooks(false);
            }
        }
    };

    const handleDeleteNotebook = async (notebook) => {
        if (!notebook || ['all', 'default'].includes(notebook.id)) return;
        setLoading(true);
        setNotebookToDelete(null);
        let success = false;
        try {
            await moveEntriesToGeneral(notebook.id);
            await deleteNotebook(notebook.id);
            success = true;
            setSnackbar({ open: true, message: `Cuaderno "${notebook.nombre}" eliminado`, severity: 'info' });
            if (selectedNotebookId === notebook.id) {
                setSelectedNotebookId('all');
            }
        } catch (error) {
            setSnackbar({ open: true, message: `Error eliminando cuaderno: ${error.message}`, severity: 'error' });
        } finally {
            setLoading(false);
            if (success) {
                fetchAndUpdateNotebooks(false);
            }
        }
    };

    const requestOpenNotebookDialog = (callback = null) => { 
        console.log("Request to open notebook dialog received. Callback:", callback);
        setOpenNotebookDialogRequest({ callback }); 
        setNotebookToEdit(null);
        setIsEditNotebookDialogOpen(true);
    };

    const handleOpenCreateNotebookDialog = () => {
        setNotebookToEdit(null);
        setIsEditNotebookDialogOpen(true);
        // No limpiar openNotebookDialogRequest aquí
    };
    const handleOpenEditNotebookDialog = (notebook) => {
        if (!notebook || ['all', 'default'].includes(notebook.id)) return;
        setNotebookToEdit(notebook);
        setIsEditNotebookDialogOpen(true);
    };
    const handleCloseNotebookDialog = () => {
        setIsEditNotebookDialogOpen(false);
        setNotebookToEdit(null);
        setOpenNotebookDialogRequest(null);
    };
    const handleSaveNotebook = async (newName) => {
        const trimmedName = newName.trim();
        if (!trimmedName) return;
        const isDuplicate = notebooks.some(nb =>
            nb.nombre.toLowerCase() === trimmedName.toLowerCase() &&
            (!notebookToEdit || nb.id !== notebookToEdit.id)
        );
        if (isDuplicate) {
            setSnackbar({ open: true, message: `El cuaderno "${trimmedName}" ya existe.`, severity: 'error' });
            return;
        }
        setLoading(true);
        let newNotebookId = null;
        let success = false;
        const savedCallbackInfo = openNotebookDialogRequest;
        setOpenNotebookDialogRequest(null);
        try {
            if (notebookToEdit && notebookToEdit.id) {
                await updateNotebookName(notebookToEdit.id, trimmedName);
                setSnackbar({ open: true, message: 'Cuaderno renombrado.', severity: 'success' });
                success = true;
            } else {
                const newNotebook = await createNotebook(trimmedName);
                newNotebookId = newNotebook.id;
                setSnackbar({ open: true, message: `Cuaderno "${trimmedName}" creado.`, severity: 'success' });
                success = true;
                // NO llamar al callback aquí todavía
            }
        } catch (error) {
            setSnackbar({ open: true, message: `Error al guardar cuaderno: ${error.message}`, severity: 'error' });
        } finally {
            setLoading(false);
            if (success) {
                handleCloseNotebookDialog();
                console.log("Notebook saved/updated, now fetching updated list...");
                await fetchAndUpdateNotebooks(false);
                console.log("Notebook list updated.");
                if (!notebookToEdit && savedCallbackInfo?.callback && newNotebookId) {
                    console.log("Calling notebook creation callback with ID:", newNotebookId);
                    savedCallbackInfo.callback(newNotebookId);
                }
            }
        }
    };

    // --- UI Elements ---
    const currentYear = new Date().getFullYear();

    return (
        <React.Fragment>
            <Backdrop open={loading || loadingInitial} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: '#fff' }}>
                <CircularProgress color="inherit" />
                <Typography sx={{ ml: 2 }}>{loadingInitial ? 'Cargando Entradas...' : 'Actualizando...'}</Typography>
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
                    <NotebookList
                        notebooks={notebooks}
                        selectedNotebookId={selectedNotebookId}
                        onSelect={setSelectedNotebookId}
                        onCreate={handleOpenCreateNotebookDialog}
                        onDelete={notebook => setNotebookToDelete(notebook)}
                        onEdit={handleOpenEditNotebookDialog}
                    />
                    <Paper sx={{ p: 1, mb: 1 }}>
                        <Button
                            variant="contained"
                            fullWidth
                            sx={{ mb: 1, backgroundColor: '#1976d2', color: '#fff', '&:hover': { backgroundColor: '#1565c0' } }}
                            onClick={handleNew}
                        >
                            NUEVA ENTRADA
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => setIsExportDialogOpen(true)}
                            sx={{ backgroundColor: '#fb8c00', color: '#fff', '&:hover': { backgroundColor: '#ef6c00' } }}
                        >
                            Exportar Todo
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => setIsImportDialogOpen(true)}
                            sx={{ mt: 1, backgroundColor: '#43a047', color: '#fff', '&:hover': { backgroundColor: '#388e3c' } }}
                        >
                            Importar
                        </Button>
                    </Paper>
                    <Paper sx={{ p: 1, mb: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setFiltersOpen(o => !o)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FilterListIcon fontSize="small" sx={{ color: 'action.active' }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Filtros</Typography>
                        </Box>
                        {filtersOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </Paper>
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
                            {loadingInitial ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>
                            ) : filteredEntries.length > 0 ? (
                                <>
                                    <EntryList entries={filteredEntries} onSelect={handleSelectEntry} selectedEntry={null} />
                                    {hasMore && (
                                        <Box sx={{ textAlign: 'center', mt: 2, mb: 1 }}>
                                            <Button
                                                onClick={loadMoreEntries}
                                                disabled={loadingMore}
                                                variant="contained"
                                                size="medium"
                                                sx={{ backgroundColor: 'primary.main', color: '#fff', '&:hover': { backgroundColor: 'primary.dark' } }}
                                            >
                                                {loadingMore ? <CircularProgress size={24} color="inherit" /> : 'Cargar Más Entradas'}
                                            </Button>
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                                    No hay entradas para mostrar
                                </Typography>
                            )}
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
                open={isEditNotebookDialogOpen}
                onClose={handleCloseNotebookDialog}
                onSave={handleSaveNotebook}
                existingNotebooks={notebooks}
                initialName={notebookToEdit ? notebookToEdit.nombre : ''}
                isEditMode={!!notebookToEdit}
            />
            {notebookToDelete && (
                <Dialog open={!!notebookToDelete} onClose={() => setNotebookToDelete(null)}>
                    <DialogTitle>Eliminar Cuaderno</DialogTitle>
                    <DialogContent> <Typography> ¿Seguro que quieres eliminar el cuaderno "{notebookToDelete.nombre}"? Sus {notebookToDelete.count || 0} notas {notebookToDelete.count === 1 ? 'pasará' : 'pasarán'} a "General". Esta acción no se puede deshacer. </Typography> </DialogContent>
                    <DialogActions> <Button onClick={() => setNotebookToDelete(null)} variant="contained" sx={{ backgroundColor: '#757575', color: '#fff', '&:hover': { backgroundColor: '#616161' } }}> Cancelar </Button> <Button onClick={() => handleDeleteNotebook(notebookToDelete)} variant="contained" sx={{ backgroundColor: '#e53935', color: '#fff', '&:hover': { backgroundColor: '#b71c1c' } }} > Eliminar </Button> </DialogActions>
                </Dialog>
            )}
            <SnackbarAlert open={snackbar.open} onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} message={snackbar.message} />
            <ExportDialog
                open={isExportDialogOpen}
                onClose={() => setIsExportDialogOpen(false)}
                entries={entries}
            />
            <ImportDialog open={isImportDialogOpen} onClose={() => setIsImportDialogOpen(false)} />
        </React.Fragment>
    );
};

export default EntradasPage;