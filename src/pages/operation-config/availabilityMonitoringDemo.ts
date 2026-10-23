import { create } from 'zustand';

export type AvailabilityMonitoringStatus = 'ON' | 'OFF';
export type AvailabilityDetectType = 'availability' | 'probeTest';
export type AvailabilityMetricType = 'institution' | 'channel';
export type AmountOperator = '>' | '<' | '=';

export interface InternalTrafficConfiguration {
  id: string;
  initialAccount: string;
  initialMemberId: string;
  targetAccountNumber: string;
  targetAccountName: string;
  amount: number;
  status: 'enable' | 'disabled';
}

export interface AvailabilityMonitoringRule {
  id: string;
  institution: string;
  institutionLabel: string;
  detectType: AvailabilityDetectType;
  metricType: AvailabilityMetricType;
  frequency?: number;
  amountOperator: AmountOperator;
  amount: number;
  timeRange?: [string, string];
  internalTraffic: boolean;
  realTraffic: boolean;
  internalConfigurations: InternalTrafficConfiguration[];
}

export interface AvailabilityMonitoringRecord {
  id: number;
  tenant: string;
  businessType: string;
  service: string;
  serviceChannel: string;
  priority: number;
  country: string;
  operator: string;
  createTime: string;
  updateTime: string;
  status: AvailabilityMonitoringStatus;
  rules: AvailabilityMonitoringRule[];
}

const exampleRule = (recordId: number): AvailabilityMonitoringRule => ({
  id: `rule-${recordId}`,
  institution: 'GTBANK_NG',
  institutionLabel: 'GUARANTY TRUST BANK',
  detectType: 'availability',
  metricType: 'institution',
  frequency: 6000,
  amountOperator: '=',
  amount: 500000,
  timeRange: ['00:00', '23:59'],
  internalTraffic: false,
  realTraffic: false,
  internalConfigurations: [],
});

const seedRecords: AvailabilityMonitoringRecord[] = [
  {
    id: 10071,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'MARKETING',
    serviceChannel: 'CHUANGLAN#General#IM276966_IM4149564',
    priority: 1,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-09-20 07:27:44',
    updateTime: '2026-09-20 07:27:52',
    status: 'ON',
    rules: [exampleRule(10071)],
  },
  {
    id: 10070,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'NOTIFICATION',
    serviceChannel: 'EVEXIN#PalmPay#PALMPAYNOTIF',
    priority: 1,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-08-03 07:02:12',
    updateTime: '2026-08-03 07:02:17',
    status: 'ON',
    rules: [exampleRule(10070)],
  },
  {
    id: 10069,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'OTP',
    serviceChannel: 'EVEXIN#PalmPay#PALMPAYOTP',
    priority: 1,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-07-24 09:10:49',
    updateTime: '2026-07-24 09:14:27',
    status: 'ON',
    rules: [exampleRule(10069)],
  },
  {
    id: 10068,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'NOTIFICATION',
    serviceChannel: 'EVEXIN#FLEXICASH#FLEXINOTIF',
    priority: 1,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-07-16 09:53:32',
    updateTime: '2026-07-16 11:28:02',
    status: 'ON',
    rules: [exampleRule(10068)],
  },
  {
    id: 10067,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'OTP',
    serviceChannel: 'EVEXIN#FlexiCash#FLEXIOTP',
    priority: 1,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-07-16 09:52:09',
    updateTime: '2026-07-23 07:27:11',
    status: 'ON',
    rules: [exampleRule(10067)],
  },
  {
    id: 10062,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'MARKETING',
    serviceChannel: 'CHUANGLAN#General#IM4149564',
    priority: 3,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-07-08 13:43:49',
    updateTime: '2026-07-08 13:43:51',
    status: 'ON',
    rules: [exampleRule(10062)],
  },
  {
    id: 10061,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'OTP',
    serviceChannel: 'CHUANGLAN#General#I1089256',
    priority: 1,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-07-08 13:38:16',
    updateTime: '2026-07-08 13:38:20',
    status: 'ON',
    rules: [exampleRule(10061)],
  },
  {
    id: 10060,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'NOTIFICATION',
    serviceChannel: 'CHUANGLAN#General#IM4149564',
    priority: 1,
    country: 'NG',
    operator: '陈倩 Athena',
    createTime: '2026-07-08 11:52:03',
    updateTime: '2026-07-08 11:52:51',
    status: 'ON',
    rules: [exampleRule(10060)],
  },
  {
    id: 10058,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'OTP',
    serviceChannel: 'AFRICA_TALKING#General#AT_OTP',
    priority: 2,
    country: 'NG',
    operator: 'System',
    createTime: '2026-06-30 10:26:18',
    updateTime: '2026-07-02 09:15:02',
    status: 'OFF',
    rules: [exampleRule(10058)],
  },
  {
    id: 10055,
    tenant: 'PALMPAY',
    businessType: 'SMS',
    service: 'MARKETING',
    serviceChannel: 'INFOBIP#General#INFOBIP_MKT',
    priority: 2,
    country: 'NG',
    operator: 'System',
    createTime: '2026-06-22 04:18:36',
    updateTime: '2026-06-22 04:18:41',
    status: 'OFF',
    rules: [exampleRule(10055)],
  },
];

const formatNow = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

interface AvailabilityMonitoringStore {
  records: AvailabilityMonitoringRecord[];
  addRecord: (record: Omit<AvailabilityMonitoringRecord, 'id' | 'operator' | 'createTime' | 'updateTime' | 'status'>) => AvailabilityMonitoringRecord;
  updateRecord: (id: number, updates: Pick<AvailabilityMonitoringRecord, 'country' | 'tenant' | 'businessType' | 'service' | 'serviceChannel' | 'priority' | 'rules'>) => void;
  deleteRecord: (id: number) => void;
  setStatus: (id: number, status: AvailabilityMonitoringStatus) => void;
}

export const useAvailabilityMonitoringStore = create<AvailabilityMonitoringStore>((set, get) => ({
  records: seedRecords,
  addRecord: (record) => {
    const now = formatNow();
    const created: AvailabilityMonitoringRecord = {
      ...record,
      id: Math.max(10071, ...get().records.map(({ id }) => id)) + 1,
      operator: 'Current User',
      createTime: now,
      updateTime: now,
      status: 'OFF',
    };
    set((state) => ({ records: [created, ...state.records] }));
    return created;
  },
  updateRecord: (id, updates) => set((state) => ({
    records: state.records.map((record) => record.id === id
      ? { ...record, ...updates, operator: 'Current User', updateTime: formatNow() }
      : record),
  })),
  deleteRecord: (id) => set((state) => ({ records: state.records.filter((record) => record.id !== id) })),
  setStatus: (id, status) => set((state) => ({
    records: state.records.map((record) => record.id === id
      ? { ...record, status, operator: 'Current User', updateTime: formatNow() }
      : record),
  })),
}));
