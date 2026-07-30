/**
 * Utility to compress images on the client side using HTML5 Canvas
 * This helps reduce the size of uploaded documents (KK, Akta, Foto, etc.) 
 * to save storage space in Supabase.
 */

export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    // Only compress images
    if (!file.type.match(/image.*/)) {
      return resolve(file);
    }

    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.7,
      outputType = 'image/jpeg'
    } = options;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas to Blob conversion failed'));
          }
          // Create a new File object with the compressed blob
          const compressedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          });
          
          console.log(`Compressed ${file.name} from ${(file.size / 1024).toFixed(2)} KB to ${(compressedFile.size / 1024).toFixed(2)} KB`);
          resolve(compressedFile);
        }, outputType, quality);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
  });
};
