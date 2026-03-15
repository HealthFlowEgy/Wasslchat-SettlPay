'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import DashboardLayout from './DashboardLayout';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page renders without shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <DashboardLayout activePath={pathname || '/'}>
      {children}
    </DashboardLayout>
  );
}
