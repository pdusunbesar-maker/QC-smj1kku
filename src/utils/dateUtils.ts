/**
 * dateUtils.ts
 * Utility terpusat untuk penanganan tanggal dan waktu kalender realtime lokal Indonesia.
 * Mencegah bug offset UTC (off-by-one day) dan menyediakan sinkronisasi waktu akurat.
 */

/**
 * Mengembalikan tanggal lokal dalam format YYYY-MM-DD
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Mengembalikan waktu lokal dalam format HH:mm (24-jam)
 */
export const getLocalTimeString = (d: Date = new Date()): string => {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Mengembalikan waktu lokal lengkap dengan detik dalam format HH:mm:ss
 */
export const getLocalTimeWithSecondsString = (d: Date = new Date()): string => {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Mengembalikan tanggal awal bulan berjalan dalam format YYYY-MM-01
 */
export const getStartOfMonthDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

/**
 * Mengembalikan tanggal akhir bulan berjalan dalam format YYYY-MM-DD
 */
export const getEndOfMonthDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

/**
 * Mengembalikan tanggal N hari yang lalu dalam format YYYY-MM-DD
 */
export const getDaysAgoDateString = (days: number, d: Date = new Date()): string => {
  const past = new Date(d.getFullYear(), d.getMonth(), d.getDate() - days);
  return getLocalDateString(past);
};

/**
 * Mengembalikan tanggal N hari ke depan dalam format YYYY-MM-DD
 */
export const getDaysAheadDateString = (days: number, d: Date = new Date()): string => {
  const future = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return getLocalDateString(future);
};

/**
 * Format tanggal Indonesia ramah pengguna: "18 Oktober 2026"
 */
export const formatIndonesianDate = (d: string | Date = new Date()): string => {
  try {
    const dateObj = typeof d === 'string' ? (d.includes('T') ? new Date(d) : new Date(`${d}T00:00:00`)) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return String(d);
  }
};

/**
 * Format tanggal dan waktu Indonesia lengkap: "18 Oktober 2026, 09:07 WIB"
 */
export const formatIndonesianDateTime = (d: string | Date = new Date()): string => {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    const dateStr = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${dateStr}, ${hours}:${minutes} WIB`;
  } catch {
    return String(d);
  }
};
