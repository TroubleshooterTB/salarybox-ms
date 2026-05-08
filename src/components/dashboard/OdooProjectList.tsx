import { useState, useEffect } from 'react';
import { Search, MapPin, Navigation, Loader2, ArrowLeft, Globe, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface OdooProjectListProps {
  onBack: () => void;
  onSelect: (project: any) => void;
}

export default function OdooProjectList({ onBack, onSelect }: OdooProjectListProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/odoo/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token') ? JSON.parse(localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token')!).access_token : ''}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter(p => 
    p.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
             <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition">
                <ArrowLeft className="w-6 h-6" />
             </button>
             <h2 className="text-xl font-black text-white">Assigned Sites</h2>
          </div>
          <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500">
             <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search projects in Odoo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-brand-500 transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">Syncing with Odoo Online...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
             <MapPin className="w-12 h-12 text-slate-800 mx-auto mb-4" />
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No projects found.</p>
          </div>
        ) : (
          filtered.map((project, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={project.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 pr-4">
                   <p className="text-[9px] font-black uppercase tracking-widest text-brand-400 mb-1">Odoo Project #{project.id}</p>
                   <h3 className="font-bold text-white text-lg leading-tight">{project.display_name}</h3>
                </div>
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                   <MapPin className="w-6 h-6" />
                </div>
              </div>

              <button 
                onClick={() => onSelect(project)}
                className="w-full bg-brand-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Visit Project Site</span>
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
