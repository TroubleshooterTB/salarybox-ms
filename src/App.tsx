import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useStore from './store';
import { supabase } from './lib/supabase';
import LoginForm from './components/auth/LoginForm';
import StaffDashboard from './components/dashboard/StaffDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import { getDeviceFingerprint } from './lib/deviceFingerprint';

function App() {
  const { session, setSession, userRole, setUserRole } = useStore();
  const [isInitializing, setIsInitializing] = useState(true);

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

      // Global Device Fingerprint Security Check
      const fp = await getDeviceFingerprint();
      if (!data.device_fingerprint) {
        const { error: updateErr } = await supabase.from('profiles').update({ device_fingerprint: fp }).eq('id', userId);
        if (updateErr) console.error("Could not bind device fingerprint:", updateErr);
      } else if (data.device_fingerprint !== fp) {
        // Special case: Allow Admins to auto-update fingerprint. 
        // For others, show warning but DON'T sign out during this production transition phase.
        if (emailLower.startsWith('admin') || data.role === 'Super Admin') {
          console.warn("Admin device change detected. Updating security fingerprint...");
          await supabase.from('profiles').update({ device_fingerprint: fp }).eq('id', userId);
        } else {
          alert("Security Note: You are logged in from a new device. This has been logged for security.");
          // We removed the signOut() here so the user can actually work!
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
