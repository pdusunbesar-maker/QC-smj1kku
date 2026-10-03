import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertCircle, 
  Lock, 
  Mail, 
  CheckCircle2,
  Plus,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { User, RoleDefinition } from '../../types';
import { SYSTEM_PERMISSIONS } from '../../services/demoData';

export const UserManagementView: React.FC = () => {
  const { 
    user: currentUser, 
    users, 
    roles, 
    addUser, 
    updateUser, 
    deleteUser, 
    saveRole, 
    deleteRole,
    can 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Add/Edit User Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'password123',
    role: 'analis',
    nip: '',
    department: 'Instalasi Patologi Klinik',
    isActive: true,
  });

  // Custom Role Modal State
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDefinition | null>(null);
  const [newRoleForm, setNewRoleForm] = useState({
    id: '',
    name: '',
    description: '',
    permissions: ['input_qc', 'export_reports'],
  });

  const canManage = can('manage_users') || currentUser.role === 'admin';

  // Filtered users list
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip && u.nip.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: 'password123',
      role: roles[0]?.id || 'analis',
      nip: '',
      department: 'Instalasi Patologi Klinik',
      isActive: true,
    });
    setModalError('');
    setShowAddUserModal(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: u.password || 'password123',
      role: u.role,
      nip: u.nip || '',
      department: u.department || 'Instalasi Patologi Klinik',
      isActive: u.isActive !== false,
    });
    setModalError('');
    setShowAddUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (editingUser) {
      const res = updateUser({
        ...editingUser,
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        nip: formData.nip.trim() || undefined,
        department: formData.department.trim() || undefined,
        isActive: formData.isActive,
      });

      if (!res.success) {
        setModalError(res.message || 'Gagal memperbarui pengguna.');
        return;
      }
    } else {
      const res = addUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        nip: formData.nip.trim() || undefined,
        department: formData.department.trim() || undefined,
        isActive: formData.isActive,
      });

      if (!res.success) {
        setModalError(res.message || 'Gagal menambahkan pengguna.');
        return;
      }
    }

    setShowAddUserModal(false);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    const res = deleteUser(userToDelete.id);
    if (!res.success) {
      alert(res.message);
    }
    setUserToDelete(null);
  };

  // Role permissions toggle
  const handleToggleRolePermission = (roleDef: RoleDefinition, permKey: string) => {
    if (!canManage) return;
    if (roleDef.id === 'admin') return; // Admin always retains all permissions

    const currentPerms = roleDef.permissions;
    const hasPerm = currentPerms.includes(permKey);
    const updatedPerms = hasPerm
      ? currentPerms.filter(p => p !== permKey)
      : [...currentPerms, permKey];

    saveRole({
      ...roleDef,
      permissions: updatedPerms,
    });
  };

  const handleSaveNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newRoleForm.id.trim().toLowerCase().replace(/\s+/g, '_');
    if (!id || !newRoleForm.name) return;

    saveRole({
      id,
      name: newRoleForm.name.trim(),
      description: newRoleForm.description.trim(),
      permissions: newRoleForm.permissions,
      isSystem: false,
    });

    setShowAddRoleModal(false);
    setNewRoleForm({
      id: '',
      name: '',
      description: '',
      permissions: ['input_qc', 'export_reports'],
    });
  };

  const handleConfirmDeleteRole = () => {
    if (!roleToDelete) return;
    const res = deleteRole(roleToDelete.id);
    if (!res.success) {
      alert(res.message);
    }
    setRoleToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Manajemen Pengguna & Hak Akses (RBAC)
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
              Role-Based Access
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengaturan akun staf laboratorium, peran otentikasi, dan konfigurasi matriks izin akses sistem L-QCMS.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Daftar Pengguna ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'roles'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Matriks Hak Akses Peran ({roles.length})
          </button>
        </div>
      </div>

      {!canManage && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Mode Peninjauan: Hanya pengguna dengan peran <strong>Administrator</strong> yang memiliki izin menambahkan, mengubah, atau menghapus pengguna dan konfigurasi izin.
          </span>
        </div>
      )}

      {/* Tab 1: Users List */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Action and Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white font-medium focus:outline-none"
              >
                <option value="all">Semua Peran</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {/* Search bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, email, NIP..."
                  className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenAddUser}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Tambah Pengguna Baru</span>
              </button>
            )}
          </div>

          {/* Users Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Nama Lengkap & NIP</th>
                    <th className="px-4 py-3">Email Pengguna</th>
                    <th className="px-4 py-3">Peran / Role</th>
                    <th className="px-4 py-3">Departemen / Unit</th>
                    <th className="px-4 py-3">Status</th>
                    {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada pengguna yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleObj = roles.find(r => r.id === u.role);
                      const isCurrentUser = u.id === currentUser.id;

                      const roleBadgeStyles: Record<string, string> = {
                        admin: 'bg-purple-50 text-purple-800 border-purple-200',
                        supervisor: 'bg-blue-50 text-blue-800 border-blue-200',
                        analis: 'bg-teal-50 text-teal-800 border-teal-200',
                        viewer: 'bg-slate-100 text-slate-700 border-slate-200',
                      };

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white font-bold text-xs">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {u.name} {isCurrentUser && <span className="text-[10px] text-emerald-600 font-mono">(Anda)</span>}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  NIP: {u.nip || '-'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 font-mono text-slate-700">
                            {u.email}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                              roleBadgeStyles[u.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {roleObj?.name || u.role}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {u.department || 'Instalasi Patologi Klinik'}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              u.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{u.isActive !== false ? 'Aktif' : 'Nonaktif'}</span>
                            </span>
                          </td>

                          {canManage && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                  title="Ubah Data Pengguna"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isCurrentUser}
                                  onClick={() => setUserToDelete(u)}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    isCurrentUser
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                  }`}
                                  title={isCurrentUser ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Role Permissions Matrix */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Atur hak akses otorisasi untuk masing-masing peran sesuai pembagian tugas operasional laboratorium.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowAddRoleModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Peran Kustom</span>
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="px-4 py-3 min-w-[220px]">Fungsi / Izin Akses Sistem</th>
                    {roles.map(r => (
                      <th key={r.id} className="px-4 py-3 text-center whitespace-nowrap min-w-[120px]">
                        <div>{r.name}</div>
                        <span className="font-mono text-[10px] text-slate-400 font-normal">
                          {r.isSystem ? '(Bawaan)' : '(Kustom)'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SYSTEM_PERMISSIONS.map(perm => (
                    <tr key={perm.key} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{perm.name}</span>
                        <span className="text-[11px] text-slate-500 block leading-tight">{perm.description}</span>
                      </td>

                      {roles.map(r => {
                        const hasPerm = r.id === 'admin' || r.permissions.includes(perm.key);
                        const isLockedAdmin = r.id === 'admin';

                        return (
                          <td key={r.id} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              disabled={!canManage || isLockedAdmin}
                              onClick={() => handleToggleRolePermission(r, perm.key)}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-all ${
                                hasPerm
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                              } ${(!canManage || isLockedAdmin) ? 'cursor-default opacity-85' : 'cursor-pointer hover:scale-105'}`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Custom roles list with delete options */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Daftar Peran Kustom:</span>
              <div className="flex flex-wrap gap-2">
                {roles.filter(r => !r.isSystem).length === 0 ? (
                  <span className="text-slate-400 text-xs italic">Belum ada peran kustom tambahan.</span>
                ) : (
                  roles.filter(r => !r.isSystem).map(r => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{r.name}</span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setRoleToDelete(r)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Hapus Peran Kustom"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingUser ? 'Ubah Data Pengguna & Hak Akses' : 'Tambah Pengguna Laboratorium Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap (dengan Gelar) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Contoh: Siti Rahmawati, S.Tr.Kes"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="nama@rsudsmj.id"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kata Sandi *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran / Hak Akses (Role) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-white focus:border-emerald-500 focus:outline-none font-medium"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIP Pegawai
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="19880315 201101 2 004"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Departemen / Sub-Unit Laboratorium
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Contoh: Instalasi Patologi Klinik - Kimia Darah"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="userActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Status Pengguna Aktif (Bisa Masuk ke Sistem)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="h-6 w-6" />
              <h3 className="font-bold text-slate-900 text-sm">Hapus Pengguna</h3>
            </div>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus akun pengguna <strong>{userToDelete.name}</strong> ({userToDelete.email})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Tambah Peran Kustom Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRole} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Peran (Role Name) *
                </label>
                <input
                  type="text"
                  value={newRoleForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewRoleForm({
                      ...newRoleForm,
                      name,
                      id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    });
                  }}
                  required
                  placeholder="Contoh: Koordinator Laboratorium"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kode Identifier Peran (ID) *
                </label>
                <input
                  type="text"
                  value={newRoleForm.id}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, id: e.target.value })}
                  required
                  placeholder="koordinator_lab"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi Tanggung Jawab
                </label>
                <textarea
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  rows={2}
                  placeholder="Deskripsikan cakupan hak akses peran ini..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  Simpan Peran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Custom Role Confirmation */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="h-6 w-6" />
              <h3 className="font-bold text-slate-900 text-sm">Hapus Peran Kustom</h3>
            </div>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus peran <strong>{roleToDelete.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
