// Type declaration for XLSX loaded via CDN
// This allows TypeScript to resolve the CDN import in Settings.tsx
declare module 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs' {
    // Re-export XLSX types
    export interface WorkBook {
        SheetNames: string[];
        Sheets: Record<string, WorkSheet>;
    }

    export interface WorkSheet {
        [cell: string]: unknown;
    }

    export interface ParsingOptions {
        type?: string;
        [key: string]: unknown;
    }

    export interface Sheet2JSONOpts {
        header?: number | string[];
        defval?: unknown;
        [key: string]: unknown;
    }

    export function read(data: ArrayBuffer | string, opts?: ParsingOptions): WorkBook;

    export const utils: {
        sheet_to_json<T = unknown[]>(sheet: WorkSheet, opts?: Sheet2JSONOpts): T[];
        [key: string]: unknown;
    };
}
