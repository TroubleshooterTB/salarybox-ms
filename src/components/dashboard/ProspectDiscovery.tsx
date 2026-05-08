import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MapPin, Navigation, Clock, Star, CheckCircle2, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    google: any;
  }
}

interface ProspectDiscoveryProps {
  onBack: () => void;
  onSelect: (place: any) => void;
}

const CATEGORIES = [
  { id: 'architect', label: 'Architects', keyword: 'architect' },
  { id: 'builder', label: 'Builders', keyword: 'builder construction' },
  { id: 'designer', label: 'Interior Designers', keyword: 'interior designer' },
  { id: 'pmc', label: 'PMC', keyword: 'project management consultancy' },
  { id: 'landscape', label: 'Landscape', keyword: 'landscape architect' },
];

export default function ProspectDiscovery({ onBack, onSelect }: ProspectDiscoveryProps) {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [radius, setRadius] = useState(5000); // 5km
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPos, setCurrentPos] = useState<{lat: number, lng: number} | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<any>(null);

  const [debugStatus, setDebugStatus] = useState({
    script: 'Checking...',
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Detected' : 'Missing',
    gps: 'Waiting...'
  });

  useEffect(() => {
    // Load Google Maps Script
    if (!window.google) {
      setDebugStatus(prev => ({ ...prev, script: 'Loading...' }));
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBWisX1RzTF_dd1ePP8LsV2asg2MpexCqg&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!window.google.maps.places) {
          setDebugStatus(prev => ({ ...prev, script: 'Error (No Places)' }));
          alert('Google Places library failed to load. Please verify your API Key has Places API enabled.');
          setLoading(false);
        } else {
          setDebugStatus(prev => ({ ...prev, script: 'Loaded' }));
          setMapLoaded(true);
        }
      };
      script.onerror = () => {
        setDebugStatus(prev => ({ ...prev, script: 'Network Error' }));
        alert('Failed to load Google Maps script. Check your internet or API key.');
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      setDebugStatus(prev => ({ ...prev, script: 'Loaded' }));
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      const timeoutId = setTimeout(() => {
        if (loading && !currentPos) {
          setDebugStatus(prev => ({ ...prev, gps: 'Timed Out' }));
          setLoading(false);
        }
      }, 5000); // 5s timeout for auto-load

      navigator.geolocation.getCurrentPosition(
        (p) => {
          clearTimeout(timeoutId);
          setDebugStatus(prev => ({ ...prev, gps: 'OK' }));
          const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
          setCurrentPos(pos);
          searchPlaces(pos);
        },
        (error) => {
          clearTimeout(timeoutId);
          setDebugStatus(prev => ({ ...prev, gps: 'Failed' }));
          console.error('Geo error:', error);
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, [mapLoaded, selectedCategory, radius]);

  const searchPlaces = async (pos: {lat: number, lng: number}) => {
    if (!window.google || !pos) return;
    
    setLoading(true);
    setPlaces([]);
    
    try {
      // Import libraries for New API
      const { Place } = await window.google.maps.importLibrary("places");
      
      const request = {
        textQuery: `${selectedCategory.label} near me`,
        fields: ["displayName", "location", "businessStatus", "rating", "userRatingCount", "formattedAddress", "id", "types"],
        locationRestriction: {
          center: { lat: pos.lat, lng: pos.lng },
          radius: radius,
        },
        maxResultCount: 20,
      };

      const { places: results } = await Place.searchText(request);
      
      // Transform new format to a standard format for our UI
      const formattedResults = results.map((p: any) => ({
        place_id: p.id,
        name: p.displayName?.text || 'Unknown',
        rating: p.rating,
        vicinity: p.formattedAddress,
        geometry: {
          location: {
            lat: p.location.lat(),
            lng: p.location.lng()
          }
        },
        types: p.types
      }));

      setPlaces(formattedResults);
      setLoading(false);
    } catch (err: any) {
      console.error('New Search error:', err);
      alert(`Search Error: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleAreaSearch = async () => {
    if (!searchTerm || !window.google) return;
    setLoading(true);
    setPlaces([]);
    
    try {
      const { Place } = await window.google.maps.importLibrary("places");
      const request = {
        textQuery: searchTerm,
        fields: ["location"],
        maxResultCount: 1,
      };

      const { places: results } = await Place.searchText(request);
      
      if (results && results.length > 0) {
        const pos = {
          lat: results[0].location.lat(),
          lng: results[0].location.lng()
        };
        setCurrentPos(pos);
        searchPlaces(pos);
      } else {
        alert('Area not found');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Area Search error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pt-6 shrink-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="flex items-center mb-6">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold ml-2">Prospect Discovery</h2>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Search any area (e.g. Bandra, Mumbai)" 
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-24 text-sm font-bold text-white focus:border-brand-500 transition outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAreaSearch()}
          />
          <button 
            onClick={handleAreaSearch}
            className="absolute right-2 top-2 bottom-2 bg-brand-500 text-white px-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition"
          >
            Find
          </button>
        </div>

        {/* Categories */}
        <div className="flex space-x-2 overflow-x-auto pb-4 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition border ${
                selectedCategory.id === cat.id 
                  ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/30' 
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Radius Filter */}
        <div className="flex items-center justify-between mt-2 px-2">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Radius: {(radius/1000).toFixed(1)} km</span>
           <input 
            type="range" 
            min="1000" 
            max="20000" 
            step="1000" 
            value={radius} 
            onChange={e => setRadius(parseInt(e.target.value))}
            className="w-2/3 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
           />
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar relative">
        {/* Status Dashboard */}
        <div className="flex items-center justify-center space-x-4 mb-4 py-2 bg-slate-900/30 rounded-xl border border-white/5">
           <div className="flex flex-col items-center">
              <span className="text-[7px] font-black uppercase text-slate-500">Script</span>
              <span className={`text-[8px] font-bold ${debugStatus.script === 'Loaded' ? 'text-emerald-400' : 'text-amber-400'}`}>{debugStatus.script}</span>
           </div>
           <div className="w-px h-4 bg-slate-800" />
           <div className="flex flex-col items-center">
              <span className="text-[7px] font-black uppercase text-slate-500">Key</span>
              <span className={`text-[8px] font-bold ${debugStatus.key === 'Detected' ? 'text-emerald-400' : 'text-rose-400'}`}>{debugStatus.key}</span>
           </div>
           <div className="w-px h-4 bg-slate-800" />
           <div className="flex flex-col items-center">
              <span className="text-[7px] font-black uppercase text-slate-500">GPS</span>
              <span className={`text-[8px] font-bold ${debugStatus.gps === 'OK' ? 'text-emerald-400' : 'text-amber-400'}`}>{debugStatus.gps}</span>
           </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest text-center px-10">Scouting Nearby Prospects... <br/>(Ensure GPS is on)</p>
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-20 px-6">
             <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-slate-700" />
             </div>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">No nearby prospects found.</p>
             <p className="text-slate-600 text-[10px] font-medium leading-relaxed">Try increasing the radius or search for a specific area like "Bandra" using the bar above.</p>
          </div>
        ) : (
          places.map((place, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={place.place_id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-white text-lg truncate leading-tight">{place.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                     <div className="flex items-center text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px] font-black ml-1">{place.rating || 'N/A'}</span>
                     </div>
                     <span className="text-slate-600">•</span>
                     <p className="text-[10px] font-bold text-slate-500 truncate">{place.vicinity}</p>
                  </div>
                </div>
                {place.opening_hours && (
                   <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center space-x-1 ${
                      place.opening_hours.open_now ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                   }`}>
                      <Clock className="w-2.5 h-2.5" />
                      <span>{place.opening_hours.open_now ? 'Open Now' : 'Closed'}</span>
                   </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-2">
                 <button 
                  onClick={() => onSelect(place)}
                  className="flex-1 bg-brand-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition flex items-center justify-center space-x-2"
                 >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Visit This Location</span>
                 </button>
                 <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name)}&destination_place_id=${place.place_id}`, '_blank')}
                  className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95"
                 >
                    <Navigation className="w-6 h-6" />
                 </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
