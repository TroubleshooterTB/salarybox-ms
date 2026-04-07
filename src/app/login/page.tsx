"use client";

import LoginForm from '@/components/auth/LoginForm';
import useStore from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { session, userRole } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      if (userRole === 'Employee') router.push('/dashboard');
      else router.push('/admin');
    }
  }, [session, userRole, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
