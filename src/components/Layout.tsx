import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: '◧', permission: null },
  { to: '/orders', label: 'Orders', icon: '▤', permission: 'orders.view' },
  { to: '/products', label: 'Products', icon: '☕', permission: 'menu.manage' },
  { to: '/categories', label: 'Categories', icon: '▦', permission: 'menu.manage' },
  { to: '/modifier-groups', label: 'Modifier Groups', icon: '✦', permission: 'menu.manage' },
  { to: '/reports', label: 'Reports', icon: '◫', permission: 'reports.view' },
  { to: '/delivery-zones', label: 'Delivery Zones', icon: '⌖', permission: 'settings.manage' },
  { to: '/website', label: 'Website', icon: '◉', permission: 'settings.manage' },
  { to: '/settings', label: 'Settings', icon: '⚙', permission: 'settings.manage' },
  { to: '/staff', label: 'Staff', icon: '◐', permission: 'staff.manage' },
  { to: '/offers-coupons', label: 'Offers & Coupons', icon: '◆', permission: 'offers.manage' },
  { to: '/customers', label: 'Customers', icon: '◍', permission: 'customers.view' },
  { to: '/notifications', label: 'Notifications', icon: '◔', permission: 'settings.manage' },
] as const;

export function Layout() {
  const { user, roleName, hasPermission, signOut } = useAuth();
  const visibleItems = NAV_ITEMS.filter(item => item.permission === null || hasPermission(item.permission));
  return <div className="flex h-screen bg-canvas text-ink"><aside className="flex w-60 flex-col border-r border-line bg-surface"><div className="flex items-center gap-2 border-b border-line px-6 py-5"><span className="font-display text-lg font-semibold tracking-tight">Cafe</span><span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">Admin</span></div><nav className="flex-1 space-y-1 px-3 py-4">{visibleItems.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({isActive}) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-accent text-white' : 'text-ink/70 hover:bg-canvas hover:text-ink'}`}><span className="text-base leading-none">{item.icon}</span>{item.label}</NavLink>)}</nav><div className="border-t border-line px-4 py-4"><p className="truncate text-xs font-medium text-ink">{user?.email}</p><p className="text-[11px] uppercase tracking-wide text-ink/40">{roleName}</p><button onClick={signOut} className="mt-2 text-xs font-medium text-accent hover:underline">Sign out</button></div></aside><main className="flex-1 overflow-y-auto"><Outlet /></main></div>;
}
