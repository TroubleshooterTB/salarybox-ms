import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Search, Loader2, Play, Square, ShieldCheck, Landmark, Coins, FileText } from 'lucide-react';
import { calculatePayroll } from '../../lib/payrollEngine';
import PayslipView from './PayslipView';
import { useLanguage } from '../../lib/i18n';

const supabaseAdminMaker = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

export default function AdminStaff({ selectedBranch }: { selectedBranch: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchesConfig, setBranchesConfig] = useState<any[]>([]);
  
  // Adjustments State
  const [showAdjustmentsModal, setShowAdjustmentsModal] = useState(false);
  const [selectedStaffForAdj, setSelectedStaffForAdj] = useState<any>(null);
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjForm, setAdjForm] = useState({
    month_year: new Date().toISOString().slice(0, 7), // YYYY-MM
    bonus: 0, incentive: 0, fines: 0, other_deductions: 0, remarks: ''
  });

  // Payslip State
  const [showPayslip, setShowPayslip] = useState(false);
  const [payslipData, setPayslipData] = useState<any>(null);
  const { t } = useLanguage();

  const initialForm = {
    full_name: '', phone_number: '', employee_id: '',
    department: 'Q1', job_title: '', ctc_amount: '',
    role: 'Employee', joining_date: new Date().toISOString().split('T')[0],
    background_verified: false, professional_tax_applicable: true, bank_account_details: '',
    multiple_branches: [] as string[],
    // V2.2 Statutory Fields
    pan_no: '', uan_no: '', pf_no: '', esi_no: '',
    pf_enabled: false, esi_enabled: false,
    bank_name: '', bank_ifsc: '', salary_type: 'Monthly'
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    const { data: bData } = await supabase.from('branches').select('name');
    if (bData) setBranchesConfig(bData);

    let query = supabase.from('profiles').select('*').order('full_name');
    if (selectedBranch && selectedBranch !== 'All Branches') {
      query = query.eq('branch', selectedBranch);
    }

    const { data } = await query;
    if (data) setStaff(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedBranch]);

  const openAdd = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEdit = (profile: any) => {
    setEditingId(profile.id);
    setFormData({
      full_name: profile.full_name || '',
      phone_number: profile.phone_number || '',
      employee_id: profile.employee_id || '',
      department: profile.department || 'Q1',
      job_title: profile.job_title || '',
      ctc_amount: profile.ctc_amount || '',
      role: profile.role || 'Employee',
      joining_date: profile.joining_date || new Date().toISOString().split('T')[0],
      background_verified: profile.background_verified || false,
      professional_tax_applicable: profile.professional_tax_applicable !== false,
      bank_account_details: profile.bank_account_details || '',
      multiple_branches: profile.multiple_branches || [],
      // V2.2 Fields
      pan_no: profile.pan_no || '',
      uan_no: profile.uan_no || '',
      pf_no: profile.pf_no || '',
      esi_no: profile.esi_no || '',
      pf_enabled: profile.pf_enabled || false,
      esi_enabled: profile.esi_enabled || false,
      bank_name: profile.bank_name || '',
      bank_ifsc: profile.bank_ifsc || '',
      salary_type: profile.salary_type || 'Monthly'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        employee_id: formData.employee_id,
        department: formData.department,
        job_title: formData.job_title,
        ctc_amount: parseFloat(formData.ctc_amount) || 0,
        role: formData.role,
        joining_date: formData.joining_date,
        background_verified: formData.background_verified,
        professional_tax_applicable: formData.professional_tax_applicable,
        bank_account_details: formData.bank_account_details,
        multiple_branches: formData.multiple_branches,
        // V2.2 Payload
        pan_no: formData.pan_no,
        uan_no: formData.uan_no,
        pf_no: formData.pf_no,
        esi_no: formData.esi_no,
        pf_enabled: formData.pf_enabled,
        esi_enabled: formData.esi_enabled,
        bank_name: formData.bank_name,
        bank_ifsc: formData.bank_ifsc,
        salary_type: formData.salary_type
      };

      if (editingId) {
        // Update existing
        const { error } = await supabase.from('profiles').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        // Create Auth identity seamlessly using secondary client
        const email = `${formData.employee_id.toLowerCase().replace(/\s/g, '')}@minimalstroke.com`;
        const { data: authData, error: authError } = await supabaseAdminMaker.auth.signUp({
          email, password: 'password123'
        });
        
        if (authError) throw authError;

        if (authData?.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            ...payload
          });
          
          if (profileError) throw profileError;
          
          // Setup default leaves
          await supabase.from('leaves').insert({
            user_id: authData.user.id, privilege_balance: 11, sick_balance: 4, casual_balance: 4
          });
        }
      }
      
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert('Error saving employee: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustments = async (profile: any) => {
    setSelectedStaffForAdj(profile);
    setAdjLoading(true);
    setShowAdjustmentsModal(true);
    
    // Fetch existing for current month_year
    const { data } = await supabase
      .from('payroll_adjustments')
      .select('*')
      .eq('user_id', profile.id)
      .eq('month_year', adjForm.month_year)
      .single();
    
    if (data) {
      setAdjForm({
        ...adjForm,
        bonus: data.bonus || 0,
        incentive: data.incentive || 0,
        fines: data.fines || 0,
        other_deductions: data.other_deductions || 0,
        remarks: data.remarks || ''
      });
    } else {
      setAdjForm({ ...adjForm, bonus: 0, incentive: 0, fines: 0, other_deductions: 0, remarks: '' });
    }
    setAdjLoading(false);
  };

  const handleSaveAdjustments = async () => {
    setAdjLoading(true);
    const { error } = await supabase.from('payroll_adjustments').upsert({
      user_id: selectedStaffForAdj.id,
      month_year: adjForm.month_year,
      bonus: adjForm.bonus,
      incentive: adjForm.incentive,
      fines: adjForm.fines,
      other_deductions: adjForm.other_deductions,
      remarks: adjForm.remarks
    }, { onConflict: 'user_id,month_year' });

    if (error) alert(error.message);
    else setShowAdjustmentsModal(false);
    setAdjLoading(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ 
      is_active: !currentStatus,
      date_of_leaving: !currentStatus ? null : new Date().toISOString().split('T')[0] // Set leaving date if deactivating
    }).eq('id', id);
    if (!error) fetchData();
  };

  const handleGeneratePayslip = async (p: any) => {
    setAdjLoading(true);
    const targetMonth = adjForm.month_year;
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const [{ data: att }, { data: adj }, { data: loans }] = await Promise.all([
      supabase.from('attendance').select('status, type, timestamp').eq('user_id', p.id).gte('timestamp', startDate).lte('timestamp', endDate),
      supabase.from('payroll_adjustments').select('*').eq('user_id', p.id).eq('month_year', targetMonth).single(),
      supabase.from('loan_schedules').select('deduction_amount').eq('user_id', p.id).eq('target_month', targetMonth).single()
    ]);

    // Simple attendance counting
    const dayMap = new Map();
    att?.forEach(r => {
      const d = new Date(r.timestamp).getDate();
      if (!dayMap.has(d)) dayMap.set(d, r);
    });
    
    let presentDays = 0, halfDays = 0, lateDays = 0;
    dayMap.forEach(r => {
      if (r.status === 'Present') presentDays++;
      else if (r.status === 'Half Day') halfDays++;
      else if (r.status === 'Late') { presentDays++; lateDays++; }
    });

    const payroll = calculatePayroll({
      baseSalary: p.ctc_amount || 0,
      year, month: month - 1,
      presentDays, paidLeaves: 1, publicHolidays: 1, halfDays, lateDays,
      overtimeHours: 0, overtimeType: 'None', standardShiftHours: 8,
      loanDeduction: loans?.deduction_amount || 0,
      professionalTaxApplicable: p.professional_tax_applicable !== false,
      joiningDate: p.joining_date,
      dateOfLeaving: p.date_of_leaving,
      bonus: adj?.bonus || 0,
      incentive: adj?.incentive || 0,
      fines: adj?.fines || 0,
      otherDeductions: adj?.other_deductions || 0,
      pfEnabled: p.pf_enabled,
      esiEnabled: p.esi_enabled
    });

    setPayslipData({ staff: p, payroll, monthYear: targetMonth });
    setShowPayslip(true);
    setAdjLoading(false);
  };

  const handleBranchToggle = (branchName: string) => {
    setFormData(prev => ({
      ...prev,
      multiple_branches: prev.multiple_branches.includes(branchName)
        ? prev.multiple_branches.filter(b => b !== branchName)
        : [...prev.multiple_branches, branchName]
    }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Staff Management V2</h2>
          <p className="text-slate-500 font-medium text-sm">Add, edit, or toggle employment status.</p>
        </div>
        <button onClick={openAdd} className="flex items-center space-x-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition">
          <Plus className="w-5 h-5" /> <span>Add Employee</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400 ml-4" />
          <input type="text" placeholder="Search employees by ID or Name..." className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 w-full placeholder-slate-400" />
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Employee</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Role & Dept</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Assigned Branches</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Status</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading records...</td></tr>
            ) : staff.map((s) => (
              <tr key={s.id} className={`transition ${!s.is_active ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-10 rounded-full ${s.is_active ? 'bg-brand-500' : 'bg-slate-300'}`}></div>
                    <div>
                      <p className="font-bold text-slate-800">{s.full_name}</p>
                      <p className="text-xs font-semibold text-slate-400">{s.employee_id} • {s.phone_number}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-700">{s.role}</p>
                  <span className="px-2 mt-1 inline-block py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black tracking-widest uppercase rounded-full">{s.department}</span>
                </td>
                <td className="px-6 py-4">
                  {s.multiple_branches && s.multiple_branches.length > 0 ? (
                    <div className="flex space-x-1">
                      {s.multiple_branches.map((b: string) => <span key={b} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">{b}</span>)}
                    </div>
                  ) : <span className="text-xs font-bold text-rose-400">Unassigned</span>}
                </td>
                <td className="px-6 py-4">
                  {s.is_active ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest uppercase rounded-full">Active</span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-black tracking-widest uppercase rounded-full">Inactive</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleGeneratePayslip(s)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition" title="Generate Payslip">
                    <FileText className="w-4 h-4" />
                  </button>
                  <button onClick={() => openAdjustments(s)} className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition" title="Salary Adjustments">
                    <Coins className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(s)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition" title="Edit Employee">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleActive(s.id, s.is_active !== false)} className={`p-2 rounded-lg transition ${s.is_active !== false ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`} title={s.is_active !== false ? "Soft Delete (Deactivate)" : "Reactivate Employee"}>
                    {s.is_active !== false ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Profile' : 'Register New Employee'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold px-3 py-1 rounded-lg">Esc</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
              {/* Basic Identity */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Identity & Employment</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                    <input required value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="e.g. Rahul Sharma" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                    <input required value={formData.phone_number} onChange={e=>setFormData({...formData, phone_number: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="10 Digit Mobile" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Employee ID</label>
                    <input required value={formData.employee_id} onChange={e=>setFormData({...formData, employee_id: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="MS001" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Job Title</label>
                    <input required value={formData.job_title} onChange={e=>setFormData({...formData, job_title: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="Lead Designer" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Joining Date</label>
                    <input required value={formData.joining_date} onChange={e=>setFormData({...formData, joining_date: e.target.value})} type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
                  </div>
                </div>
              </div>

              {/* Compensation Profile */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Compensation Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Salary Type</label>
                    <select value={formData.salary_type} onChange={e=>setFormData({...formData, salary_type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700">
                      <option value="Monthly">Monthly Fixed</option>
                      <option value="Daily">Daily Wages</option>
                      <option value="Hourly">Hourly Rate</option>
                      <option value="Piece">Per Piece</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Amount (CTC)</label>
                    <input required value={formData.ctc_amount} onChange={e=>setFormData({...formData, ctc_amount: e.target.value})} type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="₹45,000" />
                  </div>
                </div>
              </div>

              {/* Statutory Compliance */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                  <ShieldCheck className="w-3 h-3 text-brand-500" />
                  <span>Statutory Compliance</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">PAN Card No.</label>
                    <input value={formData.pan_no} onChange={e=>setFormData({...formData, pan_no: e.target.value.toUpperCase()})} type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="ABCDE1234F" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">UAN Number</label>
                    <input value={formData.uan_no} onChange={e=>setFormData({...formData, uan_no: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 font-mono" placeholder="100XXXXXXXXX" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">PF Number</label>
                    <input value={formData.pf_no} onChange={e=>setFormData({...formData, pf_no: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="DL/CPM/..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">ESI Number</label>
                    <input value={formData.esi_no} onChange={e=>setFormData({...formData, esi_no: e.target.value})} type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="200XXXXXXXXX" />
                  </div>
                  
                  <div className="col-span-2 flex items-center space-x-6 pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={formData.pf_enabled} onChange={e=>setFormData({...formData, pf_enabled: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition">Enable PF</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={formData.esi_enabled} onChange={e=>setFormData({...formData, esi_enabled: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition">Enable ESI</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input type="checkbox" checked={formData.professional_tax_applicable} onChange={e=>setFormData({...formData, professional_tax_applicable: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition">Enable PT</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Banking Profile */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                  <Landmark className="w-3 h-3 text-emerald-500" />
                  <span>Banking Profile</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Bank Name</label>
                    <input value={formData.bank_name} onChange={e=>setFormData({...formData, bank_name: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="e.g. HDFC Bank" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">IFSC Code</label>
                    <input value={formData.bank_ifsc} onChange={e=>setFormData({...formData, bank_ifsc: e.target.value.toUpperCase()})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 font-mono" placeholder="HDFC0001234" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Account Number</label>
                    <input value={formData.bank_account_details} onChange={e=>setFormData({...formData, bank_account_details: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" placeholder="Full Account Number" />
                  </div>
                </div>
              </div>

              {/* Assignments */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assignments</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">System Role</label>
                    <select value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700">
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                      <option value="Branch Admin">Branch Admin</option>
                      <option value="Attendance Manager">Attendance Manager</option>
                      <option value="Advanced Attendance Manager">Advanced Attendance Manager</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                    <select value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 appearance-none">
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Assignment Block */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Location & Designation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
                    <input required value={formData.job_title} onChange={e=>setFormData({...formData, job_title: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joining Date</label>
                    <input required value={formData.joining_date} onChange={e=>setFormData({...formData, joining_date: e.target.value})} type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authorized Geofence Branches</label>
                    <div className="flex flex-wrap gap-2">
                      {branchesConfig.map(b => (
                        <button type="button" key={b.name} onClick={() => handleBranchToggle(b.name)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${formData.multiple_branches.includes(b.name) ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/30' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Finance & Compliance Block */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Finance & Compliance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Salary</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Annual CTC (₹)</label>
                        <input
                          required
                          value={formData.ctc_amount}
                          onChange={e => setFormData({ ...formData, ctc_amount: e.target.value })}
                          type="number"
                          placeholder="e.g. 180000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-brand-500 outline-none transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Per Month (₹)</label>
                        <input
                          value={formData.ctc_amount && parseFloat(formData.ctc_amount) > 0
                            ? Math.round(parseFloat(formData.ctc_amount) / 12).toString()
                            : ''}
                          onChange={e => {
                            const monthly = parseFloat(e.target.value);
                            if (!isNaN(monthly)) {
                              setFormData({ ...formData, ctc_amount: (monthly * 12).toString() });
                            } else {
                              setFormData({ ...formData, ctc_amount: '' });
                            }
                          }}
                          type="number"
                          placeholder="e.g. 15000"
                          className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-bold text-emerald-700 focus:border-emerald-400 outline-none transition"
                        />
                      </div>
                    </div>
                    {formData.ctc_amount && parseFloat(formData.ctc_amount) > 0 && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        ₹{parseFloat(formData.ctc_amount).toLocaleString('en-IN')} / Year  →  ₹{Math.round(parseFloat(formData.ctc_amount) / 12).toLocaleString('en-IN')} / Month  →  ₹{Math.round(parseFloat(formData.ctc_amount) / 365).toLocaleString('en-IN')} / Day (approx.)
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                    <input value={formData.phone_number} onChange={e=>setFormData({...formData, phone_number: e.target.value})} type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Account Details (A/C & IFSC)</label>
                    <input value={formData.bank_account_details} onChange={e=>setFormData({...formData, bank_account_details: e.target.value})} type="text" placeholder="e.g. 19283748291 IFSC: HDFC000123" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
                  </div>
                  <div className="col-span-2 flex space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={formData.background_verified} onChange={e=>setFormData({...formData, background_verified: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                      <span className="text-sm font-bold text-slate-700">Background Checked</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={formData.professional_tax_applicable} onChange={e=>setFormData({...formData, professional_tax_applicable: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                      <span className="text-sm font-bold text-slate-700">Deduct Professional Tax</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Security & Access (For Existing Employees) */}
              {editingId && (
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Security & Access</h4>
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-rose-500 mb-1">Passcode Reset</p>
                      <p className="text-[11px] font-bold text-slate-600">This will send a secure reset link to the employee's internal email.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={async () => {
                        const email = `${formData.employee_id.toLowerCase().replace(/\s/g, '')}@minimalstroke.com`;
                        const { error } = await supabase.auth.resetPasswordForEmail(email);
                        if (error) alert(error.message);
                        else alert('Reset link sent to ' + email);
                      }}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition"
                    >
                      Send Reset Email
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end shrink-0 pb-4">
                <button type="submit" disabled={isSubmitting} className="bg-brand-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-600 transition flex items-center space-x-2 shadow-xl shadow-brand-500/20">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></> : <span>{editingId ? 'Save Changes' : 'Complete Registration'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Adjustments Modal */}
      {showAdjustmentsModal && selectedStaffForAdj && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">Monthly Adjustments</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedStaffForAdj.full_name}</p>
              </div>
              <button onClick={() => setShowAdjustmentsModal(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition font-bold">×</button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Payroll Month</label>
                <input 
                  type="month" 
                  value={adjForm.month_year} 
                  onChange={e => setAdjForm({...adjForm, month_year: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:border-brand-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Bonus</label>
                  <input 
                    type="number" 
                    value={adjForm.bonus} 
                    onChange={e => setAdjForm({...adjForm, bonus: parseFloat(e.target.value) || 0})}
                    className="w-full bg-emerald-50/50 border border-emerald-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-emerald-700 outline-none focus:border-emerald-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-widest ml-1">Incentive</label>
                  <input 
                    type="number" 
                    value={adjForm.incentive} 
                    onChange={e => setAdjForm({...adjForm, incentive: parseFloat(e.target.value) || 0})}
                    className="w-full bg-brand-50/50 border border-brand-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-brand-700 outline-none focus:border-brand-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Fine/Penalty</label>
                  <input 
                    type="number" 
                    value={adjForm.fines} 
                    onChange={e => setAdjForm({...adjForm, fines: parseFloat(e.target.value) || 0})}
                    className="w-full bg-rose-50/50 border border-rose-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-rose-700 outline-none focus:border-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Other Ded.</label>
                  <input 
                    type="number" 
                    value={adjForm.other_deductions} 
                    onChange={e => setAdjForm({...adjForm, other_deductions: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks / Note</label>
                <textarea 
                  value={adjForm.remarks} 
                  onChange={e => setAdjForm({...adjForm, remarks: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 resize-none"
                  placeholder="e.g. Festival Bonus or Laptop Damage Fine"
                />
              </div>

              <button 
                onClick={handleSaveAdjustments}
                disabled={adjLoading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition flex items-center justify-center space-x-2"
              >
                {adjLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Apply Adjustments</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayslip && payslipData && (
        <PayslipView 
          staff={payslipData.staff} 
          payroll={payslipData.payroll} 
          monthYear={payslipData.monthYear} 
          onClose={() => setShowPayslip(false)} 
        />
      )}
    </div>
  );
}
