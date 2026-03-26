import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';
import { ArrowLeft, User, Building2, Briefcase, Phone, CreditCard, ShieldCheck, ShieldX, Calendar } from 'lucide-react';

export default function StaffProfile({ onBack }: { onBack: () => void }) {
  const { session } = useStore();
  const [profile, setProfile] = useState<any>(null);
  const [leaves, setLeaves] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Security State
  const [newPasscode, setNewPasscode] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const handlePasswordUpdate = async () => {
    if (!newPasscode || newPasscode.length < 6) {
      setUpdateMessage('Passcode must be at least 6 characters.');
      return;
    }

    setUpdateLoading(true);
    setUpdateMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPasscode
      });

      if (error) throw error;
      setUpdateMessage('Success! Passcode updated.');
      setNewPasscode('');
    } catch (err: any) {
      setUpdateMessage('Error: ' + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    async function fetch() {
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const { data: l } = await supabase.from('leaves').select('*').eq('user_id', session.user.id).single();
      if (p) setProfile(p);
      if (l) setLeaves(l);
      setLoading(false);
    }
    fetch();
  }, [session]);

  const monthlyCtc = profile?.ctc_amount ? (profile.ctc_amount / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
  const annualCtc = profile?.ctc_amount ? profile.ctc_amount.toLocaleString('en-IN') : '—';

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto">
      <div className="flex items-center mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold ml-2 tracking-tight">My Profile</h2>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !profile ? (
        <p className="text-center text-slate-500 mt-20 font-medium">Profile not found. Contact your administrator.</p>
      ) : (
        <div className="space-y-4">
          {/* Avatar + name */}
          <div className="bg-gradient-to-br from-brand-900/40 to-slate-900 border border-brand-500/20 p-6 rounded-3xl flex items-center space-x-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 text-2xl font-black shrink-0">
              {profile.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{profile.full_name}</h3>
              <p className="text-sm font-bold text-brand-400">{profile.job_title || 'No Designation'}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{profile.employee_id}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Building2 className="w-4 h-4" />} label="Department" value={profile.department || '—'} />
            <InfoCard icon={<Briefcase className="w-4 h-4" />} label="Role" value={profile.role || 'Employee'} />
            <InfoCard icon={<Phone className="w-4 h-4" />} label="Phone" value={profile.phone_number || '—'} />
            <InfoCard icon={<Calendar className="w-4 h-4" />} label="Date Joined" value={profile.joining_date ? new Date(profile.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          </div>

          {/* Salary */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Salary Details</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Annual CTC</p>
                <p className="text-lg font-black text-white">₹{annualCtc}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Per Month</p>
                <p className="text-lg font-black text-emerald-400">₹{monthlyCtc}</p>
              </div>
            </div>
          </div>

          {/* Bank */}
          {profile.bank_account_details && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bank A/C Details</p>
              </div>
              <p className="text-sm font-bold text-slate-300">{profile.bank_account_details}</p>
            </div>
          )}

          {/* Compliance badges */}
          <div className="flex space-x-3">
            <div className={`flex-1 flex items-center space-x-2 p-3 rounded-2xl border ${profile.background_verified ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-slate-900 border-slate-800'}`}>
              {profile.background_verified ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldX className="w-4 h-4 text-slate-500" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">BGV {profile.background_verified ? 'Done' : 'Pending'}</span>
            </div>
            <div className={`flex-1 flex items-center space-x-2 p-3 rounded-2xl border ${profile.professional_tax_applicable ? 'bg-amber-900/20 border-amber-700/30' : 'bg-slate-900 border-slate-800'}`}>
              <User className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PT {profile.professional_tax_applicable ? 'Applicable' : 'Exempt'}</span>
            </div>
          </div>

          {/* Leave balance */}
          {leaves && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Leave Balances</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-black text-emerald-400">{leaves.privilege_balance ?? 0}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Privilege</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-rose-400">{leaves.sick_balance ?? 0}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Sick</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-brand-400">{leaves.casual_balance ?? 0}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Casual</p>
                </div>
              </div>
            </div>
          )}

          {/* Security / Passcode Change */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Security Settings</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">New Passcode</label>
                <input 
                  type="password"
                  placeholder="Enter new secret passcode"
                  value={newPasscode}
                  onChange={e => setNewPasscode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:border-brand-500 outline-none transition"
                />
              </div>
              <button 
                onClick={handlePasswordUpdate}
                disabled={!newPasscode || updateLoading}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 transition-all"
              >
                {updateLoading ? 'Updating...' : 'Update Passcode'}
              </button>
              {updateMessage && (
                <p className={`text-center text-[10px] font-black uppercase tracking-widest ${updateMessage.includes('Success') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {updateMessage}
                </p>
              )}
            </div>
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
