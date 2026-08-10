"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, AlertTriangle, MoreHorizontal, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import MODetailSheet, { MO } from "../components/MODetailSheet";
import { supabase } from "@/lib/supabase";

const columns = [
  { id: 1, title: "Admin Scrutiny", owner: "Operations Manager", color: "bg-blue-50 border-blue-200 text-blue-800" },
  { id: 2, title: "Planning & BOM", owner: "Production Engineer", color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  { id: 3, title: "Procurement", owner: "Purchase Manager", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { id: 4, title: "Active Production", owner: "Factory Manager", color: "bg-rose-50 border-rose-200 text-rose-800" },
  { id: 5, title: "Final QC & Dispatch", owner: "Logistics Manager", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
];

export default function MOTrackerPage() {
  const router = useRouter();
  const [mos, setMos] = useState<MO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMoId, setSelectedMoId] = useState<string | null>(null);

  useEffect(() => {
    fetchMOs();
  }, []);

  const fetchMOs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('manufacturing_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData: MO[] = data.map((row: any) => {
        const deadlineDate = new Date(row.sla_deadline);
        const orderDate = new Date(row.order_date);
        const isOverdue = deadlineDate < new Date() && row.status < 5;
        
        return {
          id: row.mo_id,
          client: row.client_name,
          priority: row.priority,
          deadline: `Due: ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          owner: row.current_owner,
          status: row.status,
          orderDate: orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          isOverdue
        };
      });
      setMos(formattedData);
    }
    setLoading(false);
  };

  const selectedMo = mos.find(m => m.id === selectedMoId) || null;

  const handleAdvance = async (moId: string) => {
    const moToAdvance = mos.find(m => m.id === moId);
    if (!moToAdvance || moToAdvance.status >= 5) return;

    const nextStatus = moToAdvance.status + 1;
    const nextOwner = columns.find(c => c.id === nextStatus)?.owner || "Unknown";

    // Optimistic Update
    setMos(prev => prev.map(m => {
      if (m.id === moId) {
        return { ...m, status: nextStatus, owner: nextOwner };
      }
      return m;
    }));
    setSelectedMoId(null);

    // Database Mutation
    const { error } = await supabase
      .from('manufacturing_orders')
      .update({ status: nextStatus, current_owner: nextOwner })
      .eq('mo_id', moId);

    if (error) {
      console.error("Failed to update MO", error);
      // Fallback fetch if failed
      fetchMOs();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-hidden">
      <header className="px-5 py-4 bg-white border-b border-gray-100 shadow-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-slate-600 hover:bg-gray-100 transition mr-3 active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Live MO Tracker</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Production Kanban</p>
          </div>
        </div>
        <div className="flex space-x-1">
          {columns.map(c => (
            <div key={c.id} className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-x-auto snap-x snap-mandatory flex items-start pt-6 pb-10 px-5 space-x-4 scrollbar-hide">
        {columns.map((col) => {
          const colMos = mos.filter(m => m.status === col.id);
          
          return (
            <div key={col.id} className="snap-center shrink-0 w-[85vw] max-w-sm h-[calc(100vh-140px)] flex flex-col">
              
              <div className={`p-4 rounded-t-2xl border-t border-x border-b-4 ${col.color} shrink-0`}>
                <div className="flex justify-between items-center mb-1">
                  <h2 className="font-bold tracking-tight">{col.title}</h2>
                  <span className="bg-white/50 text-current text-xs font-black px-2 py-0.5 rounded-md shadow-sm">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : colMos.length}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Owner: {col.owner}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto bg-gray-100/50 border-x border-b border-gray-200 rounded-b-2xl p-3 space-y-3">
                {loading ? (
                  // Skeleton Loaders
                  <>
                    {[1, 2].map(i => (
                      <div key={i} className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 animate-pulse h-28" />
                    ))}
                  </>
                ) : colMos.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-sm font-medium text-slate-400 border-2 border-dashed border-gray-200 rounded-xl">
                    No active MOs
                  </div>
                ) : (
                  colMos.map((mo) => (
                    <motion.div 
                      key={mo.id}
                      layoutId={mo.id}
                      onClick={() => setSelectedMoId(mo.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`bg-white p-3.5 rounded-xl shadow-sm border transition cursor-pointer relative overflow-hidden ${mo.isOverdue ? 'border-l-4 border-l-rose-500 border-y-rose-200 border-r-rose-200 bg-rose-50/30' : 'border-slate-200'}`}
                    >
                      {mo.isOverdue && (
                        <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                          Overdue
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-slate-400 tracking-widest">{mo.id}</span>
                        {mo.priority === "High" && !mo.isOverdue && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 mt-1 shadow-sm shadow-orange-500/50" />
                        )}
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-sm leading-tight mb-3 pr-4">{mo.client}</h3>
                      
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className={`flex items-center ${mo.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5 mr-1 opacity-80" />
                          {mo.deadline}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                          <MoreHorizontal className="w-3 h-3" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              
            </div>
          );
        })}
        <div className="shrink-0 w-2 h-full" />
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <MODetailSheet 
        isOpen={selectedMoId !== null} 
        onClose={() => setSelectedMoId(null)} 
        mo={selectedMo}
        onAdvance={handleAdvance}
      />
    </div>
  );
}
