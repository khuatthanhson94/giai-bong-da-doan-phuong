export const resizeImage = (file, maxWidth, maxHeight) => {
  // Trả về trực tiếp file gốc để giữ nguyên chất lượng ảnh tối đa như yêu cầu của người dùng
  return Promise.resolve(file);
};
