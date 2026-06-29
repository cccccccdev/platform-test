import { create } from 'zustand';
import type { ConfigAbility, EnvType, FlowConfig, FlowVersion } from './types';
import { capabilityActionOptions } from '../../mock/data';

const now = () => new Date().toLocaleString();
const timestampVersion = () => {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('');
};

const seedAbilities: Record<string, ConfigAbility[]> = {
  GTB_NG: [
    {
      bt: 'COLLECTION',
      ability: 'CARD_PAY',
      actions: capabilityActionOptions['COLLECTION:CARD_PAY'] ?? [],
      stateMachine: 'Default_Refund_StateMachine',
      versions: [
        {
          id: 'gtb_card_v1',
          version: '20260601103000',
          publishStatus: 'deployed',
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
              canvasNodes: [
                { id: 'out_1', componentCode: 'initOutboundOrder', x: 320, y: 40, status: 'complete' },
                { id: 'out_2', componentCode: 'loadCredential', x: 320, y: 150, status: 'complete' },
                { id: 'out_3', componentCode: 'loadGlobalVariable', x: 320, y: 260, status: 'complete' },
                { id: 'out_4', componentCode: 'generateRequestReference', x: 320, y: 370, status: 'complete' },
                { id: 'out_5', componentCode: 'httpCall', x: 320, y: 480, status: 'complete' },
                { id: 'out_6', componentCode: 'updateOutboundOrder', x: 320, y: 590, status: 'complete' },
                { id: 'out_7', componentCode: 'sendCompleteMQ', x: 320, y: 700, status: 'complete' },
              ],
              canvasEdges: [
                { id: 'out_e1', source: 'out_1', target: 'out_2' },
                { id: 'out_e2', source: 'out_2', target: 'out_3' },
                { id: 'out_e3', source: 'out_3', target: 'out_4' },
                { id: 'out_e4', source: 'out_4', target: 'out_5' },
                { id: 'out_e5', source: 'out_5', target: 'out_6' },
                { id: 'out_e6', source: 'out_6', target: 'out_7' },
              ],
            },
            {
              id: 'flow_card_callback',
              name: 'CARD_CALLBACK',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              triggerEvents: ['TRANSACTION'],
              inboundUriId: 'gtb_notify_endpoint',
              isConfigured: true,
              canvasNodes: [
                { id: 'in_1', componentCode: 'inboundRequest', x: 320, y: 80, status: 'complete' },
                { id: 'in_2', componentCode: 'initInboundOrder', x: 320, y: 200, status: 'complete' },
                { id: 'in_3', componentCode: 'requestBusinessAccessLayer', x: 320, y: 320, status: 'complete' },
                { id: 'in_4', componentCode: 'inboundResponse', x: 320, y: 440, status: 'complete' },
              ],
              canvasEdges: [
                { id: 'in_e1', source: 'in_1', target: 'in_2' },
                { id: 'in_e2', source: 'in_2', target: 'in_3' },
                { id: 'in_e3', source: 'in_3', target: 'in_4' },
              ],
            },
          ],
        },
        {
          id: 'gtb_card_v2',
          version: '20260605142000',
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
      actions: capabilityActionOptions['COLLECTION:USSD_PAY'] ?? [],
      stateMachine: 'BankCard_Debit_StateMachine',
      versions: [
        {
          id: 'gtb_ussd_v1',
          version: '20260606090000',
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
      actions: capabilityActionOptions['DISBURSEMENT:BANK_TRF'] ?? [],
      stateMachine: 'Default_Refund_StateMachine',
      versions: [
        {
          id: 'gtb_bank_v1',
          version: '20260528164500',
          publishStatus: 'deployed',
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
  updateAbilityActions: (
    channelCode: string,
    bt: string,
    ability: string,
    nextActions: string[]
  ) => { success: boolean; errors?: string[] };
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
      version: timestampVersion(),
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
      version: timestampVersion(),
      publishStatus: 'draft',
      badges: [],
      hasUnsubmittedDraft: false,
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
      publishStatus: 'deployed',
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
      publishStatus: version.publishStatus,
      hasUnsubmittedDraft: version.publishStatus === 'draft' ? false : true,
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
      publishStatus: version.publishStatus,
      hasUnsubmittedDraft: version.publishStatus === 'draft' ? false : true,
      flows: version.flows.map((flow) => flow.id === flowId ? { ...flow, ...updates } : flow),
    });
  },

  updateAbilityActions: (channelCode, bt, abilityCode, nextActions) => {
    const abilities = get().abilitiesByChannel[channelCode] ?? [];
    const abilityRecord = abilities.find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    if (!abilityRecord) return { success: false, errors: ['Ability not found'] };

    const currentActions = abilityRecord.actions;
    const removedActions = currentActions.filter((a) => !nextActions.includes(a));
    const allowedOptions = capabilityActionOptions[`${bt}:${abilityCode}`] ?? [];

    const errors: string[] = [];
    for (const removedAction of removedActions) {
      for (const version of abilityRecord.versions) {
        for (const flow of version.flows) {
          const refs = [
            ...(flow.triggerEvents || []),
            ...(flow.contextActions || []),
          ];
          if (refs.includes(removedAction)) {
            errors.push(
              `Action ${removedAction} cannot be removed because it is referenced by Flow ${flow.name} in Version ${version.version}.`
            );
          }
        }
      }
    }

    if (errors.length > 0) return { success: false, errors };

    const addedActions = nextActions.filter((a) => !currentActions.includes(a));
    for (const addedAction of addedActions) {
      if (!allowedOptions.includes(addedAction)) {
        return {
          success: false,
          errors: [`Action ${addedAction} is not available for ${bt}:${abilityCode}.`],
        };
      }
    }

    set((state) => ({
      abilitiesByChannel: {
        ...state.abilitiesByChannel,
        [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
          item.bt === bt && item.ability === abilityCode
            ? { ...item, actions: nextActions }
            : item
        ),
      },
    }));
    return { success: true };
  },
}));
