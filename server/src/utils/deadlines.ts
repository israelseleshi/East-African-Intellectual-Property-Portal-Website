import crypto from 'crypto';
import { pool } from '../database/db.js';
import { JURISDICTION_RULES } from './constants.js';

export function calculateOppositionDeadline(publicationDate: string, jurisdiction: 'ET' | 'KE'): Date {
    const pubDate = new Date(publicationDate);
    const days = JURISDICTION_RULES[jurisdiction].oppositionDays;
    const deadline = new Date(pubDate);
    deadline.setDate(deadline.getDate() + days);
    return deadline;
}

export function calculateRenewalDate(registrationDate: string, jurisdiction: 'ET' | 'KE'): Date {
    const regDate = new Date(registrationDate);
    const years = JURISDICTION_RULES[jurisdiction].renewalYears;
    const renewalDate = new Date(regDate);
    renewalDate.setFullYear(renewalDate.getFullYear() + years);
    return renewalDate;
}

export async function createOrUpdateDeadline(caseId: string, type: string, dueDate: Date) {
    // Check if deadline already exists
    const [existing] = await pool.execute(
        'SELECT id FROM deadlines WHERE case_id = ? AND type = ? AND is_completed = FALSE',
        [caseId, type]
    );

    if ((existing as unknown[]).length === 0) {
        // Create new deadline
        await pool.execute(
            'INSERT INTO deadlines (id, case_id, type, due_date) VALUES (?, ?, ?, ?)',
            [crypto.randomUUID(), caseId, type, dueDate.toISOString().split('T')[0]]
        );
    } else {
        // Update existing deadline
        await pool.execute(
            'UPDATE deadlines SET due_date = ? WHERE case_id = ? AND type = ? AND is_completed = FALSE',
            [dueDate.toISOString().split('T')[0], caseId, type]
        );
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalculateDeadlines(caseId: string, status: string, caseData: any) {
    // Clear existing incomplete deadlines for this case to maintain a single "source of truth" for the current action
    await pool.execute(
        'DELETE FROM deadlines WHERE case_id = ? AND is_completed = FALSE',
        [caseId]
    );

    // 1. Priority: Synchronize the case's internal 'next_action_date' if it exists
    if (caseData.next_action_date) {
        const type = `${caseData.flow_stage || status}_ACTION`;
        await createOrUpdateDeadline(caseId, type, new Date(caseData.next_action_date));
    }

    // 2. Secondary: Calculate statutory deadlines based on status/dates
    if (status === 'PUBLISHED' && caseData.publication_date) {
        const oppositionDeadline = calculateOppositionDeadline(
            caseData.publication_date,
            caseData.jurisdiction as 'ET' | 'KE'
        );
        await createOrUpdateDeadline(caseId, 'OPPOSITION_WINDOW', oppositionDeadline);
    }

    if ((status === 'REGISTERED' || status === 'EXPIRING') && (caseData.registration_dt || caseData.expiry_date)) {
        const renewalDate = caseData.expiry_date ? new Date(caseData.expiry_date) : calculateRenewalDate(
            caseData.registration_dt,
            caseData.jurisdiction as 'ET' | 'KE'
        );
        await createOrUpdateDeadline(caseId, 'RENEWAL', renewalDate);

        // Add 6-month notice before renewal
        const noticeDate = new Date(renewalDate);
        noticeDate.setMonth(noticeDate.getMonth() - 6);
        await createOrUpdateDeadline(caseId, 'RENEWAL_NOTICE', noticeDate);
    }
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
