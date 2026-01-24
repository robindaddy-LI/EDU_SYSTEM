
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Student, StudentType, EnrollmentHistory } from '../types';
import { mockClasses, mockStudents } from '../data/mockData';

// Interface for the form state of an enrollment record
interface EnrollmentFormRecord {
  id?: number; // Existing records will have an ID
  tempId?: number; // New records will have a temp ID for the key prop
  enrollmentDate: string;
  className: string;
  schoolName: string;
}

const EditStudent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState<Omit<Student, 'id' | 'enrollmentHistory' | 'attendanceRecords' | 'classId'> & { classId: string } | null>(null);
    const [enrollmentHistory, setEnrollmentHistory] = useState<EnrollmentFormRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const studentId = id ? parseInt(id, 10) : NaN;
        if (isNaN(studentId)) {
            setIsLoading(false);
            return;
        }

        const studentToEdit = mockStudents.find(s => s.id === studentId);

        if (studentToEdit) {
            const { enrollmentHistory: history, attendanceRecords, id: studentIdNum, ...restOfStudentData } = studentToEdit;
            
            setFormData({
                ...restOfStudentData,
                classId: String(restOfStudentData.classId), // ensure classId is a string for the select input
                dob: restOfStudentData.dob || '',
                address: restOfStudentData.address || '',
                emergencyContactName: restOfStudentData.emergencyContactName || '',
                emergencyContactPhone: restOfStudentData.emergencyContactPhone || '',
                baptismDate: restOfStudentData.baptismDate || '',
                spiritBaptismDate: restOfStudentData.spiritBaptismDate || '',
                notes: restOfStudentData.notes || '',
            });

            // Set enrollment history, ensuring each has a unique key for rendering
            setEnrollmentHistory(history?.map(h => ({ ...h, tempId: h.id, schoolName: h.schoolName || '' })) || []);
        }
        
        setIsLoading(false);
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (formData) {
            setFormData(prev => ({ ...prev!, [name]: value }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        if (formData) {
            setFormData(prev => ({ 
                ...prev!, 
                [name]: checked,
                ...(name === 'isBaptized' && !checked && { baptismDate: '' }),
                ...(name === 'isSpiritBaptized' && !checked && { spiritBaptismDate: '' }),
            }));
        }
    };

    const handleAddEnrollment = () => {
        setEnrollmentHistory(prev => [
            ...prev,
            {
                tempId: Date.now(),
                enrollmentDate: '',
                className: '',
                schoolName: '',
            }
        ]);
    };

    const handleEnrollmentChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEnrollmentHistory(prev => 
            prev.map((item, i) => 
                i === index ? { ...item, [name]: value } : item
            )
        );
    };

    const handleRemoveEnrollment = (index: number) => {
        setEnrollmentHistory(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const studentId = id ? parseInt(id, 10) : NaN;
        if (!formData || isNaN(studentId) || !formData.fullName || !formData.classId) {
            alert('請填寫「姓名」和「班級」欄位！');
            return;
        }

        const studentIndex = mockStudents.findIndex(s => s.id === studentId);
        if (studentIndex === -1) {
            alert('找不到要更新的學員！');
            return;
        }

        const allEnrollmentRecords = mockStudents.flatMap(s => s.enrollmentHistory || []).filter(Boolean);
        let nextEnrollmentId = Math.max(0, ...allEnrollmentRecords.map(r => r.id)) + 1;

        const updatedEnrollmentHistory: EnrollmentHistory[] = enrollmentHistory
            .filter(r => r.enrollmentDate && r.className)
            .map(record => {
                const { tempId, ...rest } = record;
                return {
                    ...rest,
                    id: record.id || nextEnrollmentId++,
                    studentId: studentId,
                    schoolName: rest.schoolName || undefined,
                };
            });
        
        const originalStudent = mockStudents[studentIndex];
        const updatedStudent: Student = {
            ...originalStudent,
            ...formData,
            status: formData.status,
            id: studentId,
            classId: parseInt(formData.classId, 10),
            enrollmentHistory: updatedEnrollmentHistory,
        };

        mockStudents[studentIndex] = updatedStudent;
        
        alert('學員資料已成功更新！');
        navigate(`/students/${id}`);
    };

    const formInputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-church-blue-500 focus:ring-church-blue-500 sm:text-sm bg-white text-gray-900";
    const formLabelClass = "block text-sm font-medium text-gray-700";

    if (isLoading) {
        return <div className="p-8 text-center">讀取資料中...</div>;
    }
    if (!formData) {
        return <div className="p-8 text-center">找不到學員資料。</div>;
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">編輯學員資料</h1>
                <button
                    onClick={() => navigate(`/students/${id}`)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    取消
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">基本資料</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="fullName" className={formLabelClass}>姓名 <span className="text-red-500">*</span></label>
                            <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required className={formInputClass} />
                        </div>
                        <div>
                            <label htmlFor="studentType" className={formLabelClass}>類別</label>
                            <select id="studentType" name="studentType" value={formData.studentType} onChange={handleChange} className={formInputClass}>
                                <option value={StudentType.Member}>信徒</option>
                                <option value={StudentType.Seeker}>慕道</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="classId" className={formLabelClass}>班級 <span className="text-red-500">*</span></label>
                            <select id="classId" name="classId" value={formData.classId} onChange={handleChange} required className={formInputClass}>
                                <option value="" disabled>請選擇班級...</option>
                                {mockClasses.map(cls => <option key={cls.id} value={cls.id}>{cls.className}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="status" className={formLabelClass}>狀態</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className={formInputClass}>
                                <option value="active">在學</option>
                                <option value="inactive">離校</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dob" className={formLabelClass}>出生日期</label>
                            <input type="date" id="dob" name="dob" value={formData.dob} onChange={handleChange} className={formInputClass} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="address" className={formLabelClass}>地址</label>
                            <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className={formInputClass} />
                        </div>
                    </div>
                </div>

                {/* Church Status */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">教會狀態</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input id="isBaptized" name="isBaptized" type="checkbox" checked={formData.isBaptized} onChange={handleCheckboxChange} className="focus:ring-church-blue-500 h-4 w-4 text-church-blue-600 border-gray-300 rounded" />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="isBaptized" className={formLabelClass}>是否受洗</label>
                                </div>
                            </div>
                            {formData.isBaptized && (
                                <div className="ml-7">
                                    <label htmlFor="baptismDate" className={formLabelClass}>受洗日期</label>
                                    <input type="date" id="baptismDate" name="baptismDate" value={formData.baptismDate} onChange={handleChange} className={formInputClass} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                             <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input id="isSpiritBaptized" name="isSpiritBaptized" type="checkbox" checked={formData.isSpiritBaptized} onChange={handleCheckboxChange} className="focus:ring-church-blue-500 h-4 w-4 text-church-blue-600 border-gray-300 rounded" />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="isSpiritBaptized" className={formLabelClass}>是否受聖靈</label>
                                </div>
                            </div>
                            {formData.isSpiritBaptized && (
                                <div className="ml-7">
                                    <label htmlFor="spiritBaptismDate" className={formLabelClass}>受聖靈日期</label>
                                    <input type="date" id="spiritBaptismDate" name="spiritBaptismDate" value={formData.spiritBaptismDate} onChange={handleChange} className={formInputClass} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                 {/* Emergency Contact */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">緊急聯絡人</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="emergencyContactName" className={formLabelClass}>姓名</label>
                            <input type="text" id="emergencyContactName" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className={formInputClass} />
                        </div>
                        <div>
                            <label htmlFor="emergencyContactPhone" className={formLabelClass}>電話</label>
                            <input type="tel" id="emergencyContactPhone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className={formInputClass} />
                        </div>
                    </div>
                </div>
                
                {/* Enrollment History Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h2 className="text-xl font-semibold text-gray-700">學歷/入學紀錄</h2>
                        <button
                            type="button"
                            onClick={handleAddEnrollment}
                            className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors text-sm flex items-center"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            新增紀錄
                        </button>
                    </div>
                    <div className="space-y-4">
                        {enrollmentHistory.length > 0 ? (
                            enrollmentHistory.map((record, index) => (
                                <div key={record.id || record.tempId} className="p-4 border bg-gray-50 rounded-md grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative">
                                    <div className="md:col-span-1">
                                        <label htmlFor={`enrollmentDate-${index}`} className={formLabelClass}>入學日期</label>
                                        <input type="date" id={`enrollmentDate-${index}`} name="enrollmentDate" value={record.enrollmentDate} onChange={(e) => handleEnrollmentChange(index, e)} className={formInputClass} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label htmlFor={`className-${index}`} className={formLabelClass}>教會班級</label>
                                        <select id={`className-${index}`} name="className" value={record.className} onChange={(e) => handleEnrollmentChange(index, e)} className={formInputClass}>
                                            <option value="" disabled>請選擇班級...</option>
                                            {mockClasses.map(cls => <option key={cls.id} value={cls.className}>{cls.className}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label htmlFor={`schoolName-${index}`} className={formLabelClass}>學校名稱</label>
                                        <input type="text" id={`schoolName-${index}`} name="schoolName" value={record.schoolName} onChange={(e) => handleEnrollmentChange(index, e)} className={formInputClass} placeholder="例如：石牌國小"/>
                                    </div>
                                    <div className="md:col-span-1">
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveEnrollment(index)} 
                                            className="w-full bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors text-sm flex items-center justify-center"
                                            aria-label="移除此筆紀錄"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            移除
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                             <p className="text-center text-gray-500 py-4">尚無學歷紀錄。點擊右上角「新增紀錄」來加入。</p>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">重要紀事</h2>
                    <div>
                        <label htmlFor="notes" className="sr-only">重要紀事</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className={formInputClass} placeholder="記錄學員的特殊情況，例如過敏..."></textarea>
                    </div>
                </div>

                {/* Submission */}
                <div className="flex justify-end pt-4">
                     <button type="submit" className="bg-church-blue-600 text-white px-6 py-3 rounded-lg hover:bg-church-blue-700 transition-colors duration-200 flex items-center text-base font-semibold shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        儲存變更
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditStudent;
