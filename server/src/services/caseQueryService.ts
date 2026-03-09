import type { CaseRow } from '../database/types.js';
import { caseRepository, type CaseSearchFilters, type NiceMappingRow, type DeadlineRow } from '../repositories/caseRepository.js';

type CaseWithDeadlines = CaseRow & { deadlines: DeadlineRow[] };

export const caseQueryService = {
  async listCases(filters: CaseSearchFilters): Promise<CaseWithDeadlines[]> {
    const cases = await caseRepository.findCases(filters);
    if (cases.length === 0) {
      return [];
    }

    const caseIds = cases.map((c) => c.id);
    const deadlines = await caseRepository.findDeadlinesByCaseIds(caseIds);
    const groupedDeadlines = deadlines.reduce<Map<string, DeadlineRow[]>>((acc, deadline) => {
      const key = deadline.case_id;
      const existing = acc.get(key) ?? [];
      existing.push(deadline);
      acc.set(key, existing);
      return acc;
    }, new Map<string, DeadlineRow[]>());

    return cases.map((item) => ({
      ...item,
      deadlines: groupedDeadlines.get(item.id) ?? []
    }));
  },

  async getCaseById(caseId: string): Promise<Record<string, unknown> | null> {
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
      niceClasses: niceMappings.map((mapping: NiceMappingRow) => mapping.classNo),
      niceMappings,
      assets,
      history,
      deadlines,
      eipaForm: caseData.eipa_form_json
    };
  }
};
