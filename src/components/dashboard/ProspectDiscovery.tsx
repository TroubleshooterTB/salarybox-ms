import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MapPin, Navigation, Clock, Star, CheckCircle2, Loader2, Info, X, ChevronRight, Smartphone, MessageCircle, AlertCircle, Sparkles, CheckCircle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

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
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState<any>(null);
  const [generatedPitch, setGeneratedPitch] = useState<string | null>(null);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [previousVisits, setPreviousVisits] = useState<any[]>([]);
  const [checkingHistory, setCheckingHistory] = useState(false);
  const [showSyncForm, setShowSyncForm] = useState<any>(null);
  const [formData, setFormData] = useState({
    contact_name: '',
    email: '',
    phone: '',
    expected_revenue: '',
    notes: ''
  });

  const generatePitch = (place: any) => {
    setIsGeneratingPitch(true);
    setTimeout(() => {
      const type = place.types?.includes('architect') ? 'Architect' : 'Professional';
      const websiteMention = place.website ? `I was checking out your website (${new URL(place.website).hostname}) and your portfolio is outstanding.` : '';
      const pitch = `Hello! I'm reaching out from Minimal Stroke. ${websiteMention} We saw your work as a ${type} and would love to discuss how our premium interior materials can add value to your upcoming projects at ${place.name}. Would you be open to a quick 5-min chat?`;
      setGeneratedPitch(pitch);
      setIsGeneratingPitch(false);
    }, 1000);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkHistory = async (place: any) => {
    setCheckingHistory(true);
    try {
      const { data } = await supabase
        .from('field_visit_logs')
        .select('*, visit_id(user_id, profiles(full_name))')
        .ilike('note', `%GPID:${place.place_id}%`)
        .order('timestamp', { ascending: false });
      
      setPreviousVisits(data || []);
      setShowBrief(place);
    } catch (e) {
      console.error('History check failed:', e);
      setShowBrief(place);
    } finally {
      setCheckingHistory(false);
    }
  };

  const syncToOdoo = async (place: any) => {
    setSyncingId(place.place_id);
    try {
      const response = await fetch('/api/odoo/crm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token') ? JSON.parse(localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token')!).access_token : ''}`
        },
        body: JSON.stringify({
          name: place.name,
          street: place.vicinity,
          rating: place.rating,
          place_id: place.place_id,
          category: selectedCategory.label,
          ...formData
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Opportunity created in Odoo CRM (Field Visit Done stage)!`);
        setShowSyncForm(null);
        setFormData({ contact_name: '', email: '', phone: '', expected_revenue: '', notes: '' });
      } else {
        throw new Error(data.error || 'Failed to sync with Odoo');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingId(null);
    }
  };

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBWisX1RzTF_dd1ePP8LsV2asg2MpexCqg&libraries=places&v=weekly`;
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
  }, [mapLoaded]);

  useEffect(() => {
    if (currentPos) {
      searchPlaces(currentPos);
    }
  }, [selectedCategory, radius, currentPos]);

  const searchPlaces = async (pos: {lat: number, lng: number}) => {
    if (!window.google || !pos) return;
    
    setLoading(true);
    setPlaces([]);
    
    try {
      const { Place } = await window.google.maps.importLibrary("places");
      
      const request = {
        textQuery: `${selectedCategory.label} in this area`,
        fields: ["displayName", "location", "businessStatus", "rating", "userRatingCount", "formattedAddress", "id", "types", "websiteUri", "editorialSummary"],
        locationBias: {
          center: { lat: pos.lat, lng: pos.lng },
          radius: radius,
        },
        maxResultCount: 20,
      };

      const { places: results } = await Place.searchByText(request);
      
      // Transform new format to a standard format for our UI
      const formattedResults = results.map((p: any) => ({
        place_id: p.id,
        name: p.displayName || p.displayName?.text || p.name || 'Unknown Business',
        rating: p.rating,
        vicinity: p.formattedAddress,
        geometry: {
          location: {
            lat: p.location.lat(),
            lng: p.location.lng()
          }
        },
        types: p.types,
        website: p.websiteUri,
        summary: p.editorialSummary?.text
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

      const { places: results } = await Place.searchByText(request);
      
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

               <div className="flex items-center space-x-2 pt-2">
                  <button 
                    onClick={() => checkHistory(place)}
                    className="flex-1 py-4 bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-400 active:scale-95 transition flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Insights</span>
                  </button>
                  <button 
                   disabled={syncingId === place.place_id}
                    onClick={() => {
                      setShowSyncForm(place);
                      setFormData(prev => ({ ...prev, contact_name: place.name, place_id: place.place_id }));
                    }}
                   className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center space-x-2 ${
                     syncingId === place.place_id ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-brand-400 border border-brand-500/20 hover:bg-slate-700'
                   }`}
                  >
                     {syncingId === place.place_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                     <span>CRM</span>
                  </button>
                  <button 
                   onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name)}&destination_place_id=${place.place_id}`, '_blank')}
                   className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95"
                  >
                     <Navigation className="w-5 h-5" />
                  </button>
               </div>
            </motion.div>
          ))
        )}
      </div>

      {/* CRM Sync Modal */}
      <AnimatePresence>
        {showSyncForm && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowSyncForm(null)}
               className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, y: 100, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 100, scale: 0.9 }}
               className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
             >
                <div className="space-y-1">
                   <h3 className="text-xl font-black text-white">Sync to Odoo CRM</h3>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Adding to "Field Visit Done" Stage</p>
                </div>

                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Name</label>
                      <input 
                        type="text" 
                        value={formData.contact_name}
                        onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="Name of person met"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-brand-500 transition"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                        <input 
                          type="email" 
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder="Email address"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-brand-500 transition"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                        <input 
                          type="tel" 
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Phone number"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-brand-500 transition"
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Expected Revenue</label>
                      <input 
                        type="number" 
                        value={formData.expected_revenue}
                        onChange={e => setFormData({ ...formData, expected_revenue: e.target.value })}
                        placeholder="Amount in INR"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-brand-500 transition"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visit Notes (Internal)</label>
                      <textarea 
                        rows={3}
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Key takeaways from this visit..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-medium text-white outline-none focus:border-brand-500 transition resize-none"
                      />
                   </div>
                </div>

                <div className="flex space-x-3 pt-2">
                   <button 
                    onClick={() => setShowSyncForm(null)}
                    className="flex-1 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-800 hover:text-white transition"
                   >
                      Cancel
                   </button>
                   <button 
                    disabled={syncingId !== null}
                    onClick={() => syncToOdoo(showSyncForm)}
                    className="flex-[2] py-5 bg-brand-500 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition flex items-center justify-center space-x-2"
                   >
                      {syncingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Navigation className="w-4 h-4" /> <span>Sync to Odoo</span></>}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
      {/* Prospect Brief & Insights Modal */}
      <AnimatePresence>
        {showBrief && (
          <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowBrief(null)}
               className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
             />
             <motion.div 
               initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
               className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-[3.5rem] p-8 pb-12 shadow-2xl overflow-hidden"
             >
                {/* Handle for bottom sheet feel */}
                <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto -mt-4 mb-6" />

                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center text-brand-500">
                         <MapPin className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                         <h3 className="text-xl font-black text-white truncate">{showBrief.name}</h3>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedCategory.label} Insight</p>
                      </div>
                   </div>
                   <button onClick={() => setShowBrief(null)} className="p-2 text-slate-500 hover:text-white transition">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                   {/* Website Quick Link */}
                   {showBrief.website && (
                     <button 
                      onClick={() => window.open(showBrief.website, '_blank')}
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:border-brand-500/50 transition group"
                     >
                        <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 bg-brand-500/10 text-brand-400 rounded-lg flex items-center justify-center">
                              <Globe className="w-4 h-4" />
                           </div>
                           <div className="text-left">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Business Website</p>
                              <p className="text-xs font-bold text-brand-400 truncate max-w-[150px]">{new URL(showBrief.website).hostname}</p>
                           </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-brand-500 transition" />
                     </button>
                   )}

                   {/* Summary Insight */}
                   {showBrief.summary && (
                     <div className="bg-brand-500/5 border border-brand-500/20 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                           <Info className="w-3 h-3" />
                           <span>Business Intel</span>
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"{showBrief.summary}"</p>
                     </div>
                   )}
                   {/* Previous Visits Alert */}
                   {previousVisits.length > 0 ? (
                     <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center space-x-2 text-amber-500">
                           <Clock className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Already Visited</span>
                        </div>
                        <p className="text-xs text-amber-200/80 font-medium">
                           This prospect was visited by <span className="text-amber-400">{(previousVisits[0].visit_id as any)?.profiles?.full_name || 'Staff'}</span> on {new Date(previousVisits[0].timestamp).toLocaleDateString()}.
                        </p>
                     </div>
                   ) : (
                     <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center space-x-3 text-emerald-500">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Fresh Prospect</span>
                     </div>
                   )}

                   {/* AI/Business Suggestions */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preparation Guide</h4>
                      <div className="space-y-3">
                         <div className="flex items-start space-x-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                            <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                               <Smartphone className="w-3 h-3" />
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                               {showBrief.types?.includes('architect') ? 'Ask about their current portfolio and upcoming design projects.' : 'Focus on the quality and durability of our materials for their ongoing construction.'}
                            </p>
                         </div>
                         <div className="flex items-start space-x-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                            <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                               <Star className="w-3 h-3" />
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                               {showBrief.rating > 4 ? 'This business has a great reputation. Highlight how our premium services match their standards.' : 'They might be looking for more reliable partners. Emphasize our timely delivery and support.'}
                            </p>
                         </div>
                      </div>
                   </div>

                   {/* AI Pitch Generator */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">AI Pitch Generator</h4>
                         <button 
                          onClick={() => generatePitch(showBrief)}
                          disabled={isGeneratingPitch}
                          className="text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center space-x-1 hover:text-brand-300 transition"
                         >
                            <Sparkles className="w-3 h-3" />
                            <span>{generatedPitch ? 'Regenerate' : 'Generate'}</span>
                         </button>
                      </div>
                      
                      {isGeneratingPitch ? (
                        <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center space-y-3">
                           <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Crafting custom pitch...</p>
                        </div>
                      ) : generatedPitch ? (
                        <div className="bg-brand-500/5 border border-brand-500/20 p-5 rounded-2xl space-y-4 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition">
                              <MessageCircle className="w-12 h-12 text-brand-500" />
                           </div>
                           <p className="text-xs text-slate-300 leading-relaxed italic font-medium">"{generatedPitch}"</p>
                           <button 
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generatedPitch)}`, '_blank')}
                            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2"
                           >
                              <MessageCircle className="w-4 h-4" />
                              <span>Send via WhatsApp</span>
                           </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => generatePitch(showBrief)}
                          className="w-full py-8 bg-slate-950/50 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 hover:border-brand-500/30 hover:text-brand-500 transition group"
                        >
                           <Sparkles className="w-6 h-6 mb-2 group-hover:scale-110 transition" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Generate Custom Pitch</span>
                        </button>
                      )}
                   </div>
                </div>

                <div className="mt-8 space-y-3">
                   <button 
                    onClick={() => {
                      if (currentPos && showBrief.geometry?.location) {
                        const dist = calculateDistance(
                          currentPos.lat, 
                          currentPos.lng, 
                          showBrief.geometry.location.lat, 
                          showBrief.geometry.location.lng
                        );
                        if (dist > 0.2) { // 200m geofence
                          alert(`Verification Failed: You are ${(dist * 1000).toFixed(0)}m away. You must be within 200m of ${showBrief.name} to confirm the visit.`);
                          return;
                        }
                      }
                      onSelect(showBrief);
                      setShowBrief(null);
                      setGeneratedPitch(null);
                    }}
                    className="w-full py-5 bg-brand-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/30 active:scale-95 transition flex items-center justify-center space-x-2"
                   >
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirm Arrival</span>
                   </button>
                   <p className="text-[9px] font-bold text-slate-600 text-center uppercase tracking-widest">
                      <AlertCircle className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                      Geofence Verification Enabled (200m)
                   </p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
