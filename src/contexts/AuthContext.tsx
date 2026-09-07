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
  /**
   * Hesabin firmasi. `scope: 'global'` hesaplar icin bu alan BASLANGIC
   * firmasidir — uygulama acilisinda hangi use case ile baslanacagini soyler,
   * bir kilit degildir.
   */
  company: Company;
  role: UserRole;
  /** true ise giristen sonra admin paneline duser */
  isAdmin: boolean;
  /**
   * Kapsam alani — Isıl karari 2026-09-07 (WO-003).
   * 'company' : hesap tek firmaya aittir (bugunku 8 hesabin tamami)
   * 'global'  : hesap iki use case'in ustundedir (super admin)
   *
   * ⚠️ `Company` tipi GEVSETILMEDI. `company: 'all'` alternatifi reddedildi:
   * COMPANIES[company], getCompanyItems ve storageKey dahil her tuketiciyi kirardi.
   */
  scope: 'company' | 'global';
}

/**
 * Iki use case ustu yonetici mi?
 *
 * 🔴 Kapi `isAdmin` DEGILDIR. `isAdmin` uzerinden acilan her istisna
 * kam.admin ve jpb.admin hesaplarini da kapsar; bu, Isıl'in 2026-08-31
 * kararini (admin kendi panelinin disina cikamaz) deler. Tek dogru kapi budur.
 */
export function isGlobalAdmin(user: DemoUser | null | undefined): boolean {
  return !!user && user.scope === 'global';
}

const USERS_KEY = 'smap-demo-users';
const SESSION_KEY = 'smap-demo-session';

export const SEED_USERS: DemoUser[] = [
  { username: 'kam.manager',  password: 'demo1234', displayName: 'KAM Manager',   company: 'kam', role: 'manager',  isAdmin: false, scope: 'company' },
  { username: 'kam.engineer', password: 'demo1234', displayName: 'KAM Engineer',  company: 'kam', role: 'engineer', isAdmin: false, scope: 'company' },
  { username: 'kam.operator', password: 'demo1234', displayName: 'KAM Operator',  company: 'kam', role: 'operator', isAdmin: false, scope: 'company' },
  { username: 'kam.admin',    password: 'admin1234', displayName: 'KAM Admin',    company: 'kam', role: 'admin',    isAdmin: true,  scope: 'company' },
  { username: 'jpb.manager',  password: 'demo1234', displayName: 'JPB Manager',   company: 'jpb', role: 'manager',  isAdmin: false, scope: 'company' },
  { username: 'jpb.engineer', password: 'demo1234', displayName: 'JPB Engineer',  company: 'jpb', role: 'engineer', isAdmin: false, scope: 'company' },
  { username: 'jpb.operator', password: 'demo1234', displayName: 'JPB Operator',  company: 'jpb', role: 'operator', isAdmin: false, scope: 'company' },
  { username: 'jpb.admin',    password: 'admin1234', displayName: 'JPB Admin',    company: 'jpb', role: 'admin',    isAdmin: true,  scope: 'company' },
  // Iki use case ustu yonetici — Isıl karari 2026-09-07. Baslangic firmasi KAM.
  { username: 'smap.superadmin', password: 'super1234', displayName: 'SMAP Super Admin', company: 'kam', role: 'superuser', isAdmin: true, scope: 'global' },
];

/**
 * Tohum gocu (migration) — WO-003 I1a.
 *
 * Eskiden `loadUsers()` localStorage'da kayit varsa onu AYNEN donuyordu.
 * Sonucu: tohum listesine eklenen yeni bir hesap, uygulamayi daha once acmis
 * olan herkesin tarayicisinda HIC gorunmuyordu — "eklendi" denir, ekranda olmaz.
 *
 * Bu fonksiyon kayitli liste ile tohum listesini BIRLESTIRIR:
 *   1. kayitli hesaplar korunur — kullanicinin duzenlemeleri kaybolmaz
 *   2. kayitta bulunmayan tohum hesaplar eklenir
 *   3. `scope` alani olmayan eski kayitlar 'company' sayilir (undefined kalmaz;
 *      yoksa suzgecler ve karsilastirmalar sessizce yanlis calisir)
 *
 * ⛔ Bu is resetUsers() ile cozulmez — o, kullanicilarin tum duzenlemesini siler.
 */
function migrateUsers(stored: DemoUser[]): { users: DemoUser[]; changed: boolean } {
  let changed = false;

  const users: DemoUser[] = stored.map((u) => {
    if (u.scope === 'company' || u.scope === 'global') return u;
    changed = true;
    return { ...u, scope: 'company' };
  });

  const known = new Set(users.map((u) => u.username.toLowerCase()));
  for (const seed of SEED_USERS) {
    if (!known.has(seed.username.toLowerCase())) {
      users.push(seed);
      changed = true;
    }
  }

  return { users, changed };
}

function loadUsers(): DemoUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return SEED_USERS;
    const parsed = JSON.parse(raw) as DemoUser[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_USERS;
    const { users, changed } = migrateUsers(parsed);
    // Goc sonucu diske yazilir: aksi halde her acilista yeniden hesaplanir ve
    // localStorage gercegi yansitmaz.
    if (changed) persistUsers(users);
    return users;
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
      const target = users.find((u) => u.username === username);
      if (!target) return;

      /*
       * Son super admin silinemez — Isıl karari 2026-09-07.
       * Panelde dugme zaten kapali ve sebebi yaziyor; koruma BURADA da durur.
       * Ekrandaki kisit bir niyet beyanidir, mekanizma degil: cagri baska bir
       * yerden gelirse (veya panel ileride degisirse) kural yine tutmalidir.
       * Silinirse iki-firma yonetimi kilitlenir ve tek geri donus resetUsers()
       * olur — o da kullanicilarin tum duzenlemesini siler.
       */
      if (target.scope === 'global' && users.filter((u) => u.scope === 'global').length <= 1) {
        return;
      }

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
