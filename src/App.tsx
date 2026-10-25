import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Overview = lazy(() => import('./pages/Overview').then((m) => ({ default: m.Overview })));
const Orders = lazy(() => import('./pages/Orders').then((m) => ({ default: m.Orders })));
const Categories = lazy(() => import('./pages/Categories').then((m) => ({ default: m.Categories })));
const ModifierGroups = lazy(() => import('./pages/ModifierGroups').then((m) => ({ default: m.ModifierGroups })));
const Products = lazy(() => import('./pages/Products').then((m) => ({ default: m.Products })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const WebsiteSettings = lazy(() => import('./pages/WebsiteSettings').then((m) => ({ default: m.WebsiteSettings })));
const DeliveryZones = lazy(() => import('./pages/DeliveryZones').then((m) => ({ default: m.default })));
const StaffPermissions = lazy(() => import('./pages/StaffPermissions').then((m) => ({ default: m.StaffPermissions })));
const OffersCoupons = lazy(() => import('./pages/OffersCoupons').then((m) => ({ default: m.OffersCoupons })));
const Customers = lazy(() => import('./pages/Customers').then((m) => ({ default: m.Customers })));
const Payments = lazy(() => import('./pages/Payments').then((m) => ({ default: m.Payments })));

function PageFallback() {
  return <div className="flex min-h-40 items-center justify-center p-8 text-sm text-ink/50">Loading page…</div>;
}

function page(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

function ProtectedShell() {
  const { user, roleName, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-ink/50">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roleName) return <div className="flex h-screen items-center justify-center px-6 text-center"><div><p className="text-lg font-semibold text-ink">No staff access</p><p className="mt-2 text-sm text-ink/60">This account isn't linked to a restaurant yet. Contact your platform admin.</p></div></div>;
  return <Layout />;
}

// Keep route-level permission checks intact: the lazy page isn't rendered until
// the current role passes the same permission guard as before.
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
    <Route path="/login" element={page(<Login />)} />
    <Route element={<ProtectedShell />}>
    <Route path="/" element={page(<Overview />)} />
    <Route path="/orders" element={<RequirePermission permission="orders.view">{page(<Orders />)}</RequirePermission>} />
    <Route path="/products" element={<RequirePermission permission="menu.manage">{page(<Products />)}</RequirePermission>} />
    <Route path="/categories" element={<RequirePermission permission="menu.manage">{page(<Categories />)}</RequirePermission>} />
    <Route path="/modifier-groups" element={<RequirePermission permission="menu.manage">{page(<ModifierGroups />)}</RequirePermission>} />
    <Route path="/reports" element={<RequirePermission permission="reports.view">{page(<Reports />)}</RequirePermission>} />
    <Route path="/settings" element={<RequirePermission permission="settings.manage">{page(<Settings />)}</RequirePermission>} />
    <Route path="/website" element={<RequirePermission permission="settings.manage">{page(<WebsiteSettings />)}</RequirePermission>} />
    <Route path="/delivery-zones" element={<RequirePermission permission="settings.manage">{page(<DeliveryZones />)}</RequirePermission>} />
    <Route path="/staff" element={<RequirePermission permission="staff.manage">{page(<StaffPermissions />)}</RequirePermission>} />
    <Route path="/offers-coupons" element={<RequirePermission permission="offers.manage">{page(<OffersCoupons />)}</RequirePermission>} />
    <Route path="/customers" element={<RequirePermission permission="customers.view">{page(<Customers />)}</RequirePermission>} />
    <Route path="/payments" element={page(<Payments />)} />
    </Route><Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
