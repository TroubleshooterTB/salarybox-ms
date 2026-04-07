"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '@/store';

export default function Home() {
  const { session, userRole } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push('/login');
    } else {
      if (userRole === 'Employee') router.push('/dashboard');
      else router.push('/admin');
    }
  }, [session, userRole, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sky-400">
       <span className="font-bold">Minimal Stroke HR Logic Booting...</span>
    </div>
  );
}
