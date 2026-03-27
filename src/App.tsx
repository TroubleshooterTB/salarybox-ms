import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useStore from './store';
import { supabase } from './lib/supabase';
import LoginForm from './components/auth/LoginForm';
import StaffDashboard from './components/dashboard/StaffDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import { getDeviceFingerprint } from './lib/deviceFingerprint';
import { ShieldAlert, LogOut, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  const { session, setSession, userRole, setUserRole, setUserProfile } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutFp, setLockoutFp] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfileRole(session.user.id, session.user.email || '');
      else setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfileRole(session.user.id, session.user.email || '');
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  const fetchProfileRole = async (userId: string, userEmail: string) => {
    const emailLower = userEmail.toLowerCase();
    try {
      const { data, error } = await supabase.from('profiles').select('job_title, branch, department, device_fingerprint, role').eq('id', userId).single();
      
      if (error) throw error;
      setUserProfile(data);

      // 🛠️ Hardware Device Locking System
      const fp = await getDeviceFingerprint();
      
      // Case 1: First time setup - Auto-bind this device
      if (!data.device_fingerprint) {
        console.log("Binding initial device fingerprint...");
        const { error: bindErr } = await supabase.from('profiles').update({ 
          device_fingerprint: fp 
        }).eq('id', userId);
        if (bindErr) console.error("Fingerprint binding failed:", bindErr);
      } 
      // Case 2: Fingerprint mismatch - Lockdown
      else if (data.device_fingerprint !== fp) {
        // Special safety check: Admins bypass fingerprint lockout on their own dashboard 
        // but staff remain locked out. 
        if (!emailLower.startsWith('admin')) {
          setLockoutFp(fp);
          setIsLocked(true);
          return; // Stop further initialization
        }
      }

      // Email prefix takes priority over DB role for system admins
      if (emailLower.startsWith('admin')) {
        setUserRole('Super Admin');
      } else {
        setUserRole(data?.role || 'Employee');
      }
    } catch (e: any) {
      console.error("Dashboard Boot Error:", e.message);
      if (emailLower.startsWith('admin')) {
        setUserRole('Super Admin');
      } else {
        setUserRole('Employee');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const [requestStatus, setRequestStatus] = useState<'none' | 'sending' | 'sent'>('none');

  const handleRequestApproval = async () => {
    if (!session?.user.id) return;
    setRequestStatus('sending');
    try {
      await supabase.from('profiles').update({ 
        device_reset_requested: true 
      }).eq('id', session.user.id);
      setRequestStatus('sent');
    } catch (e) {
      console.error(e);
      setRequestStatus('none');
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg z-10 glass-card p-12 text-center"
        >
          <div className="w-24 h-24 bg-rose-500/20 rounded-3xl mx-auto flex items-center justify-center mb-8 border border-rose-500/30">
            <ShieldAlert className="text-rose-500 w-12 h-12" />
          </div>
          
          <h1 className="text-3xl font-black text-white tracking-tight mb-4 uppercase">Device Unauthorized</h1>
          <p className="text-slate-400 mb-8 leading-relaxed font-medium">
            This account is registered to another hardware device. To log in from this location, you must contact your administrator to authorize this new device.
          </p>

          <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-6 mb-10 group transition-all">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-3">Hardware Identification ID</label>
            <div className="flex items-center justify-center space-x-3 text-cyan-400 font-mono text-sm font-bold">
              <Smartphone className="w-4 h-4" />
              <span>{lockoutFp}</span>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            {requestStatus === 'sent' ? (
              <div className="py-4 bg-emerald-500/10 text-emerald-400 font-bold rounded-2xl border border-emerald-500/20 text-sm">
                Authorization requested! Please wait for Admin approval.
              </div>
            ) : (
              <button
                onClick={handleRequestApproval}
                disabled={requestStatus === 'sending'}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {requestStatus === 'sending' ? 'Sending Request...' : 'Notify Admin for Authorization'}
              </button>
            )}

            <button
              onClick={() => {
                supabase.auth.signOut().then(() => {
                  setSession(null);
                  setIsLocked(false);
                  setRequestStatus('none');
                });
              }}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center space-x-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Return to Login</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-brand-400 font-medium">
        Loading Minimal Stroke ERP...
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/login" element={!session ? <LoginForm /> : <Navigate to="/" />} />
          <Route path="/" element={session ? <StaffDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin" element={session ? (userRole !== 'Employee' ? <AdminDashboard /> : <Navigate to="/" />) : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
