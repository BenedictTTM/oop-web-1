'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { getUserStatus, getUserEmail, isTokenExpired } from '@/lib/utils/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token || isTokenExpired()) {
      localStorage.removeItem('token');
      router.push('/login');
      return;
    }

    const status = getUserStatus();
    const email = getUserEmail();

    if (status === 'pending' || status === 'rejected') {
      if (email) {
        sessionStorage.setItem('pendingEmail', email);
      }
      router.push('/onboarding/pending');
      return;
    }

    if (status !== 'approved') {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}

