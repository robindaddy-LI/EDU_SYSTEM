import { Request, Response } from 'express';
import prisma from '../prisma';
import { AttendanceStatus } from '@prisma/client';

const getAcademicYear = (date: Date): number => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    return month >= 8 ? year : year - 1;
};

export const StatisticsController = {
    // Get aggregated stats for a specific student
    async getStudentStats(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const studentId = Number(id);

            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { historicalAttendance: true }
            });

            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            // Fetch all attendance records
            const records = await prisma.studentAttendance.findMany({
                where: { studentId },
                include: {
                    session: {
                        include: { class: true }
                    }
                }
            });

            // 1. Summary Stats
            const summary = {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                total: records.length,
                rate: 0
            };

            records.forEach(r => {
                if (r.status === AttendanceStatus.present) summary.present++;
                else if (r.status === AttendanceStatus.absent) summary.absent++;
                else if (r.status === AttendanceStatus.late) summary.late++;
                else if (r.status === AttendanceStatus.excused) summary.excused++;
            });

            const presentOrLate = summary.present + summary.late;
            summary.rate = summary.total > 0 ? Math.round((presentOrLate / summary.total) * 100) : 0;

            // 2. Aggregated History (By Academic Year & Class)
            const historyMap = new Map<string, {
                academicYear: number;
                className: string;
                present: number;
                late: number;
                total: number;
            }>();

            records.forEach(r => {
                const year = getAcademicYear(new Date(r.session.date));
                const className = r.session.class.name;
                const key = `${year}-${className}`;

                if (!historyMap.has(key)) {
                    historyMap.set(key, {
                        academicYear: year,
                        className,
                        present: 0,
                        late: 0,
                        total: 0
                    });
                }

                const entry = historyMap.get(key)!;
                entry.total++;
                if (r.status === AttendanceStatus.present) entry.present++;
                if (r.status === AttendanceStatus.late) entry.late++;
            });

            const aggregatedHistory = Array.from(historyMap.values()).map(h => ({
                ...h,
                percentage: h.total > 0 ? Math.round(((h.present + h.late) / h.total) * 100) : 0
            })).sort((a, b) => a.academicYear - b.academicYear);

            // 3. Return combined data
            res.json({
                summary,
                aggregatedHistory,
                manualHistory: student.historicalAttendance || []
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch student statistics' });
        }
    },

    // Get aggregated stats for a class in a specific academic year
    async getClassStats(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { year } = req.query; // Academic Year

            if (!year) {
                return res.status(400).json({ error: 'Academic year is required' });
            }

            const classId = Number(id);
            const academicYear = Number(year);
            const startDate = new Date(academicYear, 8, 1); // Sept 1st
            const endDate = new Date(academicYear + 1, 7, 31); // Aug 31st

            // Fetch sessions in range
            const sessions = await prisma.classSession.findMany({
                where: {
                    classId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                include: {
                    studentAttendance: true
                }
            });

            const totalSessions = sessions.length;
            let totalAttendees = 0;
            let totalOffering = 0;

            sessions.forEach(s => {
                const attended = s.studentAttendance.filter(
                    a => a.status === AttendanceStatus.present || a.status === AttendanceStatus.late
                ).length;
                totalAttendees += attended;
                totalOffering += Number(s.offeringAmount);
            });

            const avgAttendance = totalSessions > 0 ? Math.round((totalAttendees / totalSessions) * 10) / 10 : 0;
            const avgOffering = totalSessions > 0 ? Math.round(totalOffering / totalSessions) : 0;

            res.json({
                academicYear,
                totalSessions,
                avgAttendance,
                totalOffering,
                avgOffering
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch class statistics' });
        }
    },

    // Get School-wide dashboard stats
    async getSchoolStats(req: Request, res: Response) {
        try {
            const today = new Date();
            const currentYear = getAcademicYear(today);
            const startDate = new Date(currentYear, 8, 1);

            // 1. Active Students Count
            const activeStudents = await prisma.student.count({
                where: { status: 'active' }
            });

            // 2. Active Teachers Count
            const activeTeachers = await prisma.teacher.count({
                where: { status: 'active' }
            });

            // 3. Current Semester Sessions Count
            const sessionsCount = await prisma.classSession.count({
                where: {
                    date: { gte: startDate }
                }
            });

            // 4. Class Breakdown (Active Students)
            const classes = await prisma.class.findMany({
                include: {
                    _count: {
                        select: { students: { where: { status: 'active' } } }
                    }
                }
            });

            const classStats = classes.map(c => ({
                id: c.id,
                name: c.name,
                studentCount: c._count.students
            }));

            res.json({
                currentYear,
                activeStudents,
                activeTeachers,
                sessionsThisYear: sessionsCount,
                classBreakdown: classStats
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch school statistics' });
        }
    }
};
