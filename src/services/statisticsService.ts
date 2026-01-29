import apiClient from './api';

export interface StudentStatistics {
    summary: {
        present: number;
        absent: number;
        late: number;
        excused: number;
        total: number;
        rate: number;
    };
    aggregatedHistory: Array<{
        academicYear: number;
        className: string;
        present: number;
        late: number;
        total: number;
        percentage: number;
    }>;
    manualHistory: Array<{
        rowLabel: string; // e.g., "第一年"
        className: string;
        percentage: number;
    }>;
}

export interface ClassStatistics {
    academicYear: number;
    totalSessions: number;
    avgAttendance: number;
    totalOffering: number;
    avgOffering: number;
}

export interface SchoolStatistics {
    currentYear: number;
    activeStudents: number;
    activeTeachers: number;
    sessionsThisYear: number;
    classBreakdown: Array<{
        id: number;
        name: string;
        studentCount: number;
    }>;
}

const statisticsService = {
    getStudentStats: async (studentId: number): Promise<StudentStatistics> => {
        const response = await apiClient.get(`/statistics/student/${studentId}`);
        return response.data;
    },

    getClassStats: async (classId: number, year: number): Promise<ClassStatistics> => {
        const response = await apiClient.get(`/statistics/class/${classId}`, {
            params: { year }
        });
        return response.data;
    },

    getSchoolStats: async (): Promise<SchoolStatistics> => {
        const response = await apiClient.get('/statistics/school');
        return response.data;
    }
};

export default statisticsService;
