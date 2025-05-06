// src/pages/MainApp.js
import React, { useState, useEffect } from 'react'; // Añadir useState, useEffect
import AppLayout from '../AppLayout';
// Quitar import de auth si no se usa más aquí
// import { auth } from '../firebase';

// --- FUNCIÓN DE NORMALIZACIÓN Y DEFAULTS ---
// (Puedes mover esto a un archivo utils/tags.js si prefieres)
const DEFAULT_TAG_COLOR = '#757575'; // Gris por defecto
const DEFAULT_TAG_ICON = 'LocalOfferOutlined'; // Icono por defecto

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => {
    if (typeof t === 'string') {
      // Si es string, convertir a objeto con defaults
      return {
        name: t,
        color: DEFAULT_TAG_COLOR,
        icon: DEFAULT_TAG_ICON,
      };
    }
    // Si ya es objeto, asegurarse que tenga los campos mínimos y preservar otros
    return {
      name: t.name || "Etiqueta sin nombre", // Añadir fallback
      color: t.color || DEFAULT_TAG_COLOR,
      icon: t.icon || DEFAULT_TAG_ICON,
      ...t // Preservar otros campos como IDs si se añaden
    };
  });
}
// --- FIN NORMALIZACIÓN ---

const MainApp = () => {
  // Estado inicial como strings (se normalizarán en el effect)
  const [initialTags] = useState([
    // Puedes ajustar estos valores iniciales si quieres
    { name: "Dios/Iglesia", icon: "Church", color: "#795548" }, // Marrón
    { name: "Familia", icon: "FamilyRestroom", color: "#ff7043" }, // Naranja
    { name: "Amor", icon: "FavoriteBorder", color: "#e91e63" }, // Rosa
    { name: "Amigos", icon: "Group", color: "#4caf50" }, // Verde
    { name: "Trabajo", icon: "WorkOutline", color: "#2196f3" }, // Azul
    { name: "Educación", icon: "School", color: "#9c27b0" }, // Púrpura
    { name: "Viaje", icon: "Flight", color: "#00acc1" }, // Cyan
    { name: "Salud", icon: "LocalHospital", color: "#ef5350" }, // Rojo claro
    { name: "Dinero", icon: "AttachMoney", color: "#ffc107" }, // Amber
  ]);

  // Estado que contendrá los objetos de etiqueta normalizados
  const [availableTags, setAvailableTags] = useState([]);

  // Normalizar las etiquetas iniciales una vez al montar
  useEffect(() => {
      console.log("MainApp: Normalizing initial tags...");
      setAvailableTags(normalizeTags(initialTags));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ejecutar solo una vez


  // Pasar availableTags (ya normalizadas) y setAvailableTags
  return (
    <AppLayout
      availableTags={availableTags}
      setAvailableTags={setAvailableTags}
      // entries ya no se maneja aquí
    />
  );
};

export default MainApp;