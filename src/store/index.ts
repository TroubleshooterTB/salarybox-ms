import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AppState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  userRole: 'Employee' | 'Branch Admin' | 'Attendance Manager' | 'Advanced Attendance Manager' | 'Super Admin' | null;
  setUserRole: (role: 'Employee' | 'Branch Admin' | 'Attendance Manager' | 'Advanced Attendance Manager' | 'Super Admin' | null) => void;
  userProfile: any | null;
  setUserProfile: (profile: any | null) => void;
}

const useStore = create<AppState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  userRole: null,
  setUserRole: (role) => set({ userRole: role }),
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),
}));

export default useStore;
