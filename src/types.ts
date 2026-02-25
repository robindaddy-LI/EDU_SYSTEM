
// ==================== Enums ====================

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

export enum UserStatus {
    Active = 'active',
    Inactive = 'inactive',
}

// ==================== Models ====================

export interface User {
    id: number;
    username: string;
    fullName: string;
    role: UserRole;
    classId?: number;
    email?: string;
    status: UserStatus;
}

export interface Teacher {
    id: number;
    fullName: string;
    teacherType: TeacherType;
    status: 'active' | 'inactive';
    phone?: string;
    email?: string;
    notes?: string;
    classAssignments?: {
        id: number;
        classId: number;
        isLead: boolean;
        class: { id: number; name: string };
    }[];
}

export interface EnrollmentHistory {
    id: number;
    enrollmentDate: string; // ISO date string
    classTitle: string;     // 班級名稱（JSON 欄位，非 DB relation）
    schoolName?: string;
    studentId: number;
}

// Manual historical attendance data (stored as JSON in DB)
export interface HistoricalAttendance {
    rowLabel: string;   // e.g. "第一年"
    classTitle: string; // e.g. "幼兒班"（JSON 欄位，非 DB relation）
    percentage: number;
}

export interface Student {
    id: number;
    fullName: string;
    studentType: StudentType;
    status: 'active' | 'inactive';
    dob?: string; // ISO date string
    address?: string;
    contactName?: string;
    contactPhone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    isBaptized: boolean;
    baptismDate?: string; // ISO date string
    isSpiritBaptized: boolean;
    spiritBaptismDate?: string; // ISO date string
    classId: number;
    notes?: string;
    enrollmentHistory?: EnrollmentHistory[];
    attendanceRecords?: StudentAttendanceRecord[];
    historicalAttendance?: HistoricalAttendance[];
    class?: { id: number; name: string }; // Nested relation from API
    createdAt?: string; // ISO date string
}

export interface Class {
    id: number;
    name: string;
}

export interface ClassSession {
    id: number;
    date: string; // ISO date string (對應 Prisma: date DateTime)
    sessionType: string;
    auditorCount: number;
    offeringAmount: number;
    notes?: string;
    classId: number;
    worshipTopic?: string;
    worshipTeacherName?: string;
    activityTopic?: string;
    activityTeacherName?: string;
    isCancelled: boolean;
    cancellationReason?: string;
    // Nested relations (included when API returns with includes)
    studentAttendance?: Array<{
        id: number;
        studentId: number;
        status: string;
        reason?: string | null;
    }>;
    teacherAttendance?: Array<{
        id: number;
        teacherId: number;
        status: string;
        reason?: string | null;
    }>;
}

export interface StudentAttendanceRecord {
    id: number;
    sessionId: number;
    studentId: number;
    status: AttendanceStatus;
    reason?: string | null;
    student?: {
        id: number;
        fullName: string;
        studentType: string;
    };
    session?: {
        id: number;
        date: Date | string;
        sessionType: string;
        class: {
            id: number;
            name: string;
        };
    };
}

export interface TeacherAttendanceRecord {
    id: number;
    sessionId: number;
    teacherId: number;
    status: AttendanceStatus;
    reason?: string | null;
    teacher?: {
        id: number;
        fullName: string;
        teacherType: string;
    };
    session?: {
        id: number;
        date: Date | string;
        sessionType: string;
        class: {
            id: number;
            name: string;
        };
    };
}

export interface OperationLog {
    id: number;
    timestamp: Date | string;
    type: string; // e.g., '學年升班', '資料匯入'
    description: string;
    userId: number | null;
    metadata?: Record<string, unknown>;
    createdAt: Date | string;
    user?: {
        id: number;
        fullName: string;
        username: string;
    };
}