import { create } from 'zustand';

export interface InstitutionTypeRecord {
  key: string;
  institutionType: string;
  businessTypes: string[];
  operator: string;
  operationTime: string;
}

export const initialInstitutionTypeRecords: InstitutionTypeRecord[] = [
  { key: 'TELECOM_OPERATOR', institutionType: 'TELECOM_OPERATOR', businessTypes: ['AIRTIME', 'SMS', 'USSD_DIAL'], operator: 'Bailly', operationTime: '2025-08-07 06:27:18' },
  { key: 'GIFTCARD', institutionType: 'GIFTCARD', businessTypes: ['GIFTCARD'], operator: 'haixia.zhang', operationTime: '2026-08-03 05:47:20' },
  { key: 'IM', institutionType: 'IM', businessTypes: ['WHATSAPP'], operator: 'yimin.dai@palmpay-inc.com', operationTime: '2026-01-30 06:08:22' },
  { key: 'MMO', institutionType: 'MMO', businessTypes: ['WALLET_CREDIT', 'WALLET_DEBIT', 'ONBOARDING'], operator: '冯启航 Felix', operationTime: '2025-09-05 03:26:51' },
  { key: 'BRANCH', institutionType: 'BRANCH', businessTypes: ['BANK_ACCOUNT_DEBIT', 'BANK_ACCOUNT_WITHHOLD', 'BILL_PAYMENT', 'BANK_ACCOUNT', 'BANK_CARD_DEBIT', 'BANK_ACCOUNT_CREDIT'], operator: '冯启航 Felix', operationTime: '2026-01-07 09:23:15' },
  { key: 'BANK', institutionType: 'BANK', businessTypes: ['BANK_ACCOUNT_CREDIT', 'POS', 'BANK_CARD_DEBIT', 'BANK_ACCOUNT_DEBIT', 'BILL_PAYMENT', 'THIRD_PARTY_CHECKOUT'], operator: 'Bailly', operationTime: '2025-08-07 06:26:39' },
  { key: 'CARD_SCHEME', institutionType: 'CARD_SCHEME', businessTypes: ['POS', 'BANK_CARD_DEBIT', 'BANK_ACCOUNT_CREDIT'], operator: '冯启航 Felix', operationTime: '2025-09-04 06:04:40' },
];

interface InstitutionTypeState {
  records: InstitutionTypeRecord[];
  addRecord: (record: InstitutionTypeRecord) => void;
  updateRecord: (key: string, updates: Partial<InstitutionTypeRecord>) => void;
}

export const useInstitutionTypeStore = create<InstitutionTypeState>((set) => ({
  records: initialInstitutionTypeRecords,
  addRecord: (record) => set((state) => ({ records: [record, ...state.records] })),
  updateRecord: (key, updates) => set((state) => ({ records: state.records.map((record) => record.key === key ? { ...record, ...updates } : record) })),
}));
