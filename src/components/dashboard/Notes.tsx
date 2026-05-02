import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, Plus, Trash2, Loader2, MessageSquare, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Notes({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [session]);

  const fetchNotes = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('employee_notes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
    setLoading(false);
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !session) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('employee_notes').insert({
      user_id: session.user.id,
      content: newNote
    });
    if (!error) {
      setNewNote('');
      fetchNotes();
    }
    setIsSubmitting(false);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('employee_notes').delete().eq('id', id);
    if (!error) fetchNotes();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      <div className="flex items-center mb-6 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">Personal Notes</h2>
      </div>

      <form onSubmit={addNote} className="mb-8 relative">
        <textarea 
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Type a note for yourself..."
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-6 py-5 text-sm font-medium text-white outline-none focus:border-brand-500 transition resize-none placeholder-slate-600 shadow-xl"
          rows={3}
        />
        <button 
          disabled={isSubmitting || !newNote.trim()}
          type="submit" 
          className="absolute bottom-4 right-4 p-3 bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/30 hover:bg-brand-400 active:scale-90 transition disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {notes.map((note) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={note.id} 
                className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg group relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="text-slate-600 hover:text-rose-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm font-medium text-slate-200 leading-relaxed">{note.content}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-bold">No notes yet.</p>
              <p className="text-xs mt-1">Add your first note above.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
