import path from 'path';
export const JURISDICTION_RULES = {
    ET: { oppositionDays: 60, renewalYears: 10, currency: 'ETB' },
    KE: { oppositionDays: 90, renewalYears: 10, currency: 'KES' }
};
export const JURISDICTION_CONFIG = {
    ET: {
        substantial_exam_days: 20,
        amendment_period_days: 90,
        opposition_period_days: 60,
        certificate_request_days: 20,
        renewal_years: 7,
        renewal_on_time_days: 30,
        renewal_penalty_days: 180
    },
    KE: {
        substantial_exam_days: 30,
        amendment_period_days: 60,
        opposition_period_days: 90,
        certificate_request_days: 30,
        renewal_years: 10,
        renewal_on_time_days: 60,
        renewal_penalty_days: 180
    }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FEE_SCHEDULE = {
    ET: {
        'FILED': {
            amount: 1500,
            per_extra_class_amount: 500,
            description: 'Filing Fee (Official)',
            category: 'OFFICIAL_FEE'
        },
        'PUBLISHED': {
            amount: 500,
            per_extra_class_amount: 0,
            description: 'Publication Fee',
            category: 'OFFICIAL_FEE'
        },
        'CERTIFICATE_ISSUED': {
            amount: 1000,
            per_extra_class_amount: 200,
            description: 'Registration Fee',
            category: 'OFFICIAL_FEE'
        }
    },
    KE: {
        'FILED': {
            amount: 5000,
            per_extra_class_amount: 1000,
            description: 'Filing Fee (KE)',
            category: 'OFFICIAL_FEE'
        }
    }
};
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-prod';
export const uploadDir = path.resolve(process.cwd(), 'uploads');
