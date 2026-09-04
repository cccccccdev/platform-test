import { create } from 'zustand';
import { countryReferenceData, type CountryReference } from '../../mock/countries';

export type CurrencyType = 'Fiat' | 'Stablecoin';

export interface CurrencyRecord {
  code: string;
  name: string;
  type: CurrencyType;
  operator: string;
  operationTime: string;
}

interface BasicInfoReferenceStore {
  currencies: CurrencyRecord[];
  countries: CountryReference[];
  addCurrency: (currency: Omit<CurrencyRecord, 'operator' | 'operationTime'>) => void;
  updateCurrency: (code: string, updates: Pick<CurrencyRecord, 'name'>) => void;
  addCountry: (country: CountryReference) => void;
}

const DEMO_CURRENCY_BASE: Omit<CurrencyRecord, 'operator' | 'operationTime'>[] = [
  { code: 'CNY', name: 'Chinese Yuan', type: 'Fiat' },
  { code: 'BDT', name: 'Bangladeshi Taka', type: 'Fiat' },
  { code: 'EUR', name: 'Euro', type: 'Fiat' },
  { code: 'GBP', name: 'Pound Sterling', type: 'Fiat' },
  { code: 'GHS', name: 'Ghanaian Cedi', type: 'Fiat' },
  { code: 'HKD', name: 'Hong Kong Dollar', type: 'Fiat' },
  { code: 'IDR', name: 'Indonesian Rupiah', type: 'Fiat' },
  { code: 'KES', name: 'Kenyan Shilling', type: 'Fiat' },
  { code: 'MOP', name: 'Macanese Pataca', type: 'Fiat' },
  { code: 'MYR', name: 'Malaysian Ringgit', type: 'Fiat' },
  { code: 'NGN', name: 'Nigerian Naira', type: 'Fiat' },
  { code: 'PHP', name: 'Philippine Peso', type: 'Fiat' },
  { code: 'PKR', name: 'Pakistani Rupee', type: 'Fiat' },
  { code: 'SGD', name: 'Singapore Dollar', type: 'Fiat' },
  { code: 'THB', name: 'Thai Baht', type: 'Fiat' },
  { code: 'TZS', name: 'Tanzanian Shilling', type: 'Fiat' },
  { code: 'UGX', name: 'Ugandan Shilling', type: 'Fiat' },
  { code: 'USD', name: 'US Dollar', type: 'Fiat' },
  { code: 'VND', name: 'Vietnamese Dong', type: 'Fiat' },
  { code: 'XOF', name: 'West African CFA Franc', type: 'Fiat' },
  { code: 'ZAR', name: 'South African Rand', type: 'Fiat' },
  { code: 'EURC', name: 'Euro Coin', type: 'Stablecoin' },
  { code: 'USDC', name: 'USD Coin', type: 'Stablecoin' },
  { code: 'USDT', name: 'Tether USD', type: 'Stablecoin' },
  { code: 'XSGD', name: 'XSGD', type: 'Stablecoin' },
];

function formatOperationTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

const DEMO_CURRENCIES: CurrencyRecord[] = DEMO_CURRENCY_BASE.map((currency, index) => ({
  ...currency,
  operator: index % 3 === 0 ? 'Bailly' : index % 3 === 1 ? 'Rick' : 'System',
  operationTime: `2026-08-${String((index % 20) + 1).padStart(2, '0')} 10:30:00`,
}));

export const useBasicInfoReferenceStore = create<BasicInfoReferenceStore>((set) => ({
  currencies: DEMO_CURRENCIES,
  countries: countryReferenceData,
  addCurrency: (currency) => set((state) => ({
    currencies: [...state.currencies, {
      ...currency,
      operator: 'Current User',
      operationTime: formatOperationTime(),
    }],
  })),
  updateCurrency: (code, updates) => set((state) => ({
    currencies: state.currencies.map((currency) => currency.code === code ? {
      ...currency,
      ...updates,
      operator: 'Current User',
      operationTime: formatOperationTime(),
    } : currency),
  })),
  addCountry: (country) => set((state) => ({ countries: [...state.countries, country] })),
}));
