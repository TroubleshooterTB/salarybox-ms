import { useState } from 'react';
import { ArrowLeft, Send, Calendar, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { useLanguage } from '../../lib/i18n';

interface CorrectionRequestProps {
  onBack: () => void;
}

export default function CorrectionRequest({ onBack }: CorrectionRequestProps) {
  const { session } = useStore();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requested_punch_in: '09:00',
    requested_punch_out: '18:00',
    reason: '',
    type: 'Forgot to Punch'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    setLoading(true);
    setError(null);

    try {
      const { error: submitErr } = await supabase
        .from('attendance_corrections')
        .insert({
          user_id: session.user.id,
          date: form.date,
          requested_punch_in: form.requested_punch_in,
          requested_punch_out: form.requested_punch_out,
          reason: `[${form.type}] ${form.reason}`,
          status: 'Pending'
        });

      if (submitErr) throw submitErr;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black mb-2">Request Sent!</h2>
        <p className="text-slate-400 mb-10 px-4">Your attendance correction request has been submitted. An administrator will review it shortly.</p>
        <button 
          onClick={onBack}
          className="w-full max-w-xs py-4 bg-white text-slate-950 font-black rounded-2xl shadow-xl active:scale-95 transition uppercase tracking-widest text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="p-6 flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h1 className="text-xl font-black tracking-tight">{t('regularization')}</h1>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto">
        <div className="bg-brand-500/10 border border-brand-500/20 p-5 rounded-3xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-brand-300 leading-relaxed">
              Use this form to correct attendance errors like missing punches or incorrect location tracking.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('date_of_correction')}</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                required
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-brand-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('punch_in_time')}</label>
              <input 
                type="time"
                required
                value={form.requested_punch_in}
                onChange={e => setForm({...form, requested_punch_in: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-bold focus:border-brand-500 outline-none transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('punch_out_time')}</label>
              <input 
                type="time"
                required
                value={form.requested_punch_out}
                onChange={e => setForm({...form, requested_punch_out: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-bold focus:border-brand-500 outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('correction_type')}</label>
            <select 
              value={form.type}
              onChange={e => setForm({...form, type: e.target.value})}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-bold focus:border-brand-500 outline-none transition appearance-none"
            >
              <option>Forgot to Punch</option>
              <option>Technical Issue</option>
              <option>Wrong Location</option>
              <option>Field Work</option>
              <option>Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('detailed_reason')}</label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
              <textarea 
                required
                rows={4}
                value={form.reason}
                onChange={e => setForm({...form, reason: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-brand-500 outline-none transition resize-none"
                placeholder="Explain why this correction is needed..."
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-3 text-rose-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 active:scale-[0.98] transition flex items-center justify-center space-x-3 uppercase tracking-widest text-xs"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <>
                <Send className="w-4 h-4" />
                <span>{t('submit_request')}</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
