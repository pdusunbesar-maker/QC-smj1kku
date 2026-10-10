/**
 * Preprocessing WAJIB untuk OCR Foto Struk Hematologi Dirui Dimih 3980:
 * 1. Convert to grayscale: 0.299 * R + 0.587 * G + 0.114 * B
 * 2. Contrast 1.8: factor = (259 * (1.8 * 255 + 255)) / (255 * (259 - 1.8 * 255))
 * 3. Threshold 180 (Binarization: text becomes pure black 0, background becomes white 255)
 * 4. Crop otomatis: Hanya area tabel Item-Hasil-Unit
 */

export interface CropRegion {
  x: number;      // % from left (0 - 100)
  y: number;      // % from top (0 - 100)
  width: number;  // % width (10 - 100)
  height: number; // % height (10 - 100)
}

// Default auto-crop region for Dirui Dimih 3980 thermal receipt:
// Targets the central table area (Item - Nilai - Unit), skipping header/barcode and footer/histograms
export const DEFAULT_DIRUI_TABLE_CROP: CropRegion = {
  x: 4,      // 4% margin left
  y: 18,     // 18% from top (skipping header info, patient ID, date banner)
  width: 92, // 92% width
  height: 72 // 72% height (skipping bottom operator signature and histogram graph)
};

export interface PreprocessResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  cropRect: { x: number; y: number; width: number; height: number };
}

/**
 * Executes mandatory preprocessing pipeline on an image or image URL.
 */
export async function preprocessDiruiReceipt(
  imageSource: HTMLImageElement | string,
  cropRegion: CropRegion = DEFAULT_DIRUI_TABLE_CROP,
  options: {
    contrast?: number;  // Default 1.8 as required
    threshold?: number; // Default 180 as required
  } = {}
): Promise<PreprocessResult> {
  const contrast = options.contrast ?? 1.8;
  const threshold = options.threshold ?? 180;

  // 1. Ensure source is a loaded HTMLImageElement
  const img = await resolveImageElement(imageSource);

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // 2. Compute Crop pixel coordinates
  const cropX = Math.round((cropRegion.x / 100) * origW);
  const cropY = Math.round((cropRegion.y / 100) * origH);
  const cropW = Math.max(10, Math.round((cropRegion.width / 100) * origW));
  const cropH = Math.max(10, Math.round((cropRegion.height / 100) * origH));

  // 3. Create Canvas
  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Gagal menginisialisasi 2D Canvas context untuk preprocessing.');
  }

  // Draw cropped section with smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    cropX, cropY, cropW, cropH,
    0, 0, cropW, cropH
  );

  // 4. Pixel-level manipulation: Grayscale -> Contrast 1.8 -> Threshold 180
  const imgData = ctx.getImageData(0, 0, cropW, cropH);
  const data = imgData.data;

  // Contrast factor calculation:
  // standard formula: factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))
  const cFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Step A: Grayscale (Standard ITU-R BT.601)
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Step B: Contrast 1.8
    gray = cFactor * (gray - 128) + 128;
    if (gray < 0) gray = 0;
    else if (gray > 255) gray = 255;

    // Step C: Threshold 180 (Binarization)
    // Dark ink text (< 180) becomes pure black (0)
    // Background paper (>= 180) becomes pure white (255)
    const binary = gray >= threshold ? 255 : 0;

    data[i] = binary;     // R
    data[i + 1] = binary; // G
    data[i + 2] = binary; // B
    data[i + 3] = 255;    // A (Fully opaque)
  }

  ctx.putImageData(imgData, 0, 0);

  // 5. Output dataUrl and Blob
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
  });

  return {
    canvas,
    dataUrl,
    blob,
    originalWidth: origW,
    originalHeight: origH,
    croppedWidth: cropW,
    croppedHeight: cropH,
    cropRect: { x: cropX, y: cropY, width: cropW, height: cropH }
  };
}

/**
 * Helper to ensure an image source is fully loaded in memory
 */
function resolveImageElement(source: HTMLImageElement | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof source !== 'string') {
      if (source.complete && source.naturalWidth > 0) {
        return resolve(source);
      }
      source.onload = () => resolve(source);
      source.onerror = (e) => reject(new Error('Gagal memuat elemen gambar sumber.'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat URL gambar untuk preprocessing canvas.'));
    img.src = source;
  });
}
