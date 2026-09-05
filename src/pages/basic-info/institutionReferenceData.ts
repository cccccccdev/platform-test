import { create } from 'zustand';

export interface InstitutionRecord {
  code: string;
  name: string;
  country: string;
  institutionTypes: string[];
  logo?: string;
  relationInstitutions: string[];
  operator: string;
  operationTime: string;
}

const initialInstitutions: InstitutionRecord[] = [
  { name: 'NEDBANK LIMITED', code: '198765', country: 'GSA', institutionTypes: ['BANK'], relationInstitutions: [], operator: '胡冰楠', operationTime: '2026-05-22 06:53:57' },
  { name: 'VISA', code: 'VISA', country: 'ZA', institutionTypes: ['CARD_SCHEME'], relationInstitutions: [], operator: 'haixia.zhang', operationTime: '2026-05-26 07:31:43' },
  { name: 'MasterCard', code: 'MASTERCARD', country: 'ZA', institutionTypes: ['CARD_SCHEME'], relationInstitutions: [], operator: 'haixia.zhang', operationTime: '2026-05-26 07:31:13' },
  { name: 'VIRTUAL_INSTITUTION', code: 'VIRTUAL_INSTITUTION', country: 'ZA', institutionTypes: ['BANK'], relationInstitutions: [], operator: 'Rick', operationTime: '2025-10-29 02:32:06' },
  { name: '3(Hutchison Telecom HK LTD)', code: 'HT_HK_LTD', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:57:47' },
  { name: 'Multibyte Info Technology Ltd (MVNO)', code: 'MIT_LTD', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:56:50' },
  { name: 'Hong Kong Telecommunications (HKT/CSL)', code: 'TELECOM_HK', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:55:55' },
  { name: 'HK China Telecom Global Limited', code: 'HK_CHINA_TELECOM', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:55:16' },
  { name: 'CITIC Telecom 1616 (CSL MVNO)', code: 'CITIC_TELECOM', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:54:32' },
  { name: 'China Unicom HK Limited', code: 'UNICOM_HK_LIMITED', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:51:06' },
  { name: 'China-HongKong Telecom', code: 'HK_TELECOM', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:50:27' },
  { name: 'China Mobile HK', code: 'CHINA_MOBILE_HK', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:49:35' },
  { name: 'SmarTone HK', code: 'SMARTONE', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:48:28' },
  { name: 'GUARANTY TRUST BANK', code: 'GTBANK_NG', country: 'NG', institutionTypes: ['BANK'], relationInstitutions: [], operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { name: 'ZENITH BANK', code: 'ZENITH_NG', country: 'NG', institutionTypes: ['BANK'], relationInstitutions: [], operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { name: 'ACCESS BANK', code: 'ACCESS_NG', country: 'NG', institutionTypes: ['BANK'], relationInstitutions: [], operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { name: 'UNITED BANK FOR AFRICA', code: 'UBA_NG', country: 'NG', institutionTypes: ['BANK'], relationInstitutions: [], operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { name: 'FIRST BANK OF NIGERIA', code: 'FIRST_BANK_NG', country: 'NG', institutionTypes: ['BANK'], relationInstitutions: [], operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
];

interface InstitutionReferenceStore {
  records: InstitutionRecord[];
  addRecord: (record: InstitutionRecord) => void;
  updateRecord: (country: string, code: string, record: InstitutionRecord) => void;
}

export const useInstitutionReferenceStore = create<InstitutionReferenceStore>((set) => ({
  records: initialInstitutions,
  addRecord: (record) => set((state) => ({ records: [record, ...state.records] })),
  updateRecord: (country, code, record) => set((state) => ({ records: state.records.map((item) => item.country === country && item.code === code ? record : item) })),
}));
