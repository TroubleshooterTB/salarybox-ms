import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, PlusCircle, Loader2, Calendar, AlertCircle } from 'lucide-react';

const LEAVE_TYPES = [
  { id: 'Sick Leave', label: 'Sick Leave', key: 'sick' },
  { id: 'Privileged Leave', label: 'Privileged Leave', key: 'privileged' },
  { id: 'Casual Leave', label: 'Casual Leave', key: 'casual' },
  { id: 'Unpaid', label: 'Loss of Pay (LWP)', key: 'unpaid' }
];

export default function LeaveManagement({ onBack, prefillDate }: { onBack: () => void, prefillDate?: string }) {
  const { session } = useStore();
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'balances' | 'request'>(prefillDate ? 'request' : 'balances');
  const [formData, setFormData] = useState({
    leave_type: 'Privileged Leave',
    start_date: prefillDate || new Date().toISOString().split('T')[0],
    end_date: prefillDate || new Date().toISOString().split('T')[0],
    reason: '',
    is_half_day: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, [session]);

  const fetchBalances = async () => {
    if (!session) return;
    const currentYear = new Date().getFullYear();
    const { data } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('year', currentYear)
      .maybeSingle();
    
    if (data) {
      setBalances(data);
    } else {
      // Initialize if not found
      setBalances({
        sick_leave_total: 12, sick_leave_used: 0,
        privileged_leave_total: 15, privileged_leave_used: 0,
        casual_leave_total: 10, casual_leave_used: 0
      });
    }
    setLoading(false);
  };

  const calculateDays = () => {
    if (formData.is_half_day) return 0.5;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    const requestedDays = calculateDays();
    if (requestedDays <= 0) {
      alert('Invalid date range.');
      return;
    }

    // Check balance
    const typeKey = LEAVE_TYPES.find(t => t.id === formData.leave_type)?.key;
    if (typeKey && typeKey !== 'unpaid' && balances) {
      const available = balances[`${typeKey}_leave_total`] - balances[`${typeKey}_leave_used`];
      if (requestedDays > available) {
        alert(`Insufficient ${formData.leave_type} balance. Available: ${available} days.`);
        return;
      }
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
        status: 'Pending'
      };

      const { error } = await supabase.from('leave_requests').insert(payload);
      if (error) throw error;

      alert('Leave Request Submitted Successfully!');
      setView('balances');
      setFormData({
        leave_type: 'Privileged Leave',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
        is_half_day: false,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col max-w-md mx-auto relative overflow-x-hidden">
      <div className="flex items-center mb-8 pt-4">
        <button onClick={() => view === 'request' ? setView('balances') : onBack()} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">{view === 'balances' ? 'Leave Balance' : 'Request Time Off'}</h2>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
      ) : view === 'balances' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <BalanceCard 
            label="Privileged Leave (PL)" 
            total={balances.privileged_leave_total} 
            used={balances.privileged_leave_used} 
            color="bg-emerald-500" 
            glow="bg-emerald-500/20"
          />
          <BalanceCard 
            label="Sick Leave (SL)" 
            total={balances.sick_leave_total} 
            used={balances.sick_leave_used} 
            color="bg-rose-500" 
            glow="bg-rose-500/20"
          />
          <BalanceCard 
            label="Casual Leave (CL)" 
            total={balances.casual_leave_total} 
            used={balances.casual_leave_used} 
            color="bg-brand-500" 
            glow="bg-brand-500/20"
          />

          <button onClick={() => setView('request')} className="w-full mt-4 py-5 bg-white text-slate-950 font-black rounded-2xl flex items-center justify-center space-x-2 shadow-xl hover:shadow-white/20 active:scale-95 transition-all uppercase tracking-widest text-xs">
            <PlusCircle className="w-5 h-5" />
            <span>Apply for Leave</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deduct From</label>
            <select value={formData.leave_type} onChange={e=>setFormData({...formData, leave_type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white appearance-none focus:border-brand-500 outline-none transition uppercase tracking-widest">
              {LEAVE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <label className="flex items-center space-x-3 bg-slate-950 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-brand-500/50 transition">
            <input type="checkbox" checked={formData.is_half_day} onChange={e=>setFormData({...formData, is_half_day: e.target.checked})} className="w-5 h-5 rounded border-slate-700 text-brand-500 bg-slate-900 focus:ring-brand-500 focus:ring-offset-slate-950" />
            <div>
              <p className="text-sm font-bold text-white leading-none">Half-Day Leave</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mt-1">Deducts 0.5 from balance</p>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formData.is_half_day ? 'Date' : 'From'}</label>
              <input required value={formData.start_date} onChange={e=>setFormData({...formData, start_date: e.target.value})} type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-brand-500 transition [color-scheme:dark]" />
            </div>
            {!formData.is_half_day && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">To</label>
                <input required value={formData.end_date} onChange={e=>setFormData({...formData, end_date: e.target.value})} type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-brand-500 transition [color-scheme:dark]" />
              </div>
            )}
          </div>

          <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-brand-400">
               <Calendar className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Total Duration</span>
            </div>
            <span className="text-xl font-black text-white">{calculateDays()} Days</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason / Remarks</label>
            <textarea required value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})} rows={3} placeholder="Provide a brief reason for your leave..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-brand-500 transition resize-none placeholder-slate-600" />
          </div>

          <button type="submit" disabled={submitting} className="w-full flex justify-center items-center py-4 bg-brand-500 text-white font-black tracking-widest uppercase text-sm rounded-xl hover:bg-brand-400 active:scale-95 transition shadow-lg shadow-brand-500/20 disabled:opacity-50">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Request'}
          </button>
        </form>
      )}
    </div>
  );
}

function BalanceCard({ label, total, used, color, glow }: { label: string, total: number, used: number, color: string, glow: string }) {
  const remaining = Math.max(0, total - used);
  const percentage = (used / total) * 100;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 ${glow} rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition duration-700`} />
      
      <div className="flex justify-between items-end mb-4 relative z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
          <h3 className="text-3xl font-black text-white">{remaining} <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Available</span></h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{used} / {total}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Days Consumed</p>
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
