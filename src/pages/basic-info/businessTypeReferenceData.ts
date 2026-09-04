import { create } from 'zustand';

export interface BusinessTypeRecord { businessType: string; operator: string; operationTime: string; }

export const initialBusinessTypeRecords: BusinessTypeRecord[] = [
  ['VIBER', '顾丰荣 gufengrong', '2026-08-21 02:50:29'], ['INSURANCE', '王斌 Bin', '2026-08-17 08:34:56'],
  ['GIFTCARD', 'haixia.zhang', '2026-07-07 06:32:09'], ['STABLECOIN', '潘一泓', '2026-05-21 02:45:21'],
  ['FUNDS_IN', 'xiajichen', '2026-05-14 03:55:16'], ['PRODUCT_MANAGEMENT', '顾丰荣 gufengrong', '2026-05-09 02:39:35'],
  ['USSD_DIAL', '王斌 Bin', '2026-04-14 13:15:55'], ['DISPUTE_IN', '胡冰楠', '2026-03-13 11:28:31'],
  ['WALLET_ACCOUNT', '顾丰荣 gufengrong', '2026-01-23 09:51:57'], ['WHATSAPP', 'yimin.dai@palmpay-inc.com', '2026-01-22 08:56:17'],
  ['FUND_NOTIFICATION', '潘一泓', '2026-01-13 02:48:55'], ['MERCHANT_BALANCE', '冯启航 Felix', '2025-12-17 02:47:17'],
  ['ONBOARDING', 'jichen.xia@palmpay-inc.com', '2025-12-15 07:33:03'], ['NFC', '冯启航 Felix', '2025-12-09 11:43:39'],
  ['BANK_ACCOUNT_WITHHOLD', 'Rick', '2025-12-02 06:00:07'], ['TAX', '冯启航 Felix', '2025-11-04 02:08:34'],
  ['BILL_PAYMENT', 'Rick', '2025-10-21 06:34:17'], ['BANK_ACCOUNT_DEBIT', '冯启航 Felix', '2025-10-17 06:21:50'],
  ['DISPUTE_PROCESSING', 'Rick', '2025-10-15 12:36:16'], ['SMS', 'lemon 王艳霞', '2025-10-13 07:17:10'],
  ['RECONCILIATION', '胡冰楠', '2025-09-18 07:17:00'], ['SETTLEMENT_ACCOUNT', 'Rick', '2025-09-09 08:48:09'],
  ['BANK_ACCOUNT', 'Burny 管乘钰', '2025-08-26 02:08:55'], ['WEALTH', 'Burny 管乘钰', '2025-08-15 06:21:43'],
  ['THIRD_PARTY_CHECKOUT', 'Bailly', '2025-08-07 07:17:39'], ['KYC', 'Bailly', '2025-08-07 07:14:39'],
  ['DATA', 'Bailly', '2025-08-07 07:14:33'], ['AIRTIME', 'Bailly', '2025-08-07 06:26:56'],
  ['FX', 'Bailly', '2025-08-07 05:46:53'], ['WALLET_CREDIT', 'Bailly', '2025-08-07 05:46:46'],
  ['WALLET_DEBIT', 'Bailly', '2025-08-07 05:46:28'], ['BANK_CARD_DEBIT', 'System', '2025-08-05 06:55:44'],
  ['BANK_ACCOUNT_CREDIT', 'system', '2025-06-30 10:01:30'], ['POS', 'system', '2025-06-24 09:26:58'],
].map(([businessType, operator, operationTime]) => ({ businessType, operator, operationTime }));

interface BusinessTypeState { records: BusinessTypeRecord[]; addBusinessType: (record: BusinessTypeRecord) => void; }

export const useBusinessTypeStore = create<BusinessTypeState>((set) => ({
  records: initialBusinessTypeRecords,
  addBusinessType: (record) => set((state) => ({ records: [record, ...state.records].sort((a, b) => b.operationTime.localeCompare(a.operationTime)) })),
}));
