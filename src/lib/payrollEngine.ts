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
}

export interface PayrollOutput {
  monthDays: number;
  perMonthCtc: number;
  baseMonthSalary: number;
  payableDays: number;
  grossEarned: number;
  overtimePay: number;
  lateFine: number;
  loanDeduction: number;
  deductions: {
    pt: number;
    epf: number;
    esi: number;
    lwf: number;
  };
  totalDeductions: number;
  netPay: number;
}

/**
 * Returns the exact number of days in a given month/year pair.
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const calculatePayroll = (input: PayrollInput): PayrollOutput => {
  const {
    baseSalary, year, month,
    presentDays, paidLeaves, publicHolidays, halfDays,
    lateDays, overtimeHours, overtimeType, standardShiftHours,
    loanDeduction, professionalTaxApplicable
  } = input;

  // Dynamic month days — the critical fix for Feb / 30-day months
  const monthDays = getDaysInMonth(year, month);

  // Monthly salary breakdown
  const perMonthCtc = baseSalary / 12;
  const baseMonthSalary = perMonthCtc;

  // Payable days
  const payableDays = presentDays + paidLeaves + publicHolidays + (halfDays * 0.5);
  const perDayPay = baseMonthSalary / monthDays;
  const grossEarned = payableDays * perDayPay;

  // Late fine: 0.5 day pay per late mark
  const lateFine = lateDays * (perDayPay * 0.5);

  // Overtime
  let overtimePay = 0;
  if (overtimeType === 'Hourly') {
    const perHourPay = perDayPay / standardShiftHours;
    overtimePay = overtimeHours * perHourPay;
  } else if (overtimeType === 'Day Basic') {
    // OT paid as full day equivalents (hours / shiftHours)
    overtimePay = (overtimeHours / standardShiftHours) * perDayPay;
  }

  // Maharashtra Professional Tax
  const isFeb = month === 1;
  const pt = professionalTaxApplicable && baseMonthSalary > 10000 ? (isFeb ? 300 : 200) : 0;

  // EPF (12% on wages up to ₹15,000)
  const epfWage = Math.min(grossEarned, 15000);
  const epf = epfWage * 0.12;

  // ESI (0.75% on wages ≤ ₹21,000)
  const esi = grossEarned <= 21000 ? grossEarned * 0.0075 : 0;

  // LWF (Maharashtra: ₹25 in June and December)
  const lwf = (month === 5 || month === 11) ? 25 : 0;

  const totalDeductions = pt + epf + esi + lwf + lateFine + loanDeduction;
  const netPay = (grossEarned + overtimePay) - totalDeductions;

  return {
    monthDays,
    perMonthCtc,
    baseMonthSalary,
    payableDays,
    grossEarned,
    overtimePay,
    lateFine,
    loanDeduction,
    deductions: { pt, epf, esi, lwf },
    totalDeductions,
    netPay: Math.max(0, netPay),  // Never negative
  };
};
