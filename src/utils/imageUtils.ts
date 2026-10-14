/**
 * Image and Avatar Utilities
 * Provides resilient canvas-based image resizing and compression for uploaded user avatars.
 */

export interface PresetAvatar {
  id: string;
  label: string;
  category: 'Dokter' | 'ATLM' | 'Analis' | 'Auditor';
  url: string;
}

// Model presets removed to strictly enforce real user-uploaded photos
export const PRESET_MODEL_AVATARS: PresetAvatar[] = [];

/**
 * Resizes and center-crops an uploaded image file into a square avatar (default 256x256).
 * Compresses to JPEG (~15-25KB), ensuring fast transmission, instant local caching,
 * and seamless persistence to Supabase PostgreSQL without payload size errors.
 */
export async function compressAvatarImage(
  file: File,
  maxDimension = 256,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Robust image type detection (MIME type or file extension)
    const isImage = 
      (file.type && file.type.startsWith('image/')) ||
      /\.(jpe?g|png|webp|gif|bmp|heic|svg)$/i.test(file.name);

    if (!isImage) {
      reject(new Error('File yang dipilih bukan gambar yang didukung. Pilih file JPG, PNG, atau WEBP.'));
      return;
    }

    // Try modern object URL first for performance and memory safety
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      // Fallback handled below
    }

    const processImageSource = (src: string, isBlobUrl: boolean) => {
      const img = new Image();
      // Never set crossOrigin for blob: or data: URLs as it causes CORS/tainted canvas errors in modern browsers
      if (!isBlobUrl && !src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (isBlobUrl) {
          try {
            URL.revokeObjectURL(src);
          } catch (e) {}
        }

        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          if (!width || !height) {
            resolve(src);
            return;
          }

          const canvas = document.createElement('canvas');

          // Center crop to 1:1 square
          const cropSize = Math.min(width, height);
          const startX = (width - cropSize) / 2;
          const startY = (height - cropSize) / 2;

          const targetSize = Math.min(cropSize, maxDimension);
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            startX,
            startY,
            cropSize,
            cropSize,
            0,
            0,
            targetSize,
            targetSize
          );

          // Convert to efficient JPEG data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // If canvas compression fails, return the source data URL
          resolve(src);
        }
      };

      img.onerror = () => {
        if (isBlobUrl) {
          try {
            URL.revokeObjectURL(src);
          } catch (e) {}
          // Fallback to FileReader if object URL fails
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
              resolve(dataUrl);
            } else {
              reject(new Error('Format gambar tidak dapat dibaca.'));
            }
          };
          reader.onerror = () => reject(new Error('Gagal membaca file foto dari perangkat.'));
          reader.readAsDataURL(file);
          return;
        }
        reject(new Error('Format gambar tidak dapat dibaca. Pastikan file gambar tidak rusak.'));
      };

      img.src = src;
    };

    if (objectUrl) {
      processImageSource(objectUrl, true);
    } else {
      // Fallback to FileReader
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file foto dari perangkat.'));
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (!src) {
          reject(new Error('Gagal memproses file foto.'));
          return;
        }
        processImageSource(src, false);
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Resizes an uploaded institutional logo while preserving aspect ratio and transparency.
 * Limits dimensions to maxDimension (default 400px) and keeps payload under ~40KB
 * ensuring safe storage in localStorage without quota errors.
 */
export async function compressLogoImage(
  file: File,
  maxDimension = 400,
  quality = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    const isImage = 
      (file.type && file.type.startsWith('image/')) ||
      /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name);

    if (!isImage) {
      reject(new Error('File yang dipilih bukan gambar yang didukung. Pilih file PNG atau JPG.'));
      return;
    }

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {}

    const processLogoSource = (src: string, isBlobUrl: boolean) => {
      const img = new Image();
      if (!isBlobUrl && !src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        if (isBlobUrl) {
          try {
            URL.revokeObjectURL(src);
          } catch (e) {}
        }

        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          if (!width || !height) {
            resolve(src);
            return;
          }

          // Compute scale keeping aspect ratio
          let targetWidth = width;
          let targetHeight = height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              targetWidth = maxDimension;
              targetHeight = Math.round((height * maxDimension) / width);
            } else {
              targetHeight = maxDimension;
              targetWidth = Math.round((width * maxDimension) / height);
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // If original was PNG, keep PNG for transparency
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          const compressed = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          resolve(src);
        }
      };

      img.onerror = () => {
        if (isBlobUrl) {
          try {
            URL.revokeObjectURL(src);
          } catch (e) {}
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) resolve(dataUrl);
            else reject(new Error('Format logo tidak dapat dibaca.'));
          };
          reader.onerror = () => reject(new Error('Gagal membaca file logo.'));
          reader.readAsDataURL(file);
          return;
        }
        reject(new Error('Format logo tidak dapat dibaca.'));
      };

      img.src = src;
    };

    if (objectUrl) {
      processLogoSource(objectUrl, true);
    } else {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file logo.'));
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (!src) {
          reject(new Error('Gagal membaca data gambar logo.'));
          return;
        }
        processLogoSource(src, false);
      };
      reader.readAsDataURL(file);
    }
  });
}
