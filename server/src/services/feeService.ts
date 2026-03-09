import type { RowDataPacket } from 'mysql2/promise';
import { feeRepository, type CreateFeeScheduleInput, type FeeScheduleFilters, type FeeScheduleUpdateInput } from '../repositories/feeRepository.js';

const STAGE_ORDER = [
  'DRAFT',
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
  'RENEWAL_PENALTY'
] as const;

const toNumericAmount = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
};

export const feeService = {
  async listFeeSchedules(filters: FeeScheduleFilters): Promise<RowDataPacket[]> {
    return feeRepository.listFeeSchedules(filters);
  },

  async calculateFees(jurisdiction: string, stage: string): Promise<{
    jurisdiction: string;
    stage: string;
    fees: RowDataPacket[];
    total_amount: number;
    currency: string;
  } | null> {
    const fees = await feeRepository.getFeesByJurisdictionStage(jurisdiction, stage);
    if (fees.length === 0) {
      return null;
    }

    const totalAmount = fees.reduce((sum, fee) => sum + toNumericAmount(fee.amount), 0);
    return {
      jurisdiction,
      stage,
      fees,
      total_amount: totalAmount,
      currency: String(fees[0]?.currency || 'USD')
    };
  },

  async calculateCaseFees(caseId: string): Promise<{
    case_id: string;
    jurisdiction: string;
    current_stage: string;
    stages_billed: string[];
    fees_by_stage: Record<string, RowDataPacket[]>;
    total_amount: number;
    currency: string;
  } | null> {
    const caseData = await feeRepository.getCaseFeeContext(caseId);
    if (!caseData) {
      return null;
    }

    const currentStage = String(caseData.flow_stage);
    const currentStageIndex = STAGE_ORDER.indexOf(currentStage as (typeof STAGE_ORDER)[number]);
    const stagesToBill = currentStageIndex >= 0
      ? [...STAGE_ORDER.slice(0, currentStageIndex + 1)]
      : [currentStage];

    const feesByStage: Record<string, RowDataPacket[]> = {};
    let totalAmount = 0;
    let currency = 'USD';

    for (const stage of stagesToBill) {
      const fees = await feeRepository.getFeesByJurisdictionStage(caseData.jurisdiction, stage);
      if (fees.length === 0) {
        continue;
      }

      feesByStage[stage] = fees;
      totalAmount += fees.reduce((sum, fee) => sum + toNumericAmount(fee.amount), 0);
      if (currency === 'USD' && typeof fees[0]?.currency === 'string') {
        currency = fees[0].currency;
      }
    }

    return {
      case_id: caseId,
      jurisdiction: caseData.jurisdiction,
      current_stage: currentStage,
      stages_billed: stagesToBill,
      fees_by_stage: feesByStage,
      total_amount: totalAmount,
      currency
    };
  },

  async createFeeSchedule(input: CreateFeeScheduleInput): Promise<{
    id: string;
    jurisdiction: string;
    stage: string;
    category: string;
    amount: number;
    currency: string;
    effectiveDate: string | Date;
  }> {
    const id = await feeRepository.createFeeSchedule(input);
    return {
      id,
      jurisdiction: input.jurisdiction,
      stage: input.stage,
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      effectiveDate: input.effectiveDate
    };
  },

  async updateFeeSchedule(id: string, updates: FeeScheduleUpdateInput): Promise<boolean> {
    return feeRepository.updateFeeSchedule(id, updates);
  },

  async deleteFeeSchedule(id: string, permanent: boolean): Promise<boolean> {
    return feeRepository.deleteFeeSchedule(id, permanent);
  },

  async compareFees(stage: string, category: string): Promise<{
    stage: string;
    category: string;
    comparisons: RowDataPacket[];
  }> {
    const comparisons = await feeRepository.compareFees(stage, category);
    return {
      stage,
      category,
      comparisons
    };
  }
};
