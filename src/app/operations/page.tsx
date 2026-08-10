"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Network, ScrollText, Users, Target, KanbanSquare, Camera, Handshake } from "lucide-react";
import useStore from '@/store';
import OrgHierarchySheet from "./components/OrgHierarchySheet";
import EscalationMatrixSheet from "./components/EscalationMatrixSheet";
import RoleKPIsSheet from "./components/RoleKPIsSheet";

export default function OperationsMenu() {
  const router = useRouter();
  const { userRole } = useStore();
  const [activeSheet, setActiveSheet] = useState<"org" | "escalation" | "kpi" | null>(null);

  const closeSheet = () => setActiveSheet(null);

  const allMenuCards = [
    {
      id: "company-profile",
      title: "Company Profile",
      desc: "Brand identity, vision, and governance.",
      icon: Building2,
      color: "text-blue-600 bg-blue-50",
      action: () => router.push("/operations/company-profile"),
    },
    {
      id: "sops",
      title: "Department SOPs",
      desc: "End-to-end workflow and procedures.",
      icon: ScrollText,
      color: "text-indigo-600 bg-indigo-50",
      action: () => router.push("/operations/department-sops"),
    },
    {
      id: "org",
      title: "Org Hierarchy",
      desc: "Interactive organizational structure.",
      icon: Network,
      color: "text-emerald-600 bg-emerald-50",
      action: () => setActiveSheet("org"),
    },
    {
      id: "escalation",
      title: "Escalation Matrix",
      desc: "Client query resolution and SLAs.",
      icon: Target,
      color: "text-amber-600 bg-amber-50",
      action: () => setActiveSheet("escalation"),
    },
    {
      id: "kpis",
      title: "Role KRAs & KPIs",
      desc: "Key metrics and tasks by role.",
      icon: Users,
      color: "text-rose-600 bg-rose-50",
      action: () => setActiveSheet("kpi"),
    },
    {
      id: "mo-tracker",
      title: "Live MO Tracker",
      desc: "Real-time production Kanban board.",
      icon: KanbanSquare,
      color: "text-cyan-600 bg-cyan-50",
      action: () => router.push("/operations/mo-tracker"),
    },
    {
      id: "qc-gates",
      title: "Mobile QC Checkpoint",
      desc: "Factory floor camera inspections.",
      icon: Camera,
      color: "text-emerald-700 bg-emerald-100",
      action: () => router.push("/operations/qc-gates"),
    },
    {
      id: "franchise-portal",
      title: "Partner Portal",
      desc: "B2B pitch deck & financials.",
      icon: Handshake,
      color: "text-slate-700 bg-slate-200",
      action: () => router.push("/operations/franchise-portal"),
    }
  ];

  // RBAC Filtering logic
  const isExecutive = ["admin", "md", "gm", "executive"].includes(userRole?.toLowerCase() || "");
  const isSupervisor = ["supervisor", "factory worker", "manager"].includes(userRole?.toLowerCase() || "");

  const menuCards = allMenuCards.filter(card => {
    if (isExecutive) return true; // Executives see all
    if (isSupervisor) {
      // Supervisors only see QC and MO Tracker
      return ["mo-tracker", "qc-gates"].includes(card.id);
    }
    // Default fallback to true for development so you can see all tiles!
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-10">
      <header className="px-5 py-6 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-slate-600 hover:bg-gray-100 transition mr-3 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Operations & Handbook</h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Minimal Stroke Internal Portal</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pt-6">
        <div className="grid grid-cols-1 gap-4">
          {menuCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 250 }}
                whileTap={{ scale: 0.98 }}
                onClick={card.action}
                className="flex items-center p-5 bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-md transition text-left group"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-inner ${card.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight group-hover:text-brand-600 transition">{card.title}</h2>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">{card.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>

      <OrgHierarchySheet isOpen={activeSheet === "org"} onClose={closeSheet} />
      <EscalationMatrixSheet isOpen={activeSheet === "escalation"} onClose={closeSheet} />
      <RoleKPIsSheet isOpen={activeSheet === "kpi"} onClose={closeSheet} />
    </div>
  );
}
