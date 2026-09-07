import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  LayoutGrid,
  LogOut,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Check,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { useAuth, isGlobalAdmin, type DemoUser } from '../../contexts/AuthContext';
import { COMPANIES, ALL_COMPANIES, type Company } from '../../contexts/CompanyContext';
import type { UserRole } from '../../contexts/RoleContext';
import { getCompanyItems } from '../../data/pageLayouts';
import {
  ALL_ROLES,
  APP_PAGES,
  loadAdminConfig,
  saveAdminConfig,
  resetAdminConfig,
  getDefaultAdminConfig,
  type AdminConfig,
} from '../../data/adminConfig';

type Tab = 'users' | 'layout';

export default function AdminPanel() {
  const { currentUser, users, logout, createUser, updateUser, deleteUser } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  // 🔴 Kapi `scope === 'global'`, `isAdmin` DEGIL — kam.admin/jpb.admin bu
  // istisnalarin HICBIRINE girmez (Isıl karari 2026-08-31 korunuyor).
  const isSuper = isGlobalAdmin(currentUser);

  /*
   * Hangi firmanin ayarlarina bakiliyor.
   * - normal admin : kendi firmasi, degistirilemez (kapsam sinirinin uygulandigi yer)
   * - super admin  : secilebilir; kendi baslangic firmasiyla acilir
   */
  const [adminCompany, setAdminCompany] = useState<Company>(currentUser!.company);
  const company = isSuper ? adminCompany : currentUser!.company;
  const companyConfig = COMPANIES[company];

  const [config, setConfig] = useState<AdminConfig>(() => loadAdminConfig(company));
  const [saved, setSaved] = useState(false);

  // Firma degisince o firmanin kendi kutusu okunur. storageKey mantigi
  // DEGISMEDI (`smap-admin-config-{company}`) — yalnizca hangi kutuya
  // bakildigi secilebilir oldu.
  useEffect(() => {
    setConfig(loadAdminConfig(company));
  }, [company]);

  /*
   * Kim kimi gorur (Isıl karari 2026-09-07):
   * - super admin  : her iki firmanin tum hesaplari
   * - normal admin : yalnizca kendi firmasi VE `scope: 'global'` olmayanlar.
   *   Super admin normal admin icin YOK gibidir — listede de, sayacta da,
   *   silme/duzenleme hedefi olarak da.
   */
  const visibleUsers = useMemo(() => {
    if (isSuper) return users;
    return users.filter((u) => u.company === currentUser!.company && u.scope !== 'global');
  }, [users, isSuper, currentUser]);

  // Son super admin silinemez: silinirse iki-firma yonetimi kilitlenir ve
  // geri donus yolu yalnizca resetUsers() olur (tum duzenlemeleri siler).
  const globalAdminCount = useMemo(
    () => users.filter((u) => u.scope === 'global').length,
    [users],
  );

  // Kademe: normal admin `superuser` ATAYAMAZ. `admin` dahil diger 5 rol
  // listede KALIR — Isıl'in duzeltmesi 2026-09-07:
  // "Normal admin admin atayabilir. Normal admin superadmin atayamaz."
  const assignableRoles = useMemo(
    () => (isSuper ? ALL_ROLES : ALL_ROLES.filter((r) => r !== 'superuser')),
    [isSuper],
  );

  const persist = (next: AdminConfig) => {
    setConfig(next);
    saveAdminConfig(company, next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Ust bar */}
      <header className="border-b border-surface-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/dmaast_logo.png" alt="SMAP" className="h-9 w-9" />
            <div>
              <h1 className="font-semibold text-surface-900">SMAP Admin</h1>
              <p className="text-xs text-surface-500">
                Signed in as {currentUser!.displayName}
              </p>
            </div>
            {isSuper ? (
              /* Super admin: hangi firmanin ayarlarina bakildigi secilir */
              <label className="ml-2 flex items-center gap-2">
                <span className="text-xs font-medium text-surface-500">Use case:</span>
                <select
                  value={company}
                  onChange={(e) => setAdminCompany(e.target.value as Company)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none ${companyConfig.accent}`}
                >
                  {/* ERP adi (IFS/Clipper) gosterilmez — Isıl karari 2026-09-07 */}
                  {ALL_COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {COMPANIES[c].label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span
                className={`ml-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${companyConfig.accent}`}
              >
                {companyConfig.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {/*
              Panelden uygulamaya donus — YALNIZCA super admin.
              Normal admin panelin disina cikamaz (Isıl karari 2026-08-31).
            */}
            {isSuper && (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 rounded-lg border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100"
              >
                <Eye className="h-4 w-4" /> View app
              </Link>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<Users className="h-4 w-4" />}>
            Users &amp; Roles
          </TabButton>
          <TabButton active={tab === 'layout'} onClick={() => setTab('layout')} icon={<LayoutGrid className="h-4 w-4" />}>
            Pages &amp; Cards
          </TabButton>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Demo configuration.</span> Users, passwords and
            layout settings are stored in this browser only.{' '}
            {isSuper ? (
              <>
                This account manages <span className="font-semibold">both use cases</span>. Page
                and card settings apply to the use case selected above (
                <span className="font-semibold">{companyConfig.label}</span>); each use case keeps
                its own settings.
              </>
            ) : (
              <>
                This scope covers the{' '}
                <span className="font-semibold">{companyConfig.label}</span> use case; the other
                use case is configured from its own admin account.
              </>
            )}
          </span>
        </div>

        {tab === 'users' ? (
          <UsersTab
            company={company}
            visibleUsers={visibleUsers}
            currentUsername={currentUser!.username}
            isSuper={isSuper}
            assignableRoles={assignableRoles}
            globalAdminCount={globalAdminCount}
            onCreate={createUser}
            onUpdate={updateUser}
            onDelete={deleteUser}
          />
        ) : (
          <LayoutTab
            company={company}
            config={config}
            assignableRoles={assignableRoles}
            onChange={persist}
            onReset={() => {
              resetAdminConfig(company);
              setConfig(getDefaultAdminConfig(company));
            }}
          />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'border-primary-500 text-primary-600'
          : 'border-transparent text-surface-500 hover:text-surface-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Users */

function UsersTab({
  company,
  visibleUsers,
  currentUsername,
  isSuper,
  assignableRoles,
  globalAdminCount,
  onCreate,
  onUpdate,
  onDelete,
}: {
  company: DemoUser['company'];
  visibleUsers: DemoUser[];
  currentUsername: string;
  isSuper: boolean;
  assignableRoles: UserRole[];
  globalAdminCount: number;
  onCreate: (u: DemoUser) => { ok: boolean; error?: string };
  onUpdate: (username: string, patch: Partial<DemoUser>) => void;
  onDelete: (username: string) => void;
}) {
  const [draft, setDraft] = useState({
    username: '',
    displayName: '',
    password: '',
    role: 'operator' as UserRole,
    isAdmin: false,
    // Super admin hesabi hangi firmada acacagini secer; normal adminde bu
    // deger kendi firmasina sabittir.
    company: company as Company,
  });
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    // Panelden acilan her hesap firma kapsamlidir. `scope: 'global'` bir
    // form alani DEGILDIR — super admin hesabi tohumla gelir.
    const result = onCreate({
      ...draft,
      company: isSuper ? draft.company : company,
      scope: 'company',
    });
    if (!result.ok) {
      setError(result.error ?? 'Could not create user.');
      return;
    }
    setError(null);
    setDraft({
      username: '',
      displayName: '',
      password: '',
      role: 'operator',
      isAdmin: false,
      company,
    });
  };

  /** Silme kapali mi, kapaliysa neden — dugmenin ipucusunda yazar. */
  const deleteBlockReason = (u: DemoUser): string | null => {
    if (u.username === currentUsername) {
      return 'You cannot delete the account you are signed in with';
    }
    if (u.scope === 'global' && globalAdminCount <= 1) {
      return 'The last super admin cannot be deleted — removing it would lock cross-use-case administration';
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
          Accounts ({visibleUsers.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">User name</th>
                {isSuper && <th className="px-4 py-2.5 font-medium">Company</th>}
                <th className="px-4 py-2.5 font-medium">Display name</th>
                <th className="px-4 py-2.5 font-medium">Password</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {visibleUsers.map((u) => (
                <tr key={u.username}>
                  <td className="px-4 py-2.5 font-mono text-surface-900">
                    {u.username}
                    {u.scope === 'global' && (
                      <span className="ml-2 rounded border border-primary-200 bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                        Super
                      </span>
                    )}
                  </td>
                  {isSuper && (
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${COMPANIES[u.company].accent}`}
                      >
                        {COMPANIES[u.company].label}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <input
                      value={u.displayName}
                      onChange={(e) => onUpdate(u.username, { displayName: e.target.value })}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 hover:border-surface-300 focus:border-primary-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      value={u.password}
                      onChange={(e) => onUpdate(u.username, { password: e.target.value })}
                      className="w-32 rounded border border-transparent bg-transparent px-2 py-1 font-mono hover:border-surface-300 focus:border-primary-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.role}
                      onChange={(e) => onUpdate(u.username, { role: e.target.value as UserRole })}
                      className="rounded border border-surface-300 bg-white px-2 py-1 focus:border-primary-500 focus:outline-none"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={u.isAdmin}
                      onChange={(e) => onUpdate(u.username, { isAdmin: e.target.checked })}
                      className="h-4 w-4 accent-primary-500"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      disabled={deleteBlockReason(u) !== null}
                      onClick={() => onDelete(u.username)}
                      title={deleteBlockReason(u) ?? 'Delete user'}
                      className="rounded p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-surface-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {deleteBlockReason(u) && (
                      <p className="mt-1 max-w-[16rem] text-right text-[10px] leading-tight text-surface-400">
                        {deleteBlockReason(u)}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
          Add account
        </h2>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className={`grid gap-3 sm:grid-cols-2 ${isSuper ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
            <Field label="User name">
              <input
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                placeholder={`${isSuper ? draft.company : company}.newuser`}
                className="w-full rounded-lg border border-surface-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </Field>
            {/* Firma secimi yalnizca super adminde — normal admin kendi firmasina hesap acar */}
            {isSuper && (
              <Field label="Company">
                <select
                  value={draft.company}
                  onChange={(e) => setDraft({ ...draft, company: e.target.value as Company })}
                  className="w-full rounded-lg border border-surface-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                >
                  {ALL_COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {COMPANIES[c].label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Display name">
              <input
                value={draft.displayName}
                onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </Field>
            <Field label="Password">
              <input
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </Field>
            <Field label="Role">
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })}
                className="w-full rounded-lg border border-surface-300 bg-white px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Admin access">
              <label className="flex h-[34px] items-center gap-2 text-sm text-surface-700">
                <input
                  type="checkbox"
                  checked={draft.isAdmin}
                  onChange={(e) => setDraft({ ...draft, isAdmin: e.target.checked })}
                  className="h-4 w-4 accent-primary-500"
                />
                Opens admin panel
              </label>
            </Field>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCreate}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" /> Create account
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-surface-600">{label}</span>
      {children}
    </label>
  );
}

/* --------------------------------------------------------- Pages & Cards */

function LayoutTab({
  company,
  config,
  assignableRoles,
  onChange,
  onReset,
}: {
  company: Company;
  config: AdminConfig;
  /*
   * Bu liste rol ATAMASI degil, "hangi rolun duzenini ayarliyoruz" secimidir —
   * yetki yukseltme kapisi degil. Yine de normal admin icin `superuser`
   * cikarilir: gorunurluk karari (Isıl 2026-09-07) o kademenin normal admine
   * hic gorunmemesini istiyor, menude adinin durmasi da bir sizintidir.
   */
  assignableRoles: UserRole[];
  onChange: (next: AdminConfig) => void;
  onReset: () => void;
}) {
  const [role, setRole] = useState<UserRole>('manager');

  const visiblePages = config.pages[role] ?? [];

  const togglePage = (key: string) => {
    const next = structuredClone(config);
    const list = new Set(next.pages[role] ?? []);
    if (list.has(key)) list.delete(key);
    else list.add(key);
    next.pages[role] = [...list];
    onChange(next);
  };

  const toggleCard = (layoutId: keyof AdminConfig['cards'][UserRole], itemId: string) => {
    const next = structuredClone(config);
    const current = new Set(next.cards[role]?.[layoutId] ?? []);
    if (current.has(itemId)) current.delete(itemId);
    else current.add(itemId);
    if (!next.cards[role]) next.cards[role] = {};
    next.cards[role]![layoutId] = [...current];
    onChange(next);
  };

  const groups = [...new Set(APP_PAGES.map((p) => p.group))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-700">Configure role:</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100"
        >
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-surface-100 px-3 py-2 text-xs text-surface-600">
        <Save className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Changes save automatically. Hiding a page here removes it from that role&apos;s
        navigation. Role permissions still apply on top — this panel can narrow access, never
        widen it.
      </p>

      {groups.map((group) => (
        <section key={group}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-surface-500">
            {group}
          </h3>
          <div className="space-y-3">
            {APP_PAGES.filter((p) => p.group === group).map((page) => {
              const pageOn = visiblePages.includes(page.key);
              const layoutItems = page.layoutId ? getCompanyItems(page.layoutId, company) : undefined;
              const selectedCards = page.layoutId
                ? config.cards[role]?.[page.layoutId] ?? []
                : [];

              return (
                <div
                  key={page.key}
                  className="overflow-hidden rounded-xl border border-surface-200 bg-white"
                >
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={pageOn}
                      onChange={() => togglePage(page.key)}
                      className="h-4 w-4 accent-primary-500"
                    />
                    <span className="font-medium text-surface-900">{page.label}</span>
                    <span className="font-mono text-xs text-surface-400">{page.path}</span>
                    {page.planned && (
                      <span className="rounded-full border border-surface-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                        Planned
                      </span>
                    )}
                  </label>

                  {pageOn && layoutItems && layoutItems.length > 0 && (
                    <div className="border-t border-surface-200 bg-surface-50 px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-surface-500">
                        Cards &amp; KPIs ({selectedCards.length}/{layoutItems.length})
                      </p>
                      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {layoutItems.map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-center gap-2 text-sm text-surface-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCards.includes(item.id)}
                              onChange={() => toggleCard(page.layoutId!, item.id)}
                              className="h-3.5 w-3.5 accent-primary-500"
                            />
                            <span className="truncate">{item.title}</span>
                            <span className="text-[10px] uppercase text-surface-400">
                              {item.type}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {pageOn && page.planned && (
                    <div className="border-t border-surface-200 bg-surface-50 px-4 py-2.5 text-xs text-surface-500">
                      This module is intentionally left empty — no cards to configure.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
