import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, IndianRupee, Loader2 } from 'lucide-react';

export default function LoanLedger({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLoans() {
      if (!session) return;
      const { data } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('transaction_date', { ascending: false });
      
      if (data) setLoans(data);
      setLoading(false);
    }
    fetchLoans();
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

      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Recent Transactions</h4>
      
      {loading ? (
        <div className="flex justify-center mt-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : loans.length === 0 ? (
        <div className="text-center text-slate-600 mt-16 text-sm font-medium">No active ledger entries.</div>
      ) : (
        <div className="space-y-3">
          {loans.map(loan => (
            <div key={loan.id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center hover:bg-slate-800 transition">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
