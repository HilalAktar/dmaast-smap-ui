import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'manager' | 'engineer' | 'operator' | 'admin' | 'developer' | 'superuser';

export interface RolePermissions {
  canAccessMODSS: boolean;
  canAccessCDTSimulations: boolean;
  canAccessSustainability: boolean;
  canOverrideOptimization: boolean;
  canAcknowledgeAlerts: boolean;
  canViewStrategicKPIs: boolean;
  canViewSystemHealth: boolean;
  canRunSimulations: boolean;
  canExportReports: boolean;
  canManageRoles: boolean;
  canConfigureDashboards: boolean;
  canAccessDebug: boolean;
  canManageKPIs: boolean;
  canAccessTerminology: boolean;
  canManageUsers: boolean;
}

interface RoleConfig {
  label: string;
  description: string;
  defaultDashboard: string[];
  permissions: RolePermissions;
}

// HCD-106/107: Terminology Dictionary accessible to ALL. HCD-111: ≥5 distinct roles.
const roleConfigs: Record<UserRole, RoleConfig> = {
  operator: {
    label: 'Operator',
    description: 'Real-time monitoring and validation',
    defaultDashboard: ['real-time-scoreboard', 'active-alerts', 'hitl-tasks'],
    permissions: {
      canAccessMODSS: false,
      canAccessCDTSimulations: false,
      canAccessSustainability: false,
      canOverrideOptimization: false,
      canAcknowledgeAlerts: true,
      canViewStrategicKPIs: false,
      canViewSystemHealth: false,
      canRunSimulations: false,
      canExportReports: false,
      canManageRoles: false,
      canConfigureDashboards: false,
      canAccessDebug: false,
      canManageKPIs: false,
      canAccessTerminology: true,
      canManageUsers: false,
    },
  },
  engineer: {
    label: 'Engineer',
    description: 'System health and simulation access',
    defaultDashboard: ['system-health', 'cdt-quick-access', 'modss-settings', 'technical-kpis'],
    permissions: {
      canAccessMODSS: true,
      canAccessCDTSimulations: true,
      canAccessSustainability: true,
      canOverrideOptimization: false,
      canAcknowledgeAlerts: true,
      canViewStrategicKPIs: true,
      canViewSystemHealth: true,
      canRunSimulations: true,
      canExportReports: true,
      canManageRoles: false,
      canConfigureDashboards: false,
      canAccessDebug: false,
      canManageKPIs: false,
      canAccessTerminology: true,
      canManageUsers: false,
    },
  },
  manager: {
    label: 'Manager',
    description: 'Strategic oversight and optimization targets',
    defaultDashboard: ['strategic-kpis', 'sca-summary', 'optimization-progress', 'alerts-summary'],
    permissions: {
      canAccessMODSS: true,
      canAccessCDTSimulations: true,
      canAccessSustainability: true,
      canOverrideOptimization: true,
      canAcknowledgeAlerts: true,
      canViewStrategicKPIs: true,
      canViewSystemHealth: true,
      canRunSimulations: true,
      canExportReports: true,
      canManageRoles: false,
      canConfigureDashboards: true,
      canAccessDebug: false,
      canManageKPIs: false,
      canAccessTerminology: true,
      canManageUsers: false,
    },
  },
  admin: {
    label: 'Admin',
    description: 'Application configuration, dashboards, and KPI definitions',
    defaultDashboard: ['strategic-kpis', 'system-health', 'user-management', 'kpi-definitions'],
    permissions: {
      canAccessMODSS: true,
      canAccessCDTSimulations: true,
      canAccessSustainability: true,
      canOverrideOptimization: true,
      canAcknowledgeAlerts: true,
      canViewStrategicKPIs: true,
      canViewSystemHealth: true,
      canRunSimulations: true,
      canExportReports: true,
      canManageRoles: true,
      canConfigureDashboards: true,
      canAccessDebug: false,
      canManageKPIs: true,
      canAccessTerminology: true,
      canManageUsers: true,
    },
  },
  developer: {
    label: 'Developer',
    description: 'Technical settings, debugging, and integrations',
    defaultDashboard: ['system-health', 'api-monitoring', 'debug-console', 'integration-status'],
    permissions: {
      canAccessMODSS: true,
      canAccessCDTSimulations: true,
      canAccessSustainability: true,
      canOverrideOptimization: false,
      canAcknowledgeAlerts: true,
      canViewStrategicKPIs: true,
      canViewSystemHealth: true,
      canRunSimulations: true,
      canExportReports: true,
      canManageRoles: false,
      canConfigureDashboards: false,
      canAccessDebug: true,
      canManageKPIs: false,
      canAccessTerminology: true,
      canManageUsers: false,
    },
  },
  superuser: {
    label: 'Superuser',
    description: 'System-wide settings and user-role assignments',
    defaultDashboard: ['strategic-kpis', 'system-health', 'user-management', 'optimization-progress'],
    permissions: {
      canAccessMODSS: true,
      canAccessCDTSimulations: true,
      canAccessSustainability: true,
      canOverrideOptimization: true,
      canAcknowledgeAlerts: true,
      canViewStrategicKPIs: true,
      canViewSystemHealth: true,
      canRunSimulations: true,
      canExportReports: true,
      canManageRoles: true,
      canConfigureDashboards: true,
      canAccessDebug: true,
      canManageKPIs: true,
      canAccessTerminology: true,
      canManageUsers: true,
    },
  },
};

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  config: RoleConfig;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  allRoles: UserRole[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({
  children,
  initialRole,
}: {
  children: ReactNode;
  /** Oturum acan kullanicinin rolu (AuthContext'ten gelir). Verilmezse eski davranis korunur. */
  initialRole?: UserRole;
}) {
  const [role, setRoleState] = useState<UserRole>(() => {
    if (initialRole) return initialRole;
    const saved = localStorage.getItem('smap-user-role');
    return (saved as UserRole) || 'operator';
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('smap-user-role', newRole);
  };

  const config = roleConfigs[role];

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return config.permissions[permission];
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-user-role', role);
  }, [role]);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        config,
        hasPermission,
        allRoles: ['manager', 'engineer', 'operator', 'admin', 'developer', 'superuser'],
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

interface RoleSelectorProps {
  className?: string;
}

export function RoleSelector({ className = '' }: RoleSelectorProps) {
  const { role, setRole, allRoles } = useRole();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {allRoles.map((r) => {
        const config = roleConfigs[r];
        return (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              role === r
                ? 'bg-primary-500 text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
            title={config.description}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

interface RequirePermissionProps {
  permission: keyof RolePermissions;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
  const { hasPermission } = useRole();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
