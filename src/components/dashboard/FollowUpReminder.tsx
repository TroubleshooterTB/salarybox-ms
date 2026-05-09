import { useState, useEffect } from 'react';
import { Bell, Calendar, ChevronRight, X, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FollowUpReminder() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if we already showed the reminder today
    const lastShown = localStorage.getItem('last_followup_reminder');
    const today = new Date().toDateString();
    
    if (lastShown === today) {
      setLoading(false);
      return;
    }

    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/odoo/activities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token') ? JSON.parse(localStorage.getItem('sb-gxekdcwwzebvtxdlddkb-auth-token')!).access_token : ''}`
        }
      });
      const data = await response.json();
      if (data.success && data.activities.length > 0) {
        setActivities(data.activities);
        setShow(true);
      }
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const closeReminder = () => {
    setShow(false);
    localStorage.setItem('last_followup_reminder', new Date().toDateString());
  };

  if (!show || activities.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[3rem] p-8 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center text-brand-500">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Daily Follow-ups</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Odoo Activity Sync</p>
              </div>
            </div>
            <button onClick={closeReminder} className="p-2 text-slate-500 hover:text-white transition">
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-sm font-bold text-slate-400 mb-6 leading-relaxed">
            You have <span className="text-brand-400">{activities.length} tasks</span> scheduled for today. Don't forget to reach out!
          </p>

          {/* List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {activities.map((act) => (
              <div key={act.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                   <p className="text-[9px] font-black uppercase tracking-widest text-brand-500">{act.res_name || 'CRM Lead'}</p>
                   <div className="flex items-center space-x-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase">{act.date_deadline}</span>
                   </div>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{act.summary || 'Follow-up Call'}</h4>
                {act.note && <div className="text-[10px] text-slate-500 line-clamp-2 italic" dangerouslySetInnerHTML={{ __html: act.note }} />}
              </div>
            ))}
          </div>

          <button 
            onClick={closeReminder}
            className="w-full mt-8 py-5 bg-brand-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/30 active:scale-95 transition"
          >
            I'm On It!
          </button>
        </motion.div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </AnimatePresence>
  );
}
