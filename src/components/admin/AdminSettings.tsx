import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Target, Trash2, Edit3, Loader2, ShieldAlert, ExternalLink } from 'lucide-react';

export default function AdminSettings() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', latitude: '', longitude: '', radius_meters: '100'
  });

  const fetchBranches = async () => {
    setLoading(true);
    const { data } = await supabase.from('branches').select('*').order('name');
    if (data) setBranches(data);
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, []);

  const handleOpenModal = (branch?: any) => {
    if (branch) {
      setEditingId(branch.id);
      setFormData({
        name: branch.name,
        latitude: branch.latitude.toString(),
        longitude: branch.longitude.toString(),
        radius_meters: branch.radius_meters.toString()
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', latitude: '', longitude: '', radius_meters: '100' });
    }
    setShowModal(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      name: formData.name,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius_meters: parseInt(formData.radius_meters)
    };

    try {
      if (editingId) {
        await supabase.from('branches').update(payload).eq('id', editingId);
      } else {
        await supabase.from('branches').insert(payload);
      }
      setShowModal(false);
      fetchBranches();
    } catch (err: any) {
      alert('Error saving branch: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this branch geofence? Attendance mapped to this branch will remain intact but users can no longer punch from here.')) {
      await supabase.from('branches').delete().eq('id', id);
      fetchBranches();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Company Settings</h2>
          <p className="text-slate-500 font-medium text-sm">Manage dynamic geofences and physical branch locations.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition">
          <Plus className="w-5 h-5" /> <span>Add Branch</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Synching geofences...</div>
        ) : branches.map(b => (
          <div key={b.id} className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">{b.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{b.radius_meters}m Security Radius</p>
                </div>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(b)} className="p-2 bg-slate-50 text-slate-400 hover:text-brand-500 rounded-lg transition"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(b.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100">
              <div className="text-center w-1/2 border-r border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Latitude</p>
                <p className="font-mono text-sm font-semibold text-slate-700">{b.latitude.toFixed(6)}</p>
              </div>
              <div className="text-center w-1/2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Longitude</p>
                <p className="font-mono text-sm font-semibold text-slate-700">{b.longitude.toFixed(6)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global Security & Master Controls */}
      <div className="mt-12 bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldAlert className="w-32 h-32 text-rose-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white">Security & Master Controls</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-400 leading-relaxed">
                As a Super Admin, you can trigger password reset emails from the <span className="text-brand-400">Staff Manager</span>. For emergency "Force Resets" without email access, use the SQL Tool below.
              </p>
              
              <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Emergency Manual Reset (SQL)</p>
                <code className="block bg-slate-900 p-4 rounded-xl text-xs font-mono text-emerald-400 break-all leading-loose">
                  UPDATE auth.users <br/>
                  SET encrypted_password = crypt('NEW_PASSCODE', gen_salt('bf')) <br/>
                  WHERE email = 'employee_id@minimalstroke.com';
                </code>
                <a 
                  href="https://supabase.com/dashboard/project/gxekdcwwzebvtxdlddkb/sql" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 text-xs font-black text-brand-400 hover:text-brand-300 transition uppercase tracking-widest"
                >
                  <span>Open Supabase SQL Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl border border-white/5 flex flex-col justify-center text-center">
              <p className="text-sm font-bold text-slate-300 mb-6">Need to change your own Admin Passcode?</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl text-xs uppercase tracking-widest border border-white/10 transition-all"
              >
                Go to "My Profile" in Mobile App
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Geofence' : 'Register New Branch'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold px-3 py-1 rounded-lg">Esc</button>
            </div>
            <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch/Office Name</label>
                <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="e.g. The Mint" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latitude Coord</label>
                <input required value={formData.latitude} onChange={e=>setFormData({...formData, latitude: e.target.value})} type="number" step="any" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 font-mono" placeholder="18.5204" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longitude Coord</label>
                <input required value={formData.longitude} onChange={e=>setFormData({...formData, longitude: e.target.value})} type="number" step="any" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 font-mono" placeholder="73.8567" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Geofence Radius (Meters)</label>
                <input required value={formData.radius_meters} onChange={e=>setFormData({...formData, radius_meters: e.target.value})} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
              </div>
              
              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="bg-brand-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-600 transition flex items-center space-x-2">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Syncing Map...</span></> : <span>{editingId ? 'Update Branch' : 'Lock Satellite'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
