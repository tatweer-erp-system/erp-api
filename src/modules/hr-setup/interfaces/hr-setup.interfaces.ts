export interface ShiftWorkingDayData {
  shiftId: string;
  dayOfWeek: number;
}

export interface LeaveBalance {
  leaveTypeId: string;
  allocated: number;
  used: number;
  remaining: number;
}
