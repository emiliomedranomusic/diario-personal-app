// Modelo y utilidades para perfiles de Personas/Lugares/Festividades/Otros

export const PROFILE_TYPES = [
  { value: 'persona', label: 'Persona' },
  { value: 'lugar', label: 'Lugar' },
  { value: 'festividad', label: 'Festividad' },
  { value: 'otro', label: 'Otro' },
];

// Función para crear un nuevo perfil con datos opcionales
export function createProfile(data) {
  const nombre = data.nombre || 'Nuevo Perfil'; // Asegura que haya un nombre
  const defaultProfile = {
    id: data.id || nombre.toLowerCase().replace(/[^a-z0-9]/gi, '_') + '_' + Date.now(), // ID único
    nombre: nombre,
    tipo: 'otro', // Valor por defecto si no se especifica
    fotoUrl: '', // Valor por defecto
    relacion: '',
    tipoLugar: '',
    tipoFestividad: '',
    fecha: '',
    notas: '',
    etiquetas: [],
    genero: '', // Añadido para consistencia
    fechaFestividad: '', // Añadido para consistencia
    notasRelacionadas: data.notaId ? [data.notaId] : [] // Inicializa con la nota relacionada si existe
  };

  // Fusiona los datos proporcionados con los valores por defecto
  // Los valores en 'data' tendrán prioridad sobre 'defaultProfile'
  return { ...defaultProfile, ...data };
}

// *** MODIFICADO: extractMentions con Regex más restrictiva ***
export function extractMentions(text) {
    if (!text) return [];

    // Regex más estricta: permite nombres compuestos con espacio, punto o guion, pero no termina en separador ni permite cadenas basura
    const regex = /@([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+(?:[ .-][a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)*)(?![a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ])/g;

    const matches = text.match(regex) || [];
    return matches.map(m => m.substring(1).trim());
}

// Actualiza o agrega una nota relacionada a un perfil SIN MUTARLO
export function addRelatedNote(profile, notaId) {
  // Si el perfil no tiene la propiedad o ya incluye la nota, no hacer nada
  if (!profile || !profile.notasRelacionadas || profile.notasRelacionadas.includes(notaId)) {
    return null; // Indica que no hubo cambios necesarios
  }
  // Crear una copia del perfil con la nueva nota añadida
  return {
    ...profile,
    notasRelacionadas: [...profile.notasRelacionadas, notaId]
  };
}

// --- utilidades de almacenamiento local para perfiles ---
export function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem('diario_profiles')) || [];
  } catch {
    return [];
  }
}
export function saveProfiles(profiles) {
  localStorage.setItem('diario_profiles', JSON.stringify(profiles));
}
