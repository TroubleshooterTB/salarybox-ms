import { useState } from 'react';
import { ArrowLeft, FileText, Download, Search, Folder, Cloud } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Documents({ onBack }: { onBack: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const docs = [
    { id: '1', name: 'Employee Handbook.pdf', size: '2.4 MB', date: 'Jan 15, 2026', type: 'Policy' },
    { id: '2', name: 'Code of Conduct.pdf', size: '1.1 MB', date: 'Jan 15, 2026', type: 'Policy' },
    { id: '3', name: 'Leave Policy 2026.pdf', size: '800 KB', date: 'Feb 01, 2026', type: 'HR' },
    { id: '4', name: 'Standard Operating Procedures.pdf', size: '4.5 MB', date: 'Mar 10, 2026', type: 'Operations' },
  ];

  const filtered = docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      <div className="flex items-center mb-6 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">Company Documents</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center space-x-3 focus-within:border-brand-500 transition">
        <Search className="w-5 h-5 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search documents..." 
          className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-600"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/20 p-5 rounded-3xl flex flex-col items-center text-center">
          <Folder className="w-8 h-8 text-blue-400 mb-2" />
          <p className="text-xs font-black uppercase tracking-widest text-blue-300">Policies</p>
          <p className="text-[10px] text-blue-500/60 font-bold mt-1">12 Files</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/20 p-5 rounded-3xl flex flex-col items-center text-center">
          <Cloud className="w-8 h-8 text-emerald-400 mb-2" />
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Forms</p>
          <p className="text-[10px] text-emerald-500/60 font-bold mt-1">8 Files</p>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((doc, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={doc.id} 
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:bg-slate-800 transition shadow-lg"
          >
            <div className="flex items-center space-x-4 min-w-0">
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-brand-400 transition">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{doc.name}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{doc.type} • {doc.size}</p>
              </div>
            </div>
            <button className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-brand-500 hover:border-brand-500 transition">
              <Download className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
