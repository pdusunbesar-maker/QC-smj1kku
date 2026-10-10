import { getSupabase, getStoredSupabaseConfig } from '../services/supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const config = getStoredSupabaseConfig();
const defaultFallback = createClient(
  config.url || 'https://placeholder.supabase.co',
  config.anonKey || 'placeholder'
);

export const supabase: SupabaseClient = new Proxy(defaultFallback, {
  get(target, prop, receiver) {
    const current = getSupabase();
    if (current && prop in current) {
      const val = (current as any)[prop];
      if (typeof val === 'function') {
        return val.bind(current);
      }
      return val;
    }
    const fallbackVal = (target as any)[prop];
    if (typeof fallbackVal === 'function') {
      return fallbackVal.bind(target);
    }
    return fallbackVal;
  }
});
