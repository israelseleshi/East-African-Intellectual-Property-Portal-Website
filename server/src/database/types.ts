// Domain Types - Safe for frontend and backend

// Database Row Types
export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_verified: boolean;
  password_hash?: string;
  last_login?: Date;
}

export interface CaseRow {
  id: string;
  jurisdiction: string;
  status: string;
  flow_stage: string;
  mark_name: string;
  client_id: string;
  filing_number?: string;
  filing_date?: Date;
  publication_date?: Date;
  registration_dt?: Date;
  next_action_date?: Date;
  certificate_number?: string;
  [key: string]: unknown;
}

export interface ClientRow {
  id: string;
  name: string;
  local_name?: string;
  type: string;
  email?: string;
  nationality?: string;
  residence_country?: string;
  address_street?: string;
  address_zone?: string;
  wereda?: string;
  city?: string;
  house_no?: string;
  zip_code?: string;
  po_box?: string;
  telephone?: string;
  fax?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export type Jurisdiction = 'ER' | 'DJ' | 'SO' | 'SL' | 'KE' | 'TZ' | 'UG' | 'RW' | 'BI' | 'SD' | 'ET';

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
] as const;

export type CaseFlowStage = typeof CASE_FLOW_STAGES[number];

// Jurisdiction-specific deadline rules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JURISDICTION_CONFIG: Record<string, any> = {
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
} as const;

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
] as const;

export type TrademarkStatus = (typeof TRADEMARK_STATUSES)[number];

export type TrademarkState = 
  'INTAKE' |
  'FORMAL_EXAM' |
  'SUBSTANTIVE_EXAM' |
  'PUBLICATION' |
  'REGISTRATION' |
  'RENEWAL';

export function statusToWorkflowStage(status: TrademarkStatus): TrademarkState {
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

export type ApplicantType = 'INDIVIDUAL' | 'COMPANY' | 'PARTNERSHIP';
export type TrademarkType = 'WORD' | 'LOGO' | 'COMBINED' | 'MIXED' | 'THREE_DIMENSION' | 'OTHER';

export type NiceClass = number;

export type TrademarkCase = {
  id: string
  jurisdiction: Jurisdiction
  state: TrademarkState
  flow_stage?: CaseFlowStage
  
  status?: TrademarkStatus

  markType: TrademarkType
  wordMark?: string
  markImage?: string // TM Image: Upload Image
  colorIndication?: string // Color: Dropdown (Black & White, etc)
  niceClasses: NiceClass[]
  goodsServices: string

  applicantType: ApplicantType
  applicantName: string
  applicantAddress?: string
  applicantNationality?: string

  filingNumber?: string
  certificateNumber?: string // Cert. No
  applicationDate?: string
  publicationDate?: string
  registrationDate?: string
  expiryDate?: string // Expiry Date (Pick from case flow)
  clientExpiryDate?: string // Expiry Date (from the client)
  nextRenewalDate?: string
  
  priority?: 'YES' | 'NO' // Priority: drop-down
  
  clientInstructions?: string // Client Instruction: Open space
  remark?: string // Remark: Open space
  nextActionDate?: string // Next Action Date: Pick from case flow
  
  // Case Flow Deadline Fields
  filing_date?: string
  formal_exam_deadline?: string
  formal_exam_deficiency?: boolean
  opposition_period_end?: string
  opposition_window_days?: number
  certificate_requested_date?: string
  certificate_issued_date?: string
  renewal_due_date?: string
  renewal_on_time_deadline?: string
  renewal_penalty_deadline?: string
  next_renewal_year?: number
  days_in_substantive_exam?: number
  status_changed_at?: string
}

// Deadline calculation utilities - Pure functions, safe for frontend
export function calculateDeadline(baseDate: Date, days: number): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateRenewalDate(registrationDate: Date, years: number): Date {
  const renewalDate = new Date(registrationDate);
  renewalDate.setFullYear(renewalDate.getFullYear() + years);
  // 6 months early reminder
  renewalDate.setMonth(renewalDate.getMonth() - 6);
  return renewalDate;
}

export function getStageDeadlines(
  stage: CaseFlowStage, 
  jurisdiction: Jurisdiction, 
  triggerDate: Date
): Record<string, Date | null> {
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

export function getUrgencyLevel(deadline: Date): 'CRITICAL' | 'WARNING' | 'NORMAL' {
  const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 7) return 'CRITICAL';
  if (daysRemaining <= 30) return 'WARNING';
  return 'NORMAL';
}

// Official and Professional fees logic
export const FEES: Record<string, { official: number; professional: number }> = {
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
}

export function calculateTotalFees(jurisdiction: Jurisdiction, classesCount: number) {
  const base = FEES[jurisdiction] || FEES.ET;
  const official = base.official * classesCount;
  const professional = base.professional;
  return { official, professional, total: official + professional };
}

export type Transaction = {
  id: string
  markId: string
  markName: string
  type: 'OFFICIAL' | 'PROFESSIONAL' | 'DISBURSEMENT'
  amount: number
  currency: 'USD' | 'ETB'
  status: 'PAID' | 'PENDING' | 'OVERDUE'
  date: string
  method?: string
}

// Frontend should NOT import from '@eai/database' for db connection, only types
// Backend imports from '@eai/database/db' directly
