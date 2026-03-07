import type { Jurisdiction, NiceClass, TrademarkCase, TrademarkStatus, TrademarkType } from '@/shared/database'
import { statusToWorkflowStage } from '@/shared/database'

function tm(
  input: Omit<TrademarkCase, 'state'> & {
    status: TrademarkStatus
    markType: TrademarkType
    niceClasses: NiceClass[]
    jurisdiction: Jurisdiction
  }
): TrademarkCase {
  return {
    ...input,
    state: statusToWorkflowStage(input.status)
  }
}

export const MOCK_TRADEMARKS: TrademarkCase[] = [
  tm({
    id: 'tm_001',
    jurisdiction: 'ET',
    status: 'FILED',
    markType: 'WORD',
    wordMark: 'BETPAWA',
    niceClasses: [9, 35],
    goodsServices: 'Software; online retail services',
    applicantType: 'COMPANY',
    applicantName: 'Betpawa PLC',
    applicantNationality: 'Ethiopia',
    filingNumber: 'ET/TM/2026/0001',
    applicationDate: '2026-02-01'
  }),
  tm({
    id: 'tm_002',
    jurisdiction: 'KE',
    status: 'FORMAL_EXAM',
    markType: 'COMBINED',
    wordMark: 'EAST AFRICAN IP',
    niceClasses: [45],
    goodsServices: 'Legal services; IP services',
    applicantType: 'COMPANY',
    applicantName: 'East African IP',
    applicantNationality: 'Kenya',
    filingNumber: 'KE/TM/2025/1198',
    applicationDate: '2025-12-12'
  }),
  tm({
    id: 'tm_003',
    jurisdiction: 'ET',
    status: 'PUBLISHED',
    markType: 'LOGO',
    niceClasses: [25],
    goodsServices: 'Clothing; footwear; headgear',
    applicantType: 'INDIVIDUAL',
    applicantName: 'Hanna Tadesse',
    applicantNationality: 'Ethiopia',
    filingNumber: 'ET/TM/2025/0914',
    applicationDate: '2025-10-05',
    publicationDate: '2026-01-10'
  }),
  tm({
    id: 'tm_004',
    jurisdiction: 'KE',
    status: 'REGISTERED',
    markType: 'WORD',
    wordMark: 'KIFARU',
    niceClasses: [30],
    goodsServices: 'Coffee; tea; cocoa',
    applicantType: 'COMPANY',
    applicantName: 'Kifaru Foods Ltd',
    applicantNationality: 'Kenya',
    filingNumber: 'KE/TM/2024/0411',
    applicationDate: '2024-03-01',
    registrationDate: '2025-07-17',
    nextRenewalDate: '2035-07-17'
  }),
  tm({
    id: 'tm_005',
    jurisdiction: 'ET',
    status: 'DRAFT',
    markType: 'WORD',
    wordMark: 'NILEX',
    niceClasses: [5],
    goodsServices: 'Pharmaceutical preparations',
    applicantType: 'COMPANY',
    applicantName: 'Nilex Trading',
    applicantNationality: 'Ethiopia'
  }),
  tm({
    id: 'tm_006',
    jurisdiction: 'ET',
    status: 'SUBSTANTIVE_EXAM',
    markType: 'WORD',
    wordMark: 'ABYSSINIA GOLD',
    niceClasses: [30],
    goodsServices: 'Coffee, tea, and spices',
    applicantType: 'COMPANY',
    applicantName: 'Abyssinia Exports',
    applicantNationality: 'Ethiopia',
    filingNumber: 'ET/TM/2025/1542',
    applicationDate: '2025-11-20'
  }),
  tm({
    id: 'tm_007',
    jurisdiction: 'KE',
    status: 'EXPIRING',
    markType: 'LOGO',
    wordMark: 'SAVANNAH',
    niceClasses: [43],
    goodsServices: 'Services for providing food and drink',
    applicantType: 'COMPANY',
    applicantName: 'Savannah Lodges Ltd',
    applicantNationality: 'Kenya',
    filingNumber: 'KE/TM/2016/8842',
    applicationDate: '2016-05-10',
    registrationDate: '2017-02-15',
    nextRenewalDate: '2026-05-10'
  }),
  tm({
    id: 'tm_008',
    jurisdiction: 'ET',
    status: 'RENEWAL',
    markType: 'COMBINED',
    wordMark: 'LUCY WATER',
    niceClasses: [32],
    goodsServices: 'Mineral and aerated waters',
    applicantType: 'COMPANY',
    applicantName: 'Lucy Beverages',
    applicantNationality: 'Ethiopia',
    filingNumber: 'ET/TM/2014/0056',
    applicationDate: '2014-01-05',
    registrationDate: '2014-12-10',
    nextRenewalDate: '2024-12-10'
  }),
  tm({
    id: 'tm_009',
    jurisdiction: 'KE',
    status: 'FILED',
    markType: 'WORD',
    wordMark: 'JUA KALI',
    niceClasses: [7],
    goodsServices: 'Machines and machine tools',
    applicantType: 'INDIVIDUAL',
    applicantName: 'John Kamau',
    applicantNationality: 'Kenya',
    filingNumber: 'KE/TM/2026/0244',
    applicationDate: '2026-02-10'
  }),
  tm({
    id: 'tm_010',
    jurisdiction: 'ET',
    status: 'REGISTERED',
    markType: 'WORD',
    wordMark: 'HADASSAH',
    niceClasses: [3],
    goodsServices: 'Cosmetics and perfumes',
    applicantType: 'COMPANY',
    applicantName: 'Hadassah Beauty',
    applicantNationality: 'Ethiopia',
    filingNumber: 'ET/TM/2023/4412',
    applicationDate: '2023-08-15',
    registrationDate: '2024-05-20',
    nextRenewalDate: '2033-05-20'
  }),
  tm({
    id: 'tm_011',
    jurisdiction: 'KE',
    status: 'PUBLISHED',
    markType: 'WORD',
    wordMark: 'M-PESA NEXT',
    niceClasses: [36],
    goodsServices: 'Financial services; electronic funds transfer',
    applicantType: 'COMPANY',
    applicantName: 'Safaricom PLC',
    applicantNationality: 'Kenya',
    filingNumber: 'KE/TM/2025/9901',
    applicationDate: '2025-11-15',
    publicationDate: '2026-02-01'
  }),
  tm({
    id: 'tm_012',
    jurisdiction: 'ET',
    status: 'FORMAL_EXAM',
    markType: 'LOGO',
    wordMark: 'ENTOTO RIDE',
    niceClasses: [39],
    goodsServices: 'Transport; packaging and storage of goods',
    applicantType: 'COMPANY',
    applicantName: 'Entoto Transport',
    applicantNationality: 'Ethiopia',
    filingNumber: 'ET/TM/2026/0088',
    applicationDate: '2026-01-25'
  })
]
