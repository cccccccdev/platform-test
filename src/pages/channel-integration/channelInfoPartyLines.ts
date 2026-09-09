import { create } from 'zustand';

export type SharedLine = {
  id: string;
  lineName: string;
  line: string;
  skipSsl: boolean;
  enableProxy: boolean;
  proxyServer?: string;
  proxyPort?: number;
  timeout: number;
  operator: string;
  operationTime: string;
};

export type LineReference = {
  lineId: string;
  party: string;
  path: string;
};

export function initialLineReferences(channelCode: string): LineReference[] {
  if (channelCode !== 'EVEXIN') return [];
  return [
    { lineId: 'evexin-primary', party: 'FLEXI', path: '/api/msg/v2/sendMsg' },
    { lineId: 'evexin-secondary', party: 'FLEXI', path: '/api/msg/v2/sendMsg' },
    { lineId: 'evexin-status', party: 'FLEXI', path: '/api/msg/v2/queryStatus' },
  ];
}

export function initialSharedLines(channelCode: string): SharedLine[] {
  if (channelCode === 'EVEXIN') {
    return [
      {
        id: 'evexin-primary',
        lineName: 'EVEXIN Primary Gateway',
        line: 'https://api.evexin.com',
        skipSsl: false,
        enableProxy: false,
        timeout: 10000,
        operator: 'Adeleye Adedolapo',
        operationTime: '2026-06-26 08:55:57',
      },
      {
        id: 'evexin-secondary',
        lineName: 'EVEXIN Secondary Gateway',
        line: 'https://api-backup.evexin.com',
        skipSsl: false,
        enableProxy: false,
        timeout: 15000,
        operator: 'Bailly',
        operationTime: '2026-09-09 09:20:00',
      },
      {
        id: 'evexin-status',
        lineName: 'EVEXIN Status Service',
        line: 'https://status.evexin.com',
        skipSsl: false,
        enableProxy: false,
        timeout: 8000,
        operator: 'Bailly',
        operationTime: '2026-09-09 09:25:00',
      },
    ];
  }
  return [{
    id: 'primary',
    lineName: 'PRIMARY',
    line: `https://api.${channelCode.toLowerCase().replaceAll('_', '-')}.com`,
    skipSsl: false,
    enableProxy: false,
    timeout: 10000,
    operator: 'Zhang Wei',
    operationTime: '2026-05-19 14:12:20',
  }];
}

interface ChannelLineStore {
  linesByScope: Record<string, SharedLine[]>;
  referencesByScope: Record<string, LineReference[]>;
  setLines: (scopeKey: string, lines: SharedLine[]) => void;
  setPartyReferences: (scopeKey: string, party: string, references: LineReference[]) => void;
}

export const channelLineScopeKey = (channelCode: string, cloud: string, env: string) => `${channelCode}:${cloud}:${env}`;

export const useChannelLineStore = create<ChannelLineStore>((set) => ({
  linesByScope: {},
  referencesByScope: {},
  setLines: (scopeKey, lines) => set((state) => ({ linesByScope: { ...state.linesByScope, [scopeKey]: lines } })),
  setPartyReferences: (scopeKey, party, references) => set((state) => {
    const channelCode = scopeKey.split(':')[0];
    const current = state.referencesByScope[scopeKey] ?? initialLineReferences(channelCode);
    return {
      referencesByScope: {
        ...state.referencesByScope,
        [scopeKey]: [...current.filter((reference) => reference.party !== party), ...references],
      },
    };
  }),
}));
