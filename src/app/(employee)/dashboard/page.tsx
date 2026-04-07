"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Clock, 
  CalendarDays, IndianRupee, 
  Palmtree, FolderOpen, Globe, Settings,
  Briefcase, MessageSquare, LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import useStore from '@/store';
import WebCameraPunch from '@/components/attendance/WebCameraPunch';
import NotificationBell from '@/components/common/NotificationBell';

const menuItems = [
  { id: 'profile', label: 'Profile', icon: User, color: 'bg-blue-500' },
  { id: 'history', label: 'View Attendance', icon: CalendarDays, color: 'bg-emerald-500' },
  { id: 'leaves', label: 'Request Leave', icon: Palmtree, color: 'bg-orange-500' },
  { id: 'crm', label: 'CRM', icon: Briefcase, color: 'bg-indigo-500' },
  { id: 'notes', label: 'Notes', icon: MessageSquare, color: 'bg-amber-500' },
  { id: 'holidays', label: 'Holiday List', icon: Globe, color: 'bg-teal-500' },
  { id: 'documents', label: 'Documents', icon: FolderOpen, color: 'bg-cyan-500' },
  { id: 'loans', label: 'Loans', icon: IndianRupee, color: 'bg-rose-500' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'bg-slate-600' },
];

export default function EmployeeDashboard() {
  const { session, userRole, setSession } = useStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [todayPunches, setTodayPunches] = useState<any[]>([]);

  useEffect(() => {
    async function fetchToday() {
      if (!session) return;
      
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('timestamp', startOfDay.toISOString())
        .order('timestamp', { ascending: true });
        
      if (data) setTodayPunches(data);
    }
    
    if (!activeTab) {
      fetchToday();
    }
  }, [session, activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push('/login');
  };

  if (activeTab === 'attendance') {
    return <WebCameraPunch onBack={() => setActiveTab(null)} />;
  }

  return (
    <div className="flex flex-col min-h-screen relative p-5">
       {/* Background Aesthetic */}
       <div className="absolute top-0 left-0 w-full h-[35vh] bg-gradient-to-b from-sky-900/30 to-transparent z-0 pointer-events-none" />

        {/* Header */}
        <header className="flex justify-between items-center py-6 mb-4 relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Minimal Stroke</h1>
            <p className="text-sm font-medium text-sky-400 mt-0.5">Welcome, {session?.user?.email?.split('@')?.[0]?.toUpperCase() || 'STAFF'}</p>
          </div>
          <div className="flex items-center space-x-3">
             <NotificationBell />
             <motion.button 
               whileTap={{ scale: 0.9 }}
               onClick={handleLogout}
               className="w-11 h-11 shrink-0 bg-slate-800/80 rounded-full flex items-center justify-center shadow-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition"
             >
               <LogOut className="w-5 h-5 text-slate-300" />
             </motion.button>
          </div>
        </header>

        {/* Daily Punches UI */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl mt-2 mb-6 relative overflow-hidden z-10 sticky top-0 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div>
              <h3 className="text-lg font-black tracking-tight text-white mb-0.5">Today's Attendance</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('attendance')}
              className="bg-sky-500 text-white shadow-lg shadow-sky-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-sky-400 active:scale-95 transition flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" /> 
              <span>{todayPunches.length % 2 === 0 ? 'Punch IN' : 'Punch OUT'}</span>
            </button>
          </div>

          <div className="space-y-2 relative z-10">
             {todayPunches.length === 0 ? (
               <div className="text-center py-3 bg-slate-950/50 rounded-2xl border border-white/5">
                 <p className="text-xs font-bold text-slate-500">No punches recorded today.</p>
               </div>
             ) : (
               todayPunches.map((p, i) => (
                 <div key={p.id} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-2xl border border-white/5">
                    <div className="flex items-center space-x-3 text-sm font-bold">
                       <span className={p.type === 'In' ? 'text-emerald-400' : 'text-rose-400'}>{p.type === 'In' ? 'IN' : 'OUT'}</span>
                       <span className="text-slate-300">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{p.status}</span>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* 3x3 Grid UI */}
        <div className="flex-1 z-10">
          <div className="grid grid-cols-3 gap-4 pb-10">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.04, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(item.id)}
                  className="flex flex-col items-center justify-center p-4 bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-xl hover:bg-slate-800/80 transition duration-300 aspect-[4/5] relative overflow-hidden group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-3 shadow-lg shadow-black/20`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 tracking-wide">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
            <div className="mt-8 mb-10 text-center opacity-30 select-none">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Minimal Stroke v1.1.0 • April 07, 2026</p>
        </div>
    </div>
    </div>
  );
}
