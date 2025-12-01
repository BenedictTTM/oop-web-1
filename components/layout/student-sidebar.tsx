'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  FileText,
  TrendingUp,
  Activity,
  LogOut,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

const studentNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
  { href: '/dashboard/videos', label: 'Videos', icon: Video },
  { href: '/dashboard/quizzes', label: 'Quizzes', icon: FileText },
  { href: '/dashboard/progress', label: 'Progress', icon: TrendingUp },
];

interface SidebarContentProps {
  pathname: string;
  onItemClick?: () => void;
}

function SidebarContent({ pathname, onItemClick }: SidebarContentProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    router.push('/onboarding');
    onItemClick?.();
  };

  return (
    <>
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <h2 className="text-xl font-bold text-white">OOP Learning</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {studentNavItems.map((item) => {
          const Icon = item.icon;
          let isActive = false;
          
          if (item.href === '/dashboard') {
            isActive = pathname === '/dashboard';
          } else {
            isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false);
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </>
  );
}

export function StudentSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="hidden lg:flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <SidebarContent pathname={pathname} />
      </div>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between h-16 px-4">
          <h2 className="text-xl font-bold text-white">OOP Learning</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            className="text-slate-300 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} side="left">
        <DrawerContent>
          <DrawerHeader onClose={() => setMobileMenuOpen(false)}>
            <h2 className="text-xl font-bold text-white">Menu</h2>
          </DrawerHeader>
          <DrawerBody>
            <SidebarContent pathname={pathname} onItemClick={() => setMobileMenuOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

