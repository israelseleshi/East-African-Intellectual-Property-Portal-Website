import path from 'path';

export const JURISDICTION_RULES = {
    ET: { oppositionDays: 60, renewalYears: 10, currency: 'ETB' },
    KE: { oppositionDays: 90, renewalYears: 10, currency: 'KES' }
};

export const JURISDICTION_CONFIG: Record<string, any> = {
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
export const FEE_SCHEDULE: Record<string, any> = {
    ET: {
        // Official EIPO Fees (https://eipa.gov.et/tm-fees-and-payments/)
        'FILED': { 
            amount: 1750, 
            per_extra_class_amount: 0,
            description: 'Application For Registration Of Trade Mark', 
            category: 'OFFICIAL_FEE' 
        },
        'AMENDMENT_PENDING': { 
            amount: 350, 
            per_extra_class_amount: 0,
            description: 'Amendment Of Application For Registration Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'OPPOSITION': { 
            amount: 1500, 
            per_extra_class_amount: 0,
            description: 'Opposition To Registration Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'CERTIFICATE_ISSUED': { 
            amount: 3000, 
            per_extra_class_amount: 0,
            description: 'Registration Of Trade Mark', 
            category: 'OFFICIAL_FEE' 
        },
        'RENEWAL_DUE': { 
            amount: 1300, 
            per_extra_class_amount: 0,
            description: 'Application For Renewal Of Registration Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'RENEWAL_ON_TIME': { 
            amount: 2200, 
            per_extra_class_amount: 0,
            description: 'Renewal Of Registration Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'AMENDMENT_REGISTERED': { 
            amount: 360, 
            per_extra_class_amount: 0,
            description: 'Amendment Of Registration Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'SUBSTITUTE_CERTIFICATE': { 
            amount: 495, 
            per_extra_class_amount: 0,
            description: 'Substitute Certificate Of Registration Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'CANCELLATION': { 
            amount: 2600, 
            per_extra_class_amount: 0,
            description: 'Application For The Cancellation Or Invalidation Of The Registration Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'TRANSFER': { 
            amount: 1300, 
            per_extra_class_amount: 0,
            description: 'Registration Of Transfer Of Ownership Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'LICENSE': { 
            amount: 1300, 
            per_extra_class_amount: 0,
            description: 'Registration Of License Contract Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'LICENSE_CANCELLATION': { 
            amount: 450, 
            per_extra_class_amount: 0,
            description: 'Registration Of Cancellation Of License Contract Of A Trademark', 
            category: 'OFFICIAL_FEE' 
        },
        'DIVISION': { 
            amount: 350, 
            per_extra_class_amount: 0,
            description: 'Division Of Application For Registration Of Trade Mark', 
            category: 'OFFICIAL_FEE' 
        },
        'MERGER': { 
            amount: 350, 
            per_extra_class_amount: 0,
            description: 'Merger Of Registration Or Application For Registration Of Trade Mark', 
            category: 'OFFICIAL_FEE' 
        },
        'AGENT_APPLICATION': { 
            amount: 315, 
            per_extra_class_amount: 0,
            description: 'Application For Registration Of A Trade Mark Agent', 
            category: 'OFFICIAL_FEE' 
        },
        'AGENT_ASSESSMENT': { 
            amount: 270, 
            per_extra_class_amount: 0,
            description: 'Trade Mark Agent\'s Competence Assessment', 
            category: 'OFFICIAL_FEE' 
        },
        'AGENT_REGISTRATION': { 
            amount: 1350, 
            per_extra_class_amount: 0,
            description: 'Registration Of A Trade Mark Agent', 
            category: 'OFFICIAL_FEE' 
        },
        'AGENT_RENEWAL': { 
            amount: 1125, 
            per_extra_class_amount: 0,
            description: 'Renewal Of Registration Of A Trade Mark Agent', 
            category: 'OFFICIAL_FEE' 
        },
        'EXTENSION': { 
            amount: 500, 
            per_extra_class_amount: 0,
            description: 'Application For Extension Of A Time Limit', 
            category: 'OFFICIAL_FEE' 
        },
        'SEARCH': { 
            amount: 450, 
            per_extra_class_amount: 0,
            description: 'Search For Registered Trademarks', 
            category: 'OFFICIAL_FEE' 
        },
        'INSPECTION': { 
            amount: 150, 
            per_extra_class_amount: 0,
            description: 'Inspection Of Records And Documents Of The Office', 
            category: 'OFFICIAL_FEE' 
        },
        'COPIES': { 
            amount: 10, 
            per_extra_class_amount: 0,
            description: 'Copies Of Records And Documents Of The Office (Per Page)', 
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
export const uploadDir = process.env.UPLOAD_DIR 
    ? path.resolve(process.env.UPLOAD_DIR) 
    : path.resolve(process.cwd(), 'uploads');
