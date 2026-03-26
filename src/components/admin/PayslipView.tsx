import { useLanguage } from '../../lib/i18n';
import { Download, Printer, X } from 'lucide-react';

interface PayslipViewProps {
  staff: any;
  payroll: any;
  monthYear: string;
  onClose: () => void;
}

export default function PayslipView({ staff, payroll, monthYear, onClose }: PayslipViewProps) {
  const { t } = useLanguage();
  const dateObj = new Date(monthYear + '-01');
  const monthLabel = dateObj.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[800px] h-full max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => window.print()} 
              className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:scale-105 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400"><X /></button>
        </div>

        {/* Payslip Content (Printable Area) */}
        <div id="printable-payslip" className="flex-1 overflow-y-auto p-12 bg-white print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden; }
              #printable-payslip, #printable-payslip * { visibility: visible; }
              #printable-payslip { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
              .no-print { display: none !important; }
            }
          `}} />
          
          <div className="border-[3px] border-slate-900 p-10 relative">
            {/* Header */}
            <div className="flex justify-between items-start mb-10 border-b-2 border-slate-100 pb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-slate-900">MINIMAL <span className="text-brand-500">STROKE</span></h1>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Studio ERP • Payroll Systems</p>
                <p className="text-[10px] font-bold text-slate-500 mt-4 max-w-[250px]">
                  Branch: {staff.branch || 'Main Store'}<br />
                  Emp ID: {staff.employee_id}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl inline-block mb-4">
                  <h2 className="text-xs font-black uppercase tracking-widest">Payslip for {monthLabel}</h2>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generation Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Employee Summary Card */}
            <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('staff')} Name</span>
                  <span className="text-xs font-black text-slate-800">{staff.full_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Designation</span>
                  <span className="text-xs font-bold text-slate-700">{staff.job_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('joiningDate')}</span>
                  <span className="text-xs font-bold text-slate-700">{staff.joining_date}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bank Detail</span>
                  <span className="text-xs font-bold text-slate-700">{staff.bank_name || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A/C Number</span>
                  <span className="text-[11px] font-black text-slate-800 font-mono">XXXX{staff.bank_account_details?.slice(-4) || '0000'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">UAN / PF</span>
                  <span className="text-xs font-bold text-slate-700">{staff.uan_no || 'Not Linked'}</span>
                </div>
              </div>
            </div>

            {/* Attendance & Stats */}
            <div className="grid grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Month Days', value: payroll.monthDays },
                { label: 'Payable Days', value: payroll.payableDays },
                { label: 'Present', value: payroll.presentDays || 0 },
                { label: 'OT Hours', value: payroll.overtimeHours || 0 },
              ].map(stat => (
                <div key={stat.label} className="border-2 border-slate-100 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-lg font-black text-slate-800">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-2 gap-10 mb-10">
              {/* Earnings */}
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-4 ml-1">{t('earnings')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span>Basic (Prorated)</span>
                    <span className="font-black text-slate-900">₹{payroll.proratedBaseSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>Bonus</span>
                    <span className="font-black text-emerald-600">₹{payroll.bonus.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>Performance Incentive</span>
                    <span className="font-black text-emerald-600">₹{payroll.incentive.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>Overtime Pay</span>
                    <span className="font-black text-emerald-600">₹{payroll.overtimePay.toLocaleString()}</span>
                  </div>
                  <div className="h-0.5 bg-slate-100 my-4"></div>
                  <div className="flex justify-between text-sm font-black p-3 bg-emerald-50 text-emerald-700 rounded-xl border-2 border-emerald-100">
                    <span className="uppercase tracking-widest text-[11px]">Gross Earnings</span>
                    <span>₹{payroll.totalEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 mb-4 ml-1">{t('deductions')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>EPF Contribution</span>
                    <span className="font-black text-rose-500">₹{payroll.deductions.epf.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>ESI Contribution</span>
                    <span className="font-black text-rose-500">₹{payroll.deductions.esi.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>Professional Tax</span>
                    <span className="font-black text-rose-500">₹{payroll.deductions.pt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>Loan / Advance EMI</span>
                    <span className="font-black text-slate-900">₹{payroll.loanDeduction.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold p-3 rounded-xl">
                    <span>Fines / Penalties</span>
                    <span className="font-black text-rose-500">₹{(payroll.fines + (payroll.lateFine || 0)).toLocaleString()}</span>
                  </div>
                  <div className="h-0.5 bg-slate-100 my-4"></div>
                  <div className="flex justify-between text-sm font-black p-3 bg-rose-50 text-rose-700 rounded-xl border-2 border-rose-100">
                    <span className="uppercase tracking-widest text-[11px]">Total Deductions</span>
                    <span>₹{payroll.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Amount */}
            <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] flex items-center justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 mb-2">Net Payable Amount</p>
                <h2 className="text-5xl font-black tracking-tight italic">₹{payroll.netPay.toLocaleString()}</h2>
                <p className="text-[10px] font-bold text-white/60 mt-4 uppercase tracking-widest italic italic">Rupees {payroll.netPay.toLocaleString()} Only</p>
              </div>
              <div className="text-right border-l-2 border-white/10 pl-10 hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-6">Employer Signature</p>
                <div className="w-48 h-12 border-b-2 border-white/20 mb-2"></div>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Validated via Minimal Stroke ERP</p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-12 text-center">
              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">This is a computer-generated document and does not require a physical signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
