import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, IndianRupee, Loader2, Plus, Camera, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Reimbursements({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Travel',
    description: ''
  });

  useEffect(() => {
    fetchClaims();
  }, [session]);

  const fetchClaims = async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('reimbursements')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (data) setClaims(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('reimbursements').insert({
        user_id: session.user.id,
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        status: 'Pending'
      });

      if (error) throw error;
      setShowAdd(false);
      setFormData({ title: '', amount: '', category: 'Travel', description: '' });
      fetchClaims();
    } catch (err: any) {
      alert('Error submitting claim: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Rejected': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Rejected': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto flex flex-col">
      <div className="flex items-center justify-between mb-6 pt-4 shrink-0">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold ml-2 tracking-tight">Expense Claims</h2>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
        ) : claims.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
              <FileText className="w-10 h-10" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No claims submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-10">
            {claims.map((claim, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={claim.id}
                className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{claim.category}</p>
                    <h3 className="font-bold text-white truncate text-lg">{claim.title}</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center space-x-1.5 ${getStatusStyle(claim.status)}`}>
                    {getStatusIcon(claim.status)}
                    <span>{claim.status}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-1 text-brand-400 font-black text-xl">
                      <IndianRupee className="w-4 h-4 opacity-50" />
                      <span>{claim.amount.toLocaleString()}</span>
                   </div>
                   <p className="text-[10px] font-bold text-slate-600">{new Date(claim.created_at).toLocaleDateString()}</p>
                </div>
                
                {claim.description && (
                  <p className="text-xs text-slate-400 mt-3 border-t border-slate-800 pt-3">{claim.description}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-slate-900 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 border-t border-white/5 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-500" />
              
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white tracking-tight">New Claim</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 text-slate-500 hover:text-white transition"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Expense Title</label>
                  <input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} placeholder="Fuel for field visit..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-brand-500 transition outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Amount (₹)</label>
                    <input required type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-brand-500 transition outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Category</label>
                    <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-brand-500 transition outline-none appearance-none">
                      <option>Travel</option>
                      <option>Food</option>
                      <option>Lodging</option>
                      <option>Tools</option>
                      <option>Others</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Notes (Optional)</label>
                  <textarea value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} rows={3} placeholder="Provide details..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-brand-500 transition outline-none resize-none" />
                </div>

                <div className="flex items-center space-x-4 pt-2">
                   <div className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 border-dashed group cursor-pointer hover:border-brand-500/50 transition">
                      <Camera className="w-6 h-6 mb-1 group-hover:text-brand-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Attach Bill</span>
                   </div>
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit" 
                  className="w-full bg-brand-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Claim</span>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
