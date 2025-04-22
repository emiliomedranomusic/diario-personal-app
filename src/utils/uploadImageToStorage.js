// Sube un archivo de imagen a Cloudinary y retorna la URL pública
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadImageToStorage(file) {
  if (!file) throw new Error('No file provided');
  if (file.size > 5 * 1024 * 1024) throw new Error('La imagen debe ser menor a 5MB');

  const cloudName = 'dgmoyicar'; // Cloudinary cloud name
  const unsignedPreset = 'diario'; // Cloudinary upload preset (unsigned)

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', unsignedPreset);

  const res = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Error subiendo la imagen');
  }

  const data = await res.json();
  return data.secure_url; // URL pública de la imagen
}
