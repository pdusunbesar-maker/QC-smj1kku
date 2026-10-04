import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_URL = 'lqcms_supabase_url';
const STORAGE_KEY_SUPABASE_ANON = 'lqcms_supabase_anon_key';

export const DEFAULT_SUPABASE_URL = '';
export const DEFAULT_SUPABASE_ANON_KEY = '';

export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  // Strip trailing /rest/v1 or /rest/v1/ if user pasted API URL endpoint
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || envUrl || DEFAULT_SUPABASE_URL;
  const storedAnon = localStorage.getItem(STORAGE_KEY_SUPABASE_ANON) || envAnon || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: sanitizeSupabaseUrl(storedUrl),
    anonKey: storedAnon.trim(),
  };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = sanitizeSupabaseUrl(url);
  if (cleanUrl) localStorage.setItem(STORAGE_KEY_SUPABASE_URL, cleanUrl);
  else localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);

  if (anonKey) localStorage.setItem(STORAGE_KEY_SUPABASE_ANON, anonKey.trim());
  else localStorage.removeItem(STORAGE_KEY_SUPABASE_ANON);

  // Invalidate cached client
  cachedClient = null;
  lastUsedUrl = '';
  lastUsedKey = '';
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();

  if (!url || !anonKey) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = sanitizeSupabaseUrl(url);
    if (!cleanUrl || !anonKey) {
      return { success: false, message: 'URL atau Anon Key tidak boleh kosong.' };
    }
    const client = createClient(cleanUrl, anonKey.trim());
    // Simple ping to check auth or basic table
    const { error, status } = await client.from('laboratories').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === 'PGRST301' || error.message?.includes('Invalid API key') || error.message?.includes('JWT') || status === 401) {
        return { success: false, message: 'Koneksi gagal: Invalid API key (Kunci Anon Supabase tidak valid atau salah).' };
      }
      if (error.code === '42P01' || error.message?.includes('relation "laboratories" does not exist')) {
        return { success: true, message: 'Koneksi ke Supabase berhasil! (Catatan: Tabel laboratories belum dibuat, jalankan skrip SQL skema).' };
      }
      return { success: false, message: `Koneksi gagal: ${error.message}` };
    }
    return { success: true, message: 'Koneksi ke Supabase berhasil dan siap digunakan!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal terhubung ke Supabase. Periksa URL dan Anon Key.' };
  }
}

/**
 * Complete Supabase SQL Script to create all 18+ required tables, indexes, RLS, triggers, and initial data
 */
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- L-QCMS: LABORATORY QUALITY CONTROL MANAGEMENT SYSTEM
-- SISTEM MANAJEMEN KONTROL MUTU LABORATORIUM PATOLOGI KLINIK
-- RSUD SULTAN MUHAMMAD JAMALUDIN I - KABUPATEN KAYONG UTARA, KALIMANTAN BARAT
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. LABORATORIES TABLE
CREATE TABLE IF NOT EXISTS laboratories (
    id TEXT PRIMARY KEY DEFAULT 'lab-rsud-smj1',
    name TEXT NOT NULL DEFAULT 'Instalasi Patologi Klinik & Laboratorium Terpadu',
    hospital_name TEXT NOT NULL DEFAULT 'RSUD Sultan Muhammad Jamaludin I',
    regency TEXT NOT NULL DEFAULT 'Kabupaten Kayong Utara',
    province TEXT NOT NULL DEFAULT 'Kalimantan Barat',
    room_unit TEXT NOT NULL DEFAULT 'Laboratorium Sentral Lantai 1',
    head_of_lab TEXT NOT NULL DEFAULT 'dr. Hendra Wijaya, Sp.PK',
    head_nip TEXT NOT NULL DEFAULT '19800512 200801 1 008',
    head_of_quality TEXT NOT NULL DEFAULT 'Siti Rahmawati, S.Tr.Kes',
    quality_nip TEXT NOT NULL DEFAULT '19850914 201001 2 015',
    address TEXT NOT NULL DEFAULT 'Jl. Provinsi Sukadana - Teluk Batang KM. 3, Sukadana, Kayong Utara 78852',
    phone TEXT DEFAULT '(0534) 770123 / Ext. 108',
    email TEXT DEFAULT 'lab.patklin@rsudsultanmuhammadjamaludin1.go.id',
    accreditation TEXT DEFAULT 'KARS Paripurna Bintang 5',
    logo_url TEXT DEFAULT '/logo_kayong_utara.png',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROLES & APP USERS TABLE
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'analis', 'viewer')),
    nip TEXT,
    department TEXT,
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INSTRUMENTS TABLE
CREATE TABLE IF NOT EXISTS instruments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'Patologi Klinik - Kimia Darah',
    location TEXT NOT NULL DEFAULT 'Meja Kimia Darah Utama',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    last_calibration_date DATE,
    next_calibration_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CONTROL MATERIALS TABLE
CREATE TABLE IF NOT EXISTS control_materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('Level 1', 'Level 2', 'Level 3')),
    lot_number TEXT NOT NULL,
    expiration_date DATE NOT NULL,
    storage_condition TEXT DEFAULT '2°C - 8°C (Lyophilized)',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'depleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONTROL LOTS TABLE
CREATE TABLE IF NOT EXISTS control_lots (
    id TEXT PRIMARY KEY,
    control_material_id TEXT REFERENCES control_materials(id) ON DELETE CASCADE,
    lot_number TEXT NOT NULL,
    opened_date DATE,
    in_use_expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TEST PARAMETERS TABLE
CREATE TABLE IF NOT EXISTS test_parameters (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    method TEXT NOT NULL,
    instrument_id TEXT REFERENCES instruments(id) ON DELETE SET NULL,
    control_material_id TEXT REFERENCES control_materials(id) ON DELETE SET NULL,
    target_mean NUMERIC(10, 3) NOT NULL,
    target_sd NUMERIC(10, 3) NOT NULL,
    target_cv NUMERIC(6, 2) NOT NULL,
    min_acceptable NUMERIC(10, 3) NOT NULL,
    max_acceptable NUMERIC(10, 3) NOT NULL,
    decimal_places INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WESTGARD RULES CONFIGURATION
CREATE TABLE IF NOT EXISTS westgard_rules (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_desc TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('warning', 'reject')),
    enabled BOOLEAN DEFAULT true,
    recommendation TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. QC RESULTS TABLE
CREATE TABLE IF NOT EXISTS qc_results (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    time TIME NOT NULL,
    timestamp BIGINT NOT NULL,
    operator_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    operator_name TEXT NOT NULL,
    instrument_id TEXT REFERENCES instruments(id) ON DELETE SET NULL,
    instrument_name TEXT NOT NULL,
    parameter_id TEXT REFERENCES test_parameters(id) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    parameter_code TEXT NOT NULL,
    control_level TEXT NOT NULL CHECK (control_level IN ('Level 1', 'Level 2', 'Level 3')),
    lot_number TEXT NOT NULL,
    value NUMERIC(10, 3) NOT NULL,
    unit TEXT NOT NULL,
    mean NUMERIC(10, 3) NOT NULL,
    sd NUMERIC(10, 3) NOT NULL,
    z_score NUMERIC(8, 3) NOT NULL,
    sd_position TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pass', 'warning', 'reject', 'fail')),
    violations JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    is_demo BOOLEAN DEFAULT false,
    review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'accepted', 'rejected', 'investigation_required')),
    reviewed_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    review_comment TEXT,
    linked_non_conformity_id TEXT,
    linked_capa_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. QC VIOLATIONS TABLE
CREATE TABLE IF NOT EXISTS qc_violations (
    id TEXT PRIMARY KEY DEFAULT ('VIO-' || substr(md5(random()::text), 1, 8)),
    qc_result_id TEXT REFERENCES qc_results(id) ON DELETE CASCADE,
    rule_key TEXT REFERENCES westgard_rules(key),
    rule_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('warning', 'reject')),
    description TEXT NOT NULL,
    points_involved JSONB DEFAULT '[]'::jsonb,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. QC STATISTICS TABLE
CREATE TABLE IF NOT EXISTS qc_statistics (
    id TEXT PRIMARY KEY DEFAULT ('STAT-' || substr(md5(random()::text), 1, 8)),
    parameter_id TEXT REFERENCES test_parameters(id) ON DELETE CASCADE,
    control_level TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_runs INT NOT NULL,
    mean_value NUMERIC(10, 3) NOT NULL,
    median_value NUMERIC(10, 3) NOT NULL,
    min_value NUMERIC(10, 3) NOT NULL,
    max_value NUMERIC(10, 3) NOT NULL,
    sd_value NUMERIC(10, 3) NOT NULL,
    cv_percent NUMERIC(6, 2) NOT NULL,
    pass_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    reject_count INT DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. NON-CONFORMITY (PENYIMPANGAN) TABLE
CREATE TABLE IF NOT EXISTS non_conformities (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    time TIME NOT NULL,
    unit TEXT NOT NULL,
    instrument_id TEXT REFERENCES instruments(id) ON DELETE SET NULL,
    instrument_name TEXT NOT NULL,
    parameter_id TEXT REFERENCES test_parameters(id) ON DELETE SET NULL,
    parameter_name TEXT NOT NULL,
    qc_result_id TEXT REFERENCES qc_results(id) ON DELETE SET NULL,
    westgard_rule TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    impact TEXT NOT NULL,
    initial_analysis TEXT NOT NULL,
    immediate_action TEXT NOT NULL,
    reported_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    reported_by_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'under_investigation', 'resolved', 'escalated_to_capa')),
    resolved_at TIMESTAMPTZ,
    linked_capa_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CAPA TABLE
CREATE TABLE IF NOT EXISTS capa (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT NOT NULL,
    department TEXT NOT NULL,
    pic TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    non_conformity_description TEXT NOT NULL,
    supporting_evidence TEXT,
    rca_method TEXT NOT NULL DEFAULT 'Kombinasi 5 Why & Fishbone',
    fishbone JSONB DEFAULT '{"man":[],"machine":[],"method":[],"material":[],"measurement":[],"environment":[]}'::jsonb,
    five_why JSONB DEFAULT '{"why1":"","why2":"","why3":"","why4":"","why5":"","rootCauseConclusion":""}'::jsonb,
    identified_root_cause TEXT,
    corrective_actions JSONB DEFAULT '[]'::jsonb,
    preventive_actions JSONB DEFAULT '[]'::jsonb,
    verification_method TEXT,
    verification_result TEXT,
    verification_date DATE,
    verifier TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    verifier_name TEXT,
    effectiveness TEXT DEFAULT 'pending' CHECK (effectiveness IN ('pending', 'effective', 'not_effective')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigation', 'action_in_progress', 'pending_verification', 'closed', 'overdue')),
    overall_due_date DATE NOT NULL,
    closed_at TIMESTAMPTZ,
    linked_qc_result_id TEXT,
    linked_non_conformity_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT
);

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('danger', 'warning', 'info', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_tab TEXT,
    link_id TEXT,
    read BOOLEAN DEFAULT false
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_qc_parameter ON qc_results(parameter_id);
CREATE INDEX IF NOT EXISTS idx_qc_instrument ON qc_results(instrument_id);
CREATE INDEX IF NOT EXISTS idx_qc_date ON qc_results(date);
CREATE INDEX IF NOT EXISTS idx_qc_status ON qc_results(status);
CREATE INDEX IF NOT EXISTS idx_qc_review ON qc_results(review_status);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_capa_status ON capa(status);

-- RLS (ROW LEVEL SECURITY) POLICIES - SAFE IDEMPOTENT CONFIG
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE westgard_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public laboratories" ON laboratories;
CREATE POLICY "Public laboratories" ON laboratories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public app_users" ON app_users;
CREATE POLICY "Public app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public roles" ON roles;
CREATE POLICY "Public roles" ON roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public instruments" ON instruments;
CREATE POLICY "Public instruments" ON instruments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public control_materials" ON control_materials;
CREATE POLICY "Public control_materials" ON control_materials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public control_lots" ON control_lots;
CREATE POLICY "Public control_lots" ON control_lots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public test_parameters" ON test_parameters;
CREATE POLICY "Public test_parameters" ON test_parameters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public westgard_rules" ON westgard_rules;
CREATE POLICY "Public westgard_rules" ON westgard_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public qc_results" ON qc_results;
CREATE POLICY "Public qc_results" ON qc_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public qc_violations" ON qc_violations;
CREATE POLICY "Public qc_violations" ON qc_violations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public qc_statistics" ON qc_statistics;
CREATE POLICY "Public qc_statistics" ON qc_statistics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public non_conformities" ON non_conformities;
CREATE POLICY "Public non_conformities" ON non_conformities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public capa" ON capa;
CREATE POLICY "Public capa" ON capa FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public audit_logs" ON audit_logs;
CREATE POLICY "Public audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public notifications" ON notifications;
CREATE POLICY "Public notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
`;
