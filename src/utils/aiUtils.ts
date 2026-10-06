import { Parameter, Instrument } from '../types';

export const findBestMatch = (
  ocrValue: string | null,
  masterData: any[],
  field: 'name' | 'code' | 'brand'
): string | null => {
  if (!ocrValue) return null;
  const normalized = ocrValue.toLowerCase().trim();
  const match = masterData.find(item => 
    item[field].toLowerCase().includes(normalized) || 
    normalized.includes(item[field].toLowerCase())
  );
  return match ? match.id : null;
};
