import { create } from 'zustand';
import { mockInboundEndpointsByChannel } from '../../mock/data';
import type { InboundEndpoint } from './types';

const cloneSeedData = (): Record<string, InboundEndpoint[]> =>
  structuredClone(mockInboundEndpointsByChannel) as Record<string, InboundEndpoint[]>;

const nextPatchVersion = (version: string) => {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return 'v1.0.0';
  return `v${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
};

interface MatchCapabilityStore {
  endpointsByChannel: Record<string, InboundEndpoint[]>;
  savedEndpointsByChannel: Record<string, InboundEndpoint[]>;
  dirtyByChannel: Record<string, boolean>;
  getEndpoints: (channelCode: string) => InboundEndpoint[];
  addEndpoint: (channelCode: string, endpoint: InboundEndpoint) => void;
  updateEndpoint: (channelCode: string, endpointId: string, updates: Partial<InboundEndpoint>) => void;
  saveChannel: (channelCode: string) => void;
  discardChannel: (channelCode: string) => void;
  submitChannel: (channelCode: string) => void;
}

export const useMatchCapabilityStore = create<MatchCapabilityStore>((set, get) => ({
  endpointsByChannel: cloneSeedData(),
  savedEndpointsByChannel: cloneSeedData(),
  dirtyByChannel: {},

  getEndpoints: (channelCode) => get().endpointsByChannel[channelCode] ?? [],

  addEndpoint: (channelCode, endpoint) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: [...(state.endpointsByChannel[channelCode] ?? []), endpoint],
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  updateEndpoint: (channelCode, endpointId, updates) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) =>
        endpoint.id === endpointId
          ? { ...endpoint, ...updates, configStatus: 'draft' as const }
          : endpoint
      ),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  saveChannel: (channelCode) => set((state) => ({
    savedEndpointsByChannel: {
      ...state.savedEndpointsByChannel,
      [channelCode]: structuredClone(state.endpointsByChannel[channelCode] ?? []),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
  })),

  discardChannel: (channelCode) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: structuredClone(state.savedEndpointsByChannel[channelCode] ?? []),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
  })),

  submitChannel: (channelCode) => set((state) => {
    const submittedEndpoints = (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => ({
        ...endpoint,
        version: endpoint.configStatus === 'draft' ? nextPatchVersion(endpoint.version) : endpoint.version,
        configStatus: 'submitted' as const,
      }));
    return {
      endpointsByChannel: {
        ...state.endpointsByChannel,
        [channelCode]: submittedEndpoints,
      },
      savedEndpointsByChannel: {
        ...state.savedEndpointsByChannel,
        [channelCode]: structuredClone(submittedEndpoints),
      },
      dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
    };
  }),
}));
