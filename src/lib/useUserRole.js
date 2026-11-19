import { useAuth } from '@/lib/AuthContext';

// Returns the current user's role. Three roles exist in the app:
//   - admin   : full read/write access, sees all financial information
//   - user    : "Viewer" — read-only, sees all financial information
//   - manager : read-only AND no access to financial/commercial records
// Any non-admin role is treated as read-only.
export function useUserRole() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  // Financial values live in protected finance records; Managers cannot read
  // them at the data level and the UI never renders them.
  const canViewFinance = !isManager;
  return { role, isAdmin, isManager, isViewer: !isAdmin, canViewFinance, user };
}