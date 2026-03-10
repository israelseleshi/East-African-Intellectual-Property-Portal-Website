// Domain Types - Safe for frontend and backend
// Complete 10-Stage Case Flow System
export const CASE_FLOW_STAGES = [
    'DATA_COLLECTION',
    'READY_TO_FILE',
    'FILED',
    'FORMAL_EXAM',
    'SUBSTANTIVE_EXAM',
    'AMENDMENT_PENDING',
    'PUBLISHED',
    'CERTIFICATE_REQUEST',
    'CERTIFICATE_ISSUED',
    'REGISTERED',
    'RENEWAL_DUE',
    'RENEWAL_ON_TIME',
    'RENEWAL_PENALTY',
    'DEAD_WITHDRAWN'
];
// Jurisdiction-specific deadline rules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JURISDICTION_CONFIG = {
    ET: {
        name: 'Ethiopia',
        opposition_period_days: 60,
        certificate_request_days: 20,
        certificate_issuance_days: 30,
        renewal_years: 7,
        renewal_on_time_days: 30,
        renewal_penalty_days: 180,
        substantial_exam_days: 20,
        amendment_period_days: 90
    },
    KE: {
        name: 'Kenya',
        opposition_period_days: 90,
        certificate_request_days: 20,
        certificate_issuance_days: 30,
        renewal_years: 10,
        renewal_on_time_days: 30,
        renewal_penalty_days: 180,
        substantial_exam_days: 120
    },
    ER: { name: 'Eritrea', opposition_period_days: 60, renewal_years: 10 },
    DJ: { name: 'Djibouti', opposition_period_days: 60, renewal_years: 10 },
    SO: { name: 'Somalia', opposition_period_days: 60, renewal_years: 10 },
    SL: { name: 'Somaliland', opposition_period_days: 60, renewal_years: 10 },
    TZ: { name: 'Tanzania', opposition_period_days: 60, renewal_years: 10 },
    UG: { name: 'Uganda', opposition_period_days: 60, renewal_years: 10 },
    RW: { name: 'Rwanda', opposition_period_days: 60, renewal_years: 10 },
    BI: { name: 'Burundi', opposition_period_days: 60, renewal_years: 10 },
    SD: { name: 'Sudan', opposition_period_days: 60, renewal_years: 10 }
};
export const TRADEMARK_STATUSES = [
    'DRAFT',
    'FILED',
    'FORMAL_EXAM',
    'SUBSTANTIVE_EXAM',
    'PUBLISHED',
    'REGISTERED',
    'EXPIRING',
    'RENEWAL',
    'AMENDMENT_PENDING',
    'OPPOSED',
    'ABANDONED',
    'WITHDRAWN'
];
export function statusToWorkflowStage(status) {
    switch (status) {
        case 'DRAFT':
        case 'FILED':
            return 'INTAKE';
        case 'FORMAL_EXAM':
            return 'FORMAL_EXAM';
        case 'SUBSTANTIVE_EXAM':
        case 'AMENDMENT_PENDING':
            return 'SUBSTANTIVE_EXAM';
        case 'PUBLISHED':
        case 'OPPOSED':
            return 'PUBLICATION';
        case 'REGISTERED':
            return 'REGISTRATION';
        case 'EXPIRING':
        case 'RENEWAL':
        case 'ABANDONED':
        case 'WITHDRAWN':
            return 'RENEWAL';
        default:
            return 'INTAKE';
    }
}
// Deadline calculation utilities - Pure functions, safe for frontend
export function calculateDeadline(baseDate, days) {
    const result = new Date(baseDate);
    result.setDate(result.getDate() + days);
    return result;
}
export function calculateRenewalDate(registrationDate, years) {
    const renewalDate = new Date(registrationDate);
    renewalDate.setFullYear(renewalDate.getFullYear() + years);
    // 6 months early reminder
    renewalDate.setMonth(renewalDate.getMonth() - 6);
    return renewalDate;
}
export function getStageDeadlines(stage, jurisdiction, triggerDate) {
    const config = JURISDICTION_CONFIG[jurisdiction];
    switch (stage) {
        case 'FILED':
            return {
                formal_exam_deadline: calculateDeadline(triggerDate, 30)
            };
        case 'FORMAL_EXAM':
            return {
                formal_exam_deadline: calculateDeadline(triggerDate, 30)
            };
        case 'PUBLISHED':
            return {
                opposition_period_end: calculateDeadline(triggerDate, config.opposition_period_days),
                certificate_request_deadline: calculateDeadline(triggerDate, config.certificate_request_days)
            };
        case 'CERTIFICATE_REQUEST':
            return {
                certificate_issued_expected: calculateDeadline(triggerDate, config.certificate_issuance_days)
            };
        case 'CERTIFICATE_ISSUED':
            return {
                registration_effective: triggerDate,
                renewal_due_date: calculateRenewalDate(triggerDate, config.renewal_years)
            };
        case 'REGISTERED':
            return {
                renewal_due_date: calculateRenewalDate(triggerDate, config.renewal_years)
            };
        case 'RENEWAL_DUE':
            return {
                renewal_on_time_deadline: calculateDeadline(triggerDate, config.renewal_on_time_days),
                renewal_penalty_deadline: calculateDeadline(triggerDate, config.renewal_penalty_days)
            };
        default:
            return {};
    }
}
export function getUrgencyLevel(deadline) {
    const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 7)
        return 'CRITICAL';
    if (daysRemaining <= 30)
        return 'WARNING';
    return 'NORMAL';
}
// Official and Professional fees logic
export const FEES = {
    ET: {
        official: 200, // USD
        professional: 450 // USD
    },
    KE: {
        official: 150,
        professional: 400
    },
    ER: { official: 200, professional: 450 },
    DJ: { official: 200, professional: 450 },
    SO: { official: 200, professional: 450 },
    SL: { official: 200, professional: 450 },
    TZ: { official: 200, professional: 450 },
    UG: { official: 200, professional: 450 },
    RW: { official: 200, professional: 450 },
    BI: { official: 200, professional: 450 },
    SD: { official: 200, professional: 450 }
};
export function calculateTotalFees(jurisdiction, classesCount) {
    const base = FEES[jurisdiction] || FEES.ET;
    const official = base.official * classesCount;
    const professional = base.professional;
    return { official, professional, total: official + professional };
}
// Frontend should NOT import from '@eai/database' for db connection, only types
// Backend imports from '@eai/database/db' directly
