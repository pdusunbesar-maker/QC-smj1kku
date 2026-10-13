/**
 * Image and Avatar Utilities
 * Provides model presets, canvas-based image resizing and compression for avatars.
 */

export interface PresetAvatar {
  id: string;
  label: string;
  category: 'Dokter' | 'ATLM' | 'Analis' | 'Auditor';
  url: string;
}

export const PRESET_MODEL_AVATARS: PresetAvatar[] = [
  {
    id: 'dr-pria',
    label: 'dr. Spesialis Pria',
    category: 'Dokter',
    url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'dr-wanita',
    label: 'dr. Spesialis Wanita',
    category: 'Dokter',
    url: 'https://images.unsplash.com/photo-1594824813572-132d733737b3?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'atlm-pria',
    label: 'Petugas ATLM Pria',
    category: 'ATLM',
    url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'atlm-wanita',
    label: 'Petugas ATLM Wanita',
    category: 'ATLM',
    url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'analis-jas',
    label: 'Laboran / Analis Lab',
    category: 'Analis',
    url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'medis-klinis',
    label: 'Petugas Medis Klinis',
    category: 'Analis',
    url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'auditor-wanita',
    label: 'Auditor Mutu KARS',
    category: 'Auditor',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'auditor-pria',
    label: 'Pimpinan / Asesor Mutu',
    category: 'Auditor',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  },
];

/**
 * Resizes and center-crops an uploaded image file into a square avatar (default 256x256).
 * Compresses to JPEG ~20-35KB, ensuring fast transmission and instant Supabase persistence
 * without exceeding PostgreSQL/PostgREST HTTP payload limits.
 */
export async function compressAvatarImage(
  file: File,
  maxDimension = 256,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar yang valid.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file foto dari perangkat.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Gagal memproses data gambar.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Gambar rusak atau format tidak didukung.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          // Square center crop calculation
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

          // Convert to JPEG data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // Fallback to original data URL if canvas fails
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
