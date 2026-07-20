export const resizeImage = (file, maxWidth = 1024, maxHeight = 1024) => {
  return new Promise((resolve) => {
    // Nếu không phải là ảnh, trả về file gốc
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    // Đối với ảnh GIF hoạt họa, giữ nguyên file gốc để tránh mất hoạt ảnh
    if (file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Tính toán tỷ lệ co giãn phù hợp
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
        ctx.drawImage(img, 0, 0, width, height);

        // Nén ảnh chất lượng JPEG 0.8 (độ nén tối ưu, dung lượng giảm 80-90% nhưng chất lượng mắt thường khó phân biệt)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            // Tạo đối tượng File mới từ Blob đã nén
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + ".jpg",
              {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }
            );
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => {
        resolve(file);
      };
    };
    reader.onerror = () => {
      resolve(file);
    };
  });
};
