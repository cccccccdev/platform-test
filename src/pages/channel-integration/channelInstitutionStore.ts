import { create } from 'zustand';

export interface ChannelInstitutionMapping {
  id: string;
  channelCode: string;
  bt: string;
  ability: string;
  country: string;
  institutionCountry: string;
  institutionCode: string;
  institutionName: string;
  channelInstitutionCode?: string;
  channelInstitutionName?: string;
  operator: string;
  operationTime: string;
}

const paystackInstitutionSeeds: Array<[string, string, string | undefined, string | undefined]> = [
  ['GTBANK_NG', 'GUARANTY TRUST BANK', '058', 'Guaranty Trust Bank'],
  ['ZENITH_NG', 'ZENITH BANK', '057', 'Zenith Bank'],
  ['ACCESS_NG', 'ACCESS BANK', '044', 'Access Bank'],
  ['UBA_NG', 'UNITED BANK FOR AFRICA', '033', 'United Bank for Africa'],
  ['FIRST_BANK_NG', 'FIRST BANK OF NIGERIA', undefined, undefined],
];

const initialMappings: ChannelInstitutionMapping[] = paystackInstitutionSeeds.map(([institutionCode, institutionName, channelInstitutionCode, channelInstitutionName], index) => ({
  id: `paystack-${index}`,
  channelCode: 'PAYSTACK_NG',
  bt: 'BANK_ACCOUNT_CREDIT',
  ability: 'TRANSFER_INTER',
  country: 'NG',
  institutionCountry: 'NG',
  institutionCode,
  institutionName,
  channelInstitutionCode,
  channelInstitutionName,
  operator: 'Bailly',
  operationTime: '2026-08-19 03:53:28',
})).concat([
  { id: 'cobo-onramp-nedbank', channelCode: 'COBO', bt: 'STABLECOIN', ability: 'ON_RAMP', country: 'GSA', institutionCountry: 'GSA', institutionCode: '198765', institutionName: 'NEDBANK LIMITED', channelInstitutionCode: 'NEDBANK', channelInstitutionName: 'Nedbank', operator: 'Current User', operationTime: '2026-09-05 10:00:00' },
  { id: 'cobo-offramp-nedbank', channelCode: 'COBO', bt: 'STABLECOIN', ability: 'OFF_RAMP', country: 'GSA', institutionCountry: 'GSA', institutionCode: '198765', institutionName: 'NEDBANK LIMITED', channelInstitutionCode: 'NEDBANK', channelInstitutionName: 'Nedbank', operator: 'Current User', operationTime: '2026-09-05 10:00:00' },
]);

interface ChannelInstitutionStore {
  records: ChannelInstitutionMapping[];
  save: (record: ChannelInstitutionMapping) => void;
}

export const useChannelInstitutionStore = create<ChannelInstitutionStore>((set) => ({
  records: initialMappings,
  save: (record) => set((state) => ({ records: state.records.some((item) => item.id === record.id) ? state.records.map((item) => item.id === record.id ? record : item) : [record, ...state.records] })),
}));
