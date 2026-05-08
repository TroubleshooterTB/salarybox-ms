import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Search, Folder, Cloud, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';

export default function Documents({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchPayslips() {
      if (!session) return;
      
      const { data } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('is_locked', true)
        .order('month_year', { ascending: false });
        
      if (data) {
        // Find user's specific data in each run
        const userPayslips = data.map(run => {
          const personalData = run.data.find((p: any) => p.id === session.user.id);
          if (personalData) {
            return {
              id: run.month_year,
              name: `Payslip_${run.month_year}.pdf`,
              date: run.month_year,
              size: 'Locked',
              type: 'Payroll',
              details: personalData.payroll
            };
          }
          return null;
        }).filter(Boolean);
        setPayslips(userPayslips);
      }
      setLoading(false);
    }
    fetchPayslips();
  }, [session]);

  const docs = [
    { id: '1', name: 'Employee Handbook.pdf', size: '2.4 MB', date: 'Jan 15, 2026', type: 'Policy' },
    { id: '2', name: 'Code of Conduct.pdf', size: '1.1 MB', date: 'Jan 15, 2026', type: 'Policy' },
    { id: '3', name: 'Leave Policy 2026.pdf', size: '800 KB', date: 'Feb 01, 2026', type: 'HR' },
    { id: '4', name: 'Standard Operating Procedures.pdf', size: '4.5 MB', date: 'Mar 10, 2026', type: 'Operations' },
  ];

  const filtered = docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPayslips = payslips.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const downloadPayslip = (p: any) => {
    // Generate a simple report for download or open a viewer
    alert(`Downloading Payslip for ${p.date}. Net Pay: ₹${Math.round(p.details.netPay)}`);
    // In a real app, this would trigger a PDF generation or fetch a signed URL
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      <div className="flex items-center mb-6 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">Documents & Vault</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center space-x-3 focus-within:border-brand-500 transition">
        <Search className="w-5 h-5 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search documents or payslips..." 
          className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-600"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/20 p-5 rounded-3xl flex flex-col items-center text-center">
          <Folder className="w-8 h-8 text-blue-400 mb-2" />
          <p className="text-xs font-black uppercase tracking-widest text-blue-300">Company</p>
          <p className="text-[10px] text-blue-500/60 font-bold mt-1">{docs.length} Files</p>
        </div>
        <div className="bg-gradient-to-br from-brand-600/20 to-brand-900/20 border border-brand-500/20 p-5 rounded-3xl flex flex-col items-center text-center">
          <Calendar className="w-8 h-8 text-brand-400 mb-2" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-300">Payslips</p>
          <p className="text-[10px] text-brand-500/60 font-bold mt-1">{payslips.length} Issued</p>
        </div>
      </div>

      {filteredPayslips.length > 0 && (
        <div className="mb-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-2">Personal Payslips</h4>
          <div className="space-y-3">
            {filteredPayslips.map((p, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={p.id} 
                className="bg-slate-900 border border-brand-500/20 p-4 rounded-2xl flex items-center justify-between group hover:bg-brand-500/5 transition shadow-lg"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">Salary Statement - {p.date}</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Net: ₹{Math.round(p.details.netPay).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => downloadPayslip(p)} className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-brand-500 hover:border-brand-500 transition">
                  <Download className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-2">Shared Documents</h4>
      <div className="space-y-3">
        {filtered.map((doc, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={doc.id} 
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:bg-slate-800 transition shadow-lg"
          >
            <div className="flex items-center space-x-4 min-w-0">
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-brand-400 transition">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{doc.name}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{doc.type} • {doc.size}</p>
              </div>
            </div>
            <button className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-brand-500 hover:border-brand-500 transition">
              <Download className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
