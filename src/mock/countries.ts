export type CountryReference = {
  code: string;
  callingCode: string;
  currency: string;
  mainUnit: string;
  fractionalUnit: string;
  ratio: number;
  segmentLength: number;
  operator: string;
  operationTime: string;
};

export const countryReferenceData: CountryReference[] = [
  { code: 'NG', callingCode: '0234', currency: 'NGN', mainUnit: 'NAIRA', fractionalUnit: 'KOBO', ratio: 100, segmentLength: 4, operator: 'System', operationTime: '2025-01-17 10:52:54' },
  { code: 'TZ', callingCode: '0255', currency: 'TZS', mainUnit: 'SHILLING', fractionalUnit: 'CENTS', ratio: 100, segmentLength: 3, operator: 'system', operationTime: '2025-07-14 05:50:00' },
  { code: 'GH', callingCode: '0233', currency: 'GHS', mainUnit: 'CEDI', fractionalUnit: 'PESEWA', ratio: 100, segmentLength: 3, operator: 'Bailly', operationTime: '2025-08-07 06:32:01' },
  { code: 'BD', callingCode: '0880', currency: 'BDT', mainUnit: 'TAKA', fractionalUnit: 'POISHA', ratio: 100, segmentLength: 3, operator: 'Bailly', operationTime: '2025-08-07 06:33:13' },
  { code: 'CI', callingCode: '0225', currency: 'XOF', mainUnit: 'FCFA', fractionalUnit: 'CENTS', ratio: 100, segmentLength: 0, operator: 'Bailly', operationTime: '2025-08-07 06:34:36' },
  { code: 'SN', callingCode: '0221', currency: 'XOF', mainUnit: 'FCFA', fractionalUnit: 'CENTS', ratio: 100, segmentLength: 0, operator: 'Bailly', operationTime: '2025-08-07 06:35:22' },
  { code: 'KE', callingCode: '0254', currency: 'KES', mainUnit: 'Shiling', fractionalUnit: 'CENT', ratio: 100, segmentLength: 4, operator: '冯启航 Felix', operationTime: '2025-08-18 10:37:13' },
  { code: 'SHADOW', callingCode: '0999', currency: 'SHADOW', mainUnit: 'SHADOW', fractionalUnit: 'SHADOW', ratio: 100, segmentLength: 0, operator: 'Bailly', operationTime: '2025-08-18 12:00:33' },
  { code: 'PK', callingCode: '0092', currency: 'PKR', mainUnit: 'RUPEE', fractionalUnit: 'PAISA', ratio: 100, segmentLength: 4, operator: 'Rick', operationTime: '2025-09-09 13:19:06' },
  { code: 'GSA', callingCode: '000', currency: 'GSA', mainUnit: 'GSA', fractionalUnit: 'GSA', ratio: 0, segmentLength: 4, operator: '胡冰楠', operationTime: '2025-09-16 08:00:32' },
  { code: 'ZA', callingCode: '27', currency: 'ZAR', mainUnit: 'RAND', fractionalUnit: 'CENT', ratio: 100, segmentLength: 4, operator: 'Rick', operationTime: '2025-10-16 12:47:09' },
  { code: 'UG', callingCode: '0256', currency: 'UGX', mainUnit: 'SHILLING', fractionalUnit: 'SHILLING', ratio: 1, segmentLength: 3, operator: 'xiajichen', operationTime: '2025-12-10 08:02:04' },
  { code: 'SG', callingCode: '0065', currency: 'SGD', mainUnit: 'SINGAPORE DOLLAR', fractionalUnit: 'CENT', ratio: 100, segmentLength: 3, operator: 'Rick', operationTime: '2025-11-28 07:32:55' },
  { code: 'HK', callingCode: '0852', currency: 'HKD', mainUnit: 'HONGKONG DOLLAR', fractionalUnit: 'CENT', ratio: 100, segmentLength: 3, operator: 'Rick', operationTime: '2025-11-28 07:34:08' },
  { code: 'GB', callingCode: '0044', currency: 'GBP', mainUnit: 'POUND', fractionalUnit: 'PENNY', ratio: 100, segmentLength: 5, operator: 'Rick', operationTime: '2025-11-28 07:41:22' },
  { code: 'CN', callingCode: '0086', currency: 'CNY', mainUnit: 'YUAN', fractionalUnit: 'FEN', ratio: 100, segmentLength: 3, operator: 'Rick', operationTime: '2025-11-28 07:52:24' },
  { code: 'PH', callingCode: '0063', currency: 'PHP', mainUnit: 'PESO', fractionalUnit: 'CENTAVO', ratio: 100, segmentLength: 4, operator: 'haixia.zhang', operationTime: '2026-01-06 08:28:34' },
  { code: 'BF', callingCode: '0226', currency: 'XOF', mainUnit: 'FCFA', fractionalUnit: 'CENTS', ratio: 100, segmentLength: 4, operator: 'haixia.zhang', operationTime: '2026-07-29 08:26:34' },
];

export const countryCodeOptions = countryReferenceData.map(({ code }) => code);
