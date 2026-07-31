import { compressImageToBase64 } from './imageUtils';

export async function convertFileToBase64(file) {
  // If it's an image, use the existing canvas compression
  if (file.type.startsWith('image/')) {
    return compressImageToBase64(file);
  }

  // For non-images (PDF, video, audio), enforce a strict 700KB limit
  // because Firestore documents have a hard 1MB limit and Base64 adds ~33% overhead.
  const MAX_SIZE_BYTES = 700 * 1024; // 700KB
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File is too large (${(file.size / 1024).toFixed(1)} KB). Maximum allowed size is 700 KB.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}
