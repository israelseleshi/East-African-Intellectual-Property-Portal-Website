import { feeRepository } from '../repositories/feeRepository.js';
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
];
const toNumericAmount = (value) => {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string')
        return parseFloat(value);
    return 0;
};
export const feeService = {
    async listFeeSchedules(filters) {
        return feeRepository.listFeeSchedules(filters);
    },
    async calculateFees(jurisdiction, stage) {
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
    async calculateCaseFees(caseId) {
        const caseData = await feeRepository.getCaseFeeContext(caseId);
        if (!caseData) {
            return null;
        }
        const currentStage = String(caseData.flow_stage);
        const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
        const stagesToBill = currentStageIndex >= 0
            ? [...STAGE_ORDER.slice(0, currentStageIndex + 1)]
            : [currentStage];
        const feesByStage = {};
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
    async createFeeSchedule(input) {
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
    async updateFeeSchedule(id, updates) {
        return feeRepository.updateFeeSchedule(id, updates);
    },
    async deleteFeeSchedule(id, permanent) {
        return feeRepository.deleteFeeSchedule(id, permanent);
    },
    async compareFees(stage, category) {
        const comparisons = await feeRepository.compareFees(stage, category);
        return {
            stage,
            category,
            comparisons
        };
    }
};
