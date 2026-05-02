"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import useStore from '@/store';

export default function WebCameraPunch({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearestBranch, setNearestBranch] = useState<any>(null);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [punchingType, setPunchingType] = useState<'In' | 'Out' | null>(null);
  const [success, setSuccess] = useState(false);

  // 1. Initialize Camera
  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" },
          audio: false 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          // iOS Safari requires explicit play() and muted for autoplay
          videoRef.current.play().catch(err => {
            console.error("Video play failed:", err);
            setGeoError("Video playback failed. Please tap to enable camera.");
          });
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        setGeoError("Camera access denied: " + err.message);
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  // 2. Initialize Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported.");
      setLocating(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocating(false);
        setGeoError(''); // Clear any previous errors

        // Fetch nearest branch logic
        const { data: bs } = await supabase.from('branches').select('*').eq('is_active', true);
        if (bs && bs.length > 0) {
           // Calculate actual nearest branch using haversine
           const toRad = (val: number) => (val * Math.PI) / 180;
           let minDist = Infinity;
           let closest = bs[0];
           for (const b of bs) {
             const R = 6371e3;
             const dp = toRad(b.latitude - latitude);
             const dl = toRad(b.longitude - longitude);
             const a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(toRad(latitude))*Math.cos(toRad(b.latitude))*Math.sin(dl/2)*Math.sin(dl/2);
             const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
             if (dist < minDist) { minDist = dist; closest = b; }
           }
           setNearestBranch(closest);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        let msg = "GPS Error: ";
        if (err.code === 1) msg += "Permission Denied. Please enable Location Services.";
        else if (err.code === 2) msg += "Position Unavailable.";
        else if (err.code === 3) msg += "Request Timed Out.";
        else msg += err.message;
        
        setGeoError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleCaptureAndPunch = async (type: 'In' | 'Out') => {
    if (!videoRef.current || !canvasRef.current) {
      alert("Camera or canvas not ready. Please refresh.");
      return;
    }
    
    if (!location) {
      alert(geoError || "Waiting for GPS lock. Please ensure Location is enabled on your iPhone.");
      return;
    }
    
    setPunchingType(type);
    try {
      // Capture frame to canvas
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Ensure dimensions are captured correctly
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const selfieBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Call API
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: s?.access_token,
          punchData: {
            type,
            latitude: location.lat,
            longitude: location.lng,
            address_string: `${nearestBranch?.name || 'Office'} vicinity`,
            selfie_base64: selfieBase64,
            status: 'Present',
            branch: nearestBranch?.name || 'Main'
          }
        })
      });

      const resultData = await res.json();
      if (!res.ok) {
        let errorMsg = resultData.error || 'Punch failed';
        if (resultData.debug) {
          const d = resultData.debug;
          errorMsg += `\n\nBranch: ${d.branch} (${d.branchLat}, ${d.branchLng})\nYour GPS: (${d.yourLat}, ${d.yourLng})\nDistance: ${d.distance_m}m | Allowed: ${d.allowed_radius_m}m`;
        }
        throw new Error(errorMsg);
      }

      setSuccess(true);
      setTimeout(onBack, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPunchingType(null);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-950 text-white p-4">
        <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-black italic">PUNCH SUCCESSFUL</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-4 flex items-center bg-slate-900 border-b border-white/10">
        <button onClick={onBack} className="p-2"><ArrowLeft /></button>
        <span className="ml-2 font-black uppercase tracking-widest text-xs">PWA Punch Barrier</span>
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-900">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="w-full h-full object-cover grayscale brightness-125"
          onClick={() => videoRef.current?.play()} // User tap to resume if blocked
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {locating && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center space-y-4">
             <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
             <p className="text-xs font-black uppercase tracking-[0.2em]">Acquiring GPS Lock</p>
          </div>
        )}

        {geoError && (
          <div className="absolute top-4 left-4 right-4 bg-rose-500/90 backdrop-blur-md p-4 rounded-2xl flex items-start space-x-3 shadow-2xl animate-in slide-in-from-top">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1">Hardware Error</p>
              <p className="text-xs font-bold leading-tight">{geoError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-slate-950 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4">
           <button 
             disabled={punchingType !== null || (locating && !location)}
             onClick={() => handleCaptureAndPunch('In')}
             className="bg-sky-500 py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-500/20 active:scale-95 transition disabled:opacity-50"
           >
             {punchingType === 'In' ? 'Processing...' : 'Punch IN'}
           </button>
           <button 
             disabled={punchingType !== null || (locating && !location)}
             onClick={() => handleCaptureAndPunch('Out')}
             className="bg-rose-500 py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition disabled:opacity-50"
           >
             {punchingType === 'Out' ? 'Processing...' : 'Punch OUT'}
           </button>
        </div>
      </div>
    </div>
  );
}
