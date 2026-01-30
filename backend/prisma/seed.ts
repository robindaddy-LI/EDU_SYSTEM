
import { PrismaClient, UserRole, StudentType, TeacherType, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// --- MOCK DATA CONTENT (Copied for migration) ---

const mockClasses = [
    { id: 1, className: '幼兒班' },
    { id: 2, className: '幼年班' },
    { id: 3, className: '少年班' },
    { id: 4, className: '國中班' },
    { id: 5, className: '高中班' },
    { id: 6, className: '大專班' },
];

const mockUsers = [
    { id: 1, username: 'admin', fullName: '系統管理員', role: UserRole.admin, classId: null, email: 'admin@example.com' },
    { id: 2, username: 'teacher1', fullName: '李靜芬', role: UserRole.teacher, classId: 1, email: 'lee@example.com' },
    { id: 3, username: 'recorder1', fullName: '紀錄人員A', role: UserRole.recorder, classId: 2, email: 'recorder@example.com' },
];

const mockStudents = [
    {
        id: 1,
        fullName: '王小明',
        studentType: StudentType.member,
        status: 'active',
        classId: 1,
        isBaptized: true,
        baptismDate: '2018-05-20',
        isSpiritBaptized: true,
        spiritBaptismDate: '2019-08-15',
        dob: '2015-03-10',
        address: '台北市北投區石牌路二段201號',
        contactName: '王大明',
        contactPhone: '0912-345-678',
        notes: '對花生過敏。',
        enrollmentHistory: [
            { id: 1, studentId: 1, enrollmentDate: '2020-09-01', className: '幼兒班', schoolName: '石牌國小' }
        ],
        historicalAttendance: [
            { className: '幼兒班', rowLabel: '第一年', percentage: 92 }
        ]
    },
    {
        id: 2,
        fullName: '陳大華',
        studentType: StudentType.seeker,
        status: 'active',
        classId: 2,
        isBaptized: false,
        isSpiritBaptized: false,
        dob: '2014-07-22',
        address: '台北市北投區明德路150巷5號',
        contactName: '陳媽媽',
        contactPhone: '0987-654-321',
        enrollmentHistory: [
            { id: 2, studentId: 2, enrollmentDate: '2019-09-01', className: '幼兒班' },
            { id: 3, studentId: 2, enrollmentDate: '2021-09-01', className: '幼年班', schoolName: '明德國中' }
        ]
    },
    {
        id: 3,
        fullName: '林美麗',
        studentType: StudentType.member,
        status: 'active',
        classId: 1,
        isBaptized: true,
        baptismDate: '2019-01-10',
        isSpiritBaptized: false,
        dob: '2015-11-01',
        contactName: '林爸爸',
        contactPhone: '0922-111-333',
        notes: '需要定時提醒喝水。'
    },
    {
        id: 4,
        fullName: '黃志強',
        studentType: StudentType.member,
        status: 'active',
        classId: 3,
        isBaptized: true,
        baptismDate: '2017-12-25',
        isSpiritBaptized: true,
        spiritBaptismDate: '2017-12-25',
        dob: '2012-09-18',
        contactName: '黃媽媽',
        contactPhone: '0933-555-777',
        enrollmentHistory: [
            { id: 4, studentId: 4, enrollmentDate: '2018-09-01', className: '少年班', schoolName: '石牌國中' }
        ]
    },
    {
        id: 5,
        fullName: '張雅婷',
        studentType: StudentType.seeker,
        status: 'inactive',
        classId: 2,
        isBaptized: false,
        isSpiritBaptized: false,
        dob: '2014-02-28',
        address: '新北市淡水區竿蓁里2鄰8號',
        contactName: '張叔叔',
        contactPhone: '0918-000-888',
        enrollmentHistory: [
            { id: 5, studentId: 5, enrollmentDate: '2020-09-01', className: '幼年班', schoolName: '文化國小' }
        ]
    },
];

const mockTeachers = [
    { id: 1, fullName: '李靜芬', teacherType: TeacherType.formal, status: 'active', phone: '0911-222-333', email: 'chingfen.lee@example.com', notes: '負責幼兒班，資深教員。' },
    { id: 2, fullName: '陳建宏', teacherType: TeacherType.formal, status: 'active', phone: '0922-333-444', email: 'chienhong.chen@example.com', notes: '負責幼年班，擅長帶活動。' },
    { id: 3, fullName: '林美玲', teacherType: TeacherType.trainee, status: 'active', phone: '0933-444-555', email: 'meiling.lin@example.com', notes: '幼兒班助理教員。' },
    { id: 4, fullName: '黃文德', teacherType: TeacherType.formal, status: 'active', phone: '0944-555-666', email: 'wente.huang@example.com', notes: '負責少年班，對聖經故事有深入研究。' },
    { id: 5, fullName: '張惠君', teacherType: TeacherType.trainee, status: 'inactive', phone: '0955-666-777', email: 'huichun.chang@example.com', notes: '可支援各班級的代課教員。' }
];

const mockTeacherClassMap = [
    { id: 1, academicYear: '2024', teacherId: 1, classId: 1, isLead: true },
    { id: 2, academicYear: '2024', teacherId: 2, classId: 2, isLead: true },
    { id: 3, academicYear: '2024', teacherId: 3, classId: 1, isLead: false },
    { id: 4, academicYear: '2024', teacherId: 4, classId: 3, isLead: true },
    { id: 9, academicYear: '2024', teacherId: 5, classId: 2, isLead: false }
];

const mockClassSessions = [
    { id: 101, sessionDate: '2024-06-22', sessionType: '安息日學', auditorCount: 2, offeringAmount: 150.50, notes: '學員參與度高，王小明同學能主動分享心得。', classId: 1, worshipTopic: '大衛與歌利亞', worshipTeacherName: '李靜芬', activityTopic: '製作大衛的投石器', activityTeacherName: '林美玲', isCancelled: false },
    { id: 102, sessionDate: '2024-06-22', sessionType: '安息日學', auditorCount: 1, offeringAmount: 200.00, notes: '陳大華同學上課很專心。', classId: 2, worshipTopic: '耶穌的比喻：撒種的人', worshipTeacherName: '陳建宏', activityTopic: '種子畫', activityTeacherName: '陳建宏', isCancelled: false },
    { id: 103, sessionDate: '2024-06-08', sessionType: '安息日學', auditorCount: 0, offeringAmount: 120.00, notes: '複習上週課程，並進行分組討論。', classId: 1, worshipTopic: '挪亞方舟', worshipTeacherName: '李靜芬', activityTopic: '動物摺紙', activityTeacherName: '林美玲', isCancelled: false },
];

const mockStudentAttendanceRecords = [
    { id: 301, sessionId: 101, studentId: 1, status: AttendanceStatus.present },
    { id: 302, sessionId: 101, studentId: 3, status: AttendanceStatus.excused, reason: '回鄉探親' },
    { id: 303, sessionId: 102, studentId: 2, status: AttendanceStatus.present },
    { id: 304, sessionId: 102, studentId: 5, status: AttendanceStatus.present },
    { id: 305, sessionId: 103, studentId: 1, status: AttendanceStatus.present },
    { id: 306, sessionId: 103, studentId: 3, status: AttendanceStatus.present },
];

const mockTeacherAttendanceRecords = [
    { id: 201, sessionId: 101, teacherId: 1, status: AttendanceStatus.present },
    { id: 202, sessionId: 101, teacherId: 3, status: AttendanceStatus.present },
    { id: 203, sessionId: 102, teacherId: 2, status: AttendanceStatus.present },
    { id: 204, sessionId: 102, teacherId: 5, status: AttendanceStatus.absent, reason: '身體不適' },
    { id: 205, sessionId: 103, teacherId: 1, status: AttendanceStatus.present },
    { id: 206, sessionId: 103, teacherId: 3, status: AttendanceStatus.late, reason: '塞車' },
];

// --- SEEDING LOGIC ---

async function main() {
    console.log('Start seeding...');

    // 1. Classes
    for (const cls of mockClasses) {
        await prisma.class.upsert({
            where: { id: cls.id },
            update: {},
            create: {
                id: cls.id,
                name: cls.className,
            },
        });
    }
    console.log('Seeded Classes');

    // 2. Users
    for (const user of mockUsers) {
        await prisma.user.upsert({
            where: { id: user.id },
            update: {
                passwordHash: user.username, // For testing, password is same as username
            },
            create: {
                id: user.id,
                username: user.username,
                passwordHash: user.username, // For testing, password is same as username
                fullName: user.fullName,
                role: user.role,
                classId: user.classId,
                email: user.email,
                status: 'active',
            },
        });
    }
    console.log('Seeded Users');

    // 3. Teachers
    for (const t of mockTeachers) {
        await prisma.teacher.upsert({
            where: { id: t.id },
            update: {},
            create: {
                id: t.id,
                fullName: t.fullName,
                teacherType: t.teacherType,
                status: t.status,
                phone: t.phone,
                email: t.email,
                notes: t.notes
            }
        });
    }
    console.log('Seeded Teachers');

    // 4. Students
    for (const s of mockStudents) {
        await prisma.student.upsert({
            where: { id: s.id },
            update: {},
            create: {
                id: s.id,
                fullName: s.fullName,
                studentType: s.studentType,
                status: s.status,
                classId: s.classId,
                dob: s.dob ? new Date(s.dob) : null,
                address: s.address,
                contactName: s.contactName,
                contactPhone: s.contactPhone,
                isBaptized: s.isBaptized,
                baptismDate: s.baptismDate ? new Date(s.baptismDate) : null,
                isSpiritBaptized: s.isSpiritBaptized,
                spiritBaptismDate: s.spiritBaptismDate ? new Date(s.spiritBaptismDate) : null,
                notes: s.notes,
                enrollmentHistory: s.enrollmentHistory ? JSON.parse(JSON.stringify(s.enrollmentHistory)) : undefined,
                historicalAttendance: s.historicalAttendance ? JSON.parse(JSON.stringify(s.historicalAttendance)) : undefined,
            }
        });
    }
    console.log('Seeded Students');

    // 5. TeacherClassAssignments
    for (const m of mockTeacherClassMap) {
        await prisma.teacherClassAssignment.upsert({
            where: { id: m.id },
            update: {},
            create: {
                id: m.id,
                academicYear: m.academicYear,
                teacherId: m.teacherId,
                classId: m.classId,
                isLead: m.isLead || false
            }
        });
    }
    console.log('Seeded Class Assignments');

    // 6. Class Sessions
    for (const sess of mockClassSessions) {
        await prisma.classSession.upsert({
            where: { id: sess.id },
            update: {},
            create: {
                id: sess.id,
                classId: sess.classId,
                date: new Date(sess.sessionDate),
                sessionType: sess.sessionType,
                worshipTopic: sess.worshipTopic,
                worshipTeacherName: sess.worshipTeacherName,
                activityTopic: sess.activityTopic,
                activityTeacherName: sess.activityTeacherName,
                auditorCount: sess.auditorCount,
                offeringAmount: sess.offeringAmount,
                notes: sess.notes,
                isCancelled: sess.isCancelled,
            }
        });
    }
    console.log('Seeded Sessions');

    // 7. Attendance (Student)
    for (const r of mockStudentAttendanceRecords) {
        const exists = await prisma.studentAttendance.findUnique({
            where: { sessionId_studentId: { sessionId: r.sessionId, studentId: r.studentId } }
        });
        if (!exists) {
            await prisma.studentAttendance.create({
                data: {
                    id: r.id,
                    sessionId: r.sessionId,
                    studentId: r.studentId,
                    status: r.status,
                    reason: r.reason
                }
            });
        }
    }
    console.log('Seeded Student Attendance');

    // 8. Attendance (Teacher)
    for (const r of mockTeacherAttendanceRecords) {
        const exists = await prisma.teacherAttendance.findUnique({
            where: { sessionId_teacherId: { sessionId: r.sessionId, teacherId: r.teacherId } }
        });
        if (!exists) {
            await prisma.teacherAttendance.create({
                data: {
                    id: r.id,
                    sessionId: r.sessionId,
                    teacherId: r.teacherId,
                    status: r.status,
                    reason: r.reason
                }
            });
        }
    }
    console.log('Seeded Teacher Attendance');

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
