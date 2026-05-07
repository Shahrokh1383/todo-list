/**
 * Image Compression Utility
 * Compresses images before upload to reduce bandwidth and storage
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const TARGET_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_DIMENSION = 1024;

/**
 * Compress image using Canvas API
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = MAX_DIMENSION,
    quality = 0.8,
  } = {
    maxSizeMB: options.maxSizeMB || 1,
    maxWidthOrHeight: options.maxWidthOrHeight || MAX_DIMENSION,
    quality: options.quality || 0.8,
  };

  // Skip if file is already small enough
  if (file.size <= TARGET_FILE_SIZE) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Create new file with same properties
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            // Check if compression was successful
            if (compressedFile.size > MAX_FILE_SIZE && quality > 0.5) {
              // Try again with lower quality
              compressImage(file, { ...options, quality: quality - 0.1 })
                .then(resolve)
                .catch(reject);
            } else {
              resolve(compressedFile);
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

/**
 * Validate image file
 * @param {File} file - Image file to validate
 * @returns {Object} - Validation result { valid, error }
 */
export const validateImage = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, JPG, GIF, WebP)',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Image size must be less than 2MB',
    };
  }

  return { valid: true, error: null };
};

export default { compressImage, validateImage };