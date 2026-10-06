import { QCResult } from '../types';

export const detectShiftAndTrend = (results: QCResult[], mean: number) => {
  if (results.length < 5) return null;
  const recent = results.slice(-5);
  
  // Shift: all points on one side of mean
  const allAbove = recent.every(r => r.value > mean);
  const allBelow = recent.every(r => r.value < mean);
  
  // Trend: strictly ascending or descending
  const ascending = recent.every((r, i) => i === 0 || r.value > recent[i-1].value);
  const descending = recent.every((r, i) => i === 0 || r.value < recent[i-1].value);
  
  if (allAbove || allBelow) return 'Potential Shift Detected';
  if (ascending || descending) return 'Potential Trend Detected';
  
  return null;
};
