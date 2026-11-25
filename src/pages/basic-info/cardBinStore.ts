import { create } from 'zustand';

/** Card Type 枚举（本次需求新增字段）。demo 假设值，正式枚举以 PRD 评审结论为准。 */
export const CARD_TYPE_OPTIONS = ['Debit', 'Credit', 'Prepaid'] as const;
export type CardType = (typeof CARD_TYPE_OPTIONS)[number];

export const CARD_TYPE_SELECT_OPTIONS = CARD_TYPE_OPTIONS.map((value) => ({ value, label: value }));

/** 国家 Tab 清单，与生产 Card Bin 页面一致（2026-11-24 生产截图口径）。 */
export const COUNTRY_TABS = ['NG', 'TZ', 'GH', 'BI', 'CI', 'SN', 'KE', 'SHADOW', 'PK', 'GSA', 'ZA', 'PPTEST', 'PH', 'SHO', 'SHO2', 'Fat', 'SHO0992'] as const;

export interface CardBinRecord {
  key: string;
  /** 所属国家 Tab，新建/批量新增取当前激活 Tab */
  country: string;
  /** 6-8 位卡 BIN，同一国家内唯一 */
  cardBin: string;
  /** 本次需求新增：卡片类型 */
  cardType: CardType;
  bankName: string;
  bankCode: string;
  cardSchemeName: string;
  cardSchemeCode: string;
  operator: string;
  operationTime: string;
}

interface CardBinState {
  records: CardBinRecord[];
  /** 单条新增与批量新增共用：新记录插到列表最前 */
  addRecords: (incoming: CardBinRecord[]) => void;
}

const seedRecords: CardBinRecord[] = [
  { key: 'NG-507881', country: 'NG', cardBin: '507881', cardType: 'Debit', bankName: 'PalmPay', bankCode: '100833', cardSchemeName: 'VERVE', cardSchemeCode: 'VERVE', operator: 'gihang.feng', operationTime: '2025-10-14 02:25:09' },
  { key: 'NG-555555', country: 'NG', cardBin: '555555', cardType: 'Credit', bankName: '2222', bankCode: '334433', cardSchemeName: 'Verve', cardSchemeCode: 'Verve', operator: 'chenqian.zhou', operationTime: '2025-10-14 02:10:18' },
  { key: 'NG-121212', country: 'NG', cardBin: '121212', cardType: 'Prepaid', bankName: 'TEST', bankCode: 'TEST0001', cardSchemeName: '123', cardSchemeCode: 'VER8234', operator: 'chenqian.zhou', operationTime: '2025-09-12 03:13:10' },
  { key: 'NG-1122333', country: 'NG', cardBin: '1122333', cardType: 'Debit', bankName: 'NGTEST', bankCode: 'NGTEST', cardSchemeName: 'VISA', cardSchemeCode: 'VISA', operator: '张登伟', operationTime: '2025-09-05 04:03:47' },
  { key: 'NG-11223333', country: 'NG', cardBin: '11223333', cardType: 'Debit', bankName: 'TEST', bankCode: 'TEST0001', cardSchemeName: 'VISA', cardSchemeCode: 'VISA', operator: '张登伟', operationTime: '2025-09-05 04:02:30' },
  { key: 'NG-112233', country: 'NG', cardBin: '112233', cardType: 'Credit', bankName: 'TEST', bankCode: 'TEST0001', cardSchemeName: 'VISA', cardSchemeCode: 'VISA', operator: '张登伟', operationTime: '2025-09-05 03:31:47' },
  { key: 'NG-1244445', country: 'NG', cardBin: '1244445', cardType: 'Prepaid', bankName: 'FIRST OPTION MFB', bankCode: '090285', cardSchemeName: 'VISA', cardSchemeCode: 'VISA', operator: '张登伟', operationTime: '2025-09-05 04:42:50' },
  { key: 'NG-111111', country: 'NG', cardBin: '111111', cardType: 'Debit', bankName: 'NGTEST', bankCode: 'NGTEST', cardSchemeName: 'VISA', cardSchemeCode: 'VISA', operator: 'chenqian.zhou', operationTime: '2025-08-26 06:36:07' },
  { key: 'NG-345234', country: 'NG', cardBin: '345234', cardType: 'Debit', bankName: 'ARISE MFB', bankCode: '090282', cardSchemeName: 'VISA', cardSchemeCode: 'VISA', operator: 'chenqian.zhou', operationTime: '2025-08-28 11:27:00' },
  { key: 'TZ-402345', country: 'TZ', cardBin: '402345', cardType: 'Debit', bankName: 'CRDB Bank', bankCode: '030020', cardSchemeName: 'VISA', cardSchemeCode: 'VISA', operator: 'chenqian.zhou', operationTime: '2025-09-20 05:12:41' },
  { key: 'GH-506199', country: 'GH', cardBin: '506199', cardType: 'Prepaid', bankName: 'GCB Bank', bankCode: '040010', cardSchemeName: 'Verve', cardSchemeCode: 'Verve', operator: 'gihang.feng', operationTime: '2025-09-21 07:44:03' },
];

export const useCardBinStore = create<CardBinState>((set) => ({
  records: seedRecords,
  addRecords: (incoming) => set((state) => ({ records: [...incoming, ...state.records] })),
}));
