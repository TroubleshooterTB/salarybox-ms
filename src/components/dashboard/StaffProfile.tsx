import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { 
  ArrowLeft, Building2, Briefcase, Phone, 
  ShieldCheck, ShieldX, Calendar, Landmark, 
  FileText, Loader2 
} from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { calculatePayroll } from '../../lib/payrollEngine';
import PayslipView from '../admin/PayslipView';
import { Send, X } from 'lucide-react';

export default function StaffProfile({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const { setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Financial Docs State
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [showPayslip, setShowPayslip] = useState(false);
  const [payslipData, setPayslipData] = useState<any>(null);

  // Update Request State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ phone: '', bank_name: '', bank_account: '', reason: '' });
  const [requestLoading, setRequestLoading] = useState(false);
  
  // Security State
  const [newPasscode, setNewPasscode] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const handleGeneratePayslip = async () => {
    if (!profile || !session) return;
    setPayslipLoading(true);
    
    // Calculate for last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    // Fetch adjustments
    const { data: adj } = await supabase
      .from('payroll_adjustments')
      .select('*')
      .eq('user_id', profile.id)
      .eq('month_year', targetMonth)
      .maybeSingle();

    const payroll = calculatePayroll({
      baseSalary: profile.ctc_amount || 0,
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth(),
      presentDays: 30, // Default for preview
      paidLeaves: 0,
      publicHolidays: 0,
      halfDays: 0,
      lateDays: 0,
      overtimeHours: 0,
      overtimeType: 'None',
      standardShiftHours: 8,
      loanDeduction: 0,
      professionalTaxApplicable: true,
      bonus: adj?.bonus || 0,
      incentive: adj?.incentive || 0,
      fines: adj?.fines || 0,
      otherDeductions: adj?.other_deductions || 0,
      pfEnabled: profile.pf_enabled,
      esiEnabled: profile.esi_enabled
    });

    setPayslipData({ staff: profile, payroll, monthYear: targetMonth });
    setShowPayslip(true);
    setPayslipLoading(false);
  };

  const handlePasswordUpdate = async () => {
    if (!newPasscode || newPasscode.length < 6) {
      setUpdateMessage(t('passcode_too_short'));
      return;
    }

    setUpdateLoading(true);
    setUpdateMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPasscode
      });

      if (error) throw error;
      setUpdateMessage(t('success_passcode_updated'));
      setNewPasscode('');
    } catch (err: any) {
      setUpdateMessage(t('error') + ': ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleRequestUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setRequestLoading(true);
    
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name, employee_id').eq('id', session.user.id).single();
      
      const { error } = await supabase.from('profile_update_requests').insert({
        user_id: session.user.id,
        employee_name: profile?.full_name,
        employee_id: profile?.employee_id,
        request_data: {
          phone_number: requestForm.phone,
          bank_name: requestForm.bank_name,
          bank_account: requestForm.bank_account
        },
        reason: requestForm.reason
      });

      if (error) throw error;
      alert('Request submitted to HR successfully.');
      setShowUpdateModal(false);
      setRequestForm({ phone: '', bank_name: '', bank_account: '', reason: '' });
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    async function fetch() {
      if (!session) return;
      const { data: p } = await supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (p) setProfile(p);
      setLoading(false);
    }
    fetch();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto relative">
      <div className="flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold ml-2 tracking-tight">{t('profile')}</h2>
        </div>
        
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['en', 'hi', 'mr'] as const).map(l => (
            <button 
              key={l}
              onClick={() => setLanguage(l)}
              className="px-3 py-1 text-[10px] font-black uppercase rounded-lg transition hover:text-white data-[active=true]:bg-brand-500 data-[active=true]:text-white"
              data-active={useLanguage.getState().language === l}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {!profile ? (
        <p className="text-center text-slate-500 mt-20 font-medium">{t('profile_not_found')}</p>
      ) : (
        <div className="space-y-4 pb-24">
          {/* Avatar + name */}
          <div className="bg-gradient-to-br from-brand-900/40 to-slate-900 border border-brand-500/20 p-6 rounded-3xl flex items-center space-x-4 shadow-xl">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} className="w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-brand-500/20" alt="Profile" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 text-2xl font-black shrink-0">
                {profile.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <h3 className="text-xl font-black text-white">{profile.full_name}</h3>
              <p className="text-sm font-bold text-brand-400">{profile.job_title || t('no_designation')}</p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{profile.employee_id} • {profile.salary_type || 'Monthly'}</p>
                <button 
                  onClick={() => {
                    setRequestForm({
                      phone: profile.phone_number || '',
                      bank_name: profile.bank_name || '',
                      bank_account: profile.bank_account_details || '',
                      reason: ''
                    });
                    setShowUpdateModal(true);
                  }}
                  className="px-2 py-0.5 bg-brand-500/10 text-brand-400 text-[9px] font-black rounded border border-brand-500/20 hover:bg-brand-500 hover:text-white transition uppercase tracking-tighter"
                >
                  Request Update
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Building2 className="w-4 h-4" />} label={t('department')} value={profile.department || '—'} />
            <InfoCard icon={<Briefcase className="w-4 h-4" />} label={t('role')} value={profile.role || 'Employee'} />
            <InfoCard icon={<Phone className="w-4 h-4" />} label={t('phone')} value={profile.phone_number || '—'} />
            <InfoCard icon={<Calendar className="w-4 h-4" />} label={t('joining_date')} value={profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-4 h-4 text-brand-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('financial_docs')}</p>
            </div>
            <button 
              onClick={handleGeneratePayslip}
              disabled={payslipLoading}
              className="w-full flex items-center justify-between p-4 bg-slate-950 border border-white/5 rounded-2xl hover:bg-slate-800/50 transition group"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-white">{t('payslip')}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="p-2 bg-brand-500/10 rounded-xl group-hover:bg-brand-500 transition">
                {payslipLoading ? <Loader2 className="w-4 h-4 text-brand-400 animate-spin" /> : <FileText className="w-4 h-4 text-brand-400 group-hover:text-white" />}
              </div>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center space-x-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-brand-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('statutory_profile')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">PAN Card</p>
                <p className="text-xs font-bold text-slate-200">{profile.pan_no || 'NA'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">UAN Number</p>
                <p className="text-xs font-bold text-slate-200">{profile.uan_no || 'NA'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">EPF Status</p>
                <div className="flex items-center space-x-1">
                  {profile.pf_enabled ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <ShieldX className="w-3 h-3 text-rose-500" />}
                  <span className="text-[10px] font-bold text-slate-300">{profile.pf_enabled ? 'Enrolled' : 'Opt-out'}</span>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">ESI Status</p>
                <div className="flex items-center space-x-1">
                  {profile.esi_enabled ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <ShieldX className="w-3 h-3 text-rose-500" />}
                  <span className="text-[10px] font-bold text-slate-300">{profile.esi_enabled ? 'Enrolled' : 'Opt-out'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center space-x-2 mb-4">
              <Landmark className="w-4 h-4 text-emerald-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('banking_profile')}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('bank')}</span>
                <span className="text-sm font-bold text-slate-200">{profile.bank_name || '—'}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('account_no')}</span>
                <span className="text-sm font-mono font-bold text-slate-200">{profile.bank_account_details || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{t('security_settings')}</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('new_passcode')}</label>
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={newPasscode}
                  onChange={e => setNewPasscode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:border-brand-500 outline-none transition"
                />
              </div>
              <button 
                onClick={handlePasswordUpdate}
                disabled={!newPasscode || updateLoading}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all"
              >
                {updateLoading ? t('updating') : t('update_passcode')}
              </button>
              {updateMessage && (
                <p className={`text-center text-[10px] font-black uppercase tracking-widest mt-2 ${updateMessage.includes('Success') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {updateMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black tracking-tight">Request Profile Update</h3>
              <button onClick={() => setShowUpdateModal(false)} className="p-2 text-slate-500 hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRequestUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Phone Number</label>
                <input 
                  type="text" 
                  value={requestForm.phone} 
                  onChange={e=>setRequestForm({...requestForm, phone: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:border-brand-500 outline-none transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bank Name</label>
                <input 
                  type="text" 
                  value={requestForm.bank_name} 
                  onChange={e=>setRequestForm({...requestForm, bank_name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:border-brand-500 outline-none transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bank Account Number</label>
                <input 
                  type="text" 
                  value={requestForm.bank_account} 
                  onChange={e=>setRequestForm({...requestForm, bank_account: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:border-brand-500 outline-none transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reason for Change</label>
                <textarea 
                  rows={2}
                  value={requestForm.reason} 
                  onChange={e=>setRequestForm({...requestForm, reason: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-medium text-white focus:border-emerald-500 outline-none transition resize-none" 
                  placeholder="e.g. Switched to a different bank"
                />
              </div>

              <button 
                type="submit" 
                disabled={requestLoading}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center space-x-2"
              >
                {requestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Request to HR</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {showPayslip && payslipData && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between no-print shadow-sm">
            <button onClick={() => setShowPayslip(false)} className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-xs uppercase shadow-md active:scale-95 transition">
              Print PDF
            </button>
          </div>
          <div className="p-4 bg-white">
            <PayslipView 
              staff={payslipData.staff} 
              payroll={payslipData.payroll} 
              monthYear={payslipData.monthYear} 
              onClose={() => setShowPayslip(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-slate-500">{icon}</span>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-200 truncate">{value}</p>
    </div>
  );
}
