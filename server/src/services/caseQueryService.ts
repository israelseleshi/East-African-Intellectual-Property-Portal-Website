import type { CaseRow } from '../database/types.js';
import { caseRepository, type CaseSearchFilters, type NiceMappingRow, type DeadlineRow, type CaseDetailRow } from '../repositories/caseRepository.js';

type CaseWithDeadlines = CaseRow & { deadlines: DeadlineRow[] };

const normalizeDate = (value: unknown): string => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  }
  return '';
};

const toBool = (value: unknown): boolean => value === true || value === 1 || value === '1';

const buildEipaFormFromNormalizedData = (
  caseData: CaseDetailRow,
  niceMappings: NiceMappingRow[]
): Record<string, unknown> => {
  const markType = String(caseData.mark_type || 'WORD');
  const goodsLines = [...new Set(
    niceMappings
      .map((mapping) => (mapping.description || '').trim())
      .filter((line) => line.length > 0)
  )].slice(0, 6);

  return {
    applicant_name_english: caseData.client_name || '',
    applicant_name_amharic: caseData.client_local_name || '',
    address_street: caseData.client_address_street || '',
    address_zone: caseData.client_address_zone || '',
    city_name: caseData.client_city || '',
    city_code: caseData.client_city_code || '',
    state_name: caseData.client_state_name || '',
    state_code: caseData.client_state_code || '',
    zip_code: caseData.client_zip_code || '',
    wereda: caseData.client_wereda || '',
    house_no: caseData.client_house_no || '',
    telephone: caseData.client_telephone || '',
    email: caseData.client_email || '',
    fax: caseData.client_fax || '',
    po_box: caseData.client_po_box || '',
    nationality: caseData.client_nationality || '',
    residence_country: caseData.client_residence_country || '',
    chk_company: caseData.client_type === 'COMPANY',
    chk_male: caseData.client_gender === 'MALE',
    chk_female: caseData.client_gender === 'FEMALE',

    agent_name: caseData.agent_name || '',
    agent_country: caseData.agent_country || '',
    agent_city: caseData.agent_city || '',
    agent_subcity: caseData.agent_subcity || '',
    agent_woreda: caseData.agent_woreda || '',
    agent_wereda: caseData.agent_woreda || '',
    agent_house_no: caseData.agent_house_no || '',
    agent_telephone: caseData.agent_telephone || '',
    agent_email: caseData.agent_email || '',
    agent_po_box: caseData.agent_po_box || '',
    agent_fax: caseData.agent_fax || '',

    mark_description: caseData.mark_description || caseData.mark_name || '',
    mark_translation: caseData.translation || '',
    mark_transliteration: caseData.mark_transliteration || '',
    mark_language_requiring_traslation: caseData.mark_language_requiring_traslation || '',
    mark_language_requiring_translation: caseData.mark_language_requiring_traslation || '',
    mark_has_three_dim_features: caseData.mark_has_three_dim_features || '',
    mark_color_indication: caseData.color_indication || '',

    mark_type_word: markType === 'WORD',
    mark_type_figurative: markType === 'LOGO' || markType === 'COMBINED',
    mark_type_mixed: markType === 'MIXED',
    mark_type_three_dim: markType === 'THREE_DIMENSION' || toBool(caseData.is_three_dimensional),
    type_word: markType === 'WORD',
    type_figur: markType === 'LOGO' || markType === 'COMBINED',
    k_type_mi: markType === 'MIXED',
    type_thre: markType === 'THREE_DIMENSION' || toBool(caseData.is_three_dimensional),

    disclaimer: caseData.disclaimer_english || '',
    disclaimer_text_amharic: caseData.disclaimer_amharic || '',
    disclaimer_text_english: caseData.disclaimer_english || '',

    priority_country: caseData.priority_country || '',
    priority_filing_date: normalizeDate(caseData.priority_filing_date),
    priority_application_filing_date: normalizeDate(caseData.priority_filing_date),
    goods_and_services_covered_by_the_previous_application: caseData.goods_prev_application || '',
    priority_goods_services: caseData.goods_prev_application || '',
    priority_right_declaration: caseData.priority_declaration || '',

    chk_list_copies: toBool(caseData.chk_list_copies),
    chk_list_status: toBool(caseData.chk_list_status),
    chk_list_statutes: toBool(caseData.chk_list_status),
    chk_list_poa: toBool(caseData.chk_list_poa),
    chk_list_priority_docs: toBool(caseData.chk_list_priority_docs),
    chk_list_drawing: toBool(caseData.chk_list_drawing),
    chk_list_payment: toBool(caseData.chk_list_payment),
    chk_list_other: toBool(caseData.chk_list_other),
    other_documents_text: '',

    applicant_sign_day: (caseData as any).applicant_sign_day || '',
    applicant_sign_month: (caseData as any).applicant_sign_month || '',
    applicant_sign_year_en: (caseData as any).applicant_sign_year_en || '',
    applicant_sign_day_en: (caseData as any).applicant_sign_day || '',
    applicant_sign_month_en: (caseData as any).applicant_sign_month || '',

    goods_services_list_1: goodsLines[0] || '',
    goods_services_list_2: goodsLines[1] || '',
    goods_services_list_3: goodsLines[2] || '',
    goods_services_list_4: goodsLines[3] || '',
    goods_services_list_5: goodsLines[4] || '',
    goods_services_list_6: goodsLines[5] || ''
  };
};

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
      addressZone: caseData.client_address_zone,
      wereda: caseData.client_wereda,
      houseNo: caseData.client_house_no,
      city: caseData.client_city,
      stateName: caseData.client_state_name,
      cityCode: caseData.client_city_code,
      stateCode: caseData.client_state_code,
      zipCode: caseData.client_zip_code,
      poBox: caseData.client_po_box,
      phone: caseData.client_telephone,
      fax: caseData.client_fax,
      localName: caseData.client_local_name,
      gender: caseData.client_gender,
      residenceCountry: caseData.client_residence_country
    };

    const eipaForm = buildEipaFormFromNormalizedData(caseData, niceMappings);

    return {
      ...caseData,
      client,
      niceClasses: niceMappings.map((mapping: NiceMappingRow) => mapping.classNo),
      niceMappings,
      assets,
      history,
      deadlines,
      eipaForm
    };
  }
};
