import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, User, Lock, Bell, Moon, Languages, ShieldCheck, ChevronRight, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      <div className="flex items-center mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">App Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center space-x-4">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-brand-500/20">
            {session?.user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-black text-lg">{session?.user?.email?.split('@')[0].toUpperCase()}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{session?.user?.email}</p>
          </div>
        </div>

        {/* Options List */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 px-2 mb-3">Preferences</p>
          
          <SettingItem icon={Lock} label="Change Password" color="text-amber-400" bg="bg-amber-400/10" />
          
          <div className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center text-emerald-400">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold">Push Notifications</span>
            </div>
            <button 
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${notifications ? 'bg-brand-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${notifications ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <SettingItem icon={Languages} label="App Language" value="English" color="text-blue-400" bg="bg-blue-400/10" />
          <SettingItem icon={Moon} label="Dark Mode" value="On" color="text-indigo-400" bg="bg-indigo-400/10" />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 px-2 mb-3">Support & Security</p>
          <SettingItem icon={ShieldCheck} label="Privacy Policy" color="text-slate-400" bg="bg-slate-800" />
          <SettingItem icon={ShieldCheck} label="Terms of Service" color="text-slate-400" bg="bg-slate-800" />
        </div>

        <button 
          onClick={handleLogout}
          className="w-full mt-6 py-5 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black rounded-3xl flex items-center justify-center space-x-3 shadow-xl hover:bg-rose-500/20 transition-all uppercase tracking-widest text-xs"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out Account</span>
        </button>

        <div className="text-center py-6">
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Minimal Stroke SalaryBOX</p>
          <p className="text-[9px] text-slate-700 font-bold mt-1">Version 2.5.0 (Build 20260503)</p>
        </div>
      </div>
    </div>
  );
}

function SettingItem({ icon: Icon, label, value, color, bg }: any) {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition cursor-pointer"
    >
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-bold text-slate-200">{label}</span>
      </div>
      <div className="flex items-center space-x-3">
        {value && <span className="text-xs font-bold text-slate-500">{value}</span>}
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </div>
    </motion.div>
  );
}
