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
  // V2.6: Field Visit Allowance
  fieldVisitKm?: number;
  petrolAllowanceRate?: number;
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
  // V2.6: Field Visit
  fieldVisitKm: number;
  fieldVisitAllowance: number;
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
    holidayOTDays = 0, holidayOTHalfDays = 0, holidayOTHours = 0,
    fieldVisitKm = 0, petrolAllowanceRate = 3.75
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
  const rate = overtimeHourlyRate > 0 ? overtimeHourlyRate : perHourPay;
  const holidayOTPay = (overtimeType === 'Hourly') ? (holidayOTHours * rate) : ((holidayOTDays * perDaySalary) + (holidayOTHalfDays * perDaySalary * 0.5));

  const fieldVisitAllowance = fieldVisitKm * petrolAllowanceRate;

  const lateFine = lateDays * (perDaySalary * 0.5);
  const totalEarnings = grossEarned + bonus + incentive + overtimePay + weeklyOffOTPay + holidayOTPay + fieldVisitAllowance;

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
    fieldVisitKm,
    fieldVisitAllowance,
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

export const processEmployeePayroll = (
  p: any, year: number, month: number, 
  att: any[], adj: any, l: number, lvs: any[], 
  branchInfo: any, allHolidays: any[], 
  allFieldVisits: any[], allFieldVisitLogs: any[]
) => {
        // Get branch shift start time for late calculation
        const shiftStartStr = branchInfo?.shift_start || '09:00';
        const [shiftH, shiftM] = shiftStartStr.split(':').map(Number);

        // Group by calendar day securely parsing UTC timestamps
        const dayMap = new Map<number, any[]>();
        att.forEach(r => {
          const rawDate = new Date(r.timestamp);
          const istDate = new Date(rawDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
          const d = istDate.getDate();
          if (!dayMap.has(d)) dayMap.set(d, []);
          dayMap.get(d)!.push(r);
        });

        let presentDays = 0, halfDays = 0, lateDays = 0, paidLeaves = 0, paidWeekOffs = 0;
        let totalOvertimeHours = 0;
        let weeklyOffOTDays = 0;
        let weeklyOffOTHalfDays = 0;
        let holidayOTDays = 0;
        let holidayOTHalfDays = 0;
        let holidayOTHours = 0;

        let publicHolidays = (allHolidays || []).filter((h: any) => h.branch === null || h.branch === p.branch).length;

        const weeklyOffDay = p.weekly_off_day ?? 0; // default Sunday
        const weeklyOffDay2 = p.weekly_off_day_2 ?? -1;
        const monthDaysCount = new Date(year, month + 1, 0).getDate();

        let dailyStats: any[] = [];

        for (let day = 1; day <= monthDaysCount; day++) {
          const start_present = presentDays;
          const start_halfDays = halfDays;
          const start_paidLeaves = paidLeaves;
          const start_paidWeekOffs = paidWeekOffs;
          const records = dayMap.get(day) || [];
          const currentDate = new Date(year, month, day);
          
          const y = currentDate.getFullYear();
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          
          const dayOfWeek = currentDate.getDay();
          const approvedLeave = lvs.find((lv: any) => dateStr >= lv.start_date && dateStr <= lv.end_date);
          const isHolidayRecord = (allHolidays || []).some((h: any) => dateStr === h.date && (h.branch === null || h.branch === p.branch));

          const inPunches = records.filter(r => r.type === 'In').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const outPunches = records.filter(r => r.type === 'Out').sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          let durationMins = 0;
          let firstInTime: Date | null = null;
          let lastOutRecord: any = null;

          if (inPunches.length > 0) {
            firstInTime = new Date(inPunches[0].timestamp);
            for (let i = 0; i < inPunches.length; i++) {
              const inT = new Date(inPunches[i].timestamp).getTime();
              const outP = outPunches.find(o => new Date(o.timestamp).getTime() > inT);
              if (outP && (!lastOutRecord || new Date(outP.timestamp).getTime() > new Date(lastOutRecord.timestamp).getTime())) {
                lastOutRecord = outP;
              }
            }
            durationMins = lastOutRecord ? Math.round((new Date(lastOutRecord.timestamp).getTime() - firstInTime.getTime()) / 60000) : 0;
          }

          const isWeeklyOff = (weeklyOffDay >= 0 && dayOfWeek === weeklyOffDay) || (weeklyOffDay2 >= 0 && dayOfWeek === weeklyOffDay2);

          if (isWeeklyOff && !isHolidayRecord) {
            if (inPunches.length > 0) {
              const durationHrs = durationMins / 60;
              if (durationHrs > 5) {
                weeklyOffOTDays++;
              } else if (durationHrs > 3) {
                weeklyOffOTHalfDays++;
              }
            }
            if (!approvedLeave) {
               paidWeekOffs++; 
            } else {
               if (approvedLeave.leave_type !== 'Unpaid') {
                 if (approvedLeave.is_half_day) halfDays++; else paidLeaves++;
               }
            }
            continue;
          }

          if (isHolidayRecord) {
            if (inPunches.length > 0) {
               const durationHrs = durationMins / 60;
               if (durationHrs > 5) {
                 holidayOTDays++;
               } else if (durationHrs > 3) {
                 holidayOTHalfDays++;
               }
               holidayOTHours += durationHrs;
            }
            continue;
          }

          if (inPunches.length > 0) {
            const istDate = new Date(firstInTime!.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
            const inMinutes = istDate.getHours() * 60 + istDate.getMinutes();
            const minsLate = inMinutes - (shiftH * 60 + shiftM);
            const durationHrs = durationMins / 60;
            const forcedStatus = lastOutRecord?.status;

            const isShowroom = p.branch === 'Showroom' || p.job_title?.toLowerCase().includes('showroom');
            const stdHours = isShowroom ? 10 : 8;

            if (forcedStatus === 'Half Day' || (lastOutRecord && durationHrs > 0 && durationHrs < (stdHours / 2 + 0.5))) {
               halfDays++;
               if (approvedLeave && approvedLeave.leave_type !== 'Unpaid') {
                 if (approvedLeave.is_half_day) paidLeaves += 0.5; else paidLeaves++;
               }
            } else if (durationHrs > 0 && durationHrs < 1.5) {
               if (approvedLeave && approvedLeave.leave_type !== 'Unpaid') {
                 if (approvedLeave.is_half_day) halfDays++; else paidLeaves++;
               }
            } else {
               if (minsLate > 0) {
                 presentDays++;
                 lateDays++;
               } else {
                 presentDays++;
               }
            }

            let dailyOTMins = 0;
            if (minsLate <= -30) {
               dailyOTMins += Math.abs(minsLate); 
            }
            
            if (lastOutRecord && durationMins > stdHours * 60) {
              const durationOT = durationMins - stdHours * 60;
              dailyOTMins = Math.max(dailyOTMins, durationOT);
            }
            
            totalOvertimeHours += dailyOTMins / 60;

          } else {
            if (records.length > 0) {
              const lastRecord = records[records.length - 1];
              if (lastRecord.status === 'Present') presentDays++;
              else if (lastRecord.status === 'Half Day') halfDays++;
              else if (lastRecord.status === 'Late') { presentDays++; lateDays++; }
              else if (lastRecord.status === 'Paid Leave') paidLeaves++;
              else if (lastRecord.status === 'Half Day Leave') { paidLeaves += 0.5; halfDays++; }
            } else if (approvedLeave) {
              if (approvedLeave.leave_type !== 'Unpaid') {
                if (approvedLeave.is_half_day) halfDays++; else paidLeaves++;
              }
            }
          }
          
          let dayType = 'Working_Present';
          if (isWeeklyOff && !isHolidayRecord) {
             dayType = 'WeeklyOff';
          } else if (isHolidayRecord) {
             dayType = 'Holiday';
          } else {
             if (inPunches.length > 0) {
                dayType = 'Working_Present';
             } else {
                if (records.length > 0) {
                   const lastRecord = records[records.length - 1];
                   if (['Present', 'Half Day', 'Late'].includes(lastRecord.status)) {
                      dayType = 'Working_Present';
                   } else if (['Paid Leave', 'Half Day Leave'].includes(lastRecord.status)) {
                      dayType = 'Working_Leave';
                   } else {
                      dayType = 'Working_Absent';
                   }
                } else if (approvedLeave) {
                   dayType = 'Working_Leave';
                } else {
                   dayType = 'Working_Absent';
                }
             }
          }

          dailyStats.push({
             day,
             dateStr,
             dayType,
             added_present: presentDays - start_present,
             added_halfDays: halfDays - start_halfDays,
             added_paidLeaves: paidLeaves - start_paidLeaves,
             added_paidWeekOffs: paidWeekOffs - start_paidWeekOffs,
             isSandwiched: false
          });
        }

        // Apply Sandwich Rule
        let blockStart = -1;
        for (let i = 0; i < dailyStats.length; i++) {
            const stat = dailyStats[i];
            if (stat.dayType === 'WeeklyOff' || stat.dayType === 'Holiday') {
                if (blockStart === -1) blockStart = i;
            } else {
                if (blockStart !== -1) {
                    let beforeAbsent = false;
                    let afterAbsent = false;

                    if (blockStart > 0) {
                        const beforeStatus = dailyStats[blockStart - 1].dayType;
                        if (beforeStatus === 'Working_Absent' || beforeStatus === 'Working_Leave') {
                            beforeAbsent = true;
                        }
                    }
                    if (stat.dayType === 'Working_Absent' || stat.dayType === 'Working_Leave') {
                        afterAbsent = true;
                    }

                    if (beforeAbsent && afterAbsent) {
                        for (let j = blockStart; j < i; j++) {
                            const sandwichedStat = dailyStats[j];
                            presentDays -= sandwichedStat.added_present;
                            halfDays -= sandwichedStat.added_halfDays;
                            paidLeaves -= sandwichedStat.added_paidLeaves;
                            paidWeekOffs -= sandwichedStat.added_paidWeekOffs;
                            if (sandwichedStat.dayType === 'Holiday') {
                                publicHolidays--;
                            }
                            sandwichedStat.isSandwiched = true;
                        }
                    }
                    blockStart = -1;
                }
            }
        }

        const isShowroom = p.branch === 'Showroom' || p.job_title?.toLowerCase().includes('showroom');
        const standardShiftHours = isShowroom ? 10 : 8;

        let annualCTC = p.ctc_amount || 0;
        if (p.salary_type === 'Monthly') {
           annualCTC = (p.ctc_amount || 0) * 12;
        }

        const payrollInput: any = {
          baseSalary: annualCTC,
          year, month,
          presentDays: presentDays + paidWeekOffs, paidLeaves, publicHolidays, halfDays, lateDays,
          overtimeHours: totalOvertimeHours, overtimeType: (p.overtime_applicable ? 'Hourly' : 'None') as any, standardShiftHours,
          loanDeduction: l,
          professionalTaxApplicable: p.professional_tax_applicable !== false,
          joiningDate: p.joining_date,
          dateOfLeaving: p.date_of_leaving,
          bonus: adj?.bonus || 0,
          incentive: adj?.incentive || 0,
          fines: adj?.fines || 0,
          otherDeductions: adj?.other_deductions || 0,
          pfEnabled: p.pf_enabled,
          esiEnabled: p.esi_enabled,
          weeklyOffOTDays,
          weeklyOffOTHalfDays,
          attendanceStats: { presentDays, paidWeekOffs, paidLeaves, publicHolidays, halfDays },
          overtimeHourlyRate: p.overtime_hourly_rate || 0,
          branchOvertimeHours: totalOvertimeHours,
          holidayOTDays,
          holidayOTHalfDays,
          holidayOTHours,
          fieldVisitKm: 0, 
          petrolAllowanceRate: p.petrol_allowance_rate || 3.75
        };

        const pVisits = allFieldVisits?.filter((v: any) => v.user_id === p.id) || [];
        const pLogs = allFieldVisitLogs || [];
        let totalKm = 0;
        pVisits.forEach((v: any) => {
          const vLogs = pLogs.filter((lg: any) => lg.visit_id === v.id);
          const hasReport = vLogs.some((lg: any) => lg.action !== 'Auto' || lg.selfie_url);
          if (hasReport) totalKm += (v.total_km || 0);
        });

        const finalPayroll = calculatePayroll({
          ...payrollInput,
          fieldVisitKm: totalKm,
          petrolAllowanceRate: p.petrol_allowance_rate || 3.75
        });

        // Add dailyStats to the return so the calendar can use it for visual representation
        return { 
          ...p, 
          payroll: finalPayroll, 
          weeklyOffOTDays, 
          weeklyOffOTHalfDays, 
          branchOTHours: Math.round(totalOvertimeHours * 10) / 10, 
          attendanceStats: payrollInput.attendanceStats,
          sandwichData: dailyStats.filter(s => s.isSandwiched).map(s => s.dateStr)
        };
};
