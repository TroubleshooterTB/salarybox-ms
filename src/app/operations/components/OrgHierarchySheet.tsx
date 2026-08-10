"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, User, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "./BottomSheet";

interface OrgHierarchySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const hierarchyData = [
  {
    role: "Managing Director",
    name: "Amit Gandhi",
    level: 1,
    children: [
      {
        role: "General Manager / COO",
        name: "Tushar Bansode",
        level: 2,
        children: [
          {
            role: "Admin/Finance",
            name: "Department",
            level: 3,
            children: [
              { role: "Admin", name: "Team" },
              { role: "Cost Accountant", name: "Team" },
            ]
          },
          {
            role: "Operations",
            name: "Rujuta Kulkarni",
            level: 3,
            children: [
              { role: "Logistics Manager", name: "Team" },
              { role: "Social Media", name: "Team" },
              { role: "Developer", name: "Team" },
              { role: "Dispatch & Packaging", name: "Team" },
              { role: "Boys", name: "Team" }
            ]
          },
          {
            role: "Factory",
            name: "Factory Manager",
            level: 3,
            children: [
              { role: "Production Manager", name: "Team", children: [
                { role: "Production Engineer", name: "Team", children: [
                  { role: "Supervisor", name: "Team", children: [
                    { role: "Factory Worker", name: "Team" }
                  ]}
                ]}
              ]}
            ]
          },
          {
            role: "Design",
            name: "Product Design Lead",
            level: 3,
            children: [
              { role: "Product Designer", name: "Team" },
              { role: "Jr. Product Design", name: "Team" }
            ]
          },
          {
            role: "Sales",
            name: "Pankil Shah",
            level: 3,
            children: [
              { role: "Business Development Manager", name: "Team" },
              { role: "Store Manager", name: "Team" },
              { role: "Assistant Store Manager", name: "Team" },
              { role: "Field Sales Executives", name: "Team" }
            ]
          },
          { role: "Accountant", name: "Team", level: 3 },
          { role: "Management Trainee", name: "Team", level: 3 },
          { role: "MIS Executive", name: "Team", level: 3 },
          { role: "Purchase Manager", name: "Team", level: 3 }
        ]
      }
    ]
  }
];

function OrgNode({ node, defaultOpen = false }: { node: any; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col mt-2">
      <div 
        className={`flex items-center p-3 rounded-xl border transition ${hasChildren ? 'cursor-pointer hover:bg-gray-50 active:scale-95' : 'bg-gray-50'} ${isOpen ? 'border-slate-300 bg-white shadow-sm' : 'border-gray-100'}`}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3 shrink-0">
          {hasChildren ? <Users className="w-5 h-5 text-slate-500" /> : <User className="w-5 h-5 text-slate-400" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800">{node.role}</p>
          <p className="text-xs font-medium text-slate-500">{node.name}</p>
        </div>
        {hasChildren && (
          <div className="text-slate-400">
            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        )}
      </div>

      <AnimatePresence>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-6 border-l-2 border-gray-100 ml-5 mt-1"
          >
            {node.children.map((child: any, idx: number) => (
              <OrgNode key={idx} node={child} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrgHierarchySheet({ isOpen, onClose }: OrgHierarchySheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Organizational Hierarchy">
      <div className="space-y-2 pb-10">
        {hierarchyData.map((node, idx) => (
          <OrgNode key={idx} node={node} defaultOpen={true} />
        ))}
      </div>
    </BottomSheet>
  );
}
