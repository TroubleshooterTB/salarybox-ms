"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CheckCircle2, TrendingUp, Handshake, Globe, PackageOpen, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function FranchisePortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "roadmap">("overview");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ entityName: "", targetZone: "", email: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "financials", label: "Financials" },
    { id: "roadmap", label: "Roadmap" }
  ];

  const financialData = [
    { label: "Average Monthly Revenue (Projected)", amount: "₹ 10,00,000", pct: "100%", isBold: true },
    { label: "Cost of Goods Sold (COGS)", amount: "₹ 2,50,000", pct: "25%" },
    { label: "Logistics & Handling", amount: "₹ 50,000", pct: "5%" },
    { label: "Franchise OPEX (Rent, Staff, Utils)", amount: "₹ 1,50,000", pct: "15%" },
  ];

  const roadmapSteps = [
    { step: 1, title: "Application & Zone Lock", desc: "Submit partner profile and lock exclusive territory rights." },
    { step: 2, title: "Financial Vetting & ROI Alignment", desc: "Detailed review of the 55% Net Profit model and investment clarity." },
    { step: 3, title: "Studio Space Audit & Floor Plan", desc: "Site visit and customized layout design by MS Architecture team." },
    { step: 4, title: "Display Inventory Dispatch", desc: "Curation and dispatch of Arowwai & Liso Urbano flagship lines." },
    { step: 5, title: "Launch & System Training", desc: "Onboarding onto MS Salarybox / ERP and official store launch." },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase.from('franchise_leads').insert({
      entity_name: formData.entityName,
      target_zone: formData.targetZone,
      contact_email: formData.email,
      contact_phone: formData.phone
    });

    setIsSubmitting(false);
    
    if (!error) {
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowForm(false);
        setSubmitSuccess(false);
        setFormData({ entityName: "", targetZone: "", email: "", phone: "" });
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 selection:bg-slate-200 font-sans">
      
      <header className="px-6 py-5 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 transition mr-4 border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Partner Portal</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">B2B Franchise Deck</p>
          </div>
        </div>
        <Handshake className="w-6 h-6 text-slate-800" />
      </header>

      <div className="px-6 pt-6 pb-2 bg-white border-b border-slate-200">
        <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setShowForm(false); // Reset form view if switching tabs
              }}
              className={`pb-4 px-1 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition relative ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-6 pt-8 w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-[1.1] tracking-tight">
                  Minimal Stroke Franchise & Institutional Partnerships
                </h2>
                <p className="text-slate-500 font-medium mt-3 text-sm leading-relaxed">
                  Join India's fastest-growing premium furniture brand. We build the products, supply the tech, and guarantee the margins.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-slate-800" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Active Pilot Zone</h3>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Chatrapati Sambhajinagar</h4>
                <p className="text-slate-600 font-semibold mt-1">Zone 1</p>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-200">
                    Open for Applications
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4 flex items-center">
                  <Globe className="w-4 h-4 mr-2" /> Core Value Proposition
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-slate-800 mr-3 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-slate-600 leading-snug">
                      <strong className="text-slate-900">Made in India:</strong> Premium, in-house manufacturing for reliable quality control.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-slate-800 mr-3 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-slate-600 leading-snug">
                      <strong className="text-slate-900">PWA Tech Support:</strong> End-to-end integration with MS Salarybox and our custom ERP.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-slate-800 mr-3 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-slate-600 leading-snug">
                      <strong className="text-slate-900">Zero Supply Chain Headaches:</strong> We manage procurement, production, and primary logistics.
                    </span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === "financials" && (
            <motion.div
              key="financials"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Interactive ROI Model</h2>
                <p className="text-slate-500 font-medium mt-1 text-sm">Projected unit economics for a standard 1,500 sq.ft. studio.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Monthly Projections</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {financialData.map((item, idx) => (
                    <div key={idx} className={`p-4 flex justify-between items-center ${item.isBold ? 'bg-slate-50' : 'bg-white'}`}>
                      <span className={`text-sm ${item.isBold ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>{item.label}</span>
                      <div className="text-right">
                        <span className={`block text-sm ${item.isBold ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>{item.amount}</span>
                        <span className="text-[10px] font-bold text-slate-400">{item.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-5 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                  <div className="relative z-10">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" /> Final Net Profit
                    </h3>
                    <p className="text-[10px] font-medium text-slate-300">After fixed OPEX</p>
                  </div>
                  <div className="text-right relative z-10">
                    <span className="block text-xl font-black">₹ 5,50,000</span>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded">
                      Strict 55% Margin
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "roadmap" && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {!showForm ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Onboarding Pipeline</h2>
                    <p className="text-slate-500 font-medium mt-1 text-sm">The 5-step journey to launching your exclusive franchise.</p>
                  </div>

                  <div className="relative">
                    {roadmapSteps.map((step, idx) => {
                      const isLast = idx === roadmapSteps.length - 1;
                      return (
                        <div key={idx} className="flex relative mb-8">
                          {!isLast && (
                            <div className="absolute top-10 left-5 bottom-[-32px] w-0.5 bg-slate-200 z-0" />
                          )}
                          
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-white shrink-0 z-10 shadow-md">
                            {step.step}
                          </div>
                          
                          <div className="ml-5 flex-1 pt-1">
                            <h3 className="font-bold text-lg tracking-tight text-slate-900">{step.title}</h3>
                            <p className="text-sm font-medium text-slate-600 mt-2 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-200 mb-10">
                    <button 
                      onClick={() => setShowForm(true)}
                      className="w-full py-4 bg-slate-900 text-white font-bold tracking-widest uppercase rounded-xl shadow-lg active:scale-95 transition flex justify-center items-center"
                    >
                      <PackageOpen className="w-5 h-5 mr-2" /> Apply for Franchise
                    </button>
                  </div>
                </>
              ) : submitSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Application Received</h2>
                  <p className="text-slate-500 font-medium">Our B2B team will reach out to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 mb-10">
                  <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Partner Application</h2>
                    <button type="button" onClick={() => setShowForm(false)} className="text-sm font-bold text-slate-400">Cancel</button>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Entity / Company Name</label>
                    <input required type="text" value={formData.entityName} onChange={e => setFormData({...formData, entityName: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Target Zone / City</label>
                    <input required type="text" value={formData.targetZone} onChange={e => setFormData({...formData, targetZone: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Contact Email</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Phone Number</label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition font-medium" />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 mt-4 bg-slate-900 text-white font-bold tracking-widest uppercase rounded-xl shadow-lg active:scale-95 transition flex justify-center items-center disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application"}
                  </button>
                </form>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
