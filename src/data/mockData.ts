
import { Student, StudentType, Class, AttendanceStatus, Teacher, TeacherType, TeacherClassMap, ClassSession, TeacherAttendanceRecord, StudentAttendanceRecord, OperationLog, User, UserRole } from '../types';

export const mockStudents: Student[] = [
  { 
    id: 1, 
    fullName: '王小明', 
    studentType: StudentType.Member, 
    status: 'active',
    classId: 1, 
    isBaptized: true, 
    baptismDate: '2018-05-20',
    isSpiritBaptized: true,
    spiritBaptismDate: '2019-08-15',
    dob: '2015-03-10',
    address: '台北市北投區石牌路二段201號',
    emergencyContactName: '王大明',
    emergencyContactPhone: '0912-345-678',
    notes: '對花生過敏。',
    enrollmentHistory: [
      { id: 1, studentId: 1, enrollmentDate: '2020-09-01', className: '幼兒班', schoolName: '石牌國小' }
    ],
    attendanceRecords: [
      { id: 1, studentId: 1, sessionId: 101, sessionDate: '2024-06-22', sessionType: '安息日學', status: AttendanceStatus.Present },
      { id: 2, studentId: 1, sessionId: 102, sessionDate: '2024-06-22', sessionType: '安息日學', status: AttendanceStatus.Present },
      { id: 3, studentId: 1, sessionId: 103, sessionDate: '2024-06-08', sessionType: '安息日學', status: AttendanceStatus.Absent, reason: '感冒' },
    ],
    historicalAttendance: [
        { className: '幼兒班', rowLabel: '第一年', percentage: 92 }
    ]
  },
  { 
    id: 2, 
    fullName: '陳大華', 
    studentType: StudentType.Seeker, 
    status: 'active',
    classId: 2, 
    isBaptized: false, 
    isSpiritBaptized: false,
    dob: '2014-07-22',
    address: '台北市北投區明德路150巷5號',
    emergencyContactName: '陳媽媽',
    emergencyContactPhone: '0987-654-321',
    enrollmentHistory: [
      { id: 2, studentId: 2, enrollmentDate: '2019-09-01', className: '幼兒班' },
      { id: 3, studentId: 2, enrollmentDate: '2021-09-01', className: '幼年班', schoolName: '明德國中' }
    ],
    attendanceRecords: [
      { id: 4, studentId: 2, sessionId: 101, sessionDate: '2024-06-22', sessionType: '安息日學', status: AttendanceStatus.Present },
      { id: 5, studentId: 2, sessionId: 102, sessionDate: '2024-06-22', sessionType: '安息日學', status: AttendanceStatus.Late, reason: '睡過頭' },
      { id: 6, studentId: 2, sessionId: 103, sessionDate: '2024-06-08', sessionType: '安息日學', status: AttendanceStatus.Present },
    ],
    historicalAttendance: []
  },
  { 
    id: 3, 
    fullName: '林美麗', 
    studentType: StudentType.Member, 
    status: 'active',
    classId: 1, 
    isBaptized: true, 
    baptismDate: '2019-01-10',
    isSpiritBaptized: false,
    dob: '2015-11-01',
    emergencyContactName: '林爸爸',
    emergencyContactPhone: '0922-111-333',
    notes: '需要定時提醒喝水。',
    enrollmentHistory: [],
    attendanceRecords: [
      { id: 7, studentId: 3, sessionId: 101, sessionDate: '2024-06-22', sessionType: '安息日學', status: AttendanceStatus.Excused, reason: '家庭旅遊' },
    ],
    historicalAttendance: []
  },
  { 
    id: 4, 
    fullName: '黃志強', 
    studentType: StudentType.Member, 
    status: 'active',
    classId: 3, 
    isBaptized: true, 
    baptismDate: '2017-12-25',
    isSpiritBaptized: true,
    spiritBaptismDate: '2017-12-25',
    dob: '2012-09-18',
    emergencyContactName: '黃媽媽',
    emergencyContactPhone: '0933-555-777',
    enrollmentHistory: [
        { id: 4, studentId: 4, enrollmentDate: '2018-09-01', className: '少年班', schoolName: '石牌國中' }
    ],
    attendanceRecords: [],
    historicalAttendance: []
  },
  { 
    id: 5, 
    fullName: '張雅婷', 
    studentType: StudentType.Seeker, 
    status: 'inactive',
    classId: 2, 
    isBaptized: false, 
    isSpiritBaptized: false,
    dob: '2014-02-28',
    address: '新北市淡水區竿蓁里2鄰8號',
    emergencyContactName: '張叔叔',
    emergencyContactPhone: '0918-000-888',
    enrollmentHistory: [
        { id: 5, studentId: 5, enrollmentDate: '2020-09-01', className: '幼年班', schoolName: '文化國小' }
    ],
    attendanceRecords: [
      { id: 8, studentId: 5, sessionId: 101, sessionDate: '2024-06-22', sessionType: '安息日學', status: AttendanceStatus.Present },
      { id: 9, studentId: 5, sessionId: 102, sessionDate: '2024-06-22', sessionType: '安息日學', status: AttendanceStatus.Present },
    ],
    historicalAttendance: []
  },
];

export const mockClasses: Class[] = [
  { id: 1, className: '幼兒班' },
  { id: 2, className: '幼年班' },
  { id: 3, className: '少年班' },
  { id: 4, className: '國中班' },
  { id: 5, className: '高中班' },
  { id: 6, className: '大專班' },
];

export const mockTeachers: Teacher[] = [
  {
    id: 1,
    fullName: '李靜芬',
    teacherType: TeacherType.Formal,
    status: 'active',
    phoneNumber: '0911-222-333',
    email: 'chingfen.lee@example.com',
    notes: '負責幼兒班，資深教員。'
  },
  {
    id: 2,
    fullName: '陳建宏',
    teacherType: TeacherType.Formal,
    status: 'active',
    phoneNumber: '0922-333-444',
    email: 'chienhong.chen@example.com',
    notes: '負責幼年班，擅長帶活動。'
  },
  {
    id: 3,
    fullName: '林美玲',
    teacherType: TeacherType.Trainee,
    status: 'active',
    phoneNumber: '0933-444-555',
    email: 'meiling.lin@example.com',
    notes: '幼兒班助理教員。'
  },
  {
    id: 4,
    fullName: '黃文德',
    teacherType: TeacherType.Formal,
    status: 'active',
    phoneNumber: '0944-555-666',
    email: 'wente.huang@example.com',
    notes: '負責少年班，對聖經故事有深入研究。'
  },
  {
    id: 5,
    fullName: '張惠君',
    teacherType: TeacherType.Trainee,
    status: 'inactive',
    phoneNumber: '0955-666-777',
    email: 'huichun.chang@example.com',
    notes: '可支援各班級的代課教員。'
  }
];

export const mockTeacherClassMap: TeacherClassMap[] = [
  // 2024
  { id: 1, academicYear: '2024', teacherId: 1, classId: 1, isLead: true }, // 李靜芬 -> 幼兒班 (班負責)
  { id: 2, academicYear: '2024', teacherId: 2, classId: 2, isLead: true }, // 陳建宏 -> 幼年班 (班負責)
  { id: 3, academicYear: '2024', teacherId: 3, classId: 1, isLead: false }, // 林美玲 -> 幼兒班
  { id: 4, academicYear: '2024', teacherId: 4, classId: 3, isLead: true }, // 黃文德 -> 少年班 (班負責)
  { id: 9, academicYear: '2024', teacherId: 5, classId: 2, isLead: false }, // 張惠君 -> 幼年班

  // 2023
  { id: 5, academicYear: '2023', teacherId: 1, classId: 1, isLead: true }, // 李靜芬 -> 幼兒班 (班負責)
  { id: 6, academicYear: '2023', teacherId: 2, classId: 1, isLead: false }, // 陳建宏 -> 幼兒班
  { id: 7, academicYear: '2023', teacherId: 4, classId: 3, isLead: true }, // 黃文德 -> 少年班 (班負責)
  
  // 2022
  { id: 8, academicYear: '2022', teacherId: 1, classId: 1, isLead: true }, // 李靜芬 -> 幼兒班 (班負責)
];

// NEW MOCK DATA FOR CLASS LOGBOOK
export const mockClassSessions: ClassSession[] = [
  { 
    id: 101, 
    sessionDate: '2024-06-22', 
    sessionType: '安息日學', 
    auditorCount: 2, 
    offeringAmount: 150.50,
    notes: '學員參與度高，王小明同學能主動分享心得。',
    classId: 1,
    worshipTopic: '大衛與歌利亞',
    worshipTeacherName: '李靜芬',
    activityTopic: '製作大衛的投石器',
    activityTeacherName: '林美玲',
    isCancelled: false,
  },
  { 
    id: 102, 
    sessionDate: '2024-06-22', 
    sessionType: '安息日學', 
    auditorCount: 1, 
    offeringAmount: 200.00,
    notes: '陳大華同學上課很專心。',
    classId: 2,
    worshipTopic: '耶穌的比喻：撒種的人',
    worshipTeacherName: '陳建宏',
    activityTopic: '種子畫',
    activityTeacherName: '陳建宏',
    isCancelled: false,
  },
  { 
    id: 103, 
    sessionDate: '2024-06-08', 
    sessionType: '安息日學', 
    auditorCount: 0, 
    offeringAmount: 120.00,
    notes: '複習上週課程，並進行分組討論。',
    classId: 1,
    worshipTopic: '挪亞方舟',
    worshipTeacherName: '李靜芬',
    activityTopic: '動物摺紙',
    activityTeacherName: '林美玲',
    isCancelled: false,
  },
  // --- ADDED FOR QUARTERLY REPORT (Q1 2024/113 academic year) ---
  // September 2024
  { id: 201, sessionDate: '2024-09-07', sessionType: '安息日學', auditorCount: 1, offeringAmount: 160, classId: 1, worshipTopic: '開學禮拜', isCancelled: false },
  { id: 202, sessionDate: '2024-09-14', sessionType: '安息日學', auditorCount: 0, offeringAmount: 240, classId: 2, worshipTopic: '耶穌是好牧人', isCancelled: false },
  { id: 203, sessionDate: '2024-09-21', sessionType: '安息日學', auditorCount: 2, offeringAmount: 100, classId: 1, worshipTopic: '創造天地', isCancelled: false },
  { id: 204, sessionDate: '2024-09-28', sessionType: '安息日學', auditorCount: 1, offeringAmount: 196, classId: 2, worshipTopic: '五餅二魚', isCancelled: false },
  // October 2024
  { id: 205, sessionDate: '2024-10-05', sessionType: '安息日學', auditorCount: 0, offeringAmount: 150, classId: 1, worshipTopic: '亞伯拉罕', isCancelled: false },
  { id: 206, sessionDate: '2024-10-12', sessionType: '安息日學', auditorCount: 1, offeringAmount: 135, classId: 2, worshipTopic: '浪子回家', isCancelled: false },
  { id: 207, sessionDate: '2024-10-19', sessionType: '安息日學', auditorCount: 1, offeringAmount: 90, classId: 1, worshipTopic: '摩西過紅海', isCancelled: false },
  { id: 208, sessionDate: '2024-10-26', sessionType: '安息日學', auditorCount: 0, offeringAmount: 184, classId: 2, worshipTopic: '登山寶訓', isCancelled: false },
  // November 2024
  { id: 209, sessionDate: '2024-11-02', sessionType: '安息日學', auditorCount: 2, offeringAmount: 80, classId: 1, worshipTopic: '約瑟的故事', isCancelled: false },
  { id: 210, sessionDate: '2024-11-09', sessionType: '安息日學', auditorCount: 1, offeringAmount: 150, classId: 2, worshipTopic: '感恩的心', isCancelled: false },
  { id: 211, sessionDate: '2024-11-16', sessionType: '安息日學', auditorCount: 0, offeringAmount: 120, classId: 1, worshipTopic: '但以理', isCancelled: false },
  { id: 212, sessionDate: '2024-11-23', sessionType: '安息日學', auditorCount: 0, offeringAmount: 200, classId: 2, worshipTopic: '撒該', isCancelled: false },
  { id: 213, sessionDate: '2024-11-30', sessionType: '安息日學', auditorCount: 0, offeringAmount: 0, classId: 1, isCancelled: true, cancellationReason: '感恩節活動' },
  // Example of a cancelled class session
  { id: 301, sessionDate: '2025-04-05', sessionType: '安息日學', classId: 2, isCancelled: true, cancellationReason: '發傳單', auditorCount: 0, offeringAmount: 0 },
];

export const mockTeacherAttendanceRecords: TeacherAttendanceRecord[] = [
  // Session 101 (幼兒班, 2024-06-22)
  { id: 201, sessionId: 101, teacherId: 1, status: AttendanceStatus.Present }, // 李靜芬
  { id: 202, sessionId: 101, teacherId: 3, status: AttendanceStatus.Present }, // 林美玲
  // Session 102 (幼年班, 2024-06-22)
  { id: 203, sessionId: 102, teacherId: 2, status: AttendanceStatus.Present }, // 陳建宏
  { id: 204, sessionId: 102, teacherId: 5, status: AttendanceStatus.Absent, reason: '身體不適' }, // 張惠君 (代課但缺席)
  // Session 103 (幼兒班, 2024-06-08)
  { id: 205, sessionId: 103, teacherId: 1, status: AttendanceStatus.Present }, // 李靜芬
  { id: 206, sessionId: 103, teacherId: 3, status: AttendanceStatus.Late, reason: '塞車' }, // 林美玲
   // --- ADDED FOR QUARTERLY REPORT ---
  { id: 220, sessionId: 201, teacherId: 1, status: AttendanceStatus.Present }, { id: 221, sessionId: 201, teacherId: 3, status: AttendanceStatus.Present },
  { id: 222, sessionId: 202, teacherId: 2, status: AttendanceStatus.Present }, { id: 223, sessionId: 202, teacherId: 5, status: AttendanceStatus.Present },
  { id: 224, sessionId: 203, teacherId: 1, status: AttendanceStatus.Present }, { id: 225, sessionId: 203, teacherId: 3, status: AttendanceStatus.Present },
  { id: 226, sessionId: 204, teacherId: 2, status: AttendanceStatus.Present }, { id: 227, sessionId: 204, teacherId: 5, status: AttendanceStatus.Absent },
  { id: 228, sessionId: 205, teacherId: 1, status: AttendanceStatus.Present }, { id: 229, sessionId: 205, teacherId: 3, status: AttendanceStatus.Present },
  { id: 230, sessionId: 206, teacherId: 2, status: AttendanceStatus.Present }, { id: 231, sessionId: 206, teacherId: 5, status: AttendanceStatus.Present },
];

export const mockStudentAttendanceRecords: StudentAttendanceRecord[] = [
  // Session 101 (幼兒班, 2024-06-22)
  { id: 301, sessionId: 101, studentId: 1, status: AttendanceStatus.Present, sessionDate: '2024-06-22', sessionType: '安息日學' }, // 王小明
  { id: 302, sessionId: 101, studentId: 3, status: AttendanceStatus.Excused, reason: '回鄉探親', sessionDate: '2024-06-22', sessionType: '安息日學' }, // 林美麗
  // Session 102 (幼年班, 2024-06-22)
  { id: 303, sessionId: 102, studentId: 2, status: AttendanceStatus.Present, sessionDate: '2024-06-22', sessionType: '安息日學' }, // 陳大華
  { id: 304, sessionId: 102, studentId: 5, status: AttendanceStatus.Present, sessionDate: '2024-06-22', sessionType: '安息日學' }, // 張雅婷
  // Session 103 (幼兒班, 2024-06-08)
  { id: 305, sessionId: 103, studentId: 1, status: AttendanceStatus.Present, sessionDate: '2024-06-08', sessionType: '安息日學' },
  { id: 306, sessionId: 103, studentId: 3, status: AttendanceStatus.Present, sessionDate: '2024-06-08', sessionType: '安息日學' },
  // --- ADDED FOR QUARTERLY REPORT (Only for class 1 and 2 to match sessions) ---
  // Sep 2024
  { id: 401, sessionId: 201, studentId: 1, status: AttendanceStatus.Present, sessionDate: '2024-09-07', sessionType: '安息日學'},
  { id: 402, sessionId: 201, studentId: 3, status: AttendanceStatus.Present, sessionDate: '2024-09-07', sessionType: '安息日學'},
  { id: 403, sessionId: 202, studentId: 2, status: AttendanceStatus.Present, sessionDate: '2024-09-14', sessionType: '安息日學'},
  { id: 404, sessionId: 202, studentId: 5, status: AttendanceStatus.Absent, sessionDate: '2024-09-14', sessionType: '安息日學'},
  { id: 405, sessionId: 203, studentId: 1, status: AttendanceStatus.Late, sessionDate: '2024-09-21', sessionType: '安息日學'},
  { id: 406, sessionId: 203, studentId: 3, status: AttendanceStatus.Present, sessionDate: '2024-09-21', sessionType: '安息日學'},
  // Oct 2024
  { id: 407, sessionId: 205, studentId: 1, status: AttendanceStatus.Present, sessionDate: '2024-10-05', sessionType: '安息日學'},
  { id: 408, sessionId: 205, studentId: 3, status: AttendanceStatus.Present, sessionDate: '2024-10-05', sessionType: '安息日學'},
  { id: 409, sessionId: 206, studentId: 2, status: AttendanceStatus.Present, sessionDate: '2024-10-12', sessionType: '安息日學'},
  { id: 410, sessionId: 206, studentId: 5, status: AttendanceStatus.Present, sessionDate: '2024-10-12', sessionType: '安息日學'},
  // Nov 2024
  { id: 411, sessionId: 209, studentId: 1, status: AttendanceStatus.Absent, sessionDate: '2024-11-02', sessionType: '安息日學'},
  { id: 412, sessionId: 209, studentId: 3, status: AttendanceStatus.Present, sessionDate: '2024-11-02', sessionType: '安息日學'},
];

export const mockOperationLogs: OperationLog[] = [
    {
        id: 1,
        timestamp: new Date(Date.now() - 3600000 * 24 * 7).toISOString(), // 7 days ago
        type: '系統初始化',
        description: '系統首次設定完成。',
        user: 'System'
    }
];

export const mockUsers: User[] = [
    { id: 1, username: 'admin', fullName: '系統管理員', role: UserRole.Admin, status: 'active', email: 'admin@example.com' },
    { id: 2, username: 'teacher1', fullName: '李靜芬', role: UserRole.Teacher, classId: 1, status: 'active', email: 'lee@example.com' }, // 幼兒班
    { id: 3, username: 'recorder1', fullName: '紀錄人員A', role: UserRole.Recorder, classId: 2, status: 'active', email: 'recorder@example.com' }, // 幼年班
];
