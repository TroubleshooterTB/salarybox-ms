import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Search, Loader2, Play, Square, ShieldCheck, Landmark, Coins, FileText, CalendarDays, Trash2 } from 'lucide-react';
import { calculatePayroll } from '../../lib/payrollEngine';
import PayslipView from './PayslipView';
import AttendanceCalendar from '../dashboard/AttendanceCalendar';
import { useLanguage } from '../../lib/i18n';

// Server-side onboarding will handle all administrative auth actions

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
  const [viewingAttendance, setViewingAttendance] = useState<{ id: string, name: string } | null>(null);
  
  // Bulk Import State
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  
  const {} = useLanguage();

  const initialForm = {
    full_name: '', phone_number: '', employee_id: '',
    department: 'Management', job_title: '', ctc_amount: '',
    role: 'Employee', joining_date: new Date().toISOString().split('T')[0],
    background_verified: false, professional_tax_applicable: true, bank_account_details: '',
    multiple_branches: [] as string[],
    // V2.2 Statutory Fields
    pan_no: '', uan_no: '', pf_no: '', esi_no: '',
    pf_enabled: false, esi_enabled: false,
    bank_name: '', bank_ifsc: '', salary_type: 'Monthly',
    allow_remote_punch: false
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
      department: profile.department || 'Management',
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
      salary_type: profile.salary_type || 'Monthly',
      allow_remote_punch: profile.allow_remote_punch || false
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
        salary_type: formData.salary_type,
        allow_remote_punch: formData.allow_remote_punch,
        branch: formData.multiple_branches[0] || null // Fallback to first branch for single-branch legacy logic
      };

      if (editingId) {
        // Update existing
        const { error } = await supabase.from('profiles').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        // 1. First, check if the employee ID already exists in profiles
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, employee_id, full_name')
          .eq('employee_id', formData.employee_id)
          .maybeSingle();

        if (existingProfile) {
          alert(`Error: Employee ID "${formData.employee_id}" is already assigned to ${existingProfile.full_name || 'another staff member'}.`);
          setIsSubmitting(false);
          return;
        }

        // 2. Offload User Registration to Secure Server-Side API
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Unauthorized: Super Admin session required.");

        const res = await fetch('/api/bulk-onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: session.access_token,
            staffList: [{ ...formData, ...payload }]
          })
        });

        const data = await res.json();
        if (!res.ok || data.results[0].status === 'error') {
          throw new Error(data.results[0]?.message || data.error || 'Registration failed');
        }
      }
      
      setShowModal(false);
      fetchData();
      alert(editingId ? 'Employee updated successfully!' : 'Employee registered successfully!');
    } catch (err: any) {
      if (err.message?.includes('User already registered') || err.code === '42710' || err.message?.includes('already exists')) {
        alert('Error: An employee with this ID or Email already exists in the system.');
      } else {
        alert('Error saving employee: ' + err.message);
      }
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
      .maybeSingle();
    
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
    else {
      setShowAdjustmentsModal(false);
      alert('Adjustments saved successfully.');
    }
    setAdjLoading(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ 
      is_active: !currentStatus,
      date_of_leaving: !currentStatus ? null : new Date().toISOString().split('T')[0] // Set leaving date if deactivating
    }).eq('id', id);
    if (!error) {
      fetchData();
      alert(`Employee ${currentStatus ? 'deactivated' : 'reactivated'} successfully.`);
    } else {
      alert('Error updating status: ' + error.message);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${name}? This will remove all their attendance and payroll data. This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      
      alert('Employee deleted from records successfully.');
      fetchData();
    } catch (err: any) {
      alert('Error deleting employee: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslip = async (p: any) => {
    setAdjLoading(true);
    const targetMonth = adjForm.month_year;
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const [{ data: att }, { data: adj }, { data: loans }] = await Promise.all([
      supabase.from('attendance').select('status, type, timestamp').eq('user_id', p.id).gte('timestamp', startDate).lte('timestamp', endDate),
      supabase.from('payroll_adjustments').select('*').eq('user_id', p.id).eq('month_year', targetMonth).maybeSingle(),
      supabase.from('loan_schedules').select('deduction_amount').eq('user_id', p.id).eq('target_month', targetMonth).maybeSingle()
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

  const handleDownloadTemplate = () => {
    const headers = ["full_name", "employee_id", "branch", "role", "password", "department", "job_title"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "minimal_stroke_staff_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkProcessing(true);
    setBulkLog(["Starting bulk import process..."]);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(',').map(v => v.trim());
        if (currentLine.length < headers.length) continue;
        
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = currentLine[index];
        });
        results.push(row);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setBulkLog(prev => [...prev, "❌ Error: Session expired. Please login again."]);
        setIsBulkProcessing(false);
        return;
      }

      setBulkLog(prev => [...prev, `⏳ Handing over ${results.length} records to secure server...`]);

      const res = await fetch('/api/bulk-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session.access_token,
          staffList: results
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setBulkLog(prev => [...prev, `❌ Server Error: ${data.error || 'Unknown error'}`]);
      } else {
        data.results.forEach((r: any) => {
          if (r.status === 'success') {
            setBulkLog(prev => [...prev, `✅ Successfully processed ${r.name}`]);
          } else {
            setBulkLog(prev => [...prev, `❌ Error with ${r.name}: ${r.message}`]);
          }
        });
      }

      setIsBulkProcessing(false);
      fetchData();
    };
    reader.readAsText(file);
  };

  if (viewingAttendance) {
    return (
      <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
        <AttendanceCalendar 
          userId={viewingAttendance.id} 
          userName={viewingAttendance.name} 
          onBack={() => setViewingAttendance(null)} 
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Staff Management V2</h2>
          <p className="text-slate-500 font-medium text-sm">Add, edit, or toggle employment status.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowBulkImport(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition border border-indigo-700 shadow-lg shadow-indigo-500/20">
            <FileText className="w-5 h-5" /> <span>Bulk Import (CSV)</span>
          </button>
          <button onClick={openAdd} className="flex items-center space-x-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition">
            <Plus className="w-5 h-5" /> <span>Add Employee</span>
          </button>
        </div>
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
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Name</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Employee ID</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Role & Dept</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Assigned Branches</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Status</th>
              <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading records...</td></tr>
            ) : staff.map((s) => (
              <tr key={s.id} className={`transition ${!s.is_active ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-10 rounded-full ${s.is_active ? 'bg-brand-500' : 'bg-slate-300'}`}></div>
                    <p className="font-bold text-slate-800">{s.full_name}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{s.employee_id}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{s.phone_number}</p>
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
                  <button onClick={() => setViewingAttendance({ id: s.id, name: s.full_name })} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="View Attendance History">
                    <CalendarDays className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleGeneratePayslip(s)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition" title="Generate Payslip">
                    <FileText className="w-4 h-4" />
                  </button>
                  <button onClick={() => openAdjustments(s)} className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition" title="Salary Adjustments">
                    <Coins className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(s)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition" title="Edit Employee">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleActive(s.id, s.is_active !== false)} className={`p-2 rounded-lg transition ${s.is_active !== false ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`} title={s.is_active !== false ? "Deactivate Employee" : "Reactivate Employee"}>
                    {s.is_active !== false ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDeleteEmployee(s.id, s.full_name)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition" title="Delete Employee Record">
                    <Trash2 className="w-4 h-4" />
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Designation</label>
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
                      <option value="Management">Management</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Sales">Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="Production">Production</option>
                      <option value="Product Design">Product Design</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="Office Help Staff">Office Help Staff</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Assignment Block */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Location & Designation</h4>
                <div className="grid grid-cols-2 gap-4">
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

              {/* Remote Punch & Security */}
              <div className="flex space-x-6 pt-4 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input type="checkbox" checked={formData.background_verified} onChange={e=>setFormData({...formData, background_verified: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                  <span className="text-sm font-bold text-slate-700 group-hover:text-slate-950 transition">Background Checked</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input type="checkbox" checked={formData.allow_remote_punch} onChange={e=>setFormData({...formData, allow_remote_punch: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                  <span className="text-sm font-bold text-brand-600 group-hover:text-brand-700 transition font-black">Allow Field Punch</span>
                </label>
              </div>

              {/* Passcode Reset Link (Existing Employees) */}
              {editingId && (
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl mt-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-1">Security Reset</h5>
                      <p className="text-xs font-bold text-slate-600">Send a password reset link to the employee's system email.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={async () => {
                        const email = `${formData.employee_id.toLowerCase().replace(/\s/g, '')}@minimalstroke.com`;
                        const { error } = await supabase.auth.resetPasswordForEmail(email);
                        if (error) alert(error.message);
                        else alert('Reset link sent to ' + email);
                      }}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition"
                    >
                      Reset Password
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                 <h3 className="text-lg font-bold text-slate-800">Salary Adjustments</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedStaffForAdj.full_name}</p>
              </div>
              <button onClick={() => setShowAdjustmentsModal(false)} className="text-slate-400 font-bold hover:text-slate-600 px-3 py-1">Esc</button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Adjustment Month (YYYY-MM)</label>
                <input value={adjForm.month_year} onChange={e=>setAdjForm({...adjForm, month_year: e.target.value})} type="month" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-emerald-600">
                  <label className="text-[10px] font-bold uppercase tracking-wider ml-1">Bonus (+)</label>
                  <input value={adjForm.bonus} onChange={e=>setAdjForm({...adjForm, bonus: parseFloat(e.target.value)||0})} type="number" className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-bold" />
                </div>
                <div className="space-y-1 text-emerald-600">
                  <label className="text-[10px] font-bold uppercase tracking-wider ml-1">Incentive (+)</label>
                  <input value={adjForm.incentive} onChange={e=>setAdjForm({...adjForm, incentive: parseFloat(e.target.value)||0})} type="number" className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-bold" />
                </div>
                <div className="space-y-1 text-rose-600">
                  <label className="text-[10px] font-bold uppercase tracking-wider ml-1">Fines (-)</label>
                  <input value={adjForm.fines} onChange={e=>setAdjForm({...adjForm, fines: parseFloat(e.target.value)||0})} type="number" className="w-full bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm font-bold" />
                </div>
                <div className="space-y-1 text-rose-600">
                  <label className="text-[10px] font-bold uppercase tracking-wider ml-1">Other Ded. (-)</label>
                  <input value={adjForm.other_deductions} onChange={e=>setAdjForm({...adjForm, other_deductions: parseFloat(e.target.value)||0})} type="number" className="w-full bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm font-bold" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Adjustment Reason/Remarks</label>
                <textarea value={adjForm.remarks} onChange={e=>setAdjForm({...adjForm, remarks: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 min-h-[80px]" placeholder="Explain the adjustment..."></textarea>
              </div>

              <button onClick={handleSaveAdjustments} disabled={adjLoading} className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition disabled:opacity-50">
                {adjLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Apply Adjustments'}
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

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-800">CSV Bulk Onboarding</h3>
                  <p className="text-sm font-medium text-slate-500">Fast-track your staff registration in one click.</p>
                </div>
                <button onClick={() => setShowBulkImport(false)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400">
                  <Square className="w-6 h-6 rotate-45" />
                </button>
             </div>
             
             <div className="p-8 bg-white">
                <div className="bg-brand-50 border-2 border-dashed border-brand-200 rounded-3xl p-10 text-center mb-6 group hover:border-brand-500 transition-all duration-300 relative">
                  <FileText className="w-12 h-12 text-brand-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-slate-700 mb-2">Drag & Drop or Click to Upload CSV</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Supports .csv files only</p>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleBulkImport}
                    disabled={isBulkProcessing}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">CSV Requirements</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">Headers: full_name, employee_id, branch, role, password, department, job_title</p>
                      </div>
                      <button 
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2 bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition"
                      >
                        Download Template
                      </button>
                   </div>

                   {bulkLog.length > 0 && (
                     <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[11px] h-48 overflow-y-auto space-y-1.5 shadow-inner">
                        {bulkLog.map((log, i) => (
                           <p key={i} className={log.includes('✅') ? 'text-emerald-400' : log.includes('❌') ? 'text-rose-400' : 'text-slate-400'}>
                              {log}
                           </p>
                        ))}
                     </div>
                   )}
                </div>
             </div>

             <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowBulkImport(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  Close
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
