"use client";

import { CheckCircle2, ChevronRight, Clock, AlertTriangle, User } from "lucide-react";
import BottomSheet from "./BottomSheet";

export interface MO {
  id: string;
  client: string;
  priority: "High" | "Standard";
  deadline: string;
  owner: string;
  status: number;
  orderDate: string;
  isOverdue?: boolean;
}

interface MODetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mo: MO | null;
  onAdvance: (moId: string) => void;
}

const statusChecklists: Record<number, string[]> = {
  1: ["Customer Docs Verified", "MO Generated & Transmitted", "Factory Acknowledgement Pending"],
  2: ["Factory MO Scrutiny Complete", "Drawings & Dimensions Validated", "Bill of Materials (BOM) Created"],
  3: ["Material Requisitions Sent", "Vendor POs Raised", "Availability Dates Locked & Checked"],
  4: ["Production Timeline Scheduled", "Fabrication / Woodwork Underway", "In-Process QC Clearances Achieved"],
  5: ["Final Assembly QC Complete", "Drop-test Packaging Checked", "Logistics Coordinated"],
};

const statusNames: Record<number, string> = {
  1: "Admin Scrutiny",
  2: "Planning & BOM",
  3: "Procurement",
  4: "Active Production",
  5: "Final QC & Dispatch",
};

export default function MODetailSheet({ isOpen, onClose, mo, onAdvance }: MODetailSheetProps) {
  if (!mo) return null;

  const checklist = statusChecklists[mo.status] || [];
  const nextStatusName = statusNames[mo.status + 1];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Order: ${mo.id}`}>
      <div className="pb-8 space-y-6">
        
        {/* MO Header Info */}
        <div className={`p-4 rounded-2xl border ${mo.isOverdue ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{mo.client}</h3>
              <p className="text-sm font-medium text-slate-500">Ordered: {mo.orderDate}</p>
            </div>
            {mo.isOverdue && (
              <span className="flex items-center px-2.5 py-1 bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-rose-200 shadow-sm">
                <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
              </span>
            )}
            {!mo.isOverdue && mo.priority === "High" && (
              <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-orange-200 shadow-sm">
                High Priority
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200/60">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SLA Deadline</p>
              <p className={`text-sm font-bold flex items-center ${mo.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                <Clock className="w-4 h-4 mr-1.5 opacity-70" /> {mo.deadline}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Owner</p>
              <p className="text-sm font-bold text-slate-800 flex items-center">
                <User className="w-4 h-4 mr-1.5 opacity-70" /> {mo.owner}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Checklist */}
        <div>
          <h4 className="text-sm font-bold tracking-tight text-slate-900 mb-3">
            Stage {mo.status}: {statusNames[mo.status]} Checklist
          </h4>
          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <label key={idx} className="flex items-start p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" />
                <span className="ml-3 text-sm font-medium text-slate-700 leading-snug">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {mo.status < 5 ? (
          <button 
            onClick={() => onAdvance(mo.id)}
            className="w-full flex items-center justify-center p-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition"
          >
            Advance to {nextStatusName} <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        ) : (
          <div className="w-full flex items-center justify-center p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-bold">
            <CheckCircle2 className="w-5 h-5 mr-2" /> Ready for Dispatch
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
