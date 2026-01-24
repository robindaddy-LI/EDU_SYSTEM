
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Teacher, TeacherType } from '../types';
import { mockTeachers } from '../data/mockData';

const EditTeacher: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState<Omit<Teacher, 'id'> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const teacherId = id ? parseInt(id, 10) : NaN;
        if (isNaN(teacherId)) {
            setIsLoading(false);
            return;
        }

        const teacherToEdit = mockTeachers.find(t => t.id === teacherId);

        if (teacherToEdit) {
            const { id: teacherIdNum, ...restOfTeacherData } = teacherToEdit;
            setFormData({
                ...restOfTeacherData,
                phoneNumber: restOfTeacherData.phoneNumber || '',
                email: restOfTeacherData.email || '',
                notes: restOfTeacherData.notes || '',
            });
        }
        
        setIsLoading(false);
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (formData) {
            setFormData(prev => ({ ...prev!, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const teacherId = id ? parseInt(id, 10) : NaN;
        if (!formData || isNaN(teacherId) || !formData.fullName) {
            alert('請填寫「姓名」欄位！');
            return;
        }

        const teacherIndex = mockTeachers.findIndex(t => t.id === teacherId);
        if (teacherIndex === -1) {
            alert('找不到要更新的教員！');
            return;
        }

        const updatedTeacher: Teacher = {
            id: teacherId,
            ...formData,
        };

        mockTeachers[teacherIndex] = updatedTeacher;
        
        alert('教員資料已成功更新！');
        navigate(`/teachers/${id}`);
    };

    const formInputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-church-blue-500 focus:ring-church-blue-500 sm:text-sm bg-white text-gray-900";
    const formLabelClass = "block text-sm font-medium text-gray-700";

    if (isLoading) {
        return <div className="p-8 text-center">讀取資料中...</div>;
    }
    if (!formData) {
        return <div className="p-8 text-center">找不到教員資料。</div>;
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">編輯教員資料</h1>
                <button
                    onClick={() => navigate(`/teachers/${id}`)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    取消
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">基本資料</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="fullName" className={formLabelClass}>姓名 <span className="text-red-500">*</span></label>
                            <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required className={formInputClass} />
                        </div>
                        <div>
                            <label htmlFor="teacherType" className={formLabelClass}>教員類別</label>
                            <select id="teacherType" name="teacherType" value={formData.teacherType} onChange={handleChange} className={formInputClass}>
                                <option value={TeacherType.Formal}>正式教員</option>
                                <option value={TeacherType.Trainee}>見習教員</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="status" className={formLabelClass}>狀態</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className={formInputClass}>
                                <option value="active">在職</option>
                                <option value="inactive">離職</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className={formLabelClass}>電話</label>
                            <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className={formInputClass} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="email" className={formLabelClass}>電子郵件</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className={formInputClass} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">備註</h2>
                    <div>
                        <label htmlFor="notes" className="sr-only">備註</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className={formInputClass} placeholder="記錄教員的特殊專長或注意事項..."></textarea>
                    </div>
                </div>

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

export default EditTeacher;
