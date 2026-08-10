"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const sops = [
  {
    id: 1,
    title: "Sales, Design & Order Initiation",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 text-blue-700 border-blue-100",
    steps: [
      "Step 1.1 (Order Capture): Sales Executive captures client requirements, exact dimensions, and fabric/finish specs in Initial Sales Doc.",
      "Step 1.2 (Routing - Standard): Sales Head / OM Approval within 4 hours.",
      "Step 1.2 (Routing - Custom): Product Design Lead creates CAD/3D drawings.",
      "Step 1.3 (Client Sign-off): Custom drawings sent to client. Zero production starts without written Drawing Approval."
    ]
  },
  {
    id: 2,
    title: "Administrative Scrutiny & Handover",
    color: "bg-indigo-500",
    lightColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
    steps: [
      "Step 2.1 (MO Generation): Admin/OM converts approved Sales Doc into Manufacturing Order (MO).",
      "Step 2.2 (Factory Transmission): Admin transmits MO to Factory Admin.",
      "Step 2.3 (Factory Acknowledgment): Factory Admin logs and acknowledges MO within 2 hours.",
      "Step 2.4 (Technical Scrutiny): Jr. Production Engineer / Design Engineer verifies MO against drawings and PO specs.",
      "Step 2.5 (BOM Creation): Technical team prepares Production Docs & Material List (BOM), handing over to PPC / Production Manager."
    ]
  },
  {
    id: 3,
    title: "Procurement & Material Allocation",
    color: "bg-amber-500",
    lightColor: "bg-amber-50 text-amber-700 border-amber-100",
    steps: [
      "Step 3.1 (Inventory Verification): PPC checks raw material stocks against BOM.",
      "Step 3.2 (Requisition & PO): If stock unavailable, PPC issues Requisition to Purchase Manager. Purchase Manager issues PO to vendor within 24 hours.",
      "Step 3.3 (Availability Date Lock): Purchase Manager locks in vendor arrival dates and updates Store and PPC.",
      "Step 3.4 (Inward & Allocation): Materials inwarded, quality-checked by Store Manager, and physically allocated to dedicated MO staging area."
    ]
  },
  {
    id: 4,
    title: "Production Execution & QC",
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    steps: [
      "Step 4.1 (Scheduling): PPC locks production timeline based on material availability and client commit date.",
      "Step 4.2 (Outdoor Line): Cutting -> Welding -> Fabrication QC -> Powder Coating QC -> Weaving -> Weaving QC -> Assembly.",
      "Step 4.3 (Indoor Line): Wood Cutting -> Joinery -> Woodwork QC -> Polish/Finish -> Cushioning -> Assembly."
    ]
  },
  {
    id: 5,
    title: "Final QC, Packing & Dispatch",
    color: "bg-slate-700",
    lightColor: "bg-slate-100 text-slate-700 border-slate-200",
    steps: [
      "Step 5.1 (Final Quality Gate): Assembly Supervisor conducts 100% final inspection against MO and drawings. Deviations trigger immediate rework.",
      "Step 5.2 (Packaging): Packed according to drop-test approved standards.",
      "Step 5.3 (Dispatch & Delivery): Logistics Manager coordinates transit; goods delivered to site."
    ]
  }
];

function StepCard({ sop, index, isOpen, toggleOpen }: { sop: any; index: number; isOpen: boolean; toggleOpen: () => void }) {
  const isLast = index === sops.length - 1;
  
  return (
    <div className="flex relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute top-10 left-5 bottom-[-24px] w-0.5 bg-gray-200 z-0" />
      )}
      
      {/* Number badge */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0 z-10 shadow-md ${sop.color}`}>
        {sop.id}
      </div>
      
      {/* Content */}
      <div className="ml-4 flex-1 pb-6">
        <div 
          onClick={toggleOpen}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${sop.lightColor} ${isOpen ? 'shadow-md scale-[1.02]' : 'shadow-sm hover:scale-[1.01]'}`}
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg tracking-tight">{sop.title}</h3>
            <div className="text-current opacity-70">
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3 pt-3 border-t border-current/10"
              >
                <ul className="space-y-3">
                  {sop.steps.map((step: string, idx: number) => {
                    const [stepLabel, stepContent] = step.split('): ');
                    return (
                      <li key={idx} className="flex items-start text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 shrink-0 opacity-70" />
                        <span className="leading-snug">
                          {stepContent ? (
                            <>
                              <span className="font-bold">{stepLabel}):</span> {stepContent}
                            </>
                          ) : (
                            step
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentSOPsPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-12">
      <header className="px-5 py-6 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-20 flex items-center">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-slate-600 hover:bg-gray-100 transition mr-4 active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Department SOPs</h1>
      </header>

      <main className="flex-1 px-5 pt-8 max-w-md mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">End-to-End Workflow</h2>
          <p className="text-slate-500 font-medium mt-1">Standard Operating Procedures from order receipt to dispatch.</p>
        </div>

        <div className="relative">
          {sops.map((sop, idx) => (
            <StepCard 
              key={sop.id} 
              sop={sop} 
              index={idx} 
              isOpen={openIndex === idx} 
              toggleOpen={() => setOpenIndex(openIndex === idx ? null : idx)} 
            />
          ))}
        </div>
      </main>
    </div>
  );
}
