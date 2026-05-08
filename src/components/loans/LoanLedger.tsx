import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, IndianRupee, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoanLedger({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [loans, setLoans] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!session) return;
      
      const [lRes, sRes] = await Promise.all([
        supabase.from('loans').select('*').eq('user_id', session.user.id).order('transaction_date', { ascending: false }),
        supabase.from('loan_schedules').select('*').eq('user_id', session.user.id).gte('target_month', new Date().toISOString().slice(0, 7)).order('target_month', { ascending: true })
      ]);
      
      if (lRes.data) setLoans(lRes.data);
      if (sRes.data) setSchedules(sRes.data);
      setLoading(false);
    }
    fetchData();
  }, [session]);

  const totalBalance = loans.length > 0 ? loans[0].remaining_balance : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      <div className="flex items-center mb-6 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">Loan Ledger</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-900 via-indigo-700 to-indigo-900 rounded-[2rem] p-8 mb-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden border border-indigo-400/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Remaining Bal.</p>
        <h3 className="text-5xl font-black flex items-center tracking-tight text-white mb-1">
          <IndianRupee className="w-8 h-8 opacity-70 mr-1" />
          {totalBalance?.toLocaleString('en-IN') || '0'}
        </h3>
        <p className="text-indigo-200/60 text-xs font-semibold">Will be auto-deducted from next payroll</p>
      </div>

      {schedules.length > 0 && (
        <div className="mb-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-2">Upcoming EMIs</h4>
          <div className="space-y-3">
            {schedules.map((s, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={s.id} 
                className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl flex justify-between items-center"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-wider">{s.target_month}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Scheduled Deduction</p>
                  </div>
                </div>
                <p className="font-black text-lg text-indigo-400">₹{s.deduction_amount?.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Transaction History</h4>
      
      {loading ? (
        <div className="flex justify-center mt-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : loans.length === 0 ? (
        <div className="text-center text-slate-600 mt-16 text-sm font-medium">No active ledger entries.</div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={loan.id} 
              className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center hover:bg-slate-800 transition"
            >
              <div>
                <p className="font-bold text-slate-200 text-sm tracking-wide">{loan.type === 'Credit' ? 'Salary Deduction' : 'Loan Disbursed'}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{new Date(loan.transaction_date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-lg tracking-tight ${loan.type === 'Credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {loan.type === 'Credit' ? '+' : '-'} ₹{loan.loan_amount}
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Bal: ₹{loan.remaining_balance}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
