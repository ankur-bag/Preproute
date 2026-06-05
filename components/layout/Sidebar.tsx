// components/layout/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  BarChart2, 
  Settings, 
  Bell, 
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Test Creation', icon: ClipboardList, href: '/dashboard' }, // active for /dashboard and /tests/*
    { name: 'Test Tracking', icon: BarChart2, href: '#' },
  ];

  const bottomItems = [
    { name: 'Notifications', icon: Bell, href: '#' },
    { name: 'Settings', icon: Settings, href: '#' },
    { name: 'Help & Support', icon: HelpCircle, href: '#' },
  ];

  // Helper to determine if item is active
  const isActive = (itemHref: string, itemName: string) => {
    if (itemName === 'Test Creation') {
      return pathname.startsWith('/tests') || pathname === '/dashboard';
    }
    if (itemName === 'Dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === itemHref;
  };

  return (
    <>
      {/* Mobile Hamburger Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-45 flex w-60 flex-col bg-[#1A1A2E] text-white transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-screen`}
      >
        {/* Logo Container */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xl font-bold tracking-tight">
            <span className="text-white">Prep</span>
            <span className="text-[#5B6BF5]">route</span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 hover:bg-white/10 text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const active = isActive(item.href, item.name);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'border-l-4 border-[#5B6BF5] bg-white/10 text-white font-semibold pl-2'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} className={active ? 'text-[#5B6BF5]' : 'text-gray-400'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="h-px bg-white/10 mx-6" />

        {/* Bottom Navigation */}
        <div className="space-y-1.5 px-4 py-6">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </a>
            );
          })}
          
          <button
            onClick={logout}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
