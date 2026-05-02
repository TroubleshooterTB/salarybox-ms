import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Loader2, MapPin, Globe, Clock, ShieldCheck, ToggleLeft, ToggleRight, Trash2, AlertCircle } from 'lucide-react';
import useStore from '../../store';

export default function AdminBranches() {
  const { userRole } = useStore();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialForm = {
    name: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    geofence_enabled: true,
    is_active: true,
    shift_start: '09:00',
    shift_end: '18:00'
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchBranches = async () => {
    setLoading(true);
    const { data } = await supabase.from('branches').select('*').order('name');
    if (data) setBranches(data);
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEdit = (branch: any) => {
    setEditingId(branch.id);
    setFormData({
      name: branch.name,
      latitude: branch.latitude,
      longitude: branch.longitude,
      radius_meters: branch.radius_meters,
      geofence_enabled: branch.geofence_enabled,
      is_active: branch.is_active,
      shift_start: branch.shift_start?.slice(0, 5) || '09:00',
      shift_end: branch.shift_end?.slice(0, 5) || '18:00'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('branches').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('branches').insert(formData);
        if (error) throw error;
      }
      setShowModal(false);
      fetchBranches();
    } catch (err: any) {
      alert('Error saving branch: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const { error } = await supabase.from('branches').update({ is_active: !current }).eq('id', id);
    if (!error) fetchBranches();
  };

  const handleDelete = async (id: string) => {
     if (!confirm('Are you sure you want to delete this branch?')) return;
     const { error } = await supabase.from('branches').delete().eq('id', id);
     if (error) alert(error.message);
     else fetchBranches();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Branch Management</h2>
          <p className="text-slate-500 font-medium text-sm">Configure branch-specific rules, geofencing, and timings.</p>
        </div>
        {userRole === 'Super Admin' && (
          <button onClick={openAdd} className="flex items-center space-x-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition">
            <Plus className="w-5 h-5" /> <span>Add Branch</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500" /></div>
        ) : branches.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold">No branches configured yet.</div>
        ) : branches.map((b) => (
          <div key={b.id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-xl p-6 transition group relative ${!b.is_active ? 'opacity-60 grayscale' : 'hover:scale-[1.02]'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="bg-brand-50 p-3 rounded-2xl text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition duration-300">
                <Globe className="w-6 h-6" />
              </div>
              {userRole === 'Super Admin' && (
                <div className="flex space-x-2">
                  <button onClick={() => openEdit(b)} className="p-2 text-slate-400 hover:text-brand-500 transition"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-2 text-slate-400 hover:text-rose-500 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-1">{b.name}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
               <MapPin className="w-3 h-3 mr-1" /> {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Shift Hours</p>
                <p className="text-sm font-black text-slate-700 flex items-center"><Clock className="w-3 h-3 mr-1" /> {b.shift_start} - {b.shift_end}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Geofence</p>
                <p className={`text-sm font-black flex items-center ${b.geofence_enabled ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {b.geofence_enabled ? <ShieldCheck className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                  {b.geofence_enabled ? b.radius_meters + 'm' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
               <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${b.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                 {b.is_active ? 'Production Ready' : 'Maintenance'}
               </span>
               {userRole === 'Super Admin' && (
                 <button onClick={() => toggleStatus(b.id, b.is_active)} className="transition">
                   {b.is_active ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                 </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Configuration' : 'Onboard New Branch'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold px-3 py-1 rounded-lg">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Identity</label>
                <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700" placeholder="Branch Name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Latitude</label>
                  <input required step="any" value={formData.latitude} onChange={e=>setFormData({...formData, latitude: parseFloat(e.target.value) || 0})} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Longitude</label>
                  <input required step="any" value={formData.longitude} onChange={e=>setFormData({...formData, longitude: parseFloat(e.target.value) || 0})} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700" />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                  <ShieldCheck className="w-3 h-3 text-brand-500" />
                  <span>Shift & Geofence Protocol</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Start Time</label>
                      <input type="time" value={formData.shift_start} onChange={e=>setFormData({...formData, shift_start: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">End Time</label>
                      <input type="time" value={formData.shift_end} onChange={e=>setFormData({...formData, shift_end: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
                   </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input type="checkbox" checked={formData.geofence_enabled} onChange={e=>setFormData({...formData, geofence_enabled: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-brand-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-800 transition">Enable Geo-Barrier</span>
                  </label>
                  {formData.geofence_enabled && (
                    <input type="number" value={formData.radius_meters} onChange={e=>setFormData({...formData, radius_meters: parseInt(e.target.value)||100})} className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold" placeholder="Radius (m)" />
                  )}
                </div>
              </div>


              <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition flex items-center justify-center space-x-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Apply Changes</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
