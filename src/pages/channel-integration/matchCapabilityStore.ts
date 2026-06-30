import { create } from 'zustand';
import { mockInboundEndpointsByChannel } from '../../mock/data';
import type { CapabilityDecisionVersion, InboundEndpoint } from './types';

const timestampVersion = () => {
  const date = new Date();
  const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('');
};

const statusFromBadges = (badges: Array<{ cloud: string; env: string }>): CapabilityDecisionVersion['configStatus'] => {
  if (badges.some((badge) => badge.env === 'PROD')) return 'PROD';
  if (badges.some((badge) => badge.env === 'PRE')) return 'PRE';
  if (badges.some((badge) => badge.env === 'DAILY')) return 'DAILY';
  return 'DRAFT';
};

export const nextMatchingId = (endpointsByChannel: Record<string, InboundEndpoint[]>): string => {
  const currentMax = Object.values(endpointsByChannel)
    .flatMap((endpoints) => endpoints)
    .flatMap((endpoint) => endpoint.versions ?? [])
    .reduce((max, version) => {
      const numericId = Number(version.id);
      return Number.isInteger(numericId) ? Math.max(max, numericId) : max;
    }, 24);
  return String(currentMax + 1);
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
    name: endpoint.name.slice(0, 32),
    sourceType: endpoint.uriType === 'legacy' ? 'legacy' : 'v2',
    configStatus: endpoint.configStatus,
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
    deploymentRecords: (endpoint.badges ?? []).map((badge) => ({
      ...badge,
      version: endpoint.version,
      operator: endpoint.operator ?? 'admin',
      operationTime: endpoint.updatedTime ?? '-',
    })),
    updatedTime: endpoint.updatedTime,
    operator: endpoint.operator,
    legacyComponents: endpoint.uriType === 'legacy' ? [
      { id: 'legacy_parse', code: 'parseServletRequest', name: 'Parse Servlet Request', config: { messageFormat: 'JSON', parseQuery: true } },
      { id: 'legacy_credential', code: 'loadCredential', name: 'Load Credential', config: { credential: 'Primary Credential' } },
      { id: 'legacy_global', code: 'loadGlobalVariable', name: 'Load Global Variable', config: { scope: 'Channel' } },
      { id: 'legacy_match', code: 'matchCapability', name: 'Match Capability', config: { callbackTypeModel: 'Custom', script: 'return capability' } },
      { id: 'legacy_callback_request', code: 'callbackRequest', name: 'Callback Request', config: { requestFormat: 'JSON', timeout: '3000' } },
      { id: 'legacy_rrn', code: 'generateRrn', name: 'Generate RRN', config: { prefix: 'RRN', length: '12' } },
      { id: 'legacy_outer_inner', code: 'institutionOuter2Inner', name: 'Institution Outer to Inner', config: { mappingProfile: 'DEFAULT_INBOUND' } },
      { id: 'legacy_init_order', code: 'initOrder', name: 'Initialize Order', config: { orderType: 'CALLBACK', initializeState: true } },
      { id: 'legacy_notification', code: 'messageNotification', name: 'Message Notification', config: { topic: 'CHANNEL_CALLBACK', enabled: true } },
      { id: 'legacy_response_code', code: 'responseCodeInner2Outer', name: 'Response Code Inner to Outer', config: { mappingSet: 'DEFAULT_RESPONSE_CODE' } },
      { id: 'legacy_event_listener', code: 'eventListener', name: 'Event Listener', config: { event: 'CALLBACK_COMPLETED' } },
      { id: 'legacy_callback_response', code: 'callbackResponse', name: 'Callback Response', config: { responseFormat: 'JSON', statusCode: '200' } },
      { id: 'legacy_write_response', code: 'writeServletResponse', name: 'Write Servlet Response', config: { contentType: 'application/json' } },
      { id: 'legacy_async_flow', code: 'asyncExecuteFlow', name: 'Async Execute Forward Flow', config: { forwardFlowId: '371', executionMode: 'ASYNC' } },
    ] : undefined,
  };
};

const cloneSeedData = (): Record<string, InboundEndpoint[]> => {
  const raw = structuredClone(mockInboundEndpointsByChannel) as unknown as Record<string, InboundEndpoint[]>;
  let matchingId = 25;
  return Object.fromEntries(Object.entries(raw).map(([channel, endpoints]) => [channel, endpoints.map((endpoint) => {
    const seedVersion = { ...legacyVersionFromEndpoint(endpoint), id: String(matchingId++) };
    const versions = endpoint.versions?.length
      ? endpoint.versions
      : endpoint.uriType === 'legacy'
        ? [
            { ...seedVersion, version: '20260322024417', name: 'Legacy Callback PROD', configStatus: 'PROD' as const, badges: [{ cloud: 'ALIYUN', env: 'DAILY' }, { cloud: 'ALIYUN', env: 'PRE' }, { cloud: 'ALIYUN', env: 'PROD' }] },
            { ...structuredClone(seedVersion), id: String(matchingId++), version: '20260122035216', name: 'Legacy Callback Draft', configStatus: 'DRAFT' as const, badges: [] },
          ]
        : [seedVersion];
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
  createVersion: (channelCode: string, endpointId: string, name: string, businessType?: string) => CapabilityDecisionVersion | null;
  cloneVersion: (channelCode: string, endpointId: string, versionId: string) => CapabilityDecisionVersion | null;
  deployVersion: (channelCode: string, endpointId: string, versionId: string, cloud: string, env: string) => void;
  discardVersionDraft: (channelCode: string, endpointId: string, versionId: string) => void;
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
        versions: endpoint.versions.map((version) => {
          if (version.id !== versionId) return version;
          const tracksDraft = version.configStatus !== 'DRAFT';
          const baseline = tracksDraft && !version.draftBaseline
            ? JSON.stringify({ ...version, hasUnsubmittedDraft: false, draftBaseline: undefined })
            : version.draftBaseline;
          return {
            ...version,
            ...updates,
            configStatus: version.configStatus,
            hasUnsubmittedDraft: tracksDraft ? true : version.hasUnsubmittedDraft,
            draftBaseline: baseline,
            updatedTime: new Date().toLocaleString(),
          };
        }),
      } : endpoint),
    },
    dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
  })),

  createVersion: (channelCode, endpointId, name, businessType) => {
    const endpoint = get().getEndpoints(channelCode).find((item) => item.id === endpointId);
    if (!endpoint) return null;
    const source = endpoint.versions[0];
    const matchingId = nextMatchingId(get().endpointsByChannel);
    const version: CapabilityDecisionVersion = source.sourceType === 'legacy' ? {
      id: matchingId,
      version: timestampVersion(),
      name: name.trim().slice(0, 32),
      sourceType: 'v2',
      configStatus: 'DRAFT',
      fields: [],
      requestFields: [],
      matchType: 'single',
      singleNoField: '',
      matchFields: [],
      rules: [{ id: `result_${Date.now()}`, fieldValues: {}, bt: businessType ?? endpoint.businessTypes.find(Boolean) ?? '', ability: '', action: '' }],
      customScript: 'def execute(request) {\n  return null\n}',
      fallbackBehavior: 'alert_and_reject',
      decryptEnabled: false,
      badges: [],
      hasUnsubmittedDraft: false,
      updatedTime: new Date().toLocaleString(),
      operator: 'admin',
    } : {
      ...structuredClone(source),
      id: matchingId,
      version: timestampVersion(),
      name: name.trim().slice(0, 32),
      sourceType: 'v2',
      configStatus: 'DRAFT',
      badges: [],
      hasUnsubmittedDraft: false,
      draftBaseline: undefined,
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
    if (!endpoint || !source || source.sourceType === 'legacy') return null;
    const clone: CapabilityDecisionVersion = {
      ...structuredClone(source),
      id: nextMatchingId(get().endpointsByChannel),
      version: timestampVersion(),
      name: `${source.name} Copy`.slice(0, 32),
      configStatus: 'DRAFT',
      badges: [],
      hasUnsubmittedDraft: false,
      draftBaseline: undefined,
      updatedTime: new Date().toLocaleString(),
    };
    set((state) => ({
      endpointsByChannel: { ...state.endpointsByChannel, [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((item) => item.id === endpointId ? { ...item, versions: [clone, ...item.versions] } : item) },
      dirtyByChannel: { ...state.dirtyByChannel, [channelCode]: true },
    }));
    return clone;
  },

  deployVersion: (channelCode, endpointId, versionId, cloud, env) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.id === endpointId ? {
        ...endpoint,
        versions: endpoint.versions.map((version) => {
          if (version.id !== versionId) return version;
          const badges = version.badges?.some((badge) => badge.cloud === cloud && badge.env === env)
            ? version.badges
            : [...(version.badges ?? []), { cloud, env }];
          return {
            ...version,
            configStatus: statusFromBadges(badges),
            badges,
            deploymentRecords: [
              ...(version.deploymentRecords ?? []),
              { cloud, env, version: version.version, operator: 'admin', operationTime: new Date().toLocaleString() },
            ],
            updatedTime: new Date().toLocaleString(),
          };
        }),
      } : endpoint),
    },
  })),

  discardVersionDraft: (channelCode, endpointId, versionId) => set((state) => ({
    endpointsByChannel: {
      ...state.endpointsByChannel,
      [channelCode]: (state.endpointsByChannel[channelCode] ?? []).map((endpoint) => endpoint.id === endpointId ? {
        ...endpoint,
        versions: endpoint.versions.map((version) => {
          if (version.id !== versionId || !version.draftBaseline) return version;
          const restored = JSON.parse(version.draftBaseline) as CapabilityDecisionVersion;
          return { ...restored, hasUnsubmittedDraft: false, draftBaseline: undefined };
        }),
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
      versions: endpoint.versions.map((version) => version.id === versionId ? {
        ...version,
        version: version.configStatus === 'DRAFT' ? version.version : timestampVersion(),
        configStatus: 'DRAFT' as const,
        badges: version.configStatus === 'DRAFT' ? version.badges : [],
        hasUnsubmittedDraft: false,
        draftBaseline: undefined,
        updatedTime: new Date().toLocaleString(),
      } : version),
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
