import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { KeyRound, Smartphone, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

export default function LoginForm() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('Secure Access Initializing...');
  const [showForgot, setShowForgot] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatusText('Authenticating...');

    try {
      const email = employeeId.includes('@') 
        ? employeeId.toLowerCase() 
        : `${employeeId.toLowerCase().replace(/\s/g, '')}@minimalstroke.com`;
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your ID and Passcode.');
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      
      alert(`Reset request for "${employeeId}" submitted successfully. A notification has been sent to business@minimalstroke.com. Please wait for Super Admin approval.`);
      setShowForgot(false);
      setEmployeeId(''); // Clear for security
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 relative overflow-hidden">
      {/* Animated Orbitals for 'WOW' effect */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="w-full max-w-md z-10 glass-card p-10 relative"
      >
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-10 w-20 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        
        <div className="text-center mb-12">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)] mb-8 transform -rotate-12 border border-white/20"
          >
            <KeyRound className="text-white w-10 h-10" />
          </motion.div>
          
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
            Minimal<span className="text-gradient">Stroke</span>
          </h1>
          <div className="flex items-center justify-center space-x-2 text-slate-500">
            <Sparkles className="w-3 h-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Enterprise Resource Portal</p>
            <Sparkles className="w-3 h-3" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start space-x-3 text-rose-400 brand-glow"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-bold leading-relaxed">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity Identifier</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Smartphone className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400" />
              </div>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-950 transition-all shadow-2xl font-bold"
                placeholder="Employee ID (e.g. MS001)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Passcode</label>
              <button 
                type="button" 
                onClick={() => setShowForgot(true)}
                className="text-[10px] font-black text-cyan-500/80 hover:text-cyan-400 uppercase tracking-widest transition"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-slate-950/50 border border-white/5 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-950 transition-all shadow-2xl font-bold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            type="submit"
            className="w-full relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-full py-5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-black rounded-2xl shadow-2xl flex items-center justify-center space-x-3 overflow-hidden">
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span className="uppercase tracking-widest text-sm">{statusText}</span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-sm">Punch Access</span>
                </>
              )}
              
              <motion.div 
                animate={{ x: ['100%', '-100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-20 bg-white/20 skew-x-12 pointer-events-none" 
              />
            </div>
          </motion.button>
        </form>

        {/* Forgot Password Modal/Overlay */}
        <AnimatePresence>
          {showForgot && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950 z-[100] p-10 flex flex-col justify-center rounded-[2.5rem]"
            >
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl mx-auto flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Password Assistance</h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">
                  Enter your Employee ID. A reset request will be sent to the Super Admin for approval.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white placeholder-slate-700 outline-none focus:border-cyan-500/50 transition font-bold"
                    placeholder="e.g. MS001"
                  />
                </div>

                <button
                  onClick={handleRequestReset}
                  disabled={loading || !employeeId}
                  className="w-full py-4 bg-cyan-500 text-slate-950 font-black rounded-2xl shadow-xl hover:bg-cyan-400 transition disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {loading ? 'Processing...' : 'Send Reset Request'}
                </button>

                <button
                  onClick={() => setShowForgot(false)}
                  className="w-full py-4 text-slate-500 font-bold hover:text-white transition text-xs uppercase tracking-widest"
                >
                  Back to Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="mt-12 text-center pointer-events-none">
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">
            © 2026 Minimal Stroke Studio Pvt Ltd
          </p>
        </div>
      </motion.div>
    </div>
  );
}
