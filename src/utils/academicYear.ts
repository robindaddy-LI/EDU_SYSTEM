
/**
 * Academic Year Utilities
 * 
 * In this system, an Academic Year is defined as starting from September 1st.
 * E.g.
 * - 2025-08-31 belongs to Academic Year 2024
 * - 2025-09-01 belongs to Academic Year 2025
 * - 2026-01-31 belongs to Academic Year 2025
 */

export const getAcademicYear = (date: Date = new Date()): string => {
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();

    // If month is September (8) or later, it's the start of a new academic year
    // Otherwise it belongs to the previous year
    return (month >= 8 ? year : year - 1).toString();
};

export const getAcademicYearLabel = (yearStr: string): string => {
    const year = parseInt(yearStr, 10);
    return `${year}-${year + 1} 年度`;
};

// Generates a list of recent academic years for selection dropdowns
export const getAcademicYearOptions = (count: number = 5): number[] => {
    const current = parseInt(getAcademicYear(), 10);
    const years = [];
    for (let i = -1; i < count - 1; i++) {
        years.push(current + i);
    }
    return years; // e.g. [2024, 2025, 2026, 2027, 2028]
};
