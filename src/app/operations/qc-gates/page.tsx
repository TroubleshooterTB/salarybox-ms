"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import useStore from "@/store";

interface QC_MO {
  id: string;
  client: string;
  productType: string;
}

const qcStages = [
  "Fabrication QC",
  "Wood Work QC",
  "Powder Coating QC",
  "Weaving QC",
  "Final Assembly QC"
];

export default function QCGatesPage() {
  const router = useRouter();
  const { session } = useStore();
  
  const [pendingMOs, setPendingMOs] = useState<QC_MO[]>([]);
  const [loadingMOs, setLoadingMOs] = useState(true);
  const [activeMo, setActiveMo] = useState<QC_MO | null>(null);
  
  // QC Form State
  const [selectedStage, setSelectedStage] = useState<string>(qcStages[0]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [deviationNotes, setDeviationNotes] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  useEffect(() => {
    fetchPendingMOs();
  }, []);

  const fetchPendingMOs = async () => {
    setLoadingMOs(true);
    const { data, error } = await supabase
      .from('manufacturing_orders')
      .select('mo_id, client_name, priority')
      .lt('status', 5)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingMOs(data.map((d: any) => ({
        id: d.mo_id,
        client: d.client_name,
        productType: d.priority === "High" ? "High Priority Order" : "Standard Order"
      })));
    }
    setLoadingMOs(false);
  };

  const displayToast = (message: string, type: "success" | "error") => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const fileName = `${Date.now()}_${activeMo?.id}_qc.jpg`;
    const { data, error } = await supabase.storage
      .from('qc_images')
      .upload(fileName, photoFile);
    
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    
    const { data: urlData } = supabase.storage.from('qc_images').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const logQCRecord = async (decision: "Pass" | "Reject", imageUrl: string | null) => {
    const { error } = await supabase.from('qc_logs').insert({
      mo_id: activeMo?.id,
      stage: selectedStage,
      decision,
      image_url: imageUrl,
      deviation_notes: deviationNotes,
      logged_by: session?.user?.id
    });
    if (error) throw error;
  };

  const handlePass = async () => {
    if (!photoFile) {
      displayToast("Photo capture is required to PASS.", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const publicUrl = await uploadPhoto();
      await logQCRecord("Pass", publicUrl);
      displayToast(`MO ${activeMo?.id} PASSED ${selectedStage}.`, "success");
      resetAndClose();
    } catch (e) {
      displayToast("Failed to log pass. Try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!deviationNotes.trim()) {
      displayToast("Deviation notes required for REWORK.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const publicUrl = await uploadPhoto();
      await logQCRecord("Reject", publicUrl);
      displayToast(`MO ${activeMo?.id} FLAGGED for Rework.`, "error");
      resetAndClose();
    } catch (e) {
      displayToast("Failed to log reject. Try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setActiveMo(null);
    setPhotoUrl(null);
    setPhotoFile(null);
    setDeviationNotes("");
    setSelectedStage(qcStages[0]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center ${
              showToast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {showToast.type === "success" ? <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> : <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />}
            <span className="font-bold">{showToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-5 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20 flex items-center">
        <button 
          onClick={() => activeMo ? resetAndClose() : router.back()} 
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 text-slate-600 hover:bg-gray-100 transition mr-4 active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">QC Checkpoint</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Floor Inspection</p>
        </div>
      </header>

      <main className="flex-1 px-5 pt-6 w-full max-w-md mx-auto">
        {!activeMo ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex justify-between items-center">
              Pending QC Queue
              {loadingMOs && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            </h2>
            <div className="space-y-3">
              {pendingMOs.length === 0 && !loadingMOs ? (
                <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-medium">
                  No active orders in production.
                </div>
              ) : (
                pendingMOs.map((mo) => (
                  <button
                    key={mo.id}
                    onClick={() => setActiveMo(mo)}
                    className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 active:scale-95 transition text-left flex justify-between items-center"
                  >
                    <div>
                      <span className="text-xs font-black bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg uppercase tracking-wider">{mo.id}</span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{mo.client}</h3>
                      <p className="text-sm font-medium text-slate-500">{mo.productType}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
              <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider">{activeMo.id}</span>
              <h2 className="text-xl font-black text-slate-900 mt-2">{activeMo.client}</h2>
              <p className="text-sm font-bold text-slate-500 mt-1">{activeMo.productType}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Select QC Stage</label>
              <select 
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-4 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none"
              >
                {qcStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef}
                onChange={handlePhotoCapture}
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-95 transition"
              >
                <Camera className="w-8 h-8 mb-1" />
                <span className="font-bold tracking-wide">Capture QC Photo</span>
              </button>
              
              {photoUrl && (
                <div className="mt-4 p-2 bg-white border-2 border-slate-200 rounded-2xl">
                  <img src={photoUrl} alt="QC Preview" className="w-full h-48 object-cover rounded-xl" />
                  <div className="flex items-center justify-center p-2 text-slate-500 font-medium text-sm">
                    <ImageIcon className="w-4 h-4 mr-2" /> Photo attached
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Deviation Notes <span className="text-rose-500 normal-case tracking-normal">(Log deviation {">"} 2mm)</span>
              </label>
              <textarea 
                value={deviationNotes}
                onChange={(e) => setDeviationNotes(e.target.value)}
                rows={3}
                placeholder="Describe any issues..."
                className="w-full bg-white border-2 border-slate-200 text-slate-900 font-medium rounded-xl p-4 focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none"
              />
            </div>
          </motion.div>
        )}
      </main>

      {activeMo && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-30"
        >
          <div className="max-w-md mx-auto flex space-x-3">
            <button 
              onClick={handleReject}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-rose-100 text-rose-700 border-2 border-rose-200 rounded-2xl font-black tracking-widest uppercase flex items-center justify-center active:scale-95 transition disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <XCircle className="w-6 h-6 mr-2" />} Reject
            </button>
            <button 
              onClick={handlePass}
              disabled={isSubmitting}
              className="flex-[1.5] py-4 bg-emerald-500 text-white rounded-2xl font-black tracking-widest uppercase flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6 mr-2" />} Pass
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
