import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Orders } from './pages/Orders';
import { Categories } from './pages/Categories';
import { ModifierGroups } from './pages/ModifierGroups';
import { Products } from './pages/Products';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { WebsiteSettings } from './pages/WebsiteSettings';
import DeliveryZones from './pages/DeliveryZones';
import { StaffPermissions } from './pages/StaffPermissions';
import { OffersCoupons } from './pages/OffersCoupons';
import { Customers } from './pages/Customers';
import { Notifications } from './pages/Notifications';

function ProtectedShell() {
  const { user, roleName, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-ink/50">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roleName) return <div className="flex h-screen items-center justify-center px-6 text-center"><div><p className="text-lg font-semibold text-ink">No staff access</p><p className="mt-2 text-sm text-ink/60">This account isn't linked to a restaurant yet. Contact your platform admin.</p></div></div>;
  return <Layout />;
}

// Route-level guard: even though the nav already hides links a role can't
// use, someone could still navigate to the URL directly. This blocks that,
// mirroring the same permission the RLS policies now enforce server-side.
function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return <div className="flex h-full items-center justify-center px-6 text-center"><div><p className="text-lg font-semibold text-ink">No access</p><p className="mt-2 text-sm text-ink/60">Your role doesn't have permission to view this page. Ask an owner/admin to grant it from Staff & Permissions.</p></div></div>;
  }
  return children;
}

export default function App() {
  return <AuthProvider><BrowserRouter>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedShell />}>
    <Route path="/" element={<Overview />} />
    <Route path="/orders" element={<RequirePermission permission="orders.view"><Orders /></RequirePermission>} />
    <Route path="/products" element={<RequirePermission permission="menu.manage"><Products /></RequirePermission>} />
    <Route path="/categories" element={<RequirePermission permission="menu.manage"><Categories /></RequirePermission>} />
    <Route path="/modifier-groups" element={<RequirePermission permission="menu.manage"><ModifierGroups /></RequirePermission>} />
    <Route path="/reports" element={<RequirePermission permission="reports.view"><Reports /></RequirePermission>} />
    <Route path="/settings" element={<RequirePermission permission="settings.manage"><Settings /></RequirePermission>} />
    <Route path="/website" element={<RequirePermission permission="settings.manage"><WebsiteSettings /></RequirePermission>} />
    <Route path="/delivery-zones" element={<RequirePermission permission="settings.manage"><DeliveryZones /></RequirePermission>} />
    <Route path="/staff" element={<RequirePermission permission="staff.manage"><StaffPermissions /></RequirePermission>} />
    <Route path="/offers-coupons" element={<RequirePermission permission="offers.manage"><OffersCoupons /></RequirePermission>} />
    <Route path="/customers" element={<RequirePermission permission="customers.view"><Customers /></RequirePermission>} />
    <Route path="/notifications" element={<RequirePermission permission="settings.manage"><Notifications /></RequirePermission>} />
    </Route><Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
