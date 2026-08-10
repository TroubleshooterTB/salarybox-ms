"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { AlertCircle, Clock, ShieldAlert, Zap, Users, Info, Scale, ChevronDown, ChevronUp, FileWarning } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EscalationMatrixSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const matrixData = [
  {
    level: 1,
    title: "Primary (Day-to-day)",
    desc: "Day-to-day updates, order status.",
    contact: "Pankil Shah (Sales Head)",
    sla: "< 24 hours",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    iconColor: "text-blue-500",
    icon: Info
  },
  {
    level: 2,
    title: "Department Lead",
    desc: "Design / technical / execution queries.",
    contact: "Rujuta Kulkarni (Operations Manager)",
    sla: "< 12 hours",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    iconColor: "text-emerald-500",
    icon: Zap
  },
  {
    level: 3,
    title: "General Management",
    desc: "Unresolved issues, production delays.",
    contact: "Tushar Bansode (General Manager)",
    sla: "< 8 hours",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    iconColor: "text-amber-500",
    icon: Clock
  },
  {
    level: 4,
    title: "Executive",
    desc: "Major concerns, quality grievances.",
    contact: "Amit Gandhi (Managing Director)",
    sla: "Immediate (≤ 4 hours)",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    iconColor: "text-orange-500",
    icon: ShieldAlert
  },
  {
    level: 5,
    title: "Board of Directors",
    desc: "Critical delivery impact.",
    contact: "Board of Directors",
    sla: "< 48 hours",
    color: "bg-rose-50 border-rose-200 text-rose-700",
    iconColor: "text-rose-500",
    icon: AlertCircle
  }
];

export default function EscalationMatrixSheet({ isOpen, onClose }: EscalationMatrixSheetProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Client Escalation Matrix">
      <div className="space-y-4 pb-10">
        
        {/* Escalation Levels */}
        {matrixData.map((item) => (
          <div key={item.level} className={`p-4 rounded-2xl border ${item.color}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                <span className="font-bold tracking-tight">Level {item.level}: {item.title}</span>
              </div>
            </div>
            <p className="text-sm font-medium mb-3 opacity-90">{item.desc}</p>
            
            <div className="flex flex-col space-y-2 mt-3 pt-3 border-t border-black/10">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold opacity-80">Contact</span>
                <span className="font-bold">{item.contact}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold opacity-80">SLA</span>
                <span className="font-black bg-white/50 px-2 py-0.5 rounded-md shadow-sm">{item.sla}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Governance & Accountability Rules */}
        <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full px-4 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition"
          >
            <div className="flex items-center space-x-3 text-slate-800">
              <div className="p-2 bg-slate-200 rounded-lg">
                <Scale className="w-5 h-5 text-slate-700" />
              </div>
              <span className="font-bold text-base tracking-tight">Governance & Accountability Rules</span>
            </div>
            <div className="text-slate-400">
              {showRules ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>
          
          <AnimatePresence>
            {showRules && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4 border-t border-slate-100 bg-white">
                  <p className="text-sm text-slate-500 font-medium mb-2">
                    Strict penalties are enforced for SLA breaches to maintain accountability.
                  </p>
                  
                  {/* Level 1 */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl relative">
                    <div className="flex items-center mb-1">
                      <FileWarning className="w-4 h-4 text-amber-500 mr-2" />
                      <h4 className="font-bold text-amber-900 text-sm">Level 1 Violation</h4>
                    </div>
                    <p className="text-xs text-amber-700 font-semibold mb-2">Single SLA Delay</p>
                    <div className="text-xs text-amber-800 space-y-1 bg-amber-100/50 p-2 rounded-lg">
                      <p><strong>Trigger:</strong> Yellow Warning Badge logged automatically on employee profile.</p>
                      <p><strong>Action:</strong> Automated push alert sent to direct Reporting Manager. Role holder must provide reason code within 2 hours.</p>
                    </div>
                  </div>

                  {/* Level 2 */}
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl relative">
                    <div className="flex items-center mb-1">
                      <ShieldAlert className="w-4 h-4 text-rose-500 mr-2" />
                      <h4 className="font-bold text-rose-900 text-sm">Level 2 Violation</h4>
                    </div>
                    <p className="text-xs text-rose-700 font-semibold mb-2">2 Consecutive Breaches OR 2 Breaches in 30 Days</p>
                    <div className="text-xs text-rose-800 space-y-1 bg-rose-100/50 p-2 rounded-lg">
                      <p><strong>Trigger:</strong> Red Audit Alert. Auto-escalates directly to GM and OM.</p>
                      <p><strong>Action:</strong> Department Lead must file a formal Root Cause Analysis (RCA) report within 12 hours.</p>
                    </div>
                  </div>

                  {/* Level 3 */}
                  <div className="p-3 bg-slate-800 border border-slate-900 rounded-xl relative">
                    <div className="flex items-center mb-1">
                      <AlertCircle className="w-4 h-4 text-rose-400 mr-2" />
                      <h4 className="font-bold text-white text-sm">Level 3 Violation</h4>
                    </div>
                    <p className="text-xs text-slate-300 font-semibold mb-2">3+ Breaches in a Month OR Negligence causing Level 4/5 Client Escalation</p>
                    <div className="text-xs text-slate-200 space-y-1 bg-slate-900/50 p-2 rounded-lg">
                      <p><strong>Trigger:</strong> Performance Strike logged on MS Salarybox ledger.</p>
                      <p><strong>Penalty:</strong> <span className="text-rose-400 font-bold">5% to 15% deduction</span> on monthly variable incentive / performance bonus, plus formal review with GM & MD.</p>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </BottomSheet>
  );
}
