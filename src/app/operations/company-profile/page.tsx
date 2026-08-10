"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Target, Eye, ShieldCheck, Building2 } from "lucide-react";
import { motion } from "framer-motion";

export default function CompanyProfilePage() {
  const router = useRouter();

  const governance = [
    { name: "Amit Gandhi", role: "Managing Director" },
    { name: "Ninad Shah", role: "Co-Director & CEO" },
    { name: "Tushar Bansode", role: "COO / General Manager" },
    { name: "Yogesh Shah", role: "Professional Director" },
    { name: "Ar. Meena Gandhi", role: "Professional Director" },
    { name: "CA Anil Jain", role: "Fractional CFO" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="px-5 py-6 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-20 flex items-center">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-slate-600 hover:bg-gray-100 transition mr-4 active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Company Profile</h1>
      </header>

      {/* Hero Section */}
      <div className="bg-white px-5 py-10 border-b border-gray-200">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Minimal Stroke
          </h2>
          <p className="text-lg font-medium text-slate-500 mt-1">Furniture & Beyond</p>
          
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wide border border-blue-100">Flagship: Arowwai</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wide">Liso Urbano</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wide">Urban Jula</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wide">Project Series</span>
          </div>
        </motion.div>
      </div>

      <main className="flex-1 px-5 pt-8 max-w-md mx-auto w-full space-y-8">
        
        {/* Vision & Mission */}
        <section className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center mb-3">
              <Eye className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-bold text-slate-800">Our Vision</h3>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed relative z-10">
              To build India’s most respected premium Make-in-India furniture manufacturing brand, delivering globally relevant outdoor and indoor furniture for contemporary architecture.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center mb-3">
              <Target className="w-5 h-5 text-emerald-500 mr-2" />
              <h3 className="text-lg font-bold text-slate-800">Our Mission</h3>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed relative z-10">
              Craft furniture that seamlessly blends artistic design with functional comfort.
            </p>
          </motion.div>
        </section>

        {/* Governance */}
        <section>
          <div className="flex items-center mb-5 px-1">
            <ShieldCheck className="w-5 h-5 text-slate-700 mr-2" />
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Governance</h3>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            {governance.map((person, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (idx * 0.05) }}
                key={idx} 
                className={`p-4 flex items-center ${idx !== governance.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold mr-4 shrink-0">
                  {person.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{person.name}</p>
                  <p className="text-sm font-medium text-slate-500">{person.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
