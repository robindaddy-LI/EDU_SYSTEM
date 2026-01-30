
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TeacherType, Teacher, Student, StudentType, EnrollmentHistory, HistoricalAttendance, Class } from '../types';
import studentService from '../services/studentService';
import teacherAssignmentService from '../services/teacherAssignmentService';
import classService from '../services/classService';
import operationLogService from '../services/operationLogService';
import teacherService from '../services/teacherService';
import { useAuth } from '../AuthContext';
// Import XLSX from CDN
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

interface ClassAssignmentState {
    [classId: number]: {
        leadTeacherId: string; // Storing as string to match select value
        teacherIds: number[];
    };
}

// --- Helper Functions for Academic Year ---
const getCurrentAcademicYear = (date: Date = new Date()): number => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    return month >= 8 ? year : year - 1; // Academic year starts in September (month 8)
};

const gregorianToRoc = (gregorianYear: number): number => {
    return gregorianYear - 1911;
};

// --- Parsing Helpers ---

const parseDateString = (input: string | number | Date): string => {
    if (!input) return '';

    // Handle Excel serial date (number)
    if (typeof input === 'number') {
        // Excel base date check (approximate)
        if (input > 20000) {
            const date = new Date(Math.round((input - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }
        // If it's a small number (like year 108), let it fall through to string parsing or return as is
        return input.toString();
    }

    if (input instanceof Date) {
        return input.toISOString().split('T')[0];
    }

    const dateStr = String(input).trim();

    // Handle ROC Format (e.g. 105.5.20, 108/01/01, 99-12-31)
    // Regex captures: Group 1 (Year), Group 2 (Month), Group 3 (Day)
    const rocMatch = dateStr.match(/^(\d{2,3})[./-](\d{1,2})[./-](\d{1,2})/);
    if (rocMatch) {
        const yearVal = parseInt(rocMatch[1], 10);
        // Heuristic: If year is between 10 and 190 (likely ROC year), convert to AD
        if (yearVal > 10 && yearVal < 1900) {
            const adYear = yearVal + 1911;
            const m = rocMatch[2].padStart(2, '0');
            const d = rocMatch[3].padStart(2, '0');
            return `${adYear}-${m}-${d}`;
        }
    }

    // Handle 2008.10.2 format to 2008-10-02
    // Also handle YYYY/MM/DD
    let normalized = dateStr.replace(/\./g, '-').replace(/\//g, '-');
    const parts = normalized.split('-');
    if (parts.length === 3) {
        const y = parts[0];
        // Double check if the first part looks like ROC year but wasn't caught by regex above
        const yearNum = parseInt(y, 10);
        let finalYear = y;
        if (yearNum > 10 && yearNum < 1900) {
            finalYear = (yearNum + 1911).toString();
        }

        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${finalYear}-${m}-${d}`;
    }
    return normalized;
};

const parseBaptismInfo = (str: string): { is: boolean; date: string } => {
    if (!str) return { is: false, date: '' };
    const cleanStr = String(str).trim();
    // Assuming any content means yes, usually starts with V
    const is = cleanStr.length > 0;
    let date = '';
    if (is) {
        // Extract content in parentheses: V (2015年) or V (2020.10.21...)
        const match = cleanStr.match(/\((.*?)\)/);
        if (match) {
            let dateContent = match[1].replace('年', '').trim();
            // Try to parse date. If only year (2015), assume 2015-01-01 or keep string if strict validation not needed
            if (/^\d{4}$/.test(dateContent)) {
                date = `${dateContent}-01-01`;
            } else {
                // Try handling 2020.10.21 format inside parens
                // Sometimes text follows date: "2020.10.21石牌靈恩會"
                // Extract digits/dots/slashes/dashes
                const dateMatch = dateContent.match(/^[\d\.\-\/]+/);
                if (dateMatch) {
                    date = parseDateString(dateMatch[0]);
                }
            }
        }
    }
    return { is, date };
};

const mapClassName = (header: string): string => {
    const h = String(header).trim();
    // CSV headers: 幼兒, 幼年, 少年, 初級, 中級, 高級
    // System classes: 幼兒班, 幼年班, 少年班, 國中班, 高中班
    if (h.includes('幼兒')) return '幼兒班';
    if (h.includes('幼年')) return '幼年班';
    if (h.includes('少年')) return '少年班';
    if (h.includes('初級')) return '國中班';
    if (h.includes('中級')) return '高中班';
    if (h.includes('高級')) return '大專班';
    if (h.includes('大專')) return '大專班';
    if (h.includes('國中')) return '國中班';
    if (h.includes('高中')) return '高中班';
    return h + (h.endsWith('班') ? '' : '班');
};

const Settings: React.FC = () => {
    const { currentUser } = useAuth();
    const [promotionResult, setPromotionResult] = useState<{ updated: number; skipped: number; graduated?: number } | null>(null);
    const [isPromoting, setIsPromoting] = useState(false);

    // Classes State
    const [classes, setClasses] = useState<Class[]>([]);

    // Teachers State
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    // State for teacher assignments
    const currentGregorianYear = getCurrentAcademicYear();
    const [selectedYear, setSelectedYear] = useState<string>(currentGregorianYear.toString());
    const [assignments, setAssignments] = useState<ClassAssignmentState>({});
    const [isSavingAssignments, setIsSavingAssignments] = useState(false);
    const [assignmentSaveResult, setAssignmentSaveResult] = useState<string | null>(null);

    // State for Import
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Data Cleanup
    const [duplicateGroups, setDuplicateGroups] = useState<Student[][]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isAutoMerging, setIsAutoMerging] = useState(false);
    const [cleanupResult, setCleanupResult] = useState<string | null>(null);

    const activeTeachers = useMemo(() => teachers.filter(t => t.status === 'active'), [teachers]);
    const formalActiveTeachers = useMemo(() => activeTeachers.filter(t => t.teacherType === TeacherType.Formal), [activeTeachers]);

    // Load Teachers
    useEffect(() => {
        const loadTeachers = async () => {
            try {
                const data = await teacherService.getAll();
                setTeachers(data);
            } catch (error) {
                console.error('Failed to load teachers', error);
            }
        };
        loadTeachers();
    }, []);

    // Load Classes
    useEffect(() => {
        const loadClasses = async () => {
            try {
                const data = await classService.getAll();
                // Ensure we have classes, if empty (fresh DB), keeping mockClasses might be safer for UI or handle empty
                if (data && data.length > 0) {
                    setClasses(data);
                }
            } catch (error) {
                console.error('Failed to load classes', error);
            }
        };
        loadClasses();
    }, []);

    useEffect(() => {
        const loadAssignments = async () => {
            if (classes.length === 0) return; // Wait for classes to load

            try {
                const apiAssignments = await teacherAssignmentService.getAll(selectedYear);
                const newAssignments: ClassAssignmentState = {};

                classes.forEach(cls => {
                    const classAssignments = apiAssignments.filter(a => a.classId === cls.id);
                    const lead = classAssignments.find(a => a.isLead);
                    const others = classAssignments.filter(a => !a.isLead).map(a => a.teacherId);

                    newAssignments[cls.id] = {
                        leadTeacherId: lead ? String(lead.teacherId) : '',
                        teacherIds: others,
                    };
                });

                setAssignments(newAssignments);
            } catch (error) {
                console.error('Failed to load teacher assignments:', error);
                // Fallback to empty assignments
                const emptyAssignments: ClassAssignmentState = {};
                classes.forEach(cls => {
                    emptyAssignments[cls.id] = { leadTeacherId: '', teacherIds: [] };
                });
                setAssignments(emptyAssignments);
            }
            setAssignmentSaveResult(null);
        };

        loadAssignments();
    }, [selectedYear, classes]);


    const getTargetClassId = (dob: string | undefined, academicYear: number): number | null | -1 => {
        if (!dob) return null;
        const classMap = new Map<string, number>(classes.map(c => [c.className, c.id]));
        const birthDate = new Date(dob);

        // Validation: Check if date is valid
        if (isNaN(birthDate.getTime())) return null;

        // 使用傳入的學年度 (9月1日) 作為基準日
        const referenceDate = new Date(academicYear, 8, 1); // 9月1日 (月份從0開始)

        let age = referenceDate.getFullYear() - birthDate.getFullYear();
        const monthDifference = referenceDate.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && referenceDate.getDate() < birthDate.getDate())) {
            age--;
        }

        // 依據教會教育分班慣例 (以學齡為主，9/1 實歲)
        // 3-5歲: 幼兒班
        // 6-8歲: 幼年班 (小一~小三)
        // 9-11歲: 少年班 (小四~小六)
        // 12-14歲: 國中班 (國一~國三)
        // 15-17歲: 高中班 (高一~高三)
        // 18-22歲: 大專班
        // 23歲以上: 自動離校

        if (age >= 23) return -1; // 超過大專年齡，標記為應離校
        if (age >= 18) return classMap.get('大專班') || classMap.get('高級班') || 6; // 大專/高級 (18-22)
        if (age >= 15) return classMap.get('高中班') || 5; // 高中 (15-17)
        if (age >= 12) return classMap.get('國中班') || 4; // 國中 (12-14)
        if (age >= 9) return classMap.get('少年班') || 3;  // 國小高年級 (9-11)
        if (age >= 6) return classMap.get('幼年班') || 2;  // 國小低年級 (6-8)
        return classMap.get('幼兒班') || 1;                // 學齡前 (3-5)
    };

    const handlePromoteStudents = async () => {
        const targetYear = parseInt(selectedYear, 10);
        const rocYear = gregorianToRoc(targetYear);

        const confirmation = window.confirm(
            `您確定要執行 ${rocYear} 學年度 (${targetYear}) 的升班作業嗎？\n\n此操作將根據所有「在學」學員的出生年月日，以及選擇的學年度基準日 (9/1)，自動更新他們的班級。\n此操作無法復原，請謹慎操作！`
        );

        if (confirmation) {
            setIsPromoting(true);
            setPromotionResult(null);
            let updatedCount = 0;
            let skippedCount = 0;
            let graduatedCount = 0; // Track auto-graduated students

            try {
                // Fetch all students from API
                const allStudents = await studentService.getAll({ status: 'active' });

                for (const student of allStudents) {
                    if (student.status === 'inactive') {
                        skippedCount++;
                        continue;
                    }

                    // Use the selected year for calculation
                    const targetClassId = getTargetClassId(student.dob, targetYear);

                    if (targetClassId === null) {
                        skippedCount++;
                        continue;
                    }

                    // Handle auto-graduation (age >= 23)
                    if (targetClassId === -1) {
                        try {
                            await studentService.update(student.id, { status: 'inactive' });
                            graduatedCount++;
                        } catch (error) {
                            console.error('Failed to graduate student:', student.fullName, error);
                            skippedCount++;
                        }
                        continue;
                    }

                    if (student.classId !== targetClassId) {
                        try {
                            // Update via API
                            await studentService.update(student.id, { classId: targetClassId });
                            updatedCount++;
                        } catch (error) {
                            console.error('Failed to promote student:', student.fullName, error);
                            skippedCount++;
                        }
                    }
                }

                // Log operation
                await operationLogService.create({
                    type: '學年升班',
                    description: `執行 ${rocYear} 學年度升班作業。成功更新 ${updatedCount} 位學員，自動離校 ${graduatedCount} 位，跳過 ${skippedCount} 位。`,
                    userId: currentUser?.id || 1,
                    metadata: { rocYear, updatedCount, graduatedCount, skippedCount }
                });

                setPromotionResult({ updated: updatedCount, skipped: skippedCount, graduated: graduatedCount });
            } catch (error) {
                console.error('Promotion failed:', error);
                alert('升班作業失敗，請檢查網路連線或聯絡系統管理員。');
            } finally {
                setIsPromoting(false);
            }
        }
    };

    const handleLeadChange = (classId: number, leadTeacherId: string) => {
        setAssignments(prev => ({
            ...prev,
            [classId]: {
                ...prev[classId],
                leadTeacherId: leadTeacherId,
                teacherIds: prev[classId].teacherIds.filter(id => id !== parseInt(leadTeacherId, 10)),
            }
        }));
    };

    const handleTeacherToggle = (classId: number, teacherId: number) => {
        setAssignments(prev => {
            const currentTeacherIds = prev[classId].teacherIds;
            const newTeacherIds = currentTeacherIds.includes(teacherId)
                ? currentTeacherIds.filter(id => id !== teacherId)
                : [...currentTeacherIds, teacherId];
            return {
                ...prev,
                [classId]: { ...prev[classId], teacherIds: newTeacherIds }
            };
        });
    };

    const handleSaveAssignments = async () => {
        setIsSavingAssignments(true);
        setAssignmentSaveResult(null);

        try {
            const assignmentsArray = [];

            for (const classIdStr in assignments) {
                const classId = parseInt(classIdStr, 10);
                const { leadTeacherId, teacherIds } = assignments[classId];

                if (leadTeacherId) {
                    assignmentsArray.push({
                        teacherId: parseInt(leadTeacherId, 10),
                        classId: classId,
                        isLead: true,
                    });
                }

                teacherIds.forEach(teacherId => {
                    assignmentsArray.push({
                        teacherId: teacherId,
                        classId: classId,
                        isLead: false,
                    });
                });
            }

            await teacherAssignmentService.batchUpsert({
                academicYear: selectedYear,
                assignments: assignmentsArray
            });

            const rocYear = gregorianToRoc(parseInt(selectedYear, 10));
            setAssignmentSaveResult(`${rocYear} 學年度教員設定已成功儲存！`);
        } catch (error: any) {
            console.error('Failed to save teacher assignments:', error);
            const responseData = error.response?.data;
            const errorMessage = responseData?.error || error.message || '儲存失敗';
            const details = responseData?.details ? ` (${responseData.details})` : '';
            const code = responseData?.code ? ` [Code: ${responseData.code}]` : '';
            const meta = responseData?.meta ? ` Meta: ${JSON.stringify(responseData.meta)}` : '';

            setAssignmentSaveResult(`❌ ${errorMessage}${code}${details}${meta}`);
        } finally {
            setIsSavingAssignments(false);
        }
    };

    // --- Core Data Processing Logic (Shared for CSV/Excel Rows) ---
    // rows: 2D array of values (strings, numbers, etc.)
    const processImportData = (rows: any[][]) => {
        const parsedStudents: any[] = [];
        let enrollmentIdCounter = 1000 + Date.now();
        let tempId = 1;

        // Use current selected year for import calculation or default to current logic
        const importCalcYear = parseInt(selectedYear, 10);

        for (let i = 0; i < rows.length - 1; i++) {
            const currentRow = rows[i];
            const nextRow = rows[i + 1];

            // Check if this is a start of a student block
            // Criterion: next row starts with '基本資料' (ignoring whitespace)
            if (nextRow && nextRow[0] && String(nextRow[0]).trim() === '基本資料') {
                // Current row[0] is Name
                const name = String(currentRow[0] || '').trim();
                if (!name) continue;

                // Initialize Student Object
                const student: any = {
                    fullName: name,
                    studentType: StudentType.Member, // Default
                    status: 'active',
                    classId: 0, // Will calculate
                    isBaptized: false,
                    isSpiritBaptized: false,
                    enrollmentHistory: [],
                    historicalAttendance: [],
                    notes: ''
                };

                // --- Parse Basic Info ---
                // The row AFTER '基本資料' (i+2) contains values
                if (i + 2 < rows.length) {
                    const valRow = rows[i + 2];
                    // Structure matches: ,DOB, WaterBaptism, SpiritBaptism, Father, Mother, Phone, ParentMobile

                    student.dob = parseDateString(valRow[1]);

                    const waterInfo = parseBaptismInfo(String(valRow[2] || ''));
                    student.isBaptized = waterInfo.is;
                    student.baptismDate = waterInfo.date;

                    const spiritInfo = parseBaptismInfo(String(valRow[3] || ''));
                    student.isSpiritBaptized = spiritInfo.is;
                    student.spiritBaptismDate = spiritInfo.date;

                    const parents = [];
                    if (valRow[4]) parents.push(`父:${valRow[4]}`);
                    if (valRow[5]) parents.push(`母:${valRow[5]}`);

                    const parentMobile = String(valRow[7] || '');

                    student.emergencyContactName = parents.join(' ') || '家長';
                    student.emergencyContactPhone = parentMobile || String(valRow[6] || '') || '';
                }

                // Scan forward for other sections until next '基本資料' or End of rows
                let j = i + 3;
                while (j < rows.length) {
                    const subRow = rows[j];
                    // Check if we hit next student
                    if (j + 1 < rows.length && String(rows[j + 1][0]).trim() === '基本資料') break;

                    // Guard against empty rows
                    if (!subRow || subRow.length === 0) {
                        j++;
                        continue;
                    }

                    const sectionHeader = String(subRow[0] || '').trim();

                    // Address
                    if (subRow[1] && String(subRow[1]).trim() === '住址') {
                        student.address = String(subRow[2] || '');
                    }

                    // Enrollment
                    // Header Row: 入學年月,幼兒,幼年...
                    if (sectionHeader === '入學年月') {
                        const headers = subRow;
                        const values = rows[j + 1]; // The row below header
                        if (values) {
                            headers.forEach((header: any, idx: number) => {
                                if (idx > 0 && values[idx]) {
                                    const rocYearStr = String(values[idx]).trim();
                                    const rocYear = parseInt(rocYearStr);
                                    if (!isNaN(rocYear)) {
                                        const adYear = rocYear + 1911;
                                        const mappedClassName = mapClassName(header);

                                        student.enrollmentHistory!.push({
                                            id: enrollmentIdCounter++,
                                            studentId: student.id,
                                            enrollmentDate: `${adYear}-09-01`,
                                            className: mappedClassName,
                                            schoolName: '' // Not in data
                                        });
                                    }
                                }
                            });
                        }
                    }

                    // Attendance
                    // Header: 出席,,幼兒,幼年...
                    if (sectionHeader === '出席') {
                        const headers = subRow;
                        // Rows follow: ,第一年,,,,92...
                        let k = j + 1;
                        while (k < rows.length) {
                            const attRow = rows[k];
                            // Break if we hit next main section
                            const possibleHeader = String(attRow[0] || '').trim();
                            if (possibleHeader === '重要紀事' || (k + 1 < rows.length && String(rows[k + 1][0]).trim() === '基本資料')) break;

                            const rowLabel = String(attRow[1] || '').trim(); // 第一年, 第二年...
                            if (rowLabel) {
                                headers.forEach((header: any, idx: number) => {
                                    if (idx > 1 && attRow[idx]) { // Skip col 0,1
                                        let val = parseFloat(String(attRow[idx]));
                                        if (!isNaN(val)) {
                                            // FIX: Handle decimals (e.g. 0.673 -> 67.3%)
                                            // Explicit check for decimal range [0, 1] excluding 0
                                            // If it is exactly 1, we treat it as 100%
                                            if (val > 0 && val <= 1) {
                                                val = val * 100;
                                            }
                                            // Round to 1 decimal place
                                            val = Math.round(val * 10) / 10;

                                            const mappedClassName = mapClassName(header);
                                            student.historicalAttendance!.push({
                                                rowLabel: rowLabel,
                                                className: mappedClassName,
                                                percentage: val
                                            });
                                        }
                                    }
                                });
                            }
                            k++;
                        }
                    }

                    // Notes
                    if (sectionHeader === '重要紀事') {
                        const notesLines = [];
                        let k = j + 1;
                        while (k < rows.length) {
                            // Stop at next student
                            if (k + 1 < rows.length && String(rows[k + 1][0]).trim() === '基本資料') break;

                            // Collect non-empty lines
                            const lineContent = rows[k].join(' ').trim().replace(/,+/g, '');
                            if (lineContent) {
                                notesLines.push(lineContent);
                            }
                            k++;
                        }
                        student.notes = notesLines.join('\n');
                    }

                    j++;
                }

                // Assign Class ID based on DOB and current selected year
                const calculatedClassId = getTargetClassId(student.dob, importCalcYear);
                // Default to 1 (幼兒班) if calculation fails
                student.classId = calculatedClassId || 1;

                parsedStudents.push(student);
                tempId++;

                // Advance i to where we finished scanning
                i = j - 1;
            }
        }
        return parsedStudents;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setIsImporting(true);
        setImportResult(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            let allStudentsToImport: any[] = [];

            // Iterate through all sheets
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                // Convert sheet to array of arrays. defval: '' ensures empty cells are empty strings
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

                // processImportData is now synchronous and returns array
                const sheetStudents = processImportData(rows);
                allStudentsToImport = allStudentsToImport.concat(sheetStudents);
            }

            if (allStudentsToImport.length > 0) {
                const result = await studentService.batchImport(allStudentsToImport);

                // Log operation
                await operationLogService.create({
                    type: '資料匯入',
                    description: `從 Excel/CSV 匯入處理完成。建立: ${result.created}, 合併: ${result.merged}, 錯誤: ${result.errors}`,
                    userId: currentUser?.id || 1,
                    metadata: { ...result }
                });

                setImportResult(`匯入完成！成功建立: ${result.created}, 合併資料: ${result.merged}, 錯誤: ${result.errors}`);
            } else {
                setImportResult("未偵測到符合格式的學員資料，請檢查檔案內容。");
            }

        } catch (err) {
            console.error("Import error:", err);
            setImportResult("讀取檔案失敗，請確認格式是否為標準 Excel (.xlsx, .xls) 或 CSV。");
        } finally {
            setIsImporting(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const scanForDuplicates = async () => {
        setIsScanning(true);
        setCleanupResult(null);
        try {
            const results = await studentService.findDuplicates();
            setDuplicateGroups(results);
            if (results.length === 0) {
                setCleanupResult('未發現重複資料！');
            } else {
                setCleanupResult(null);
            }
        } catch (error) {
            console.error('Scan failed:', error);
            setCleanupResult('掃描失敗，請稍後再試');
        } finally {
            setIsScanning(false);
        }
    };

    const handleResolveDuplicates = async (action: 'merge' | 'delete', group: Student[]) => {
        if (!window.confirm(action === 'merge' ? '確定要將此群組合併至最早的資料嗎？(其他資料將被刪除，歷史紀錄將合併)' : '確定要刪除此群組的所有資料嗎？(此操作不可復原)')) return;

        try {
            if (action === 'merge') {
                // Keep the first one (oldest by createdAt logic in backend)
                const keepId = group[0].id;
                const mergeIds = group.slice(1).map(s => s.id);
                await studentService.resolveDuplicates({ action: 'merge', keepId, mergeIds });
                setCleanupResult(`成功合併群組: ${group[0].fullName}`);
            } else {
                const deleteIds = group.map(s => s.id);
                await studentService.resolveDuplicates({ action: 'delete', deleteIds });
                setCleanupResult(`成功刪除 ${group.length} 筆資料`);
            }
            // Refresh scan
            scanForDuplicates();
        } catch (error) {
            console.error('Resolve failed:', error);
            alert('處理失敗');
        }
    };

    const handleAutoMergeAll = async () => {
        if (!duplicateGroups.length) return;
        if (!window.confirm(`確定要自動合併所有 ${duplicateGroups.length} 組重複資料嗎？\n系統將自動保留最早建立的資料(ID最小)，並合併其餘資料的歷史紀錄。此操作不可復原。`)) return;

        setIsAutoMerging(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < duplicateGroups.length; i++) {
                const group = duplicateGroups[i];
                if (group.length < 2) continue;

                // Priority: Keep first one (assuming sorted by ID or sort here)
                const sortedGroup = [...group].sort((a, b) => a.id - b.id);
                const keepId = sortedGroup[0].id;
                const mergeIds = sortedGroup.slice(1).map(s => s.id);

                try {
                    await studentService.resolveDuplicates({ action: 'merge', keepId, mergeIds });
                    successCount++;
                    setCleanupResult(`正在處理: ${i + 1}/${duplicateGroups.length} (成功: ${successCount})`);
                } catch (e) {
                    console.error('Auto merge failed for group', group[0].fullName, e);
                    failCount++;
                }
            }
            setCleanupResult(`批次處理完成！成功合併 ${successCount} 組，失敗 ${failCount} 組。`);
            scanForDuplicates(); // Refresh
        } catch (error) {
            console.error('Batch merge error', error);
            setCleanupResult('批次處理發生錯誤');
        } finally {
            setIsAutoMerging(false);
        }
    };

    const yearsToShow = Array.from({ length: 5 }, (_, i) => currentGregorianYear + 1 - i); // Allow 1 year into future
    const selectedRocYear = gregorianToRoc(parseInt(selectedYear, 10));

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">系統設定</h1>

            {/* Year Selector Section (Moved to top to emphasize global effect) */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-50 to-white border-b border-blue-50">
                    <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-church-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <span>目前設定學年度</span>
                            </div>
                        </h2>
                        <div>
                            <label htmlFor="year-select" className="sr-only">選擇學年度</label>
                            <select
                                id="year-select"
                                value={selectedYear}
                                onChange={e => setSelectedYear(e.target.value)}
                                className="rounded-lg border-gray-200 shadow-sm focus:border-church-blue-500 focus:ring-church-blue-500 sm:text-sm bg-white text-gray-900 py-2 pl-3 pr-8 font-bold"
                            >
                                {yearsToShow.map(year => (
                                    <option key={year} value={year.toString()}>
                                        {gregorianToRoc(year)} 學年度 ({year})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="mt-3 text-gray-600 text-sm">
                        此設定將影響下方「教員設定」的顯示年份，以及「學年升班」和「資料匯入」時的年齡計算基準日 (該年 9 月 1 日)。
                    </p>
                </div>
            </div>

            {/* Import Section */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <div className="bg-green-100 p-2 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        匯入學員資料 (Excel / CSV)
                    </h2>
                    <p className="mt-3 text-gray-600">
                        支援 .xlsx, .xls, .csv 格式。系統會自動掃描檔案中的所有頁籤(Sheets)並匯入資料。
                    </p>
                    <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm text-green-800 space-y-1">
                        <p><strong>💡 智慧分班：</strong> 自動偵測民國/西元出生日期，並依據上方選擇的 <strong>{gregorianToRoc(parseInt(selectedYear))} 學年度</strong> 重新計算班級。</p>
                        <p><strong>💡 數據正規化：</strong> 自動將小數點出席率 (如 0.673) 轉換為百分比 (67.3%)。</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        * 格式需求：需包含特定關鍵字結構 (基本資料、入學年月、出席、重要紀事)。
                    </p>
                </div>
                <div className="p-6 sm:p-8 bg-white">
                    <div className="w-full flex flex-col items-center justify-center">
                        <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isImporting ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-300 hover:bg-green-50 hover:border-green-400'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {isImporting ? (
                                    <>
                                        <svg className="animate-spin h-10 w-10 text-green-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="text-sm text-gray-500 font-bold">處理資料中，請稍候...</p>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-bold text-green-600">點擊上傳</span> 或將檔案拖放至此</p>
                                        <p className="text-xs text-gray-400">XLSX, XLS, CSV (Max 10MB)</p>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={handleFileUpload}
                                disabled={isImporting}
                            />
                        </label>
                    </div>

                    {importResult && (
                        <div className={`mt-6 p-4 rounded-xl flex items-start ${importResult.includes('失敗') || importResult.includes('未偵測') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                            <svg className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${importResult.includes('失敗') || importResult.includes('未偵測') ? 'text-red-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={importResult.includes('失敗') || importResult.includes('未偵測') ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}></path>
                            </svg>
                            <span className="font-bold text-sm">{importResult}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Teacher Assignment Section */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                <div className="p-6 sm:p-8 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-church-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.002 3.002 0 01-3.71-1.29l-1.123-1.945A3 3 0 012 8.324V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v2.324a3 3 0 01-1.88 2.775l-1.123 1.945a3.002 3.002 0 01-3.71 1.29m-3.71-1.29a3.002 3.002 0 01-3.142 0" />
                            </svg>
                        </div>
                        <span>年度教員班級設定 ({selectedRocYear} 學年度)</span>
                    </h2>
                </div>

                <div className="px-6 sm:px-8 py-6 space-y-6 bg-white">
                    {classes.map(cls => (
                        <div key={cls.id} className="p-5 border border-gray-100 bg-gray-50/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-4">
                                <span className="w-1 h-6 bg-church-blue-500 rounded-full mr-3"></span>
                                <h3 className="font-bold text-lg text-gray-800">{cls.className}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label htmlFor={`lead-${cls.id}`} className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">班負責</label>
                                    <div className="relative">
                                        <select
                                            id={`lead-${cls.id}`}
                                            value={assignments[cls.id]?.leadTeacherId || ''}
                                            onChange={(e) => handleLeadChange(cls.id, e.target.value)}
                                            className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-church-blue-500 focus:ring-church-blue-500 sm:text-sm bg-white text-gray-900 py-3 px-4"
                                        >
                                            <option value="">-- 未指定 --</option>
                                            {formalActiveTeachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">班級教員</label>
                                    <div className="mt-1 space-y-2 max-h-40 overflow-y-auto border border-gray-200 p-3 rounded-xl bg-white custom-scrollbar">
                                        {activeTeachers.map(t => {
                                            const assignment = assignments[cls.id];
                                            // Safety check: if assignment is undefined, use default
                                            const teacherIds = assignment?.teacherIds || [];
                                            const isLead = parseInt(assignment?.leadTeacherId || '0', 10) === t.id;

                                            return (
                                                <label key={t.id} className={`flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${isLead ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={teacherIds.includes(t.id)}
                                                        onChange={() => handleTeacherToggle(cls.id, t.id)}
                                                        disabled={isLead}
                                                        className="h-4 w-4 rounded border-gray-300 text-church-blue-600 focus:ring-church-blue-500 bg-white"
                                                    />
                                                    <span className={`ml-3 text-sm font-medium ${isLead ? 'text-gray-400' : 'text-gray-700'}`}>
                                                        {t.fullName} {isLead && '(班負責)'}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 sm:p-8 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handleSaveAssignments}
                        disabled={isSavingAssignments}
                        className="bg-church-blue-600 text-white px-8 py-3 rounded-xl hover:bg-church-blue-700 transition-all duration-200 flex items-center justify-center text-base font-bold shadow-lg shadow-church-blue-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isSavingAssignments ? '儲存中...' : `儲存 ${selectedRocYear} 學年度設定`}
                    </button>
                    {assignmentSaveResult && (
                        <div className="mt-4 p-3 inline-block bg-green-100 border border-green-200 rounded-lg animate-fade-in text-sm text-green-800 font-bold px-4">
                            ✓ {assignmentSaveResult}
                        </div>
                    )}
                </div>
            </div>

            {/* Promotion Section */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                <div className="p-6 sm:p-8 bg-gradient-to-r from-yellow-50 to-white border-b border-yellow-50">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17l5-5m0 0l-5-5m5 5H6" />
                            </svg>
                        </div>
                        學年升班作業
                    </h2>
                    <p className="mt-3 text-gray-600 text-sm">
                        自動根據出生年月日與上方選擇的 <strong>{gregorianToRoc(parseInt(selectedYear))} 學年度</strong> 基準日，計算學員年級並更新班級分配。
                    </p>
                    <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-lg">
                        <p className="font-bold mb-1">⚠️ 注意事項：</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>此為年度性操作，請於新學年開始時執行。</li>
                            <li>僅處理「在學」學員，且必須有出生年月日資料。</li>
                            <li>操作不可復原。</li>
                        </ul>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handlePromoteStudents}
                            disabled={isPromoting}
                            className="bg-yellow-500 text-white px-6 py-3 rounded-xl hover:bg-yellow-600 transition-all duration-200 flex items-center justify-center text-base font-bold shadow-lg shadow-yellow-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {isPromoting ? '處理中...' : `執行 ${gregorianToRoc(parseInt(selectedYear))} 學年度升班`}
                        </button>

                        {promotionResult && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl animate-fade-in">
                                <h3 className="font-bold text-green-800 text-lg">🎉 升班作業完成！</h3>
                                <p className="text-green-700 mt-1">
                                    成功更新 <span className="font-black text-xl">{promotionResult.updated}</span> 位學員。
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    (跳過 {promotionResult.skipped} 位：資料不全或已離校)
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Data Cleanup Section */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-12">
                <div className="p-6 sm:p-8 bg-gradient-to-r from-red-50 to-white border-b border-red-50">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                        <div className="bg-red-100 p-2 rounded-lg mr-3">
                            <span className="text-2xl">🧹</span>
                        </div>
                        資料清理 (重複資料移除)
                    </h2>
                    <p className="mt-3 text-gray-600 text-sm">
                        系統將掃描姓名與出生日期完全相同的學生資料 (通常發生於重複匯入)。
                    </p>
                </div>

                <div className="p-6 sm:p-8 bg-white">
                    <div className="flex items-center space-x-4 mb-6">
                        <button
                            onClick={scanForDuplicates}
                            disabled={isScanning}
                            className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isScanning ? '掃描中...' : '掃描重複資料'}
                        </button>
                        {duplicateGroups.length > 0 && (
                            <button
                                onClick={handleAutoMergeAll}
                                disabled={isAutoMerging || isScanning}
                                className="bg-yellow-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-yellow-600 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed ml-4"
                            >
                                {isAutoMerging ? '正在合併...' : `一鍵合併所有 (${duplicateGroups.length})`}
                            </button>
                        )}
                        {cleanupResult && (
                            <span className={`font-bold ${cleanupResult.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
                                {cleanupResult}
                            </span>
                        )}
                    </div>

                    {duplicateGroups.length > 0 && (
                        <div className="space-y-6">
                            {duplicateGroups.map((group, index) => (
                                <div key={index} className="border border-gray-200 rounded-2xl p-6 bg-gray-50 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                        <h4 className="font-bold text-lg flex items-center">
                                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg mr-3 text-sm">重複群組 {index + 1}</span>
                                            {group[0].fullName}
                                            <span className="text-gray-400 text-sm ml-2 font-normal">
                                                ({group[0].dob ? new Date(group[0].dob).toLocaleDateString() : '無生日'})
                                            </span>
                                        </h4>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleResolveDuplicates('merge', group)}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 shadow-sm"
                                            >
                                                保留最早 (合併紀錄)
                                            </button>
                                            <button
                                                onClick={() => handleResolveDuplicates('delete', group)}
                                                className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50"
                                            >
                                                全部刪除
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid gap-3">
                                        {group.map(student => (
                                            <div key={student.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-100">
                                                <div className="flex items-center space-x-4">
                                                    <span className="font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">ID: {student.id}</span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${student.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                                        {student.status}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        建立於: {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'Unknown'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {student.class?.name || '未分班'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
