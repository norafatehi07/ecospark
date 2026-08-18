import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Uploads a file (File object or Blob) to Firebase Storage and returns the download URL.
 * 
 * @param {File|Blob} file - The file to upload.
 * @param {string} path - The storage path/folder (e.g., 'submissions').
 * @returns {Promise<string>} The public download URL.
 */
export async function uploadImage(file, path = 'uploads') {
  if (!file) throw new Error('No file provided for upload.');

  // Extract extension if it's a File object, otherwise default to jpg
  let extension = 'jpg';
  if (file.name) {
    const parts = file.name.split('.');
    if (parts.length > 1) {
      extension = parts.pop();
    }
  }

  const rand = Math.random().toString(36).substring(2, 15);
  const filename = `${Date.now()}_${rand}.${extension}`;
  const fullPath = `${path}/${filename}`;
  
  const storageRef = ref(storage, fullPath);
  
  // Upload
  const snapshot = await uploadBytes(storageRef, file);
  
  // Get URL
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return downloadUrl;
}
