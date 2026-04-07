"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import useStore from '@/store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setUserRole, setUserProfile } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email || '');
      else setIsInitializing(false);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email || '');
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const emailLower = email.toLowerCase();
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (data) {
        setUserProfile(data);
        if (emailLower.startsWith('admin')) {
          setUserRole('Super Admin');
        } else {
          setUserRole(data.role || 'Employee');
        }
      } else if (emailLower.startsWith('admin')) {
        setUserRole('Super Admin');
        setUserProfile({ full_name: 'Admin', role: 'Super Admin' });
      }
    } catch (e) {
      console.error("Auth error:", e);
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sky-400 font-bold">
        SYNCHING MINIMAL STROKE IDENTITY...
      </div>
    );
  }

  return <>{children}</>;
}
