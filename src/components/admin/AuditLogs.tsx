import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, User, Calendar, ShieldAlert } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, admin:admin_id(full_name), employee:employee_id(full_name)')
      .order('timestamp', { ascending: false });

    if (error) console.error(error);
    else setLogs(data || []);
    setLoading(false);
  }

  const filteredLogs = logs.filter(log => 
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">System Audit Logs</h2>
          <p className="text-slate-500 font-medium text-sm">Track all administrative overrides and security actions.</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Compliance Mode Active</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400 ml-4" />
          <input 
            type="text" 
            placeholder="Search by admin, employee, action or reason..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 w-full placeholder-slate-400" 
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Timestamp</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Action</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Admin</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Target Employee</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    No audit records found matching your search
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.log_id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${
                        log.action_type.includes('OVERRIDE') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                        {log.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                            {log.admin?.full_name?.[0] || 'A'}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{log.admin?.full_name || 'System Admin'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                         <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">{log.employee?.full_name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-500 max-w-xs truncate" title={log.reason}>
                        {log.reason}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
