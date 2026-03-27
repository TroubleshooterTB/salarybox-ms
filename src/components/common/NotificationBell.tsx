import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { Bell, X, Check, Loader2 } from 'lucide-react';

export default function NotificationBell() {
  const { session } = useStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (data) setNotifications(data);
      setLoading(false);
    };

    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowOverlay(!showOverlay)}
        className="relative p-2 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 transition"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 border-2 border-slate-950 rounded-full text-[8px] font-black flex items-center justify-center text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {showOverlay && (
        <>
          <div className="fixed inset-0 z-[120]" onClick={() => setShowOverlay(false)} />
          <div className="absolute right-0 mt-4 w-72 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[130] p-4 animate-in fade-in slide-in-from-top-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Alerts</h3>
              <button onClick={() => setShowOverlay(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 relative z-10 custom-scrollbar">
              {loading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
              ) : notifications.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-500 text-center py-10 uppercase tracking-widest">No new alerts.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="bg-slate-950/50 border border-white/5 p-3 rounded-2xl group flex justify-between items-start space-x-3">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-0.5">{n.title}</p>
                      <p className="text-xs font-medium text-slate-300 leading-normal">{n.message}</p>
                      <p className="text-[8px] font-bold text-slate-600 mt-2 uppercase tracking-widest">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 bg-slate-900 hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 rounded-lg transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
