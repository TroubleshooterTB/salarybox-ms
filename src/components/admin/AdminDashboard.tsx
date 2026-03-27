import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';
import { 
  LogOut, Users, Settings, Clock, 
  IndianRupee, History, Map, 
  FileStack, UserCheck, Calendar, Globe, CheckSquare 
} from 'lucide-react';
import L from 'leaflet';
import ExportModule from './ExportModule';
import AdminStaff from './AdminStaff';
import AdminSettings from './AdminSettings';
import AdminApprovals from './AdminApprovals';
import AdminCalendar from './AdminCalendar';
import AdminDailyAttendance from './AdminDailyAttendance';
import AdminLoans from './AdminLoans';
import AdminHistoricalAttendance from './AdminHistoricalAttendance';
import AdminCorrections from './AdminCorrections';
import AdminBranches from './AdminBranches';
import { useLanguage } from '../../lib/i18n';
import useStore from '../../store';

import iconMarkerURL from 'leaflet/dist/images/marker-icon.png';
import iconRetinaURL from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadowURL from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: iconMarkerURL,
  iconRetinaUrl: iconRetinaURL,
  shadowUrl: iconShadowURL,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const createSelfieIcon = (url: string) => L.divIcon({
  className: 'custom-selfie-icon',
  html: `<div style="width: 44px; height: 44px; border-radius: 50%; border: 3px solid #10b981; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); background: white;">
          <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;"/>
         </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { userRole, userProfile } = useStore();
  const [activeTab, setActiveTab] = useState<'map'|'staff'|'settings'|'approvals'|'calendar'|'daily'|'history'|'loans'|'export'|'corrections'|'branches'>('daily');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Logic: If Branch Admin, force their assigned branch.
  const initialBranch = (userRole === 'Branch Admin' && userProfile?.branch) 
    ? userProfile.branch 
    : (localStorage.getItem('admin_branch') || 'All Branches');

  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);

  const fetchData = async () => {
    // Initial branch fetch
    const { data: bData } = await supabase.from('branches').select('name').order('name');
    if (bData) setBranches(bData);
      
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, branch, department)')
      .order('timestamp', { ascending: false })
      .limit(100);
      
    if (data) setAttendance(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const mapCenter: [number, number] = [18.5204, 73.8567];

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 font-sans">
      <aside className="w-80 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 shrink-0 shadow-2xl shadow-slate-200/50 z-20">
        <div className="p-8 border-b border-slate-50">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center space-x-2">
              <span className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/30">MS</span>
              <span>Minimal<span className="text-brand-500">Stroke</span></span>
            </h1>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              {(['en', 'hi', 'mr'] as const).map(l => (
                <button 
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg transition ${language === l ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 mb-8">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Environment Context</label>
            {userRole === 'Branch Admin' ? (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-black text-slate-700">{selectedBranch} (Locked)</span>
              </div>
            ) : (
              <select 
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  localStorage.setItem('admin_branch', e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 transition"
              >
                <option>All Branches</option>
                {branches.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
          {[
            { id: 'daily', icon: Clock, label: t('attendance') },
            { id: 'history', icon: History, label: 'History' },
            { id: 'staff', icon: Users, label: t('staff') },
            { id: 'loans', icon: IndianRupee, label: t('loans') },
            { id: 'approvals', icon: UserCheck, label: t('approvals') },
            { id: 'corrections', icon: CheckSquare, label: t('corrections') },
            { id: 'branches', icon: Globe, label: t('branches') },
            { id: 'export', icon: FileStack, label: t('export') },
            { id: 'map', icon: Map, label: 'Live Map' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'settings', icon: Settings, label: t('settings') }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition duration-300 group ${
                activeTab === item.id 
                  ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/30' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50 space-y-2">
          <button onClick={() => navigate('/')} className="w-full py-3 text-slate-400 hover:text-slate-700 font-bold text-xs transition text-center">
            Return to App
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col h-screen">
        <div className="flex-1 overflow-auto relative">
           {activeTab === 'daily' && <AdminDailyAttendance selectedBranch={selectedBranch} />}
           {activeTab === 'history' && <AdminHistoricalAttendance selectedBranch={selectedBranch} />}
           {activeTab === 'staff' && <AdminStaff selectedBranch={selectedBranch} />}
           {activeTab === 'calendar' && <AdminCalendar selectedBranch={selectedBranch} />}
           {activeTab === 'approvals' && <AdminApprovals selectedBranch={selectedBranch} />}
           {activeTab === 'corrections' && <AdminCorrections selectedBranch={selectedBranch} />}
           {activeTab === 'branches' && <AdminBranches />}
           {activeTab === 'loans' && <AdminLoans selectedBranch={selectedBranch} />}
           {activeTab === 'settings' && <AdminSettings />}
           {activeTab === 'export' && <ExportModule selectedBranch={selectedBranch} />}

           {activeTab === 'map' && (
             <div className="h-full w-full z-0 relative shadow-inner">
               <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                 <TileLayer
                   attribution='&copy; <a href="https://carto.com/">Carto</a>'
                   url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                 />
                 
                 {attendance
                   .filter(p => p.latitude && p.longitude && (selectedBranch === 'All Branches' || p.profiles?.branch === selectedBranch))
                   .map((punch: any) => (
                   <Marker 
                     key={punch.id} 
                     position={[punch.latitude, punch.longitude]} 
                     icon={punch.selfie_url ? createSelfieIcon(punch.selfie_url) : DefaultIcon}
                   >
                     <Popup className="premium-popup">
                       <div className="text-center font-sans tracking-tight min-w-[140px]">
                         <h3 className="font-bold text-sm text-slate-800 mb-1">{punch.profiles?.full_name || 'Verified Staff'}</h3>
                         <p className="text-xs font-semibold text-slate-500 mb-2 bg-slate-50 rounded py-1 border border-slate-100">{punch.type} Punch @ {new Date(punch.timestamp).toLocaleTimeString()}</p>
                         <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] rounded-full font-bold uppercase tracking-widest">{punch.status}</span>
                         {punch.profiles?.branch && <p className="mt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">{punch.profiles.branch}</p>}
                       </div>
                     </Popup>
                   </Marker>
                 ))}
               </MapContainer>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}
