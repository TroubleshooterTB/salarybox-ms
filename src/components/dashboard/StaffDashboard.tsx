import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, Clock, 
  CalendarDays, IndianRupee, 
  Palmtree, FolderOpen, Globe, Settings,
  Briefcase, MessageSquare, ExternalLink, MapPin
} from 'lucide-react';
import useStore from '../../store';
import { supabase } from '../../lib/supabase';
import CameraPunch from '../attendance/CameraPunch';
import LeaveManagement from '../leaves/LeaveManagement';
import LoanLedger from '../loans/LoanLedger';
import StaffProfile from './StaffProfile';
import HolidayCalendar from './HolidayCalendar';
import CorrectionRequest from './CorrectionRequest';
import AttendanceCalendar from './AttendanceCalendar';
import FieldVisit from './FieldVisit';
import Documents from './Documents';
import Notes from './Notes';
import SettingsView from './Settings';
import NotificationBell from '../common/NotificationBell';

const baseMenuItems = [
  { id: 'profile', label: 'Profile', icon: User, color: 'bg-blue-500' },
  { id: 'history', label: 'View Attendance', icon: CalendarDays, color: 'bg-emerald-500' },
  { id: 'leaves', label: 'Request Leave', icon: Palmtree, color: 'bg-orange-500' },
  { id: 'crm', label: 'CRM', icon: Briefcase, color: 'bg-indigo-500', isExternal: true },
  { id: 'notes', label: 'Notes', icon: MessageSquare, color: 'bg-amber-500' },
  { id: 'holidays', label: 'Holiday List', icon: Globe, color: 'bg-teal-500' },
  { id: 'documents', label: 'Documents', icon: FolderOpen, color: 'bg-cyan-500' },
  { id: 'loans', label: 'Loans', icon: IndianRupee, color: 'bg-rose-500' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'bg-slate-600' },
];

export default function StaffDashboard() {
  const { session, userRole, userProfile } = useStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [correctionDate, setCorrectionDate] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);

  const menuItems = [...baseMenuItems];
  if (userProfile?.branch === 'Remote/Field') {
    menuItems.splice(3, 0, { id: 'field_visit', label: 'Field Visit', icon: MapPin, color: 'bg-violet-600' });
  }

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
    
    // Refresh interval every time dashboard mounts or activeTab clears
    if (!activeTab) {
      fetchToday();
    }
  }, [session, activeTab]);

  useEffect(() => {
    const syncPunches = async () => {
      const queue = JSON.parse(localStorage.getItem('attendance_queue') || '[]');
      if (queue.length === 0 || !navigator.onLine) return;

      setIsSyncing(true);
      const remainingQueue = [];

      for (const punch of queue) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) throw new Error('No session');

          const res = await fetch('/api/punch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: currentSession.access_token,
              punchData: punch
            })
          });

          if (!res.ok) throw new Error('Sync failed');
        } catch (err) {
          remainingQueue.push(punch);
        }
      }

      localStorage.setItem('attendance_queue', JSON.stringify(remainingQueue));
      setIsSyncing(false);
      
      // Refresh punches after sync
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', session?.user?.id)
        .gte('timestamp', startOfDay.toISOString())
        .order('timestamp', { ascending: true });
      if (data) setTodayPunches(data);
    };

    if (session) {
      syncPunches();
      window.addEventListener('online', syncPunches);
      return () => window.removeEventListener('online', syncPunches);
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (activeTab === 'attendance') {
    return <CameraPunch onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'leaves') {
    return <LeaveManagement onBack={() => { setActiveTab(null); setCorrectionDate(undefined); }} prefillDate={correctionDate} />;
  }
  if (activeTab === 'loans') {
    return <LoanLedger onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'profile') {
    return <StaffProfile onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'holidays') {
    return <HolidayCalendar onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'corrections') {
    return <CorrectionRequest onBack={() => { setActiveTab(null); setCorrectionDate(undefined); }} prefillDate={correctionDate} />;
  }
  if (activeTab === 'field_visit') {
    return <FieldVisit onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'documents') {
    return <Documents onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'notes') {
    return <Notes onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'settings') {
    return <SettingsView onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'history') {
    return <AttendanceCalendar 
      onBack={() => setActiveTab(null)}
      onRegularize={(date) => { setCorrectionDate(date); setActiveTab('corrections'); }}
      onApplyLeave={(date) => { setCorrectionDate(date); setActiveTab('leaves'); }}
    />;
  }
  if (activeTab === 'loans') {
    return <LoanLedger onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === 'profile') {
    return <StaffProfile onBack={() => setActiveTab(null)} />;
  }
  if (activeTab && !['attendance', 'leaves', 'loans', 'history', 'profile', 'holidays', 'corrections'].includes(activeTab)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-brand-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(var(--color-brand-500),0.3)]">
          <Settings className="w-10 h-10 text-brand-400 animate-spin-slow" />
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight capitalize">{activeTab}</h2>
        <p className="text-slate-400 font-medium text-center mb-10 px-4">This module is currently being provisioned for your account. Please check back later.</p>
        <button onClick={() => setActiveTab(null)} className="px-8 py-3 bg-white text-slate-950 font-bold rounded-xl shadow-lg active:scale-95 transition">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // A sleek glassmorphism mobile app shell
  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col items-center overflow-hidden">
      {/* Background Aesthetic */}
      <div className="absolute top-0 left-0 w-full h-[35vh] bg-gradient-to-b from-brand-900/30 to-transparent z-0 pointer-events-none" />

      <div className="w-full max-w-md w-full z-10 flex flex-col min-h-screen relative p-5">
        
        {/* Header */}
        <header className="flex justify-between items-center py-6 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Minimal Stroke</h1>
            <p className="text-sm font-medium text-brand-400 mt-0.5">Welcome, {session?.user?.email?.split('@')?.[0]?.toUpperCase() || 'STAFF'}</p>
          </div>
          <div className="flex items-center space-x-3">
            {(userRole && userRole !== 'Employee' || session?.user?.email?.toLowerCase().startsWith('admin')) && (
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-gradient-to-tr from-brand-600 to-cyan-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:brightness-110 transition shrink-0"
              >
                Admin Panel
              </motion.button>
            )}
            <NotificationBell />
            <motion.div 
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="w-11 h-11 shrink-0 bg-slate-800/80 rounded-full flex items-center justify-center shadow-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition"
            >
              <User className="w-5 h-5 text-slate-300" />
            </motion.div>
          </div>
        </header>

        {/* Offline Sync Status */}
        {isSyncing && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1.5 px-4 rounded-full mb-4 self-center flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span>Syncing Offline Punches...</span>
          </motion.div>
        )}

        {/* Daily Punches UI */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl mt-2 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {(() => {
            const hasPunches = todayPunches.length > 0;
            const lastPunch = hasPunches ? todayPunches[todayPunches.length - 1] : null;
            const shiftCompleted = hasPunches && lastPunch?.type === 'Out';
            return (
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div>
              <h3 className="text-lg font-black tracking-tight text-white mb-0.5">Today's Attendance</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
            {shiftCompleted ? (
              <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Shift Completed</span>
              </div>
            ) : (
              <button 
                onClick={() => setActiveTab('attendance')}
                className="bg-brand-500 text-white shadow-lg shadow-brand-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-400 active:scale-95 transition flex items-center space-x-2"
              >
                <Clock className="w-4 h-4" /> <span>{todayPunches.length % 2 === 0 ? 'Punch IN' : 'Punch OUT'}</span>
              </button>
            )}
          </div>
            );
          })()}

          <div className="space-y-3 relative z-10">
            {todayPunches.length === 0 ? (
              <div className="text-center py-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-xs font-bold text-slate-500">No punches recorded today.</p>
              </div>
            ) : (
              todayPunches.map((p, i) => (
                <div key={p.id} className={`flex justify-between items-center p-3 rounded-2xl border ${p.type === 'In' ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${p.type === 'In' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {p.type === 'In' ? 'IN' : 'OUT'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-wide">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5 truncate max-w-[150px]">{p.address_string || `GPS: ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`}</p>
                    </div>
                  </div>
                  {i > 0 && p.type === 'Out' && todayPunches[i-1].type === 'In' && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Duration</p>
                      <p className="text-xs font-black text-white">
                        {Math.floor((new Date(p.timestamp).getTime() - new Date(todayPunches[i-1].timestamp).getTime()) / 3600000)}h {Math.floor(((new Date(p.timestamp).getTime() - new Date(todayPunches[i-1].timestamp).getTime()) % 3600000) / 60000)}m
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3x4 Grid UI */}
        <div className="flex-1">
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
                  onClick={() => {
                    if (item.id === 'crm') {
                      window.open('https://minimalstroke.odoo.com/odoo/crm', '_blank');
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-4 bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-3xl shadow-xl hover:bg-slate-800/80 transition duration-300 aspect-[4/5] relative overflow-hidden group"
                >
                  {/* Subtle highlight effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                  
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-3 shadow-lg shadow-black/20`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 tracking-wide flex items-center">
                    {item.label}
                    {item.isExternal && <ExternalLink className="w-2.5 h-2.5 ml-1 text-slate-500" />}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
        {/* Version Stamp */}
        <div className="text-center pb-6 pt-2">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600/40">
            Version: v2.5.0 • Last Updated: Apr 18, 2026 17:30
          </span>
        </div>
      </div>
    </div>
  );
}
