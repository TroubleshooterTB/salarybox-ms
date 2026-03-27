import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, PlusCircle, Loader2 } from 'lucide-react';

export default function LeaveManagement({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [quotas, setQuotas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'balances' | 'request'>('balances');
  const [formData, setFormData] = useState({
    leave_type: 'PL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
    is_half_day: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchQuotas() {
      if (!session) return;
      const currentYear = new Date().getFullYear();
      const { data } = await supabase
        .from('leave_quotas')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('year', currentYear)
        .maybeSingle();
      
      if (data) {
        setQuotas(data);
      } else {
        // Fallback or initialization handled by DB trigger/seed, but we can show defaults
        setQuotas({
          pl_total: 15, pl_used: 0,
          sl_total: 12, sl_used: 0,
          cl_total: 10, cl_used: 0
        });
      }
      setLoading(false);
    }
    fetchQuotas();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    // Validate dates
    if (!formData.is_half_day && formData.end_date < formData.start_date) {
      alert('End date cannot be before start date.');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        user_id: session.user.id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.is_half_day ? formData.start_date : formData.end_date,
        reason: formData.reason,
        is_half_day: formData.is_half_day,
        status: 'Pending',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('leave_requests').insert(payload);
      if (error) throw error;

      alert('Leave Request Submitted Successfully! Awaiting Admin Approval.');
      setView('balances');
      // Full form reset
      setFormData({
        leave_type: 'PL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
        is_half_day: false,
      });
    } catch (err: any) {
      // Surface the real error message from Supabase (e.g. RLS violation)
      const msg = err?.message || err?.details || JSON.stringify(err);
      alert('Failed to submit leave request:\n\n' + msg + '\n\nPlease contact your administrator if this persists.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col max-w-md mx-auto relative">
      <div className="flex items-center mb-8 pt-4">
        <button onClick={() => view === 'request' ? setView('balances') : onBack()} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">{view === 'balances' ? 'Leave Balance' : 'Request Time Off'}</h2>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
      ) : view === 'balances' ? (
        <div className="space-y-6">
          <QuotaCard 
            label="Privileged Leave (PL)" 
            total={quotas.pl_total} 
            used={quotas.pl_used} 
            color="bg-emerald-500" 
            glow="bg-emerald-500/20"
          />
          <QuotaCard 
            label="Sick Leave (SL)" 
            total={quotas.sl_total} 
            used={quotas.sl_used} 
            color="bg-rose-500" 
            glow="bg-rose-500/20"
          />
          <QuotaCard 
            label="Casual Leave (CL)" 
            total={quotas.cl_total} 
            used={quotas.cl_used} 
            color="bg-brand-500" 
            glow="bg-brand-500/20"
          />

          <button onClick={() => setView('request')} className="w-full mt-4 py-5 bg-white text-slate-950 font-black rounded-2xl flex items-center justify-center space-x-2 shadow-xl hover:shadow-white/20 active:scale-95 transition-all uppercase tracking-widest text-xs">
            <PlusCircle className="w-5 h-5" />
            <span>Request Time Off</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leave Category</label>
            <select value={formData.leave_type} onChange={e=>setFormData({...formData, leave_type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white appearance-none focus:border-emerald-500 outline-none transition uppercase tracking-widest">
              <option value="PL">Privilege Leave (PL)</option>
              <option value="SL">Sick Leave (SL)</option>
              <option value="CL">Casual Leave (CL)</option>
              <option value="Unpaid">Loss of Pay (LWP)</option>
            </select>
          </div>

          <label className="flex items-center space-x-3 bg-slate-950 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-emerald-500/50 transition">
            <input type="checkbox" checked={formData.is_half_day} onChange={e=>setFormData({...formData, is_half_day: e.target.checked})} className="w-5 h-5 rounded border-slate-700 text-emerald-500 bg-slate-900 focus:ring-emerald-500 focus:ring-offset-slate-950" />
            <div>
              <p className="text-sm font-bold text-white leading-none">Half-Day Leave</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mt-1">Deducts 0.5 from balance</p>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formData.is_half_day ? 'Date' : 'Start Date'}</label>
              <input required value={formData.start_date} onChange={e=>setFormData({...formData, start_date: e.target.value})} type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500 transition [color-scheme:dark]" />
            </div>
            {!formData.is_half_day && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</label>
                <input required value={formData.end_date} onChange={e=>setFormData({...formData, end_date: e.target.value})} type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500 transition [color-scheme:dark]" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason / Remarks</label>
            <textarea required value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})} rows={3} placeholder="Please provide a brief reason..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-emerald-500 transition resize-none placeholder-slate-600" />
          </div>

          <button type="submit" disabled={submitting} className="w-full flex justify-center items-center py-4 bg-emerald-500 text-slate-950 font-black tracking-widest uppercase text-sm rounded-xl hover:bg-emerald-400 active:scale-95 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
          </button>
        </form>
      )}
    </div>
  );
}

function QuotaCard({ label, total, used, color, glow }: { label: string, total: number, used: number, color: string, glow: string }) {
  const remaining = Math.max(0, total - used);
  const percentage = (used / total) * 100;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 ${glow} rounded-full blur-3xl pointer-events-none`} />
      
      <div className="flex justify-between items-end mb-4 relative z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
          <h3 className="text-3xl font-black text-white">{remaining} <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Available</span></h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{used} / {total}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Days Used</p>
        </div>
      </div>

      <div className="h-3 bg-slate-950/50 rounded-full overflow-hidden border border-white/5 relative z-10">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
