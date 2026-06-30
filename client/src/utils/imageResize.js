export const resizeImage = (file, maxWidth, maxHeight) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions while preserving aspect ratio
      let { width, height } = img;
      const aspectRatio = width / height;
      if (width > maxWidth) {
        width = maxWidth;
        height = Math.round(width / aspectRatio);
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * aspectRatio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) {
          // Preserve original file name and type
          const resizedFile = new File([blob], file.name, { type: blob.type });
          resolve(resizedFile);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, file.type || 'image/jpeg', 0.9);
    };
    img.onerror = err => reject(err);
    // Use Object URL to load image without reading the whole file into memory
    img.src = URL.createObjectURL(file);
  });
};
