"use client";

import AdminDashboard from '@/components/admin/AdminDashboard';
import useStore from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { session, userRole } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (session && userRole === 'Employee') {
       router.push('/dashboard');
    } else if (!session) {
       router.push('/login');
    }
  }, [session, userRole, router]);

  if (!session || userRole === 'Employee') return null;

  return <AdminDashboard />;
}
