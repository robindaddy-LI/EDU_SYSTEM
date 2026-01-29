
export enum UserRole {
    Admin = 'admin',
    Teacher = 'teacher', // 對應班負責
    Recorder = 'recorder', // 對應紀錄人員 (原職工)
}

export enum StudentType {
    Member = 'member',
    Seeker = 'seeker',
}

export enum TeacherType {
    Formal = 'formal',
    Trainee = 'trainee',
}

export enum AttendanceStatus {
    Present = 'present',
    Absent = 'absent',
    Late = 'late',
    Excused = 'excused',
}

export interface User {
    id: number;
    username: string;
    fullName: string;
    role: UserRole;
    classId?: number;
    email?: string;
    status?: 'active' | 'inactive';
}

export interface Teacher {
    id: number;
    fullName: string;
    teacherType: TeacherType;
    status: 'active' | 'inactive';
    phoneNumber?: string;
    email?: string;
    notes?: string;
}

export interface EnrollmentHistory {
    id: number;
    enrollmentDate: string; // ISO date string
    className: string;
    schoolName?: string;
    studentId: number;
}

export interface StudentAttendanceRecord {
    id: number;
    status: AttendanceStatus;
    reason?: string; // New field for absence reason
    sessionId: number;
    studentId: number;
    sessionDate: string;
    sessionType: string; // e.g., 'Sabbath School', 'Weekday Service'
}

// New interface for manual historical data
export interface HistoricalAttendance {
    rowLabel: string; // e.g. "第一年"
    className: string; // e.g. "幼兒班"
    percentage: number;
}

export interface Student {
    id: number;
    fullName: string;
    studentType: StudentType;
    status: 'active' | 'inactive';
    dob?: string; // ISO date string
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    isBaptized: boolean;
    baptismDate?: string; // ISO date string
    isSpiritBaptized: boolean;
    spiritBaptismDate?: string; // ISO date string
    classId: number;
    notes?: string; // Important notes
    enrollmentHistory?: EnrollmentHistory[];
    attendanceRecords?: StudentAttendanceRecord[];
    historicalAttendance?: HistoricalAttendance[]; // Added field
    class?: { id: number; name: string }; // Raw relation from API
}

export interface Class {
    id: number;
    className: string;
}

export interface TeacherClassMap {
    id: number;
    academicYear: string;
    teacherId: number;
    classId: number;
    isLead?: boolean;
}

export interface ClassSession {
    id: number;
    sessionDate: string; // ISO date string
    sessionType: string;
    auditorCount: number;
    offeringAmount: number;
    notes?: string;
    classId: number;
    worshipTopic?: string;
    worshipTeacherName?: string;
    activityTopic?: string;
    activityTeacherName?: string;
    isCancelled?: boolean;
    cancellationReason?: string;
}

export interface TeacherAttendanceRecord {
    id: number;
    status: AttendanceStatus;
    reason?: string; // New field for absence reason
    sessionId: number;
    teacherId: number;
}


export interface AttendanceStatusWeight {
    status_key: AttendanceStatus;
    status_name: string;
    weight: number;
}

export interface OperationLog {
    id: number;
    timestamp: string; // ISO date string
    type: string; // e.g., '學年升班', '資料匯入'
    description: string;
    user: string; // User who performed the action
}