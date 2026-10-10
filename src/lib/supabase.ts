import { getSupabase } from '../services/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const current = getSupabase();
    if (current) {
      const val = (current as any)[prop];
      if (typeof val === 'function') {
        return val.bind(current);
      }
      return val;
    }
    const dummyMethod = (...args: any[]) => {
      console.warn('Supabase belum dikonfigurasi. Operasi diabaikan.');
      return {
        select: () => Promise.resolve({ data: [], error: { message: 'Supabase belum dikonfigurasi' } }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase belum dikonfigurasi' } }),
        update: () => Promise.resolve({ data: null, error: { message: 'Supabase belum dikonfigurasi' } }),
        delete: () => Promise.resolve({ data: null, error: { message: 'Supabase belum dikonfigurasi' } }),
        upload: () => Promise.resolve({ data: null, error: { message: 'Supabase belum dikonfigurasi' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      };
    };
    return dummyMethod;
  }
});

