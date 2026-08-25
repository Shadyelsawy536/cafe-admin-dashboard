import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Orders } from './pages/Orders';
import { Categories } from './pages/Categories';
import { ModifierGroups } from './pages/ModifierGroups';
import { Products } from './pages/Products';

function ProtectedShell() {
  const { user, roleName, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-ink/50">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roleName) {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-ink">No staff access</p>
          <p className="mt-2 text-sm text-ink/60">This account isn't linked to a restaurant yet. Contact your platform admin.</p>
        </div>
      </div>
    );
  }
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedShell />}>
            <Route path="/" element={<Overview />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/modifier-groups" element={<ModifierGroups />} />
            <Route path="/products" element={<Products />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
