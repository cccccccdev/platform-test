import { create } from 'zustand';
import { mockInboundEndpointsByChannel } from '../../mock/data';
import type { CapabilityDecisionVersion, InboundEndpoint } from './types';

const nextPatchVersion = (version: string) => {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return 'v1.0.0';
  return `v${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
};

const legacyVersionFromEndpoint = (endpoint: InboundEndpoint): CapabilityDecisionVersion => {
  const parsedFields = endpoint.fields.map((field, index) => {
    const [source, ...nameParts] = field.split('.');
    return {
      id: `${endpoint.id}_field_${index}`,
      source: (['query', 'header', 'body'].includes(source) ? source : 'body') as 'query' | 'header' | 'body',
      name: nameParts.join('.') || field,
      type: 'String' as const,
      moc: 'yes' as const,
      description: '',
    };
  });
  const requestFields = endpoint.matchType === 'single'
    ? []
    : endpoint.matchType === 'order_no'
      ? parsedFields.filter((field) => `${field.source}.${field.name}` === endpoint.singleNoField).slice(0, 1)
      : parsedFields;
  return {
    id: `${endpoint.id}_version_1`,
    version: endpoint.version,
    configStatus: endpoint.configStatus,
    description: endpoint.description,
    fields: requestFields.map((field) => `${field.source}.${field.name}`),
    requestFields,
    matchType: endpoint.matchType,
    matchFieldSource: endpoint.matchFieldSource,
    singleNoField: endpoint.singleNoField,
    referenceField: endpoint.referenceField,
    matchFields: endpoint.matchFields,
    rules: endpoint.rules,
    customScript: endpoint.customScript,
    fallbackBehavior: endpoint.fallbackBehavior,
    decryptEnabled: endpoint.decryptEnabled,
    badges: endpoint.badges,
    updatedTime: endpoint.updatedTime,
    operator: endpoint.operator,
  };
};

const cloneSeedData = (): Record<string, InboundEndpoint[]> => {
  const raw = structuredClone(mockInboundEndpointsByChannel) as unknown as Record<string, InboundEndpoint[]>;
  return Object.fromEntries(Object.entries(raw).map(([channel, endpoints]) => [channel, endpoints.map((endpoint) => {
    const versions = endpoint.versions?.length ? endpoint.versions : [legacyVersionFromEndpoint(endpoint)];
    const businessTypes = endpoint.businessTypes ?? [...new Set([endpoint.businessType, ...versions.flatMap((version) => version.rules.map((rule) => rule.bt))].filter(Boolean))];
    return { ...endpoint, businessTypes, versions };
  })]));
};

interface MatchCapabilityStore {
  endpointsByChannel: Record<string, InboundEndpoint[]>;
  savedEndpointsByChannel: Record<string, InboundEndpoint[]>;
  dirtyByChannel: Record<string, boolean>;
  getEndpoints: (channelCode: string) => InboundEndpoint[];
  addEndpoint: (channelCode: string, endpoint: InboundEndpoint) => void;
  updateEndpoint: (channelCode: string, endpointId: string, updates: Partial<InboundEndpoint>) => void;
  updateDecisionVersion: (channelCode: string, endpointId: string, versionId: string, updates: Partial<CapabilityDecisionVersion>) => void;
  createVersion: (channelCode: string, endpointId: string) => CapabilityDecisionVersion | null;
  cloneVersion: (channelCode: string, endpointId: string, versionId: string) => CapabilityDecisionVersion | null;
  deployVersion: (channelCode: string, endpointId: string, versionId: string) => void;
  deleteVersion: (channelCode: string, endpointId: string, versionId: string) => void;
  deleteEndpoint: (channelCode: string, endpointId: string) => void;
  saveChannel: (channelCode: string) => void;
  submitVersion: (channelCode: string, endpointId: string, versionId: string) => void;
  discardChannel: (channelCode: string) => void;
}

export const useMatchCapabilityStore = create<MatchCapabilityStore>((set, get) => ({
  endpointsByChannel: cloneSeedData(),
  savedEndpointsByChannel: cloneSeedData(),
  dirtyByChannel: {},

  getEndpoints: (channelCode) => get().endpointsByChannel[channelCode] ?? [],

  addEndpoint: (channelCode, endpoint) => set((state) => ({
    endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: [...(state.endpointsByChannel[channelCode] ?? []), endpoint] },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  updateEndpoint: (channelCode, endpointId, updates) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.id === endpointId ? { ...endpoint, ...updates } : endpoint),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  updateDecisionVersion: (channelCode, endpointId, versionId, updates) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.id === endpointId ? {
        ...endpoint,
        versions: endpoint.versions.map((version) => version.id === versionId ? {
          ...version,
          ...updates,
          configStatus: endpoint.uriType === 'legacy' ? 'legacy_readonly' : 'draft',
          updatedTime: new Date().toLocaleString(),
        } : version),
      } : endpoint),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  createVersion: (channelCode, endpointId) => {
    const endpoint = get().getEndpoints(channelCode).find((item) => item.id === endpointId);
    if (!endpoint || endpoint.uriType === 'legacy' || endpoint.versions.some((version) => version.configStatus === 'draft')) return null;
    const source = endpoint.versions[0];
    const version: CapabilityDecisionVersion = {
      ...structuredClone(source),
      id: `decision_${Date.now()}`,
      version: nextPatchVersion(source.version),
      configStatus: 'draft',
      badges: [],
      updatedTime: new Date().toLocaleString(),
      operator: 'admin',
    };
    set((state) => ({
      endpointsByChannel: {
        ...state.endpointsByChannel,
        [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((item) => item.id === endpointId ? { ...item, versions: [version, ...item.versions] } : item),
      },
      dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
    }));
    return version;
  },

  cloneVersion: (channelCode, endpointId, versionId) => {
    const endpoint = get().getEndpoints(channelCode).find((item) => item.id === endpointId);
    const source = endpoint?.versions.find((version) => version.id === versionId);
    if (!endpoint || !source || endpoint.versions.some((version) => version.configStatus === 'draft')) return null;
    const clone: CapabilityDecisionVersion = { ...structuredClone(source), id: `decision_${Date.now()}`, version: nextPatchVersion(endpoint.versions[0].version), configStatus: 'draft', badges: [], updatedTime: new Date().toLocaleString() };
    set((state) => ({
      endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((item) => item.id === endpointId ? { ...item, versions: [clone, ...item.versions] } : item) },
      dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
    }));
    return clone;
  },

  deployVersion: (channelCode, endpointId, versionId) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.id === endpointId ? {
        ...endpoint,
        versions: endpoint.versions.map((version) => version.id === versionId ? { ...version, configStatus: 'published', badges: [{ cloud: 'BD', env: 'DAILY' }] } : version),
      } : endpoint),
    },
  })),

  deleteVersion: (channelCode, endpointId, versionId) => set((state) => ({
    endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.id === endpointId ? { ...endpoint, versions: endpoint.versions.filter((version) => version.id !== versionId) } : endpoint) },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  deleteEndpoint: (channelCode, endpointId) => set((state) => ({
    endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: (state.endpointsByChannel[channelCode] ?? []).filter((endpoint) => endpoint.id !== endpointId) },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  saveChannel: (channelCode) => set((state) => ({
    savedEndpointsByChannel: { ...state.savedEndpointsByChannel, [channelCode]: structuredClone(state.endpointsByChannel[channelCode] ?? []) },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
  })),

  submitVersion: (channelCode, endpointId, versionId) => set((state) => {
    const submitted = (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.id === endpointId ? {
      ...endpoint,
      versions: endpoint.versions.map((version) => version.id === versionId ? { ...version, configStatus: 'submitted' as const, updatedTime: new Date().toLocaleString() } : version),
    } : endpoint);
    return {
      endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: submitted },
      savedEndpointsByChannel: { ...state.savedEndpointsByChannel, [channelCode]: structuredClone(submitted) },
      dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
    };
  }),

  discardChannel: (channelCode) => set((state) => ({
    endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: structuredClone(state.savedEndpointsByChannel[channelCode] ?? []) },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: false },
  })),
}));
