import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, Play, Pause, Square, MapPin, Camera, Loader2, Navigation, AlertTriangle, Search, CheckCircle, Smartphone, Mic, StopCircle, Trash2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProspectDiscovery from './ProspectDiscovery';
import OdooProjectList from './OdooProjectList';
import { Globe } from 'lucide-react';

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
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showOdooProjects, setShowOdooProjects] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [syncToOdoo, setSyncToOdoo] = useState(true);
  const [odooFormData, setOdooFormData] = useState({
    contact_name: '',
    email: '',
    phone: '',
    expected_revenue: '',
    notes: ''
  });

  useEffect(() => {
    fetchActiveVisit();
    fetchTodaysLogs();
  }, [session]);

  const fetchTodaysLogs = async () => {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('field_visit_logs')
      .select('*, visit_id(user_id)')
      .gte('timestamp', `${today}T00:00:00`)
      .order('timestamp', { ascending: false });
    
    if (data) {
      // Filter logs by current user
      const userLogs = data.filter(log => {
        const visit = log.visit_id as any;
        return visit && visit.user_id === session.user.id;
      });
      setLogs(userLogs);
    }
  };

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
      // Initialize location tracking for existing visit
      getCurrentPosition().then(pos => {
        setCurrentLocation(pos);
        setLastCheckTime(Date.now());
      }).catch(console.error);
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
      setCurrentLocation(pos);
      setLastCheckTime(Date.now());
      alert('Field Visit Started!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logAction = async (visitId: string, type: string, lat: number, lng: number, selfieUrl?: string, dist = 0, audioUrl?: string) => {
    const { error } = await supabase
      .from('field_visit_logs')
      .insert({
        visit_id: visitId,
        type,
        latitude: lat,
        longitude: lng,
        selfie_url: selfieUrl,
        audio_url: audioUrl,
        distance_from_last: dist,
        note: selectedProspect ? `${note} [GPID:${selectedProspect.place_id}]` : note
      });
    if (error) console.error(error);
    fetchLogs(visitId);
    setNote('');
    setSelfie(null);
    setAudioBlob(null);
    setAudioUrl(null);
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

      // Upload audio if exists
      let audioPublicUrl = '';
      if (audioBlob) {
        const audioName = `${session?.user?.id}/${Date.now()}.webm`;
        const { error: audioError } = await supabase.storage.from('selfies').upload(audioName, audioBlob);
        if (!audioError) {
          audioPublicUrl = supabase.storage.from('selfies').getPublicUrl(audioName).data.publicUrl;
        }
      }

      await logAction(activeVisit.id, 'Checkpoint', pos.lat, pos.lng, publicUrl, undefined, audioPublicUrl);
      
      // Optional: Sync to Odoo CRM if toggled
      if (syncToOdoo) {
        try {
          const syncRes = await fetch('/api/odoo/crm', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token') ? JSON.parse(localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token')!).access_token : ''}`
            },
            body: JSON.stringify({
              name: selectedProspect?.name || 'Manual Visit Checkpoint',
              street: selectedProspect?.vicinity || '',
              rating: selectedProspect?.rating || 0,
              place_id: selectedProspect?.place_id || 'manual',
              category: 'Field Visit',
              ...odooFormData,
              notes: `${note || odooFormData.notes}${audioPublicUrl ? `\n\nVoice Memo: ${audioPublicUrl}` : ''}`
            })
          });
          const syncData = await syncRes.json();
          if (!syncData.success) console.error('Odoo sync failed:', syncData.error);
        } catch (e) { console.error('Odoo sync error:', e); }
      }

      alert('Visit Recorded!');
      setSyncToOdoo(false);
      setOdooFormData({ contact_name: '', email: '', phone: '', expected_revenue: '', notes: '' });
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
    }, 60000); // Check every 1 min

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

  if (showDiscovery) {
    return (
      <ProspectDiscovery 
        onBack={() => setShowDiscovery(false)} 
        onSelect={(place) => {
          setNote(`Visiting: ${place.name}\nAddress: ${place.vicinity}`);
          setSelectedProspect(place);
          setOdooFormData(prev => ({ 
            ...prev, 
            contact_name: place.name,
            phone: place.phone || '',
            email: place.email || '',
            notes: `Visiting: ${place.name}\nAddress: ${place.vicinity}`
          }));
          setShowDiscovery(false);
        }}
      />
    );
  }

  if (showOdooProjects) {
    return (
      <OdooProjectList 
        onBack={() => setShowOdooProjects(false)} 
        onSelect={(project) => {
          setNote(`Visiting Project: ${project.display_name}\n(Odoo Sync Enabled)`);
          setSelectedProspect(project); // Treat project as a prospect for sync purposes
          setOdooFormData(prev => ({ 
            ...prev, 
            contact_name: project.contact_name || project.display_name,
            phone: project.phone || '',
            email: project.email_from || '',
            notes: `Visiting Project: ${project.display_name}`
          }));
          setShowOdooProjects(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col max-w-md mx-auto relative overflow-x-hidden">
      <div className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold ml-2 tracking-tight">Field Visit</h2>
        </div>
        <div className="flex items-center space-x-2">
            <button 
             onClick={() => setShowDiscovery(true)}
             className="p-2.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl hover:bg-brand-500/20 transition flex items-center space-x-2"
            >
               <Search className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Discover</span>
            </button>
            <button 
             onClick={() => setShowOdooProjects(true)}
             className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition flex items-center space-x-2"
            >
               <Globe className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Sites</span>
            </button>
           {activeVisit && (
             <button 
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," 
                  + ["Type,Time,Note,Lat,Lng,Distance"]
                  + logs.map(e => [e.type, new Date(e.timestamp).toLocaleTimeString(), e.note || "", e.latitude, e.longitude, e.distance_from_last].join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `Field_Visit_Report_${new Date().toISOString().slice(0,10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="p-2.5 text-brand-400 bg-brand-500/10 rounded-xl border border-brand-500/20"
             >
                <Navigation className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : !activeVisit ? (
        <div className="flex-1 flex flex-col pt-4 pb-10">
          <div className="flex flex-col items-center justify-center space-y-8 flex-1">
            <div className="w-24 h-24 bg-brand-500/10 rounded-full flex items-center justify-center border border-brand-500/20 shadow-[0_0_50px_rgba(var(--color-brand-500),0.1)]">
              <Navigation className="w-10 h-10 text-brand-400" />
            </div>
            <div className="text-center space-y-2 px-6">
              <h3 className="text-2xl font-black tracking-tight">Ready to Start?</h3>
              <p className="text-slate-400 font-medium text-center">Your location and travel distance will be tracked automatically.</p>
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
        </div>
      ) : (
        <div className="flex-1 space-y-6 pt-4 pb-10">
          {activeVisit && (
            <>
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
                  onChange={e => {
                    setNote(e.target.value);
                    if (syncToOdoo) setOdooFormData({ ...odooFormData, notes: e.target.value });
                  }}
                  placeholder="Add visit details/client name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-brand-500 transition resize-none placeholder-slate-600"
                  rows={2}
                />

                {/* Odoo Sync Toggle */}
                <div className="pt-2 border-t border-slate-800/50">
                   <button 
                    onClick={() => {
                      setSyncToOdoo(!syncToOdoo);
                      if (!syncToOdoo && selectedProspect) {
                        setOdooFormData({
                          ...odooFormData,
                          contact_name: selectedProspect.name,
                          notes: note
                        });
                      }
                    }}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${
                      syncToOdoo ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'
                    }`}
                   >
                      <div className="flex items-center space-x-3">
                         <div className={`p-2 rounded-lg ${syncToOdoo ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <Globe className="w-4 h-4" />
                         </div>
                         <div className="text-left">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${syncToOdoo ? 'text-emerald-400' : 'text-slate-500'}`}>Sync to Odoo CRM</p>
                            <p className="text-[9px] font-bold text-slate-600">Convert this visit into an Opportunity</p>
                         </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${syncToOdoo ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}>
                         {syncToOdoo && <CheckCircle className="w-3 h-3" />}
                      </div>
                   </button>
                </div>

                {syncToOdoo && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2 overflow-hidden"
                  >
                     <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                           <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Contact</label>
                           <input 
                            type="text"
                            value={odooFormData.contact_name}
                            onChange={e => setOdooFormData({ ...odooFormData, contact_name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-brand-500"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Exp. Revenue</label>
                           <input 
                            type="number"
                            value={odooFormData.expected_revenue}
                            onChange={e => setOdooFormData({ ...odooFormData, expected_revenue: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-brand-500"
                           />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                           <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Phone</label>
                           <input 
                            type="tel"
                            value={odooFormData.phone}
                            onChange={e => setOdooFormData({ ...odooFormData, phone: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-brand-500"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Email</label>
                           <input 
                            type="email"
                            value={odooFormData.email}
                            onChange={e => setOdooFormData({ ...odooFormData, email: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-brand-500"
                           />
                        </div>
                     </div>
                  </motion.div>
                )}

                {/* Audio Recorder */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isRecording ? 'bg-rose-500 animate-pulse text-white' : 
                        audioUrl ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                         {isRecording ? <Mic className="w-5 h-5" /> : audioUrl ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Voice Memo</p>
                         <p className="text-[9px] font-bold text-slate-600">
                            {isRecording ? 'Recording audio...' : audioUrl ? 'Voice note recorded' : 'Optional audio note'}
                         </p>
                      </div>
                   </div>
                   <div className="flex items-center space-x-2">
                      {isRecording ? (
                        <button onClick={stopRecording} className="p-2 bg-rose-500 text-white rounded-lg"><StopCircle className="w-4 h-4" /></button>
                      ) : audioUrl ? (
                        <button onClick={() => { setAudioUrl(null); setAudioBlob(null); }} className="p-2 bg-slate-800 text-rose-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={startRecording} className="p-2 bg-brand-500 text-white rounded-lg shadow-lg shadow-brand-500/20"><Mic className="w-4 h-4" /></button>
                      )}
                   </div>
                </div>

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
                        {log.audio_url && (
                          <button 
                            onClick={() => new Audio(log.audio_url).play()}
                            className="w-10 h-10 bg-brand-500/10 text-brand-400 rounded-lg flex items-center justify-center border border-brand-500/20"
                          >
                             <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                ))}
              </div>
            </>
          )}
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
