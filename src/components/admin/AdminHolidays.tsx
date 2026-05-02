import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Trash2, Loader2, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function AdminHolidays() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'National' | 'Regional' | 'Optional'>('National');
  const [branch, setBranch] = useState('All Branches');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [hRes, rRes, bRes] = await Promise.all([
      supabase.from('holidays').select('*').order('date', { ascending: true }),
      supabase.from('holiday_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('branches').select('name')
    ]);

    if (hRes.data) setHolidays(hRes.data);
    if (rRes.data) setRequests(rRes.data);
    if (bRes.data) setBranches(bRes.data);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is Super Admin to bypass approval
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    
    if (profile?.role === 'Super Admin') {
      const { error } = await supabase.from('holidays').insert({
        name,
        date,
        type,
        branch: branch === 'All Branches' ? null : branch
      });
      if (error) alert(error.message);
      else {
        alert('Holiday added successfully.');
        setName(''); setDate('');
        fetchData();
      }
    } else {
      const { error } = await supabase.from('holiday_requests').insert({
        name,
        date,
        type,
        branch: branch === 'All Branches' ? null : branch,
        admin_id: user?.id,
        status: 'Pending'
      });
      if (error) alert(error.message);
      else {
        alert('Holiday request sent for Super Admin approval.');
        setName(''); setDate('');
        fetchData();
      }
    }
    setIsSubmitting(false);
  };

  const deleteHoliday = async (id: string) => {
    if (!window.confirm('Delete this holiday?')) return;
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Holiday Manager</h2>
          <p className="text-slate-500 font-medium">Manage yearly holidays and branch-specific closures.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Holiday Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 space-y-5 sticky top-8">
            <h3 className="font-bold text-slate-800 flex items-center">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center mr-3">
                <Plus className="w-4 h-4" />
              </div>
              Propose New Holiday
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Holiday Name</label>
                <input 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ganesh Chaturthi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                <input 
                  required 
                  type="date"
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition"
                  >
                    <option value="National">National</option>
                    <option value="Regional">Regional</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Branch</label>
                  <select 
                    value={branch} 
                    onChange={e => setBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 transition"
                  >
                    <option value="All Branches">All Branches</option>
                    {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit for Approval</span>}
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-tighter">Holidays require Super Admin authorization</p>
          </form>
        </div>

        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Holidays */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-700 text-sm tracking-wide flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-brand-500" />
                Active Holiday Calendar 2026
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {holidays.length === 0 ? (
                <div className="p-12 text-center text-slate-300 font-black uppercase tracking-widest">No holidays scheduled</div>
              ) : holidays.map(h => (
                <div key={h.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition group">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex flex-col items-center justify-center border border-brand-100">
                      <span className="text-[10px] font-black uppercase leading-none">{new Date(h.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-lg font-black leading-none">{new Date(h.date).getDate()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{h.name}</p>
                      <div className="flex items-center space-x-3 mt-0.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          h.type === 'National' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          h.type === 'Regional' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {h.type}
                        </span>
                        <span className="flex items-center text-[9px] font-black text-slate-400 uppercase">
                          <MapPin className="w-3 h-3 mr-1" />
                          {h.branch || 'All Branches'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteHoliday(h.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Requests */}
          {requests.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
                <h4 className="font-bold text-amber-900 text-sm tracking-wide flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending Approvals
                </h4>
              </div>
              <div className="divide-y divide-slate-50">
                {requests.map(r => (
                  <div key={r.id} className={`p-5 flex justify-between items-center ${r.status === 'Pending' ? 'bg-amber-50/20' : 'opacity-50'}`}>
                    <div>
                      <p className="font-bold text-slate-800">{r.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.date} • {r.branch || 'All Branches'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                         r.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                         r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                         'bg-rose-100 text-rose-700'
                       }`}>
                         {r.status}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
