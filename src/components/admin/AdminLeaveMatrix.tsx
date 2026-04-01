import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminLeaveMatrix({ selectedBranch }: { selectedBranch: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch profiles first
      let profileQuery = supabase.from('profiles').select('id, full_name, employee_id, branch, department');
      if (selectedBranch && selectedBranch !== 'All Branches') {
        profileQuery = profileQuery.eq('branch', selectedBranch);
      }
      const { data: profiles } = await profileQuery;

      // Fetch quotas for the current year
      const { data: quotas } = await supabase
        .from('leave_quotas')
        .select('*')
        .eq('year', currentYear);

      if (profiles) {
        const matrix = profiles.map(p => {
          const q = quotas?.find(q => q.user_id === p.id) || {
            pl_total: 15, pl_used: 0,
            sl_total: 12, sl_used: 0,
            cl_total: 10, cl_used: 0
          };
          return {
            ...p,
            pl: `${q.pl_total - q.pl_used} / ${q.pl_total}`,
            sl: `${q.sl_total - q.sl_used} / ${q.sl_total}`,
            cl: `${q.cl_total - q.cl_used} / ${q.cl_total}`,
            pl_raw: q.pl_total - q.pl_used,
            sl_raw: q.sl_total - q.sl_used,
            cl_raw: q.cl_total - q.cl_used
          };
        });
        setData(matrix);
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedBranch, currentYear]);

  const filteredData = data.filter(item => 
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
      'Emp ID': item.employee_id,
      'Name': item.full_name,
      'Branch': item.branch,
      'Department': item.department,
      'PL Available': item.pl,
      'SL Available': item.sl,
      'CL Available': item.cl
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leave_Balances");
    XLSX.writeFile(wb, `Leave_Balances_${currentYear}.xlsx`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leave Balance Matrix</h2>
          <p className="text-slate-500 text-sm font-medium">Tracking SL/PL/CL quotas for {currentYear}</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase flex items-center space-x-2 hover:bg-slate-800 transition shadow-lg"
        >
          <Download className="w-4 h-4" />
          <span>Export Matrix</span>
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-brand-500 transition shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Employee ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Branch</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-emerald-50/30">Privilege (PL)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-rose-50/30">Sick (SL)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-brand-50/30">Casual (CL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Balances...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center font-medium text-slate-400">No records found.</td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{item.full_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{item.employee_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase border border-slate-200">{item.branch}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block min-w-[80px] px-3 py-1 rounded-full text-xs font-black ${item.pl_raw <= 2 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {item.pl}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block min-w-[80px] px-3 py-1 rounded-full text-xs font-black ${item.sl_raw <= 2 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {item.sl}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block min-w-[80px] px-3 py-1 rounded-full text-xs font-black ${item.cl_raw <= 2 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {item.cl}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
