// Export all services from a single entry point
// Re-export consolidated types from types.ts
export type { StudentAttendanceRecord, TeacherAttendanceRecord, OperationLog } from '../types';

export { default as apiClient } from './api';
export { default as sessionService, type SessionFilter, type SessionDetail, type AttendanceUpdate } from './sessionService';
export { default as studentService, type StudentFilter, type StudentCreateData } from './studentService';
export { default as teacherService, type TeacherFilter, type TeacherCreateData, type ClassAssignmentData } from './teacherService';
export { default as classService, type ClassWithCounts, type ClassDetail } from './classService';
export { default as userService, type UserFilter, type UserCreateData, type UserUpdateData, type LoginResponse } from './userService';
export { default as operationLogService, type CreateOperationLogDto } from './operationLogService';
export { default as studentAttendanceService, type StudentAttendanceUpsertDto, type StudentAttendanceBatchDto } from './studentAttendanceService';
export { default as teacherAttendanceService, type TeacherAttendanceUpsertDto, type TeacherAttendanceBatchDto } from './teacherAttendanceService';
export { default as statisticsService, type StudentStatistics, type ClassStatistics, type SchoolStatistics } from './statisticsService';
export { default as teacherAssignmentService } from './teacherAssignmentService';
