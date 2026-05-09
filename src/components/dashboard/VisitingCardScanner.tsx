import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, Loader2, CheckCircle2, Navigation, Smartphone, Mail, User, Briefcase, Globe, X, ScanLine, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';

interface VisitingCardScannerProps {
  onBack: () => void;
  onScan?: (data: any, images: any) => void;
  prefillStage?: string; // e.g. 'Visiting Card Entry' or 'Field Visit Done'
}

export default function VisitingCardScanner({ onBack, onScan, prefillStage = 'Visiting Card Entry' }: VisitingCardScannerProps) {
  const { session } = useStore();
  const [mode, setMode] = useState<'scan' | 'history'>('scan');
  const [step, setStep] = useState<'capture' | 'review'>('capture');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [images, setImages] = useState<{front?: string, back?: string}>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrData, setOcrData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    designation: ''
  });

  const [activeCapture, setActiveCapture] = useState<'front' | 'back' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (mode === 'history') fetchHistory();
  }, [mode]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('field_visit_logs')
      .select('*')
      .eq('user_id', session?.user?.id)
      .eq('type', 'Card Scan')
      .order('timestamp', { ascending: false });
    setHistory(data || []);
    setLoadingHistory(false);
  };

  const startCamera = async (side: 'front' | 'back') => {
    setActiveCapture(side);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !activeCapture) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    setImages(prev => ({ ...prev, [activeCapture]: dataUrl }));
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
    setActiveCapture(null);
  };

  const preProcessImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 1. Grayscale
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
        ctx.drawImage(img, 0, 0);
        
        // 2. Simple Thresholding (Manual implementation for browser)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i+1] + data[i+2]) / 3;
          const val = avg > 128 ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });
  };

  const runOCR = async () => {
    if (!images.front) return;
    setIsProcessing(true);
    setOcrProgress(20);
    
    try {
      const base64Image = images.front.split(',')[1];
      // Next.js uses process.env instead of import.meta.env
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY || 'AIzaSyA7Ol5Md6ys-iCMYZAaUD-ZBXran2SDDyM'; 

      setOcrProgress(40);

      // 1. Use Gemini 1.5 Flash for true AI Intelligence
      // Switching to stable v1 endpoint
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Extract the following details from this business card image: Name, Company, Designation, Email, Phone, Website. Return ONLY a valid JSON object with these keys: name, company, designation, email, phone, website. If a field is missing, leave it empty string. Focus on distinguishing the personal name from branding like 'First Select'." },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }]
        })
      });

      setOcrProgress(80);
      const data = await response.json();

      if (data.error) {
        // Fallback to basic OCR if Gemini API is not enabled
        throw new Error(`AI Error: ${data.error.message}. Please ensure "Generative Language API" is enabled in your Google Console.`);
      }

      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("AI failed to read the card. Please ensure the photo is clear.");

      // Clean the JSON response (Gemini sometimes adds markdown blocks)
      const jsonStr = resultText.replace(/```json|```/g, '').trim();
      const extracted = JSON.parse(jsonStr);

      setOcrData({
        name: extracted.name || '',
        company: extracted.company || '',
        designation: extracted.designation || '',
        email: extracted.email || '',
        phone: extracted.phone || '',
        website: extracted.website || ''
      });

      setOcrProgress(100);
      setStep('review');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'AI Processing failed. Please enter details manually.');
      setStep('review');
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Upload Images to Supabase
      const uploadImage = async (dataUrl: string, suffix: string) => {
        const blob = await (await fetch(dataUrl)).blob();
        const path = `cards/${session?.user?.id}/${Date.now()}_${suffix}.jpg`;
        const { error } = await supabase.storage.from('selfies').upload(path, blob);
        if (error) throw error;
        return supabase.storage.from('selfies').getPublicUrl(path).data.publicUrl;
      };

      const frontUrl = images.front ? await uploadImage(images.front, 'front') : null;
      const backUrl = images.back ? await uploadImage(images.back, 'back') : null;

      // 2. Sync to Odoo
      const response = await fetch('/api/odoo/crm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token') ? JSON.parse(localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token')!).access_token : ''}`
        },
        body: JSON.stringify({
          name: ocrData.company || ocrData.name || 'New Card Lead',
          contact_name: ocrData.name,
          email: ocrData.email,
          phone: ocrData.phone,
          street: ocrData.website,
          category: 'Visiting Card',
          notes: `Visiting Card Scan.\nDesignation: ${ocrData.designation}\nFront: ${frontUrl}\nBack: ${backUrl}`,
          stage: prefillStage // Custom stage
        })
      });

      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error);

      // 3. Save to local history (field_visit_logs)
      await supabase.from('field_visit_logs').insert({
        user_id: session?.user?.id,
        type: 'Card Scan',
        note: `Scanned: ${ocrData.name} (${ocrData.company}).\nDesignation: ${ocrData.designation}`,
        photo_url: frontUrl,
        audio_url: backUrl, // Reusing audio_url for back image link
        timestamp: new Date().toISOString()
      });

      if (onScan) {
        onScan(ocrData, { front: frontUrl, back: backUrl });
      }

      alert('Lead created successfully in Odoo!');
      onBack();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pt-6 shrink-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg font-black ml-2 leading-none">Card Scanner</h2>
            <p className="text-[9px] font-bold text-brand-400 ml-2 mt-1 uppercase tracking-widest">OCR Powered Data Entry</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500">
          <ScanLine className="w-5 h-5" />
        </div>
        <div className="flex items-center space-x-2">
           <button 
            onClick={() => setMode('scan')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${mode === 'scan' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
           >
              Scan
           </button>
           <button 
            onClick={() => setMode('history')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${mode === 'history' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
           >
              History
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-20 custom-scrollbar">
        {mode === 'history' ? (
          <div className="space-y-4">
             {loadingHistory ? (
               <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
             ) : history.length === 0 ? (
               <div className="text-center py-20 opacity-50">
                  <ScanLine className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No cards scanned yet</p>
               </div>
             ) : (
               history.map((item, i) => (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   key={item.id}
                   className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center space-x-4"
                 >
                    <div className="w-16 h-16 bg-slate-950 rounded-2xl overflow-hidden shrink-0 border border-slate-800">
                       <img src={item.photo_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-white text-sm truncate">{item.note.split('\n')[0].replace('Scanned: ', '')}</h4>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => window.open(item.photo_url, '_blank')} className="p-2 text-slate-500 hover:text-white transition">
                       <ImageIcon className="w-5 h-5" />
                    </button>
                 </motion.div>
               ))
             )}
          </div>
        ) : step === 'capture' ? (
          <div className="space-y-8">
            <div className="space-y-4">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Scan Visiting Card</h3>
               
               <div className="grid grid-cols-1 gap-4">
                  {/* Front side */}
                  <div className="relative group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Front Side (Required)</p>
                    <div 
                      onClick={() => !images.front && startCamera('front')}
                      className={`h-48 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition overflow-hidden relative ${
                        images.front ? 'border-brand-500 bg-brand-500/5' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      {images.front ? (
                        <>
                          <img src={images.front} className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); setImages(p => ({ ...p, front: undefined })); }} className="absolute top-3 right-3 p-2 bg-slate-950/80 rounded-full text-white backdrop-blur-md">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-slate-700 mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Click to capture front</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Back side */}
                  <div className="relative group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Back Side (Optional)</p>
                    <div 
                      onClick={() => !images.back && startCamera('back')}
                      className={`h-48 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition overflow-hidden relative ${
                        images.back ? 'border-brand-500 bg-brand-500/5' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      {images.back ? (
                        <>
                          <img src={images.back} className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); setImages(p => ({ ...p, back: undefined })); }} className="absolute top-3 right-3 p-2 bg-slate-950/80 rounded-full text-white backdrop-blur-md">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-slate-700 mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capture back side</span>
                        </>
                      )}
                    </div>
                  </div>
               </div>
            </div>

            <button 
              disabled={!images.front || isProcessing}
              onClick={runOCR}
              className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition shadow-xl flex flex-col items-center justify-center space-y-2 ${
                !images.front || isProcessing ? 'bg-slate-800 text-slate-600' : 'bg-brand-500 text-white shadow-brand-500/20 active:scale-95 hover:bg-brand-400'
              }`}
            >
              <div className="flex items-center space-x-3">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
                <span>{isProcessing ? `Processing (${ocrProgress}%)` : 'Scan & Extract Info'}</span>
              </div>
              {isProcessing && (
                <div className="w-48 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${ocrProgress}%` }}
                    className="h-full bg-brand-500"
                  />
                </div>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="bg-brand-500/10 border border-brand-500/20 p-5 rounded-3xl space-y-1">
                <h3 className="text-sm font-black text-white">Review extracted data</h3>
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Verify and edit if needed</p>
             </div>

             <div className="space-y-4">
                {[
                  { key: 'name', label: 'Contact Name', icon: User },
                  { key: 'company', label: 'Company Name', icon: Briefcase },
                  { key: 'designation', label: 'Designation', icon: Briefcase },
                  { key: 'email', label: 'Email Address', icon: Mail },
                  { key: 'phone', label: 'Phone Number', icon: Smartphone },
                  { key: 'website', label: 'Website / Link', icon: Globe },
                ].map(field => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                    <div className="relative">
                       <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                       <input 
                        type="text" 
                        value={(ocrData as any)[field.key]}
                        onChange={e => setOcrData({ ...ocrData, [field.key]: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-brand-500 transition"
                       />
                    </div>
                  </div>
                ))}
             </div>

             <div className="flex space-x-3 pt-6">
                <button onClick={() => setStep('capture')} className="flex-1 py-5 bg-slate-900 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest border border-slate-800">
                  Rescan
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="flex-[2] py-5 bg-brand-500 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> <span>Sync to Odoo CRM</span></>}
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Camera Overlay */}
      <AnimatePresence>
        {showCamera && (
          <div className="fixed inset-0 z-[200] bg-black flex flex-col">
             <div className="relative flex-1">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 border-[40px] border-black/40 flex items-center justify-center pointer-events-none">
                   <div className="w-full max-w-[80%] aspect-[1.6/1] border-2 border-brand-500/50 rounded-2xl relative">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-500 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-500 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-500 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-500 rounded-br-xl" />
                   </div>
                </div>
             </div>

             <div className="h-40 bg-slate-950 flex items-center justify-around px-10">
                <button onClick={stopCamera} className="p-4 text-slate-400"><X className="w-8 h-8" /></button>
                <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-8 border-slate-800 active:scale-90 transition" />
                <div className="w-16" /> {/* Spacer */}
             </div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
