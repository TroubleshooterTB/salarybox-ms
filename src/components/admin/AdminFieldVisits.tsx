import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  MapPin, Calendar, User, 
  Navigation, Camera, Clock,
  ChevronRight, ArrowLeft,
  ExternalLink, Search, Filter
} from 'lucide-react';

export default function AdminFieldVisits() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('field_visits')
      .select('*, profiles(full_name, employee_id, branch)')
      .order('start_time', { ascending: false });

    if (!error && data) {
      setVisits(data);
    }
    setLoading(false);
  };

  const getVisitLogs = async (visitId: string) => {
    const { data } = await supabase
      .from('field_visit_logs')
      .select('*')
      .eq('visit_id', visitId)
      .order('timestamp', { ascending: true });
    return data || [];
  };

  const handleVisitClick = async (visit: any) => {
    const logs = await getVisitLogs(visit.id);
    setSelectedVisit({ ...visit, logs });
  };

  const filteredVisits = visits.filter(v => {
    const matchesSearch = v.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.profiles?.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (selectedVisit) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <button 
          onClick={() => setSelectedVisit(null)}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition mb-6 font-bold text-sm uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">{selectedVisit.profiles?.full_name}</h3>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedVisit.profiles?.employee_id}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                  <span className="text-sm font-bold text-slate-700">{new Date(selectedVisit.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total KM</span>
                  <span className="text-sm font-black text-brand-600">{selectedVisit.total_km.toFixed(1)} KM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedVisit.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>
                    {selectedVisit.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Timeline Details</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5" />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Started At</p>
                    <p className="text-sm font-bold">{new Date(selectedVisit.start_time).toLocaleTimeString()}</p>
                  </div>
                </div>
                {selectedVisit.end_time && (
                  <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5" />
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Ended At</p>
                      <p className="text-sm font-bold">{new Date(selectedVisit.end_time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-brand-500" />
              <span>Visit Checkpoints</span>
            </h3>
            
            <div className="space-y-4">
              {selectedVisit.logs?.map((log: any, idx: number) => (
                <div key={log.id} className="bg-white p-5 rounded-3xl shadow-lg border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{log.action}</p>
                      <p className="text-[10px] font-bold text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {log.selfie_url && (
                      <a 
                        href={log.selfie_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-12 h-12 rounded-xl overflow-hidden border-2 border-brand-500 shadow-lg hover:scale-110 transition cursor-pointer"
                      >
                        <img src={log.selfie_url} className="w-full h-full object-cover" />
                      </a>
                    )}
                    <a 
                      href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-brand-50 hover:text-brand-500 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
              
              {(!selectedVisit.logs || selectedVisit.logs.length === 0) && (
                <div className="p-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 font-bold">No checkpoint logs recorded for this visit.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-screen overflow-hidden">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Field Visit Manager</h2>
          <p className="text-slate-500 font-medium">Monitor real-time field activities and KM tracking.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 w-64 shadow-sm"
            />
          </div>
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            {['All', 'Running', 'Completed'].map(s => (
              <button 
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${filterStatus === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date / Time</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Distance</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredVisits.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition group cursor-pointer" onClick={() => handleVisitClick(v)}>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-black text-xs">
                        {v.profiles?.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{v.profiles?.full_name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.profiles?.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${v.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600 animate-pulse'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-700">{new Date(v.date).toLocaleDateString()}</p>
                    <p className="text-[10px] font-bold text-slate-400">{new Date(v.start_time).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-lg font-black text-slate-800">{v.total_km.toFixed(1)}</span>
                    <span className="text-[10px] font-black text-slate-400 ml-1">KM</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition translate-x-0 group-hover:translate-x-1" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredVisits.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center">
              <MapPin className="w-16 h-16 text-slate-100 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs text-slate-300">No field visits found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
