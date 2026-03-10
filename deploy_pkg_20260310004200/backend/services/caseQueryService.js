import { caseRepository } from '../repositories/caseRepository.js';
export const caseQueryService = {
    async listCases(filters) {
        const cases = await caseRepository.findCases(filters);
        if (cases.length === 0) {
            return [];
        }
        const caseIds = cases.map((c) => c.id);
        const deadlines = await caseRepository.findDeadlinesByCaseIds(caseIds);
        const groupedDeadlines = deadlines.reduce((acc, deadline) => {
            const key = deadline.case_id;
            const existing = acc.get(key) ?? [];
            existing.push(deadline);
            acc.set(key, existing);
            return acc;
        }, new Map());
        return cases.map((item) => ({
            ...item,
            deadlines: groupedDeadlines.get(item.id) ?? []
        }));
    },
    async getCaseById(caseId) {
        const caseData = await caseRepository.findCaseWithClientById(caseId);
        if (!caseData) {
            return null;
        }
        const [niceMappings, assets, history, deadlines] = await Promise.all([
            caseRepository.findNiceMappingsByCaseId(caseId),
            caseRepository.findActiveAssetsByCaseId(caseId),
            caseRepository.findCaseHistoryByCaseId(caseId),
            caseRepository.findDeadlinesByCaseId(caseId)
        ]);
        const client = {
            id: caseData.client_id_ref,
            name: caseData.client_name,
            type: caseData.client_type,
            nationality: caseData.client_nationality,
            email: caseData.client_email,
            addressStreet: caseData.client_address_street,
            city: caseData.client_city,
            zipCode: caseData.client_zip_code,
            phone: caseData.client_telephone,
            fax: caseData.client_fax
        };
        return {
            ...caseData,
            client,
            niceClasses: niceMappings.map((mapping) => mapping.classNo),
            niceMappings,
            assets,
            history,
            deadlines,
            eipaForm: caseData.eipa_form_json
        };
    }
};
