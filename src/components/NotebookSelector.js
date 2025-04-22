// src/components/NotebookSelector.js
import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Divider, Box, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// ID especial para la opción "Crear Nuevo..."
const CREATE_NEW_NOTEBOOK_VALUE = '__CREATE_NEW__';

export default function NotebookSelector({
    notebooks = [{ id: 'default', nombre: 'General' }], // Default prop value
    value,
    onChange,
    onAddNewNotebookRequest = () => {} // Recibe la función para solicitar creación
 }) {

    // Filtrar para que solo se muestren cuadernos reales (no la vista global 'all')
    const selectableNotebooks = notebooks.filter(nb => nb.id !== 'all');

    // Asegurarse que 'General' (default) esté presente si no viene
     if (!selectableNotebooks.some(nb => nb.id === 'default')) {
         selectableNotebooks.unshift({ id: 'default', nombre: 'General' });
     }

    const handleChange = (event) => {
        const selectedValue = event.target.value;
        if (selectedValue === CREATE_NEW_NOTEBOOK_VALUE) {
            // Si seleccionan "Crear Nuevo...", llamar a la función del padre
            onAddNewNotebookRequest();
            // No cambiar el valor seleccionado actual en el estado del padre
        } else {
            // Si seleccionan un cuaderno normal, llamar al onChange normal
            onChange(selectedValue);
        }
    };

    return (
        <FormControl fullWidth size="small"> {/* Usar size="small" para consistencia */}
            <InputLabel id="notebook-select-label">Cuaderno</InputLabel>
            <Select
                labelId="notebook-select-label"
                value={value} // El valor actual seleccionado
                label="Cuaderno"
                onChange={handleChange} // Usar nuestro manejador personalizado
            >
                {/* Opción para Crear Nuevo Cuaderno */}
                <MenuItem value={CREATE_NEW_NOTEBOOK_VALUE} sx={{ color: 'primary.main', fontStyle: 'italic' }}>
                     <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                         <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                         <Typography variant="body2">Crear nuevo cuaderno...</Typography>
                    </Box>
                </MenuItem>
                <Divider />

                {/* Lista de Cuadernos Existentes */}
                {selectableNotebooks.map(nb => (
                    <MenuItem key={nb.id} value={nb.id}>
                        {nb.nombre}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}