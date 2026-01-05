'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/settings/workspace', label: 'Workspace', icon: '🏢' },
  { href: '/settings/users', label: 'Users', icon: '👥' },
  { href: '/settings/notifications', label: 'Notifications', icon: '🔔' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-64 shrink-0">
        <nav className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 sticky top-24">
          <h2 className="font-semibold text-gray-900 mb-4">Settings</h2>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
