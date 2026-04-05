// ── Report Data Types ──

export interface DailySiteBreakdown {
  locationId: string;
  locationName: string;
  present: number;
  late: number;
  earlyDeparture: number;
  absent: number;
  onLeave: number;
  total: number;
}

export interface DailyAttendanceReport {
  date: string;
  sites: DailySiteBreakdown[];
  totals: {
    present: number;
    late: number;
    earlyDeparture: number;
    absent: number;
    onLeave: number;
    total: number;
  };
}

export interface EmployeeSummaryRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  daysWorked: number;
  totalHours: number;
  overtimeHours: number;
  absences: number;
  lateCount: number;
  earlyDepartureCount: number;
}

export interface LateArrivalRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  lateCount: number;
  dates: string[];
}

export interface OvertimeRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  totalOvertimeMinutes: number;
  recordCount: number;
  overtimeStatus: "pending" | "approved" | "rejected" | "mixed";
}

export interface OvertimeSiteSummary {
  locationId: string;
  locationName: string;
  totalOvertimeMinutes: number;
  employeeCount: number;
}

export interface OvertimeReport {
  byEmployee: OvertimeRow[];
  bySite: OvertimeSiteSummary[];
}

export interface AbsenceRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  locationName: string;
  absenceCount: number;
  dates: string[];
  consecutiveMax: number;
}

export interface SiteComparisonRow {
  locationId: string;
  locationName: string;
  city: string;
  totalEmployees: number;
  attendanceRate: number;
  avgHoursPerDay: number;
  totalOvertimeHours: number;
  lateCount: number;
  absenceCount: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface ActivityFeedItem {
  id: string;
  employeeName: string;
  action: "clock_in" | "clock_out";
  time: string;
  locationName: string;
  status: string;
}
