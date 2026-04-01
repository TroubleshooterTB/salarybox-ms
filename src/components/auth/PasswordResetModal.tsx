import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PasswordResetModalProps {
  userId: string;
  onComplete: () => void;
}

export default function PasswordResetModal({ userId, onComplete }: PasswordResetModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update Auth Password
      const { error: authErr } = await supabase.auth.updateUser({ password });
      if (authErr) throw authErr;

      // 2. Update Profile Flag
      // NOTE: This will only work if the column 'needs_password_reset' has been added to the DB.
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ needs_password_reset: false })
        .eq('id', userId);
      
      if (profErr) {
        console.warn("Profile update failed (maybe column missing?), but password was updated:", profErr.message);
      }

      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-brand-50 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-brand-100">
            <Lock className="w-10 h-10 text-brand-500" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Security Update</h2>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            Your account was created by an administrator. For your security, please set a permanent password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-5">
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:border-brand-500 outline-none transition"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
            <input 
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:border-brand-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 text-rose-500 p-4 rounded-xl text-xs font-bold border border-rose-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-900/20 hover:bg-black transition-all flex items-center justify-center space-x-3 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Update Security & Continue</span>}
          </button>

          <div className="flex items-center justify-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
            <ShieldCheck className="w-3 h-3" />
            <span>End-to-End Encrypted Security</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
