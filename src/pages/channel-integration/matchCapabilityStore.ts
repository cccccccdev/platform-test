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
  createVersion: (channelCode: string, endpointId: string) => void;
  cloneEndpoint: (channelCode: string, endpointId: string) => InboundEndpoint | null;
  deployEndpoint: (channelCode: string, endpointId: string) => void;
  deleteEndpoint: (channelCode: string, endpointId: string) => void;
  saveChannel: (channelCode: string) => void;
  submitEndpoint: (channelCode: string, endpointId: string) => void;
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
          ? { ...endpoint, ...updates, configStatus: endpoint.uriType === 'legacy' ? 'legacy_readonly' as const : 'draft' as const, updatedTime: new Date().toLocaleString() }
          : endpoint
      ),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  createVersion: (channelCode, endpointId) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) =>
        endpoint.id === endpointId
          ? { ...endpoint, version: nextPatchVersion(endpoint.version), configStatus: 'draft' as const, badges: [] }
          : endpoint
      ),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  cloneEndpoint: (channelCode, endpointId) => {
    const source = get().getEndpoints(channelCode).find((endpoint) => endpoint.id === endpointId);
    if (!source || source.uriType === 'legacy') return null;
    const clone: InboundEndpoint = {
      ...structuredClone(source),
      id: `uri_${Date.now()}`,
      name: `${source.name}_copy`,
      url: `${source.url}-copy`,
      version: 'v0.0.1',
      configStatus: 'draft',
      badges: [],
      referenceCount: 0,
      updatedTime: new Date().toLocaleString(),
    };
    get().addEndpoint(channelCode, clone);
    return clone;
  },

  deployEndpoint: (channelCode, endpointId) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) =>
        endpoint.id === endpointId
          ? { ...endpoint, configStatus: 'published' as const, badges: [{ cloud: 'BD', env: 'DAILY' }] }
          : endpoint
      ),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
  })),

  deleteEndpoint: (channelCode, endpointId) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).filter((endpoint) => endpoint.id !== endpointId),
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

  submitEndpoint: (channelCode, endpointId) => set((state) => {
    const submitted = (state.endpointsByChannel[channelCode] ?? []).map((endpoint) =>
      endpoint.id === endpointId && endpoint.uriType === 'new'
        ? { ...endpoint, configStatus: 'submitted' as const, updatedTime: new Date().toLocaleString() }
        : endpoint
    );
    return {
      endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: submitted },
      savedEndpointsByChannel: { ...state.savedEndpointsByChannel, [channelCode]: structuredClone(submitted) },
      dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
    };
  }),

  discardChannel: (channelCode) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: structuredClone(state.savedEndpointsByChannel[channelCode] ?? []),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
  })),

  submitChannel: (channelCode) => set((state) => {
    const submittedEndpoints = (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.uriType === 'legacy'
      ? endpoint
      : { ...endpoint, configStatus: 'submitted' as const });
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
