import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { UserRole } from './RoleContext';
import type { Company } from './CompanyContext';

/**
 * DEMO KIMLIK DOGRULAMA — GERCEK GUVENLIK DEGILDIR.
 *
 * Bu projede backend yoktur (Işıl karari: "sadece tasarim, backend yok").
 * Kullanicilar ve parolalar tarayicinin localStorage'inda DUZ METIN tutulur.
 * Amaci yalnizca tasarimi gostermektir: hangi (firma, rol) hangi ekrani gorur.
 * Uretimde bu katmanin yerini sunucu tarafli kimlik dogrulama alir.
 */

export interface DemoUser {
  username: string;
  password: string;
  displayName: string;
  company: Company;
  role: UserRole;
  /** true ise giristen sonra admin paneline duser */
  isAdmin: boolean;
}

const USERS_KEY = 'smap-demo-users';
const SESSION_KEY = 'smap-demo-session';

export const SEED_USERS: DemoUser[] = [
  { username: 'kam.manager',  password: 'demo1234', displayName: 'KAM Manager',   company: 'kam', role: 'manager',  isAdmin: false },
  { username: 'kam.engineer', password: 'demo1234', displayName: 'KAM Engineer',  company: 'kam', role: 'engineer', isAdmin: false },
  { username: 'kam.operator', password: 'demo1234', displayName: 'KAM Operator',  company: 'kam', role: 'operator', isAdmin: false },
  { username: 'kam.admin',    password: 'admin1234', displayName: 'KAM Admin',    company: 'kam', role: 'admin',    isAdmin: true  },
  { username: 'jpb.manager',  password: 'demo1234', displayName: 'JPB Manager',   company: 'jpb', role: 'manager',  isAdmin: false },
  { username: 'jpb.engineer', password: 'demo1234', displayName: 'JPB Engineer',  company: 'jpb', role: 'engineer', isAdmin: false },
  { username: 'jpb.operator', password: 'demo1234', displayName: 'JPB Operator',  company: 'jpb', role: 'operator', isAdmin: false },
  { username: 'jpb.admin',    password: 'admin1234', displayName: 'JPB Admin',    company: 'jpb', role: 'admin',    isAdmin: true  },
];

function loadUsers(): DemoUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return SEED_USERS;
    const parsed = JSON.parse(raw) as DemoUser[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_USERS;
    return parsed;
  } catch {
    return SEED_USERS;
  }
}

function persistUsers(users: DemoUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession(users: DemoUser[]): DemoUser | null {
  try {
    const username = localStorage.getItem(SESSION_KEY);
    if (!username) return null;
    return users.find((u) => u.username === username) ?? null;
  } catch {
    return null;
  }
}

interface AuthContextType {
  users: DemoUser[];
  currentUser: DemoUser | null;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  /** Admin paneli icin — yalnizca cagiranin kendi firmasi filtrelenmelidir */
  createUser: (user: DemoUser) => { ok: boolean; error?: string };
  updateUser: (username: string, patch: Partial<DemoUser>) => void;
  deleteUser: (username: string) => void;
  resetUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<DemoUser[]>(() => loadUsers());
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(() => loadSession(loadUsers()));

  const login = useCallback(
    (username: string, password: string) => {
      const u = users.find(
        (x) => x.username.toLowerCase() === username.trim().toLowerCase(),
      );
      if (!u) return { ok: false, error: 'Unknown user name.' };
      if (u.password !== password) return { ok: false, error: 'Incorrect password.' };
      localStorage.setItem(SESSION_KEY, u.username);
      setCurrentUser(u);
      return { ok: true };
    },
    [users],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    // Adresi koke al: cikista URL oldugu yerde kalirsa (ornegin /admin)
    // bir sonraki kullanici o sayfada baslar. AuthProvider BrowserRouter'in
    // disinda oldugu icin useNavigate kullanilamaz; router zaten cikista
    // sokuluyor, girise donuldugunde window.location'dan yeniden kuruluyor.
    // Isıl karari 2026-08-31.
    window.history.replaceState(null, '', '/');
  }, []);

  const createUser = useCallback(
    (user: DemoUser) => {
      const exists = users.some(
        (u) => u.username.toLowerCase() === user.username.trim().toLowerCase(),
      );
      if (exists) return { ok: false, error: 'That user name is already taken.' };
      if (!user.username.trim()) return { ok: false, error: 'User name is required.' };
      if (!user.password) return { ok: false, error: 'Password is required.' };
      const next = [...users, { ...user, username: user.username.trim() }];
      setUsers(next);
      persistUsers(next);
      return { ok: true };
    },
    [users],
  );

  const updateUser = useCallback(
    (username: string, patch: Partial<DemoUser>) => {
      const next = users.map((u) => (u.username === username ? { ...u, ...patch } : u));
      setUsers(next);
      persistUsers(next);
      setCurrentUser((cur) => (cur && cur.username === username ? { ...cur, ...patch } : cur));
    },
    [users],
  );

  const deleteUser = useCallback(
    (username: string) => {
      const next = users.filter((u) => u.username !== username);
      setUsers(next);
      persistUsers(next);
    },
    [users],
  );

  const resetUsers = useCallback(() => {
    setUsers(SEED_USERS);
    persistUsers(SEED_USERS);
  }, []);

  const value = useMemo(
    () => ({ users, currentUser, login, logout, createUser, updateUser, deleteUser, resetUsers }),
    [users, currentUser, login, logout, createUser, updateUser, deleteUser, resetUsers],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
