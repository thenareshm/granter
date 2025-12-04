import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DriveLogo } from '../components/Icons';
import { useTheme } from '../hooks/useTheme';
import { useUserSettings } from '../hooks/useUserSettings';
import { cn } from '../utils/cn';

const navItems = [
  { label: 'Dashboard', to: '/', end: true },
  { label: 'Grant Recipes', to: '/grant-recipes' },
  { label: 'API Keys', to: '/settings/api-keys' },
  { label: 'Drive', to: '/drive', icon: DriveLogo },
];

export const AppLayout = () => {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useUserSettings();

  const initials =
    user?.displayName
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    '';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-slate-200 bg-white px-5 py-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
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
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-200/20 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                )
              }
            >
              {item.icon ? <item.icon className="h-4 w-4" /> : null}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">Granter</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-500 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
                </svg>
              )}
            </button>
            {loading ? (
              <div className="text-sm text-slate-500">Checking auth…</div>
            ) : user ? (
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-200/30 dark:text-brand-100">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? user.email ?? 'User avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials || '•'
                  )}
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-100">
                  {user.displayName ?? user.email}
                  {settings?.driveConnected && (
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
                      Drive connected
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-6xl text-slate-800 dark:text-slate-50">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
