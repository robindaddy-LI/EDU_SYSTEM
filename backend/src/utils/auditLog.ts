import { Prisma } from '@prisma/client';
import prisma from '../prisma';

/**
 * 審計記錄參數
 */
export interface AuditLogParams {
    /** 操作類型，例如 '學生修改' | '學生刪除' | '學生合併' | '學生匯入' */
    type: string;
    /** 人類可讀的操作描述 */
    description: string;
    /** 操作者的 User ID（from req.user.id），未登入時為 null */
    userId: number | null;
    /** 變動的詳細 metadata，例如 before/after diff */
    metadata?: Record<string, unknown>;
}

/**
 * 建立審計記錄到 operation_logs 表。
 *
 * 採用 fire-and-forget 模式：寫入失敗只會 console.error，
 * 不會影響主要業務操作的回應。
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.operationLog.create({
            data: {
                type: params.type,
                description: params.description,
                userId: params.userId,
                metadata: params.metadata
                    ? (params.metadata as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
            },
        });
    } catch (error) {
        // Fire-and-forget: 審計寫入失敗不應中斷主操作
        console.error('[AuditLog] Failed to create audit log:', error);
        console.error('[AuditLog] Params:', JSON.stringify(params, null, 2));
    }
}

/**
 * 計算物件之間的差異欄位（shallow diff）。
 * 回傳只包含有變動的欄位，格式為 { field: { before, after } }。
 */
export function diffFields(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    fieldsToCompare: string[]
): Record<string, { before: unknown; after: unknown }> {
    const changes: Record<string, { before: unknown; after: unknown }> = {};

    for (const field of fieldsToCompare) {
        const beforeVal = before[field];
        const afterVal = after[field];

        // 簡易比較：序列化後比較（處理 Date、null 等型別）
        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
            changes[field] = { before: beforeVal, after: afterVal };
        }
    }

    return changes;
}
