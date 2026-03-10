import crypto from 'crypto';
import { pool } from '../database/db.js';
import { JURISDICTION_RULES } from './constants.js';
export function calculateOppositionDeadline(publicationDate, jurisdiction) {
    const pubDate = new Date(publicationDate);
    const days = JURISDICTION_RULES[jurisdiction].oppositionDays;
    const deadline = new Date(pubDate);
    deadline.setDate(deadline.getDate() + days);
    return deadline;
}
export function calculateRenewalDate(registrationDate, jurisdiction) {
    const regDate = new Date(registrationDate);
    const years = JURISDICTION_RULES[jurisdiction].renewalYears;
    const renewalDate = new Date(regDate);
    renewalDate.setFullYear(renewalDate.getFullYear() + years);
    return renewalDate;
}
export async function createOrUpdateDeadline(caseId, type, dueDate, connection) {
    const db = connection || pool;
    // Check if deadline already exists and is pending
    const [existing] = await db.execute('SELECT id FROM deadlines WHERE case_id = ? AND type = ? AND status = "PENDING"', [caseId, type]);
    if (existing.length === 0) {
        // Create new deadline
        await db.execute('INSERT INTO deadlines (id, case_id, type, due_date, status) VALUES (?, ?, ?, ?, "PENDING")', [crypto.randomUUID(), caseId, type, dueDate.toISOString().split('T')[0]]);
    }
    else {
        // Update existing pending deadline
        await db.execute('UPDATE deadlines SET due_date = ? WHERE case_id = ? AND type = ? AND status = "PENDING"', [dueDate.toISOString().split('T')[0], caseId, type]);
    }
}
export async function recalculateDeadlines(caseId, status, caseData, connection) {
    const db = connection || pool;
    // Mark existing pending deadlines as SUPERSEDED instead of deleting
    await db.execute('UPDATE deadlines SET status = "SUPERSEDED" WHERE case_id = ? AND status = "PENDING"', [caseId]);
    // 1. Priority: Synchronize the case's internal 'next_action_date' if it exists
    if (caseData.next_action_date) {
        const type = `${caseData.flow_stage || status}_ACTION`;
        await createOrUpdateDeadline(caseId, type, new Date(caseData.next_action_date));
    }
    // 2. Secondary: Calculate statutory deadlines based on status/dates
    if (status === 'PUBLISHED' && caseData.publication_date) {
        const oppositionDeadline = calculateOppositionDeadline(caseData.publication_date, caseData.jurisdiction || 'ET');
        await createOrUpdateDeadline(caseId, 'OPPOSITION_WINDOW', oppositionDeadline);
    }
    if ((status === 'REGISTERED' || status === 'EXPIRING') && (caseData.registration_dt || caseData.expiry_date)) {
        const registrationDate = caseData.registration_dt ?? new Date().toISOString();
        const renewalDate = caseData.expiry_date
            ? new Date(caseData.expiry_date)
            : calculateRenewalDate(registrationDate, caseData.jurisdiction || 'ET');
        await createOrUpdateDeadline(caseId, 'RENEWAL', renewalDate);
        // Add 6-month notice before renewal
        const noticeDate = new Date(renewalDate);
        noticeDate.setMonth(noticeDate.getMonth() - 6);
        await createOrUpdateDeadline(caseId, 'RENEWAL_NOTICE', noticeDate);
    }
}
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}
