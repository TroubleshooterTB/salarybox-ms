export interface PayrollInput {
  baseSalary: number;           // Annual CTC
  year: number;
  month: number;                // 0-indexed (0=Jan, 11=Dec)
  presentDays: number;
  paidLeaves: number;
  publicHolidays: number;
  halfDays: number;
  lateDays: number;
  overtimeHours: number;
  overtimeType: 'None' | 'Hourly' | 'Day Basic';
  standardShiftHours: number;   // e.g. 8
  loanDeduction: number;        // EMI scheduled for this month
  professionalTaxApplicable: boolean;
  joiningDate?: string;         // YYYY-MM-DD
  dateOfLeaving?: string;       // YYYY-MM-DD
  // Adjustments from payroll_adjustments table
  bonus?: number;
  incentive?: number;
  fines?: number;
  otherDeductions?: number;
  pfEnabled?: boolean;
  esiEnabled?: boolean;
  // V2.5: Weekly off overtime
  weeklyOffOTDays?: number;     // Full days worked on weekly off
  weeklyOffOTHalfDays?: number; // Half days worked on weekly off (<5 hrs)
  // V2.5: Branch-level hourly overtime
  branchOvertimeHours?: number;         
  overtimeHourlyRate?: number;          
  // V2.5: Holiday overtime
  holidayOTDays?: number;       
  holidayOTHalfDays?: number;   
  holidayOTHours?: number;      
}

export interface PayrollOutput {
  monthDays: number;
  perMonthCtc: number;
  baseMonthSalary: number;      // Fixed monthly component
  proratedBaseSalary: number;   // Adjusted for joining/leaving dates
  payableDays: number;
  grossEarned: number;          // Attendance-based pay (Basic)
  totalEarnings: number;        // Gross + Bonus + Incentives + OT
  overtimePay: number;
  overtimeHours: number;        // Total OT hours
  hourlyRate: number;           // Per hour rate used for OT
  isExcessiveOT: boolean;       // Flag for HR review (>50 hours)
  weeklyOffOTPay: number;       
  branchOTPay: number;          
  holidayOTPay: number;         
  bonus: number;
  incentive: number;
  lateFine: number;
  loanDeduction: number;
  fines: number;
  otherDeductions: number;
  deductions: {
    pt: number;
    epf: number;
    esi: number;
    lwf: number;
  };
  employerContributions: {
    epf: number;                // 13% (12% + 1% admin/EDLI approx)
    esi: number;                // 3.25%
    lwf: number;
  };
  totalDeductions: number;
  netPay: number;               // Take home
  ctcToCompany: number;         // Total cost including employer overheads
}

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const calculatePayroll = (input: PayrollInput): PayrollOutput => {
  const {
    baseSalary, year, month,
    presentDays, paidLeaves, publicHolidays, halfDays,
    lateDays, overtimeHours, overtimeType, standardShiftHours,
    loanDeduction, professionalTaxApplicable,
    joiningDate, dateOfLeaving,
    bonus = 0, incentive = 0, fines = 0, otherDeductions = 0,
    pfEnabled = false, esiEnabled = false,
    weeklyOffOTDays = 0, weeklyOffOTHalfDays = 0,
    branchOvertimeHours = 0,
    overtimeHourlyRate = 0,
    holidayOTDays = 0, holidayOTHalfDays = 0, holidayOTHours = 0
  } = input;

  const monthDays = getDaysInMonth(year, month);
  const perMonthCtc = baseSalary / 12;
  const baseMonthSalary = perMonthCtc;
  const perDaySalary = baseMonthSalary / monthDays;

  // 1. Prorated Salary Calculation (Tenure-based)
  let tenureDays = monthDays;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  if (joiningDate) {
    const jDate = new Date(joiningDate);
    if (jDate > monthStart && jDate <= monthEnd) {
      const activeDays = monthDays - jDate.getDate() + 1;
      tenureDays = Math.min(tenureDays, activeDays);
    } else if (jDate > monthEnd) {
      tenureDays = 0;
    }
  }

  if (dateOfLeaving) {
    const lDate = new Date(dateOfLeaving);
    if (lDate >= monthStart && lDate < monthEnd) {
      const activeDays = lDate.getDate();
      tenureDays = Math.min(tenureDays, activeDays);
    } else if (lDate < monthStart) {
      tenureDays = 0;
    }
  }

  const proratedBaseSalary = perDaySalary * tenureDays;

  // 2. Attendance-based Pay
  const payableDays = Math.min(tenureDays, presentDays + paidLeaves + publicHolidays + (halfDays * 0.5));
  const grossEarned = payableDays * perDaySalary;

  // 3. Standard Overtime Pay (Hourly / Day Basic)
  let overtimePay = 0;
  const perHourPay = perDaySalary / standardShiftHours;
  
  if (overtimeType === 'Hourly' || overtimeType === 'Day Basic') {
    const rate = overtimeHourlyRate > 0 ? overtimeHourlyRate : perHourPay;
    if (overtimeType === 'Hourly') {
      overtimePay = overtimeHours * rate;
    } else {
      overtimePay = (overtimeHours / standardShiftHours) * (rate * standardShiftHours);
    }
  }

  const isExcessiveOT = overtimeHours > 50;

  // 4. Weekly Off OT Pay (V2.5)
  // Full day on weekly off = 1 day salary; half day (<5 hrs) = 0.5 day salary
  const weeklyOffOTPay = (weeklyOffOTDays * perDaySalary) + (weeklyOffOTHalfDays * perDaySalary * 0.5);

  // 5. Branch Hourly OT Pay (V2.5) - Override with calculated hourly OT if needed
  // If hourly overtime rate is provided by branch, we can use it, but user requested Month Salary / Days / Shift Hours
  // We will use standard overtimePay calculated above instead of fixed branch rate.
  const branchOTPay = 0; 

  // 5. Holiday OT Pay (V2.5)
  // Logic: 
  // - If OT is hourly: holidayOTHours * rate
  // - Otherwise: (holidayOTDays * perDaySalary) + (holidayOTHalfDays * perDaySalary * 0.5)
  let holidayOTPay = 0;
  const rate = overtimeHourlyRate > 0 ? overtimeHourlyRate : perHourPay;
  
  if (overtimeType === 'Hourly') {
    holidayOTPay = holidayOTHours * rate;
  } else {
    holidayOTPay = (holidayOTDays * perDaySalary) + (holidayOTHalfDays * perDaySalary * 0.5);
  }

  const lateFine = lateDays * (perDaySalary * 0.5);
  const totalEarnings = grossEarned + bonus + incentive + overtimePay + weeklyOffOTPay + holidayOTPay;

  // 6. Statutory Deductions
  const isFeb = month === 1;
  const pt = (professionalTaxApplicable && totalEarnings > 10000) ? (isFeb ? 300 : 200) : 0;
  const epfWage = Math.min(totalEarnings, 15000);
  const epf = pfEnabled ? Math.round(epfWage * 0.12) : 0;
  const esi = (esiEnabled && totalEarnings <= 21000) ? Math.ceil(totalEarnings * 0.0075) : 0;
  const lwf = (month === 5 || month === 11) ? 25 : 0;

  // 7. Statutory Contributions
  const employerEpf = pfEnabled ? Math.round(epfWage * 0.13) : 0;
  const employerEsi = (esiEnabled && totalEarnings <= 21000) ? Math.ceil(totalEarnings * 0.0325) : 0;
  const employerLwf = (month === 5 || month === 11) ? 25 : 0;

  const totalDeductions = pt + epf + esi + lwf + lateFine + loanDeduction + fines + otherDeductions;
  const netPay = Math.max(0, totalEarnings - totalDeductions);
  const ctcToCompany = totalEarnings + employerEpf + employerEsi + employerLwf;

  return {
    monthDays,
    perMonthCtc,
    baseMonthSalary,
    proratedBaseSalary,
    payableDays,
    grossEarned,
    totalEarnings,
    overtimePay,
    overtimeHours,
    hourlyRate: perHourPay,
    isExcessiveOT,
    weeklyOffOTPay,
    branchOTPay,
    holidayOTPay,
    bonus,
    incentive,
    lateFine,
    loanDeduction,
    fines,
    otherDeductions,
    deductions: { pt, epf, esi, lwf },
    employerContributions: {
      epf: employerEpf,
      esi: employerEsi,
      lwf: employerLwf
    },
    totalDeductions,
    netPay,
    ctcToCompany
  };
};
