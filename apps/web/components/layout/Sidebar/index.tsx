'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Briefcase, User, BarChart2, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';

const NAV = [
  { href: '/search',      label: 'Discover',     icon: Search },
  { href: '/recommended', label: 'Recommended',  icon: Sparkles },
  { href: '/deals',       label: 'Deals',        icon: Briefcase },
  { href: '/profile',     label: 'Profile',      icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 py-4">
      <div className="px-4 pb-4">
        <Link href="/search" className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-[#4F6EF7]" />
          <span className="text-sm font-semibold text-zinc-100">Influence</span>
        </Link>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[#4F6EF7]/10 text-[#4F6EF7]'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
