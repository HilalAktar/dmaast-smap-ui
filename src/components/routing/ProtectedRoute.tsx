import { Navigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import type { RolePermissions } from '../../contexts/RoleContext';

interface ProtectedRouteProps {
  permission: keyof RolePermissions;
  children: React.ReactNode;
}

/**
 * Yetkisi olmayan kullanıcıyı Dashboard'a yönlendirir.
 * URL ile doğrudan erişim engellenir.
 */
export default function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { hasPermission } = useRole();

  if (!hasPermission(permission)) {
    /*
     * 🔴 Hedef "/" DEGIL, "/dashboard".
     * Kok artik icerik gostermeyen bir dagitici (Isıl karari 2026-09-07);
     * oraya gidilirse ikinci bir <Navigate> daha calisir ve `state` KAYBOLUR —
     * Dashboard'daki "access denied" uyarisi (Dashboard.tsx:58) hic gorunmezdi.
     */
    return <Navigate to="/dashboard" state={{ accessDenied: true }} replace />;
  }

  return <>{children}</>;
}
