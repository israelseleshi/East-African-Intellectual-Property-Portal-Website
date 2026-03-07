import path from 'path';

export const JURISDICTION_RULES = {
    ET: { oppositionDays: 60, renewalYears: 10, currency: 'ETB' },
    KE: { oppositionDays: 90, renewalYears: 10, currency: 'KES' }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FEE_SCHEDULE: Record<string, any> = {
    ET: {
        'FILED': { amount: 1500, description: 'Filing Fee (Official)', category: 'OFFICIAL_FEE' },
        'PUBLISHED': { amount: 500, description: 'Publication Fee', category: 'OFFICIAL_FEE' },
        'CERTIFICATE_ISSUED': { amount: 1000, description: 'Registration Fee', category: 'OFFICIAL_FEE' }
    },
    KE: {
        'FILED': { amount: 5000, description: 'Filing Fee (KE)', category: 'OFFICIAL_FEE' }
    }
};

export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-prod';
export const uploadDir = path.resolve(process.cwd(), 'uploads');
