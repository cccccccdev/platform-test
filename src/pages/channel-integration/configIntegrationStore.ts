import { create } from 'zustand';
import type { ConfigAbility, EnvType, FlowConfig, FlowVersion } from './types';

const now = () => new Date().toLocaleString();

const seedAbilities: Record<string, ConfigAbility[]> = {
  GTB_NG: [
    {
      bt: 'COLLECTION',
      ability: 'CARD_PAY',
      stateMachine: 'Default_Refund_StateMachine',
      versions: [
        {
          id: 'gtb_card_v1',
          version: 'v1.0.0',
          publishStatus: 'published',
          badges: [{ cloud: 'BD', env: 'DAILY' }, { cloud: 'ALIYUN', env: 'PROD' }],
          remark: 'Initial version for card payment collection',
          operator: 'admin',
          operationTime: '2026-06-01 10:30:00',
          flows: [
            {
              id: 'flow_card_transaction',
              name: 'CARD_TRANSACTION',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              triggerEvents: ['TRANSACTION'],
              isConfigured: true,
            },
            {
              id: 'flow_card_callback',
              name: 'CARD_CALLBACK',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              triggerEvents: ['TRANSACTION'],
              isConfigured: true,
            },
          ],
        },
        {
          id: 'gtb_card_v2',
          version: 'v1.1.0',
          publishStatus: 'submitted',
          badges: [],
          remark: 'Add timeout handling',
          operator: 'admin',
          operationTime: '2026-06-05 14:20:00',
          flows: [],
        },
      ],
    },
    {
      bt: 'COLLECTION',
      ability: 'USSD_PAY',
      stateMachine: 'BankCard_Debit_StateMachine',
      versions: [
        {
          id: 'gtb_ussd_v1',
          version: 'v0.0.1',
          publishStatus: 'draft',
          badges: [],
          remark: '',
          operator: 'admin',
          operationTime: '2026-06-06 09:00:00',
          flows: [],
        },
      ],
    },
    {
      bt: 'DISBURSEMENT',
      ability: 'BANK_TRF',
      stateMachine: 'Default_Refund_StateMachine',
      versions: [
        {
          id: 'gtb_bank_v1',
          version: 'v0.9.0',
          publishStatus: 'published',
          badges: [{ cloud: 'ONELOOP', env: 'PROD' }],
          remark: 'Bank transfer disbursement - beta',
          operator: 'admin',
          operationTime: '2026-05-28 16:45:00',
          flows: [],
        },
      ],
    },
  ],
  ZENITH_NG: [],
  PAYSTACK_NG: [],
};

const cloneSeed = () => structuredClone(seedAbilities);

const nextVersion = (versions: FlowVersion[]) => {
  const maxPatch = versions.reduce((max, item) => {
    const match = /^v0\.0\.(\d+)$/.exec(item.version);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `v0.0.${maxPatch + 1}`;
};

interface ConfigIntegrationStore {
  abilitiesByChannel: Record<string, ConfigAbility[]>;
  addAbility: (channelCode: string, ability: ConfigAbility) => void;
  createVersion: (channelCode: string, bt: string, ability: string) => FlowVersion | null;
  updateVersion: (
    channelCode: string,
    bt: string,
    ability: string,
    versionId: string,
    updates: Partial<FlowVersion>
  ) => void;
  deleteVersion: (channelCode: string, bt: string, ability: string, versionId: string) => void;
  cloneVersion: (channelCode: string, bt: string, ability: string, versionId: string) => FlowVersion | null;
  deployVersion: (channelCode: string, bt: string, ability: string, versionId: string) => EnvType | null;
  addFlow: (channelCode: string, bt: string, ability: string, versionId: string, flow: FlowConfig) => void;
  updateFlow: (
    channelCode: string,
    bt: string,
    ability: string,
    versionId: string,
    flowId: string,
    updates: Partial<FlowConfig>
  ) => void;
}

export const useConfigIntegrationStore = create<ConfigIntegrationStore>((set, get) => ({
  abilitiesByChannel: cloneSeed(),

  addAbility: (channelCode, ability) => set((state) => ({
    abilitiesByChannel: {
      ...state.abilitiesByChannel,
      [channelCode]: [ability, ...(state.abilitiesByChannel[channelCode] ?? [])],
    },
  })),

  createVersion: (channelCode, bt, abilityCode) => {
    const ability = (get().abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    if (!ability || ability.versions.some((version) => version.publishStatus === 'draft')) return null;
    const version: FlowVersion = {
      id: `version_${Date.now()}`,
      version: nextVersion(ability.versions),
      publishStatus: 'draft',
      badges: [],
      remark: '',
      operator: 'admin',
      operationTime: now(),
      flows: [],
    };
    set((state) => ({
      abilitiesByChannel: {
        ...state.abilitiesByChannel,
        [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
          item.bt === bt && item.ability === abilityCode
            ? { ...item, versions: [version, ...item.versions] }
            : item
        ),
      },
    }));
    return version;
  },

  updateVersion: (channelCode, bt, abilityCode, versionId, updates) => set((state) => ({
    abilitiesByChannel: {
      ...state.abilitiesByChannel,
      [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
        item.bt === bt && item.ability === abilityCode
          ? {
              ...item,
              versions: item.versions.map((version) =>
                version.id === versionId
                  ? { ...version, ...updates, operationTime: now() }
                  : version
              ),
            }
          : item
      ),
    },
  })),

  deleteVersion: (channelCode, bt, abilityCode, versionId) => set((state) => ({
    abilitiesByChannel: {
      ...state.abilitiesByChannel,
      [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
        item.bt === bt && item.ability === abilityCode
          ? { ...item, versions: item.versions.filter((version) => version.id !== versionId) }
          : item
      ),
    },
  })),

  cloneVersion: (channelCode, bt, abilityCode, versionId) => {
    const ability = (get().abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    const source = ability?.versions.find((version) => version.id === versionId);
    if (!ability || !source || ability.versions.some((version) => version.publishStatus === 'draft')) return null;
    const clone: FlowVersion = {
      ...structuredClone(source),
      id: `version_${Date.now()}`,
      version: nextVersion(ability.versions),
      publishStatus: 'draft',
      badges: [],
      operator: 'admin',
      operationTime: now(),
    };
    set((state) => ({
      abilitiesByChannel: {
        ...state.abilitiesByChannel,
        [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
          item.bt === bt && item.ability === abilityCode
            ? { ...item, versions: [clone, ...item.versions] }
            : item
        ),
      },
    }));
    return clone;
  },

  deployVersion: (channelCode, bt, abilityCode, versionId) => {
    const ability = (get().abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    const version = ability?.versions.find((item) => item.id === versionId);
    if (!version || version.publishStatus === 'draft') return null;
    const existing = version.badges.filter((badge) => badge.cloud === 'BD').map((badge) => badge.env);
    const target: EnvType = !existing.includes('DAILY')
      ? 'DAILY'
      : !existing.includes('PRE')
        ? 'PRE'
        : 'PROD';
    const badges = version.badges.some((badge) => badge.cloud === 'BD' && badge.env === target)
      ? version.badges
      : [...version.badges, { cloud: 'BD' as const, env: target }];
    get().updateVersion(channelCode, bt, abilityCode, versionId, {
      publishStatus: 'published',
      badges,
    });
    return target;
  },

  addFlow: (channelCode, bt, abilityCode, versionId, flow) => {
    const ability = (get().abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    const version = ability?.versions.find((item) => item.id === versionId);
    if (!version) return;
    get().updateVersion(channelCode, bt, abilityCode, versionId, {
      publishStatus: 'draft',
      badges: [],
      flows: [...version.flows, flow],
    });
  },

  updateFlow: (channelCode, bt, abilityCode, versionId, flowId, updates) => {
    const ability = (get().abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    const version = ability?.versions.find((item) => item.id === versionId);
    if (!version) return;
    get().updateVersion(channelCode, bt, abilityCode, versionId, {
      publishStatus: 'draft',
      badges: [],
      flows: version.flows.map((flow) => flow.id === flowId ? { ...flow, ...updates } : flow),
    });
  },
}));
