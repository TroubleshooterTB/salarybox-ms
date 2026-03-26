import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';
import { LogOut, Download, Users, Settings, Activity, CalendarDays, Clock, IndianRupee } from 'lucide-react';
import L from 'leaflet';
import ExportModule from './ExportModule';
import AdminStaff from './AdminStaff';
import AdminSettings from './AdminSettings';
import AdminApprovals from './AdminApprovals';
import AdminCalendar from './AdminCalendar';
import AdminDailyAttendance from './AdminDailyAttendance';
import AdminLoans from './AdminLoans';
import AdminHistoricalAttendance from './AdminHistoricalAttendance';

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
  const [activeTab, setActiveTab] = useState<'map'|'staff'|'settings'|'approvals'|'calendar'|'daily'|'history'|'loans'|'export'>('daily');
  const [attendance, setAttendance] = useState<any[]>([]);

  const fetchData = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, branch)')
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
      <aside className="w-72 bg-slate-950 text-white min-h-screen flex flex-col items-center py-10 shadow-2xl z-20">
        <div className="text-center mb-12 w-full px-6">
           <h1 className="text-2xl font-black tracking-tight text-white mb-1">Minimal Stroke</h1>
           <div className="mx-auto mt-2 inline-block px-3 py-1 bg-brand-500/20 text-brand-400 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border border-brand-500/20">Control Panel</div>
        </div>

        <nav className="flex-1 w-full px-6 space-y-3">
           <button 
             onClick={() => setActiveTab('daily')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'daily' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <Clock className="w-5 h-5" />
             <span className="text-sm">Live Punches</span>
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'history' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <CalendarDays className="w-5 h-5" />
             <span className="text-sm">Historical Attendance</span>
           </button>
           <button 
             onClick={() => setActiveTab('staff')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'staff' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <Users className="w-5 h-5" />
             <span className="text-sm">Staff Manager</span>
           </button>
           <button 
             onClick={() => setActiveTab('calendar')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'calendar' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <CalendarDays className="w-5 h-5" />
             <span className="text-sm">Master Calendar</span>
           </button>
           <button 
             onClick={() => setActiveTab('approvals')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'approvals' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <Activity className="w-5 h-5" />
             <span className="text-sm">Approvals Center</span>
           </button>
           <button 
             onClick={() => setActiveTab('loans')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'loans' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <IndianRupee className="w-5 h-5" />
             <span className="text-sm">Loan Ledgers</span>
           </button>
           <button 
             onClick={() => setActiveTab('settings')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'settings' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <Settings className="w-5 h-5" />
             <span className="text-sm">Company Settings</span>
           </button>
           <button 
             onClick={() => setActiveTab('export')}
             className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold tracking-wide ${activeTab === 'export' ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20 translate-x-2' : 'hover:bg-slate-800 text-slate-400'}`}
           >
             <Download className="w-5 h-5" />
             <span className="text-sm">Export Engine</span>
           </button>
        </nav>

        <button onClick={() => navigate('/')} className="mt-auto mb-2 px-6 py-4 w-[85%] text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition flex items-center justify-center space-x-2 border border-transparent">
          <span className="font-bold tracking-wide text-sm">Return to Mobile App</span>
        </button>
        <button onClick={handleLogout} className="mb-2 px-6 py-4 w-[85%] text-slate-400 hover:text-white hover:bg-rose-500/20 rounded-2xl transition flex items-center justify-center space-x-2 border border-transparent hover:border-rose-500/30">
          <LogOut className="w-5 h-5" />
          <span className="font-bold tracking-wide text-sm">Terminate Session</span>
        </button>
      </aside>

      <main className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col h-screen">
        {/* Standard header for Map/Verity/Export only. New modules have their own scoped headers. */}
        {['map', 'export'].includes(activeTab) && (
        <header className="px-12 py-8 border-b border-slate-200/60 bg-white/80 backdrop-blur-md z-10 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black mb-1.5 tracking-tight text-slate-900">
              {activeTab === 'map' ? 'Geofence Tracker' : 'Report Exporter'}
            </h2>
            <p className="text-sm font-medium text-slate-500 tracking-wide">
              {activeTab === 'map' ? 'Visual footprint of remote and local employee punches.' : 'Generate clean XLSX sheets for financing.'}
            </p>
          </div>
        </header>
        )}

        <div className="flex-1 overflow-auto bg-slate-50 relative">
           {activeTab === 'staff' ? <AdminStaff /> : 
            activeTab === 'settings' ? <AdminSettings /> : 
            activeTab === 'approvals' ? <AdminApprovals /> : 
            activeTab === 'calendar' ? <AdminCalendar /> : 
            activeTab === 'daily' ? <AdminDailyAttendance /> : 
            activeTab === 'history' ? <AdminHistoricalAttendance /> :
            activeTab === 'loans' ? <AdminLoans /> : 
            activeTab === 'export' ? <ExportModule /> : 
            activeTab === 'map' ? (
             <div className="h-full w-full z-0 relative shadow-inner">
               <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                 <TileLayer
                   attribution='&copy; <a href="https://carto.com/">Carto</a>'
                   url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                 />
                 
                 {attendance.filter((a: any) => a.latitude && a.longitude).map((punch: any) => (
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
                       </div>
                     </Popup>
                   </Marker>
                 ))}
               </MapContainer>
             </div>
           ) : null}
        </div>
      </main>
    </div>
  );
}
