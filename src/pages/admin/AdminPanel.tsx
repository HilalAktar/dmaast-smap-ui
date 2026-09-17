import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useAuth, type DemoUser } from '../../contexts/AuthContext';
import { COMPANIES, type Company } from '../../contexts/CompanyContext';
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

  // Admin kendi firmasinin disini goremez — kapsam sinirinin tek uygulandigi yer burasi
  const company = currentUser!.company;
  const companyConfig = COMPANIES[company];

  const [config, setConfig] = useState<AdminConfig>(() => loadAdminConfig(company));
  const [saved, setSaved] = useState(false);

  const companyUsers = useMemo(
    () => users.filter((u) => u.company === company),
    [users, company],
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
            <span
              className={`ml-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${companyConfig.accent}`}
            >
              {companyConfig.label} · {companyConfig.erp}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
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
            layout settings are stored in this browser only. This scope covers the{' '}
            <span className="font-semibold">{companyConfig.label}</span> use case; the other use
            case is configured from its own admin account.
          </span>
        </div>

        {tab === 'users' ? (
          <UsersTab
            company={company}
            companyUsers={companyUsers}
            currentUsername={currentUser!.username}
            onCreate={createUser}
            onUpdate={updateUser}
            onDelete={deleteUser}
          />
        ) : (
          <LayoutTab company={company} config={config} onChange={persist} onReset={() => {
            resetAdminConfig(company);
            setConfig(getDefaultAdminConfig(company));
          }} />
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
  companyUsers,
  currentUsername,
  onCreate,
  onUpdate,
  onDelete,
}: {
  company: DemoUser['company'];
  companyUsers: DemoUser[];
  currentUsername: string;
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
  });
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    const result = onCreate({ ...draft, company });
    if (!result.ok) {
      setError(result.error ?? 'Could not create user.');
      return;
    }
    setError(null);
    setDraft({ username: '', displayName: '', password: '', role: 'operator', isAdmin: false });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
          Accounts ({companyUsers.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">User name</th>
                <th className="px-4 py-2.5 font-medium">Display name</th>
                <th className="px-4 py-2.5 font-medium">Password</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {companyUsers.map((u) => (
                <tr key={u.username}>
                  <td className="px-4 py-2.5 font-mono text-surface-900">{u.username}</td>
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
                      {ALL_ROLES.map((r) => (
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
                      disabled={u.username === currentUsername}
                      onClick={() => onDelete(u.username)}
                      title={
                        u.username === currentUsername
                          ? 'You cannot delete the account you are signed in with'
                          : 'Delete user'
                      }
                      className="rounded p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-surface-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="User name">
              <input
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                placeholder={`${company}.newuser`}
                className="w-full rounded-lg border border-surface-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </Field>
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
                {ALL_ROLES.map((r) => (
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
  onChange,
  onReset,
}: {
  company: Company;
  config: AdminConfig;
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
            {ALL_ROLES.map((r) => (
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
