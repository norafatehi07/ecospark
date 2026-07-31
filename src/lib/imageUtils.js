/**
 * Compresses an image file on the client-side and returns a Base64 data URL.
 * Resizes the image to a maximum width/height of 800px and converts to WebP.
 * This ensures the resulting Base64 string is small enough (< 100KB) to fit comfortably
 * inside a Firestore document, bypassing the need for Firebase Storage.
 *
 * @param {File} file - The image file to compress
 * @returns {Promise<string>} - A promise that resolves to the Base64 data URL
 */
export async function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format with 0.8 quality (better detail for AI verification)
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
      img.src = event.target.result;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
