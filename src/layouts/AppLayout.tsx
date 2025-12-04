import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../utils/cn';

const navItems = [
  { label: 'Dashboard', to: '/', end: true },
  { label: 'Grant Recipes', to: '/grant-recipes' },
];

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-slate-200 bg-white px-5 py-6 shadow-card">
        <div className="text-2xl font-semibold text-brand-600">Granter</div>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-lg font-semibold text-slate-800">Granter</div>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              NM
            </div>
            <div className="text-sm font-medium text-slate-700">Naresh Mandla</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
