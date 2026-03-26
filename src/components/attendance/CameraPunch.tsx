import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';

// We no longer use hardcoded constants; branches are loaded dynamically from Supabase.

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CameraPunch({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const webcamRef = useRef<Webcam>(null);
  
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearestBranch, setNearestBranch] = useState<{name: string, distance: number, radius: number} | null>(null);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let watchId: number;

    const initGeo = async () => {
      // 1. Fetch dynamic branches first
      const { data: bs } = await supabase.from('branches').select('*');
      const loadedBranches = bs || [];

      // 2. Start GPS tracker
      if (!navigator.geolocation) {
        setGeoError('Geolocation is not supported by your browser.');
        setLocating(false);
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });

          if (loadedBranches.length === 0) {
            setGeoError('No company branches configured. Contact Admin.');
            setLocating(false);
            return;
          }

          let minDistance = Infinity;
          let closest = null;

          for (const branch of loadedBranches) {
            const dist = getDistance(latitude, longitude, branch.latitude, branch.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              closest = { name: branch.name, distance: dist, radius: branch.radius_meters || 100 };
            }
          }
          
          setNearestBranch(closest);
          setLocating(false);
        },
        (error) => {
          setGeoError(error.message || 'Unable to retrieve your location.');
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    initGeo();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handlePunch = useCallback(async (type: 'In' | 'Out') => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc || !location || !session) return;

    if (nearestBranch && nearestBranch.distance > nearestBranch.radius) {
      alert(`PUNCH REJECTED: You are ${Math.round(nearestBranch.distance)}m away from ${nearestBranch.name}. Must be within ${nearestBranch.radius}m.`);
      return;
    }

    setLoading(true);
    try {
      // 1. Reverse geocode the location for human-readable address
      let addressString = `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`;
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=16&addressdetails=1`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'MinimalStrokeERP/2.0' } }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.display_name) {
            // Trim to road + suburb + city for brevity
            const a = geoData.address;
            const parts = [a.road, a.suburb, a.city || a.town || a.village].filter(Boolean);
            addressString = parts.join(', ') || geoData.display_name.split(',').slice(0, 3).join(',').trim();
          }
        }
      } catch {
        // Geocoding failure is non-fatal, use lat/lng fallback
      }

      // 2. Upload selfie
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const fileName = `${session.user.id}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);

      // 3. Auto half-day check on OUT punch
      let status = 'Present';
      if (type === 'Out') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: lastPunch } = await supabase
          .from('attendance')
          .select('timestamp')
          .eq('user_id', session.user.id)
          .eq('type', 'In')
          .gte('timestamp', startOfDay.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (lastPunch) {
          const durationHours = (new Date().getTime() - new Date(lastPunch.timestamp).getTime()) / 3600000;
          if (durationHours < 8) status = 'Half Day';
        }
      }

      // 4. Insert attendance record with real address
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          user_id: session.user.id,
          type: type,
          latitude: location.lat,
          longitude: location.lng,
          address_string: addressString,
          selfie_url: publicUrlData.publicUrl,
          status: status
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => { onBack(); }, 2500);

    } catch (err: any) {
      console.error(err);
      alert('Error during punch: ' + err.message);
    } finally {
      if (!success) setLoading(false);
    }
  }, [location, nearestBranch, session, success, onBack]);

  const isViolation = nearestBranch && nearestBranch.distance > nearestBranch.radius;

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-950 text-white p-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-emerald-500 rounded-full p-6 mb-6 shadow-xl shadow-emerald-500/20">
          <CheckCircle2 className="w-16 h-16 text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Punch Successful!</h2>
        <p className="text-emerald-200">Your attendance has been automatically recorded.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative w-full h-full max-w-md mx-auto overflow-hidden">
      <div className="p-4 flex items-center shadow-lg bg-slate-900/80 backdrop-blur-md z-10 absolute top-0 w-full border-b border-white/5">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">Geo-Punch Barrier</h2>
      </div>

      <div className="flex-1 relative bg-black pt-16 flex items-center justify-center overflow-hidden">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
          className="w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-64 h-64 border-[3px] border-white/30 rounded-full"
          />
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 pb-10 border-t border-white/5">
        
        {locating ? (
          <div className="flex items-center space-x-3 text-slate-300 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <Loader2 className="animate-spin w-5 h-5 text-brand-500" />
            <span className="text-sm font-medium">Acquiring GPS Satellite Lock...</span>
          </div>
        ) : geoError ? (
          <div className="flex items-center space-x-3 text-red-400 bg-red-900/20 p-4 rounded-2xl border border-red-500/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{geoError}</span>
          </div>
        ) : nearestBranch ? (
          <div className={`p-4 rounded-2xl border flex items-center space-x-4 mb-6 ${isViolation ? 'bg-red-900/20 border-red-500/30 text-red-200' : 'bg-brand-900/20 border-brand-500/30 text-brand-100'}`}>
            <div className={`p-3 rounded-xl shadow-inner ${isViolation ? 'bg-red-500/20' : 'bg-brand-500/20'}`}>
              <MapPin className={`w-6 h-6 ${isViolation ? 'text-red-400' : 'text-brand-400'}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-70 mb-0.5">Nearest Branch Geofence</p>
              <h3 className="text-lg font-bold leading-none">{nearestBranch.name}</h3>
              <p className={`text-sm mt-1 font-semibold ${isViolation ? 'text-red-400' : 'text-brand-400'}`}>
                {Math.round(nearestBranch.distance)}m away {isViolation ? '(Out of Range)' : '(In Range)'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            disabled={loading || locating || isViolation || !!geoError}
            onClick={() => handlePunch('In')}
            className={`py-4 rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 transition-all shadow-lg
              ${isViolation || locating ? 'bg-slate-800 text-slate-500' : 'bg-brand-500 text-white hover:bg-brand-400 hover:-translate-y-1 hover:shadow-brand-500/30'}
            `}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            <span className="text-sm uppercase tracking-wide">Punch IN</span>
          </button>
          
          <button
            disabled={loading || locating || isViolation || !!geoError}
            onClick={() => handlePunch('Out')}
            className={`py-4 rounded-2xl font-bold flex flex-col items-center justify-center space-y-1 transition-all shadow-lg
              ${isViolation || locating ? 'bg-slate-800 text-slate-500' : 'bg-rose-500 text-white hover:bg-rose-400 hover:-translate-y-1 hover:shadow-rose-500/30'}
            `}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            <span className="text-sm uppercase tracking-wide">Punch OUT</span>
          </button>
        </div>
        
        {isViolation && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-center text-red-400/80 mt-4 leading-relaxed font-medium">
            Violation: You must be within {nearestBranch?.radius || 'allowed'} meters of a branch to punch. Return to the branch radius to unlock.
          </motion.p>
        )}
      </div>
    </div>
  );
}
