import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, Play, Pause, Square, MapPin, Camera, Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FieldVisit({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [activeVisit, setActiveVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [note, setNote] = useState('');
  
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<number>(Date.now());
  const [isStationary, setIsStationary] = useState(false);

  useEffect(() => {
    fetchActiveVisit();
  }, [session]);

  const fetchActiveVisit = async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('field_visits')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'Active') // Or Paused
      .maybeSingle();

    if (data) {
      setActiveVisit(data);
      fetchLogs(data.id);
    }
    setLoading(false);
  };

  const fetchLogs = async (visitId: string) => {
    const { data } = await supabase
      .from('field_visit_logs')
      .select('*')
      .eq('visit_id', visitId)
      .order('timestamp', { ascending: false });
    if (data) setLogs(data);
  };

  const startVisit = async () => {
    setIsSubmitting(true);
    try {
      const pos = await getCurrentPosition();
      const { data, error } = await supabase
        .from('field_visits')
        .insert({
          user_id: session?.user?.id,
          status: 'Active'
        })
        .select()
        .single();

      if (error) throw error;

      await logAction(data.id, 'Start', pos.lat, pos.lng);
      setActiveVisit(data);
      alert('Field Visit Started!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logAction = async (visitId: string, type: string, lat: number, lng: number, selfieUrl?: string, dist = 0) => {
    const { error } = await supabase
      .from('field_visit_logs')
      .insert({
        visit_id: visitId,
        type,
        latitude: lat,
        longitude: lng,
        selfie_url: selfieUrl,
        distance_from_last: dist,
        note: note
      });
    if (error) console.error(error);
    fetchLogs(visitId);
    setNote('');
    setSelfie(null);
  };

  const getCurrentPosition = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => reject(e),
        { enableHighAccuracy: true }
      );
    });
  };

  const handlePauseResume = async () => {
    if (!activeVisit) return;
    const newStatus = activeVisit.status === 'Active' ? 'Paused' : 'Active';
    const type = newStatus === 'Active' ? 'Resume' : 'Pause';
    
    setIsSubmitting(true);
    try {
      const pos = await getCurrentPosition();
      const { error } = await supabase
        .from('field_visits')
        .update({ status: newStatus })
        .eq('id', activeVisit.id);
      
      if (error) throw error;
      await logAction(activeVisit.id, type, pos.lat, pos.lng);
      setActiveVisit({...activeVisit, status: newStatus});
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const endVisit = async () => {
    if (!activeVisit || !window.confirm('End your field visit for today?')) return;
    setIsSubmitting(true);
    try {
      const pos = await getCurrentPosition();
      const { error } = await supabase
        .from('field_visits')
        .update({ 
          status: 'Completed',
          end_time: new Date().toISOString()
        })
        .eq('id', activeVisit.id);
      
      if (error) throw error;
      await logAction(activeVisit.id, 'End', pos.lat, pos.lng);
      setActiveVisit(null);
      setLogs([]);
      alert('Field Visit Completed. Report sent to Admin.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const captureCheckpoint = async () => {
    if (!activeVisit || !selfie) {
      alert('Please take a selfie first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const pos = await getCurrentPosition();
      
      // Upload selfie
      const fileName = `${session?.user?.id}/${Date.now()}.jpg`;
      const blob = await (await fetch(selfie)).blob();
      const { error: uploadError } = await supabase.storage.from('selfies').upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(fileName);

      await logAction(activeVisit.id, 'Checkpoint', pos.lat, pos.lng, publicUrl);
      alert('Visit Recorded!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const takeSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setSelfie(canvas.toDataURL('image/jpeg'));
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setShowCamera(false);
    }
  };

  // Stationary Tracking (30 mins)
  useEffect(() => {
    if (activeVisit?.status !== 'Active') return;

    const interval = setInterval(async () => {
      try {
        const pos = await getCurrentPosition();
        if (currentLocation) {
          const dist = calculateDistance(currentLocation.lat, currentLocation.lng, pos.lat, pos.lng);
          if (dist < 0.05) { // Less than 50 meters
             const duration = (Date.now() - lastCheckTime) / 60000;
             if (duration >= 30 && !isStationary) {
                setIsStationary(true);
                await logAction(activeVisit.id, 'Stationary', pos.lat, pos.lng, undefined, 0);
                // Trigger notification via edge function or logic
             }
          } else {
             setIsStationary(false);
             setLastCheckTime(Date.now());
             await logAction(activeVisit.id, 'Checkpoint', pos.lat, pos.lng, undefined, dist);
             const newTotalKm = (activeVisit.total_km || 0) + dist;
             await supabase.from('field_visits').update({ total_km: newTotalKm }).eq('id', activeVisit.id);
             setActiveVisit({...activeVisit, total_km: newTotalKm});
          }
        }
        setCurrentLocation(pos);
      } catch (e) { console.error(e); }
    }, 300000); // Check every 5 mins

    return () => clearInterval(interval);
  }, [activeVisit, currentLocation, lastCheckTime, isStationary]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col max-w-md mx-auto relative overflow-x-hidden">
      <div className="flex items-center mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">Field Visit Tracking</h2>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : !activeVisit ? (
        <div className="flex flex-col items-center justify-center space-y-8 mt-20">
          <div className="w-24 h-24 bg-brand-500/10 rounded-full flex items-center justify-center border border-brand-500/20 shadow-[0_0_50px_rgba(var(--color-brand-500),0.1)]">
            <Navigation className="w-10 h-10 text-brand-400" />
          </div>
          <div className="text-center space-y-2 px-6">
            <h3 className="text-2xl font-black tracking-tight">Ready to Start?</h3>
            <p className="text-slate-400 font-medium">Your location and travel distance will be tracked automatically for the report.</p>
          </div>
          <button 
            disabled={isSubmitting}
            onClick={startVisit}
            className="w-full py-5 bg-white text-slate-950 font-black rounded-3xl flex items-center justify-center space-x-3 shadow-xl hover:shadow-white/20 active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Field Visit</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6 pb-10">
          {/* Active Status Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 ${activeVisit.status === 'Active' ? 'bg-emerald-500/10' : 'bg-amber-500/10'} rounded-full blur-3xl pointer-events-none`} />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${activeVisit.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{activeVisit.status} Visit</p>
                </div>
                <h3 className="text-3xl font-black text-white">{(activeVisit.total_km || 0).toFixed(2)} <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">KM</span></h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Started At</p>
                <p className="text-sm font-bold text-white">{new Date(activeVisit.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={handlePauseResume} className={`flex items-center justify-center space-x-2 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition ${activeVisit.status === 'Active' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                {activeVisit.status === 'Active' ? <><Pause className="w-4 h-4 fill-current" /> <span>Pause</span></> : <><Play className="w-4 h-4 fill-current" /> <span>Resume</span></>}
              </button>
              <button onClick={endVisit} className="flex items-center justify-center space-x-2 py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                <Square className="w-4 h-4 fill-current" />
                <span>End Visit</span>
              </button>
            </div>
          </div>

          {/* New Checkpoint Form */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-brand-500" />
              Log Visit Point
            </h4>

            {selfie ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden group">
                <img src={selfie} className="w-full h-full object-cover" />
                <button onClick={() => setSelfie(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={startCamera} className="w-full aspect-video bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-brand-500/50 hover:text-brand-400 transition group">
                <Camera className="w-8 h-8 mb-2 group-hover:scale-110 transition" />
                <span className="text-[10px] font-black uppercase tracking-widest">Take Mandatory Selfie</span>
              </button>
            )}

            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add visit details/client name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-brand-500 transition resize-none placeholder-slate-600"
              rows={2}
            />

            <button 
              disabled={isSubmitting || !selfie}
              onClick={captureCheckpoint}
              className="w-full py-4 bg-brand-500 text-white font-black rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition uppercase tracking-widest text-[10px] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Log Checkpoint'}
            </button>
          </div>

          {/* Activity Log */}
          <div className="space-y-3">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-2">Today's Activity</p>
             {logs.map(log => (
               <div key={log.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center space-x-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                   log.type === 'Start' ? 'bg-emerald-500/20 text-emerald-400' :
                   log.type === 'End' ? 'bg-rose-500/20 text-rose-400' :
                   log.type === 'Stationary' ? 'bg-amber-500/20 text-amber-400' :
                   'bg-slate-800 text-slate-400'
                 }`}>
                   {log.type === 'Stationary' ? <AlertTriangle className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                     <p className="font-bold text-sm text-slate-200">{log.type}</p>
                     <p className="text-[9px] font-black text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                   </div>
                   {log.note && <p className="text-xs text-slate-400 mt-0.5 truncate italic">"{log.note}"</p>}
                   {log.distance_from_last > 0 && <p className="text-[9px] font-black text-brand-400 uppercase tracking-widest mt-1">+{log.distance_from_last.toFixed(2)} KM</p>}
                 </div>
                 {log.selfie_url && (
                   <img src={log.selfie_url} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                 )}
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Camera Overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-12 flex items-center justify-center w-full space-x-12">
              <button onClick={() => setShowCamera(false)} className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={takeSelfie} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                <div className="w-16 h-16 border-4 border-slate-900 rounded-full" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
