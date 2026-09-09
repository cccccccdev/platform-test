import { create } from 'zustand';

export type SharedLine = {
  id: string;
  lineName: string;
  line: string;
  skipSsl: boolean;
  enableProxy: boolean;
  proxyServer?: string;
  proxyPort?: number;
  operator: string;
  operationTime: string;
};

export function initialSharedLines(channelCode: string): SharedLine[] {
  if (channelCode === 'EVEXIN') {
    return [
      {
        id: 'evexin-primary',
        lineName: 'EVEXIN Primary Gateway',
        line: 'https://api.evexin.com',
        skipSsl: false,
        enableProxy: false,
        operator: 'Adeleye Adedolapo',
        operationTime: '2026-06-26 08:55:57',
      },
      {
        id: 'evexin-secondary',
        lineName: 'EVEXIN Secondary Gateway',
        line: 'https://api-backup.evexin.com',
        skipSsl: false,
        enableProxy: false,
        operator: 'Bailly',
        operationTime: '2026-09-09 09:20:00',
      },
      {
        id: 'evexin-status',
        lineName: 'EVEXIN Status Service',
        line: 'https://status.evexin.com',
        skipSsl: false,
        enableProxy: false,
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
    operator: 'Zhang Wei',
    operationTime: '2026-05-19 14:12:20',
  }];
}

interface ChannelLineStore {
  linesByScope: Record<string, SharedLine[]>;
  setLines: (scopeKey: string, lines: SharedLine[]) => void;
}

export const channelLineScopeKey = (channelCode: string, cloud: string, env: string) => `${channelCode}:${cloud}:${env}`;

export const useChannelLineStore = create<ChannelLineStore>((set) => ({
  linesByScope: {},
  setLines: (scopeKey, lines) => set((state) => ({ linesByScope: { ...state.linesByScope, [scopeKey]: lines } })),
}));
