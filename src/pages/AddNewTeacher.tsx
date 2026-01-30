
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Teacher, TeacherType } from '../types';
import { teacherService } from '../services';

const AddNewTeacher: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        teacherType: TeacherType.Formal,
        status: 'active' as 'active' | 'inactive',
        phoneNumber: '',
        email: '',
        notes: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fullName) {
            alert('請填寫「姓名」欄位！');
            return;
        }

        setIsSubmitting(true);
        try {
            const teacherData = {
                fullName: formData.fullName,
                teacherType: formData.teacherType,
                status: formData.status,
                phoneNumber: formData.phoneNumber || undefined,
                email: formData.email || undefined,
                notes: formData.notes || undefined,
            };

            await teacherService.create(teacherData);
            alert('教員已成功新增！');
            navigate('/teachers');
        } catch (err) {
            console.error('Failed to create teacher:', err);
            alert('新增教員失敗，請稍後再試。');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formInputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-church-blue-500 focus:ring-church-blue-500 sm:text-sm bg-white text-gray-900";
    const formLabelClass = "block text-sm font-medium text-gray-700";

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">新增教員</h1>
                <button
                    onClick={() => navigate('/teachers')}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    返回列表
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
                    <button type="submit" disabled={isSubmitting} className="bg-church-blue-600 text-white px-6 py-3 rounded-lg hover:bg-church-blue-700 transition-colors duration-200 flex items-center text-base font-semibold shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        新增教員
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddNewTeacher;
