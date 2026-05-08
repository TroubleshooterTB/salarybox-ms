import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle2, XCircle, Clock, 
  Loader2, IndianRupee, User,
  Filter, Search, ExternalLink,
  ChevronRight, Calendar
} from 'lucide-react';

export default function AdminReimbursements({ selectedBranch }: { selectedBranch: string }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClaims();
  }, [selectedBranch, statusFilter]);

  const fetchClaims = async () => {
    setLoading(true);
    let query = supabase
      .from('reimbursements')
      .select('*, profiles(full_name, employee_id, branch, department)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'All') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    
    if (data) {
      const filtered = selectedBranch === 'All Branches' 
        ? data 
        : data.filter(c => c.profiles?.branch === selectedBranch);
      setClaims(filtered);
    }
    setLoading(false);
  };

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    const { error } = await supabase
      .from('reimbursements')
      .update({ status, approved_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) {
       // Also notify user
       const claim = claims.find(c => c.id === id);
       if (claim) {
         await supabase.from('notifications').insert({
           user_id: claim.user_id,
           title: `Claim ${status}`,
           message: `Your reimbursement request for ₹${claim.amount} has been ${status.toLowerCase()}.`,
           is_read: false
         });
       }
       fetchClaims();
    }
  };

  const filteredClaims = claims.filter(c => 
    c.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-screen overflow-hidden">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Expense Approvals</h2>
          <p className="text-slate-500 font-medium">Review and process staff reimbursement claims for {selectedBranch}.</p>
        </div>
        <div className="flex items-center space-x-4">
           <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 flex items-center space-x-3 shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff or expense..." 
                className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <select 
             value={statusFilter}
             onChange={e => setStatusFilter(e.target.value)}
             className="bg-white border border-slate-200 rounded-2xl px-5 py-2.5 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm transition"
           >
             <option value="Pending">Pending</option>
             <option value="Approved">Approved</option>
             <option value="Rejected">Rejected</option>
             <option value="All">All Status</option>
           </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>
        ) : filteredClaims.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-20 text-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4"><IndianRupee className="w-10 h-10 opacity-20" /></div>
             <p className="font-black uppercase tracking-widest text-xs">No reimbursement claims found matching criteria.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Category & Title</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-5">
                       <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><User className="w-5 h-5" /></div>
                          <div>
                             <span className="font-bold text-slate-800">{claim.profiles?.full_name}</span>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{claim.profiles?.employee_id}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-0.5">{claim.category}</p>
                       <p className="text-sm font-bold text-slate-700">{claim.title}</p>
                       <div className="flex items-center space-x-2 mt-1 opacity-60">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{new Date(claim.created_at).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="inline-flex items-center space-x-1 font-mono text-lg font-black text-slate-900">
                          <span className="text-slate-300">₹</span>
                          <span>{claim.amount?.toLocaleString()}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                          claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          claim.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                       }`}>
                          {claim.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> :
                           claim.status === 'Rejected' ? <XCircle className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          <span>{claim.status}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       {claim.status === 'Pending' ? (
                         <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => handleAction(claim.id, 'Approved')}
                              className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition"
                            >
                               <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleAction(claim.id, 'Rejected')}
                              className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition"
                            >
                               <XCircle className="w-5 h-5" />
                            </button>
                         </div>
                       ) : (
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Processed</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
