import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { getDeviceFingerprint } from '../../lib/deviceFingerprint';
import { KeyRound, Smartphone, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('Verifying Device Security...');
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    getDeviceFingerprint().then(setFingerprint);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fingerprint) return setError('Device security footprint missing.');
    setLoading(true);
    setError('');
    setStatusText('Authenticating...');

    try {
      const email = `${employeeId.toLowerCase().replace(/\s/g, '')}@minimalstroke.com`;
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      
      // Success! App.tsx's onAuthStateChange listener will pick this up instantly, 
      // check the device fingerprint globally, and seamlessly route them to the dashboard.
      
    } catch (err: any) {
      setError(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  if (!fingerprint) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-brand-500 mr-2" /> {statusText}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute top-[50%] right-[0%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10 glass-panel border border-white/10 bg-white/5 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-gradient-to-tr from-brand-600 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6"
          >
            <KeyRound className="text-white w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Minimal Stroke</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">ERP Access Portal</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Employee ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Smartphone className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all shadow-inner"
                placeholder="e.g. MS001"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Passcode</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all shadow-inner"
                placeholder="••••••••"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            type="submit"
            className="w-full mt-2 py-4 bg-white text-slate-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5 text-slate-600" />
                <span>{statusText}</span>
              </>
            ) : (
              <span>Punch Access</span>
            )}
          </motion.button>
        </form>
        
        <p className="mt-8 text-center text-xs text-slate-600 font-medium">
          Device Fingerprint: <span className="font-mono text-slate-500">{fingerprint}</span>
        </p>
      </motion.div>
    </div>
  );
}
