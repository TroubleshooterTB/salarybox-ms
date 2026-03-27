import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export default function AdminCorrections({ selectedBranch }: { selectedBranch: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('attendance_corrections')
      .select('*, profiles(full_name, employee_id, branch)')
      .order('created_at', { ascending: false });

    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.filter('profiles.branch', 'eq', selectedBranch);
    }

    const { data } = await query;
    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedBranch]);

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('attendance_corrections')
      .update({ status, approved_by: user?.id })
      .eq('id', id);

    if (error) alert(error.message);
    else fetchRequests();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800">{t('corrections')}</h2>
        <p className="text-slate-500 font-medium text-sm">Review and approve employee attendance regularization requests.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Employee</th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Date & Reason</th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Requested Punches</th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold">No pending requests found.</td></tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition tracking-tight">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{req.profiles?.full_name}</p>
                    <p className="text-xs font-semibold text-slate-400">{req.profiles?.employee_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">{new Date(req.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-xs text-slate-400 flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {req.reason || 'No reason provided'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest text-slate-600">
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">{req.requested_punch_in || '—'}</span>
                      <span>→</span>
                      <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-md">{req.requested_punch_out || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                      req.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                      req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'Pending' && (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleAction(req.id, 'Approved')}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition shadow-sm"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'Rejected')}
                          className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition shadow-sm"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
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
