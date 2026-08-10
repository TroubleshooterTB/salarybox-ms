"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { Search, ChevronDown, ChevronUp, Target, Briefcase, FileCheck, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RoleKPIsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const rolesData = [
  {
    role: "Managing Director (MD)",
    reportsTo: "Board of Directors",
    tasks: "Corporate vision, brand strategy, final approval on major CAPEX, resolving Level 4 client escalations (SLA: ≤ 4 hours).",
    kpi: null
  },
  {
    role: "General Manager",
    reportsTo: "MD",
    tasks: [
      "Human Resource Management: Total authority over hiring, firing, promotions, demotions, salary increments, bonuses, and employee welfare policies across all 125+ staff spanning factory, design, and retail.",
      "Organisational Due Diligence: Enforcing strict compliance with company bylaws, labor laws, factory safety regulations, and operational audits.",
      "Day-to-Day Operations & Employee Issue Management: Resolving cross-departmental friction, daily floor blockages, and employee grievances before they impact production schedules.",
      "System Planning & Implementation (PWA/Odoo ERP): Overseeing the deployment and adoption of custom digital workflows (MS Salarybox, Odoo ERP architecture) across all departments.",
      "Operational Bottleneck Handling: Immediate interception of floor-level failures (e.g., administrative delays in MO generation, procurement lags, or design drawing errors).",
      "Financial Planning & Budgeting: Daily, weekly, monthly, quarterly, and yearly budget tracking, protecting company margins, and enforcing financial model assumptions (e.g., 55% net profit model structures for franchises).",
      "Growth Plan & Execution: Translating Amit Gandhi’s 5-year vision into operational milestones across all verticals (Minimal Stroke luxury retail, Urban Jula D2C swings, Liso Urbano, Art Gallery, and Global Exports).",
      "Sales Target Setting & Review: Establishing company-wide and individual sales quotas (e.g., managing the 25L monthly targets per sales driver and auditing real vs. raw pipelines).",
      "Franchise Due Diligence: Vetting master and unit franchise applicants (e.g., Chatrapati Sambhajinagar zones), auditing their financial stability, and verifying local market viability.",
      "Cross-Departmental Synchronization: Enforcing strict adherence to the Work Flow MS pipelines—guaranteeing zero communication gaps between Sales, Admin, PPC, and Factory.",
      "Workflow Enforcement: Ensuring administrative sign-offs (such as the 48-Hour Choice Rule and multi-department PO verification rules) are strictly followed.",
      "Escalation Management (Level 3): Acting as the definitive Level 3 management authority for unresolved client or operational issues within an 8-hour SLA window.",
      "Training Module Development: Spearheading the creation of standardized training handbooks and onboarding modules for all new hires.",
      "IT Department Handling: Directing the MIS Executive and developers to maintain secure, zero-downtime PWA deployments.",
      "Internal Governance Meetings: Conducting periodic general meetings, collecting structural reports from all department heads, and driving accountability.",
      "Marketing Plan Implementation: Aligning digital outreach, showroom events, and architect engagement programs with active sales pipelines.",
      "Corporate Representation: Serving as primary management spokesperson in external institutional, legal, and vendor negotiations.",
      "Financial Approvals: Exercising direct discretionary financial authorization up to INR 50,000 per transaction.",
      "Balance Sheet & P&L Auditing: Conducting rigorous weekly and monthly checks of income statements, COGS, OPEX, and cash flow alongside the Fractional CFO (CA Anil Jain)."
    ],
    kpi: null
  },
  {
    role: "Sales Head",
    reportsTo: "General Manager",
    tasks: "Lead revenue generation, verify/sign off sales documents within 4 hours, handle Level 1 client escalations (SLA: < 24 hours).",
    kpi: null
  },
  {
    role: "Business Development Manager (BDM)",
    reportsTo: "Sales Head",
    tasks: "Expand B2B architect network, execute franchise expansion strategy, ensure franchise financial models reflect strict 55% net profit margin target after fixed OPEX.",
    kpi: "Onboard 2 institutional/franchise partners per quarter."
  },
  {
    role: "Store Manager / Assistant Store Manager",
    reportsTo: "Sales Head",
    tasks: "Showroom experience management, walk-in lead conversion, floor inventory audit.",
    kpi: null
  },
  {
    role: "Field Sales Executive",
    reportsTo: "BDM / Store Manager",
    tasks: "Client site visits, technical dimension verification, daily CRM lead logging.",
    kpi: null
  },
  {
    role: "Product Design Lead",
    reportsTo: "Managing Director",
    tasks: "Design quality control, design language consistency across collections (Arowwai, Liso Urbano, Urban Jula), team management.",
    kpi: null
  },
  {
    role: "Sr. / Jr. Product Designer",
    reportsTo: "Product Design Lead / MD",
    tasks: "(Hard) Sketch concept in 0.5hr -> Obtain MD approval within 3hrs -> Generate CAD, 3D, and Renders.",
    kpi: "Final production handover within 10 days of sketch approval."
  },
  {
    role: "Factory Manager",
    reportsTo: "General Manager",
    tasks: "Complete manufacturing facility oversight, safety enforcement, throughput optimization.",
    kpi: "95% on-time MO completion rate."
  },
  {
    role: "Production Manager / PPC",
    reportsTo: "Factory Manager",
    tasks: "Production scheduling, MO allocation to floor leads, daily bottleneck resolution.",
    kpi: "Zero production line idle time due to material or scheduling delays."
  },
  {
    role: "Purchase Manager",
    reportsTo: "General Manager / Factory Manager",
    tasks: "Raw material procurement, vendor negotiations, PO generation within 24 hours of requisition, tracking ETA.",
    kpi: "100% material readiness prior to scheduled production start."
  },
  {
    role: "Production Engineer",
    reportsTo: "Production Manager",
    tasks: "MO technical scrutiny, PO validation, creating accurate Bill of Materials (BOM) and cutting lists.",
    kpi: "Zero drawing/dimension errors passed to manufacturing floor."
  },
  {
    role: "QC Supervisor (Fabrication/Woodwork/Weaving)",
    reportsTo: "Production Engineer",
    tasks: "In-process inspections at every stage (Metal, Wood, Polish, Weave, Assembly).",
    kpi: "Reject/log any component exceeding > 2mm deviation from drawings prior to assembly."
  },
  {
    role: "Operations Manager (OM)",
    reportsTo: "General Manager",
    tasks: "Order-to-MO workflow administration, resolving Level 2 technical/execution queries (SLA: < 12 hours).",
    kpi: null
  },
  {
    role: "Accountant / Cost Accountant",
    reportsTo: "Fractional CFO / General Manager",
    tasks: "Daily ledger tracking, vendor payments, MO cost-variance audits, running monthly payroll on MS Salarybox.",
    kpi: null
  },
  {
    role: "Logistics & Dispatch Manager",
    reportsTo: "Operations Manager",
    tasks: "Final packaging quality compliance, transporter dispatch coordination, transit tracking.",
    kpi: "Maintain < 1% transit damage rate."
  },
  {
    role: "MIS Executive",
    reportsTo: "General Manager",
    tasks: "Data integrity, daily workflow reports, system user access controls.",
    kpi: null
  },
  {
    role: "Factory Worker (Fabricators, Polishers, Weavers, Assemblers)",
    reportsTo: "Line Supervisor",
    tasks: "Physical fabrication strictly as per technical drawings, equipment maintenance, floor safety.",
    kpi: null
  }
];

export default function RoleKPIsSheet({ isOpen, onClose }: RoleKPIsSheetProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredRoles = rolesData.filter((r) => 
    r.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Role KRAs & KPIs">
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition sm:text-sm font-medium"
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-10">
        {filteredRoles.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-medium">
            No roles found matching "{searchTerm}"
          </div>
        ) : (
          filteredRoles.map((role, idx) => {
            const isExpanded = openIndex === idx;
            return (
              <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setOpenIndex(isExpanded ? null : idx)}
                  className="w-full px-4 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition"
                >
                  <div className="text-left flex-1 pr-4">
                    <h3 className="font-bold text-slate-900">{role.role}</h3>
                    <p className="text-xs font-medium text-slate-500 flex items-center mt-1">
                      <Target className="w-3.5 h-3.5 mr-1" /> Reports to: {role.reportsTo}
                    </p>
                  </div>
                  <div className="text-slate-400 bg-slate-50 p-1 rounded-full shrink-0">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50">
                        <div className="mt-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center">
                            <Briefcase className="w-3.5 h-3.5 mr-1" /> Core Tasks & Responsibilities
                          </h4>
                          <div className="text-sm text-slate-800 font-medium leading-relaxed">
                            {Array.isArray(role.tasks) ? (
                              <ul className="list-disc pl-5 space-y-1">
                                {role.tasks.map((task, i) => (
                                  <li key={i}>{task}</li>
                                ))}
                              </ul>
                            ) : (
                              <p>{role.tasks}</p>
                            )}
                          </div>
                        </div>
                        
                        {role.kpi && (
                          <div className="mt-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1 flex items-center">
                              <Award className="w-3.5 h-3.5 mr-1" /> Key Performance Indicator (KPI)
                            </h4>
                            <div className="text-sm text-emerald-800 font-semibold leading-relaxed bg-emerald-100/50 p-3 rounded-xl border border-emerald-200 shadow-sm">
                              {role.kpi}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
}
