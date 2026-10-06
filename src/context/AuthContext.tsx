import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RoleDefinition } from '../types';
import { StorageService } from '../services/storage';

interface AuthContextType {
  user: User;
  users: User[];
  roles: RoleDefinition[];
  role: string;
  isAuthenticated: boolean;
  login: (user: User) => void;
  loginWithCredentials: (email: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  switchRole: (role: string) => void;
  can: (action: string) => boolean;
  addUser: (newUser: Omit<User, 'id'>) => { success: boolean; message?: string };
  updateUser: (updatedUser: User) => { success: boolean; message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
  saveRole: (role: RoleDefinition) => void;
  deleteRole: (roleId: string) => { success: boolean; message?: string };
  refreshUsersAndRoles: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STATUS_KEY = 'lqcms_auth_status_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [roles, setRoles] = useState<RoleDefinition[]>(() => StorageService.getRoles());
  const [user, setUser] = useState<User>(() => StorageService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const stored = localStorage.getItem(AUTH_STATUS_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    StorageService.setCurrentUser(user);
  }, [user]);

  // Real-time synchronization across browser tabs and Supabase sync
  useEffect(() => {
    const handleUpdate = () => {
      refreshUsersAndRoles();
    };

    window.addEventListener('lqcms_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('lqcms_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const refreshUsersAndRoles = () => {
    const freshUsers = StorageService.getUsers();
    const freshRoles = StorageService.getRoles();
    setUsers(freshUsers);
    setRoles(freshRoles);
    const matched = freshUsers.find(u => u.id === user.id);
    if (matched) setUser(matched);
  };

  const login = (newUser: User) => {
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STATUS_KEY, 'true');
    // Execute audit logging asynchronously so the UI transitions to main menu instantaneously
    setTimeout(() => {
      StorageService.logAudit('LOGIN', `Pengguna ${newUser.name} (${newUser.role}) berhasil masuk ke sistem.`);
    }, 0);
  };

  const loginWithCredentials = (identifier: string, password?: string): { success: boolean; message?: string } => {
    // Always read latest users list from storage to guarantee fresh authentication data across devices
    const currentUsersList = StorageService.getUsers();
    setUsers(currentUsersList);

    const raw = identifier.trim().toLowerCase();
    if (!raw) {
      return { success: false, message: 'Silakan masukkan Username atau NIP.' };
    }

    const cleanDigits = raw.replace(/\D/g, '');

    const target = currentUsersList.find(u => {
      const email = u.email.toLowerCase();
      const name = u.name.toLowerCase();
      const nip = (u.nip || '').toLowerCase();
      const nipDigits = (u.nip || '').replace(/\D/g, '');
      const role = u.role.toLowerCase();

      // Check common alias/username
      if (raw === 'admin' && (role === 'admin' || email.includes('admin') || name.includes('hendra'))) return true;
      if (raw === 'budi' && name.includes('budi')) return true;
      if (raw === 'rudi' && (name.includes('budi') || name.includes('rudi'))) return true;
      if (raw === 'maya' && name.includes('maya')) return true;
      if (raw === 'hendra' && name.includes('hendra')) return true;
      if (raw === 'siti' && name.includes('siti')) return true;

      // Email match
      if (email === raw || email.split('@')[0] === raw) return true;

      // NIP match
      if (nip === raw || (cleanDigits.length >= 6 && nipDigits.includes(cleanDigits))) return true;

      // Name includes
      if (name.includes(raw)) return true;

      // Role match
      if (role === raw) return true;

      return false;
    });

    if (!target) {
      return { 
        success: false, 
        message: 'Username atau NIP tidak ditemukan.' 
      };
    }

    if (target.isActive === false) {
      return { success: false, message: 'Akun pengguna ini sedang dinonaktifkan oleh administrator.' };
    }

    if (target.password && password && password.trim() !== '' && target.password !== password) {
      return { success: false, message: 'Kata sandi tidak sesuai.' };
    }

    login(target);
    return { success: true };
  };

  const logout = () => {
    StorageService.logAudit('LOGOUT', `Pengguna ${user.name} (${user.role}) keluar dari sistem.`);
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STATUS_KEY);
  };

  const switchRole = (newRole: string) => {
    const matchedUser = users.find(u => u.role === newRole);
    if (matchedUser) {
      setUser(matchedUser);
      StorageService.logAudit('LOGIN', `Beralih peran pengguna ke ${newRole} (${matchedUser.name})`);
    } else {
      const updatedUser = {
        ...user,
        role: newRole,
      };
      setUser(updatedUser);
      StorageService.saveUser(updatedUser);
      refreshUsersAndRoles();
    }
  };

  const can = (permissionKey: string): boolean => {
    if (!isAuthenticated) return false;
    // Admin has superuser privileges
    if (user.role === 'admin') return true;

    // Check specific role definition permissions
    const currentRoleDef = roles.find(r => r.id === user.role);
    if (currentRoleDef) {
      return currentRoleDef.permissions.includes(permissionKey);
    }

    // Fallback standard roles
    if (user.role === 'supervisor') {
      return ['input_qc', 'review_qc', 'manage_capa', 'export_reports'].includes(permissionKey);
    }
    if (user.role === 'analis') {
      return ['input_qc', 'manage_capa', 'export_reports'].includes(permissionKey);
    }
    if (user.role === 'viewer') {
      return ['export_reports'].includes(permissionKey);
    }

    return false;
  };

  // User Management
  const addUser = (newUser: Omit<User, 'id'>): { success: boolean; message?: string } => {
    const emailExists = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (emailExists) {
      return { success: false, message: 'Alamat email sudah digunakan oleh pengguna lain.' };
    }

    const id = `user-${Date.now().toString().slice(-6)}`;
    const fullUser: User = {
      ...newUser,
      id,
      isActive: newUser.isActive ?? true,
      createdAt: new Date().toISOString().split('T')[0],
      password: newUser.password || 'password123',
    };

    StorageService.saveUser(fullUser);
    StorageService.logAudit(
      'UPDATE_MASTER_DATA',
      `Menambahkan pengguna baru: ${fullUser.name} (${fullUser.email}) dengan peran ${fullUser.role}`,
      fullUser
    );

    refreshUsersAndRoles();
    return { success: true };
  };

  const updateUser = (updatedUser: User): { success: boolean; message?: string } => {
    const existing = users.find(u => u.id === updatedUser.id);
    if (!existing) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    // Prevent changing own admin role if sole admin
    const admins = users.filter(u => u.role === 'admin' && u.isActive !== false);
    if (existing.role === 'admin' && updatedUser.role !== 'admin' && admins.length <= 1) {
      return { success: false, message: 'Tidak dapat mengubah peran admin terakhir pada sistem.' };
    }

    StorageService.saveUser(updatedUser);
    StorageService.logAudit(
      'UPDATE_MASTER_DATA',
      `Memperbarui profil & hak akses pengguna: ${updatedUser.name} (${updatedUser.role})`,
      updatedUser,
      existing
    );

    refreshUsersAndRoles();
    if (user.id === updatedUser.id) {
      setUser(updatedUser);
    }

    return { success: true };
  };

  const deleteUser = (userId: string): { success: boolean; message?: string } => {
    if (userId === user.id) {
      return { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang masuk.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    const admins = users.filter(u => u.role === 'admin');
    if (target.role === 'admin' && admins.length <= 1) {
      return { success: false, message: 'Tidak dapat menghapus Administrator utama terakhir.' };
    }

    StorageService.deleteUser(userId);
    StorageService.logAudit(
      'UPDATE_MASTER_DATA',
      `Menghapus pengguna: ${target.name} (${target.email}, Peran: ${target.role})`,
      null,
      target
    );

    refreshUsersAndRoles();
    return { success: true };
  };

  const saveRole = (roleDef: RoleDefinition) => {
    StorageService.saveRole(roleDef);
    StorageService.logAudit(
      'UPDATE_MASTER_DATA',
      `Menyimpan konfigurasi hak akses peran: ${roleDef.name}`,
      roleDef
    );
    refreshUsersAndRoles();
  };

  const deleteRole = (roleId: string): { success: boolean; message?: string } => {
    const target = roles.find(r => r.id === roleId);
    if (!target) return { success: false, message: 'Peran tidak ditemukan.' };
    if (target.isSystem) {
      return { success: false, message: 'Peran bawaan sistem (Admin, Supervisor, Ahli Teknologi Laboratorium Medik (ATLM), Viewer) tidak dapat dihapus.' };
    }

    const usersWithRole = users.filter(u => u.role === roleId);
    if (usersWithRole.length > 0) {
      return { success: false, message: `Masih terdapat ${usersWithRole.length} pengguna yang menggunakan peran ini. Ubah peran mereka terlebih dahulu.` };
    }

    StorageService.deleteRole(roleId);
    StorageService.logAudit('UPDATE_MASTER_DATA', `Menghapus peran kustom: ${target.name}`);
    refreshUsersAndRoles();
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        roles,
        role: user.role,
        isAuthenticated,
        login,
        loginWithCredentials,
        logout,
        switchRole,
        can,
        addUser,
        updateUser,
        deleteUser,
        saveRole,
        deleteRole,
        refreshUsersAndRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
