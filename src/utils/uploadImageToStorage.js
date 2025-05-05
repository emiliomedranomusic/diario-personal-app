// Sube un archivo de imagen a Firebase Storage y retorna la URL privada
import { storage, auth } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sube un archivo a Firebase Storage y devuelve la URL de descarga.
 * @param {File} file El archivo a subir.
 * @param {string} storagePath La ruta base en Storage (ej: 'uploads', 'profile_pics').
 * @param {function} onProgress (opcional) Callback para progreso (0-100)
 * @returns {Promise<{ url: string, fullPath: string, name: string, type: string }>} La URL de descarga de la imagen subida.
 */
export function uploadImageToStorage(file, storagePath = 'uploads', onProgress) {
  return new Promise(async (resolve, reject) => {
    const user = auth.currentUser;
    if (!user) {
      return reject(new Error('Usuario no autenticado para subir archivo.'));
    }
    if (!file) {
      return reject(new Error('No se proporcionó archivo.'));
    }
    // Validación frontend (además de reglas backend)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'audio/mpeg', 'audio/mp3', 'audio/wav',
      'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.some(type => file.type === type || file.type.startsWith(type.split('/')[0]))) {
      return reject(new Error('Tipo de archivo no permitido.'));
    }
    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error('El archivo debe ser menor a 10MB.'));
    }
    // Generar nombre único
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    // --- Path ajustado para adjuntos ---
    let finalPath = storagePath;
    if (storagePath === 'attachments') {
      finalPath = `attachments/${user.uid}`;
    } else if (storagePath === 'profile_pics') {
      finalPath = `profile_pics/${user.uid}`;
    } else {
      finalPath = `${storagePath}/${user.uid}`;
    }
    const storageRef = ref(storage, `${finalPath}/${uniqueFileName}`);
    // Subida resumible
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed',
      (snapshot) => {
        if (typeof onProgress === 'function') {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        }
      },
      (error) => {
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error('Permiso denegado. Revisa las reglas de Storage.'));
            break;
          case 'storage/canceled':
            reject(new Error('Subida cancelada.'));
            break;
          default:
            reject(new Error('Error desconocido al subir el archivo.'));
        }
      },
      () => {
        // Subida completada
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            resolve({
              url: downloadURL,
              fullPath: uploadTask.snapshot.ref.fullPath,
              name: file.name,
              type: file.type
            });
          })
          .catch((err) => {
            if (err.code === 'storage/object-not-found') {
              reject(new Error('No se pudo obtener la URL de descarga. Verifica las reglas de Storage.'));
            } else if (err.code === 'storage/unauthorized') {
              reject(new Error('No tienes permiso para leer este archivo. Revisa las reglas de Storage.'));
            } else {
              reject(new Error('Archivo subido, pero error al obtener URL.'));
            }
          });
      }
    );
  });
}
