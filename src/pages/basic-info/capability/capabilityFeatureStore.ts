import { create } from 'zustand';

export type FeatureInputMode =
  | 'True/False'
  | 'Custom Single Select'
  | 'Custom Multiple Select'
  | 'Custom Multiple Input'
  | 'Text Input';

export interface FeatureDefinition {
  key: string;
  feature: string;
  inputMode: FeatureInputMode;
  options: string[];
  description: string;
  operationTime: string;
  operator: string;
}

export interface ChannelFeatureHistory {
  version: string;
  featureValue: string;
  operator: string;
  operationTime: string;
  approvalStatus: string;
  reason?: string;
}

export const FEATURE_OPERATION_TIME = '2008-08-08 20:08:00';
export const FEATURE_OPERATOR = '我爱北京天安门';

export const initialFeatureDefinitions: FeatureDefinition[] = [
  { key: 'auto_release', feature: 'auto_release', inputMode: 'True/False', options: [], description: 'Whether automatic release is supported after the final capture.', operationTime: FEATURE_OPERATION_TIME, operator: FEATURE_OPERATOR },
  { key: 'release_mode', feature: 'release_mode', inputMode: 'Custom Single Select', options: ['MANUAL', 'AUTO'], description: 'Default release strategy exposed to downstream consumers.', operationTime: FEATURE_OPERATION_TIME, operator: FEATURE_OPERATOR },
  { key: 'supported_capture_types', feature: 'supported_capture_types', inputMode: 'Custom Multiple Select', options: ['PARTIAL', 'FULL'], description: 'Capture modes that can participate in the release flow.', operationTime: FEATURE_OPERATION_TIME, operator: FEATURE_OPERATOR },
  { key: 'supported_card_brands', feature: 'supported_card_brands', inputMode: 'Custom Multiple Input', options: [], description: 'Free-form list of card brands supported by the channel.', operationTime: FEATURE_OPERATION_TIME, operator: FEATURE_OPERATOR },
  { key: 'release_note', feature: 'release_note', inputMode: 'Text Input', options: [], description: 'Any free-form text value that should be returned as-is.', operationTime: FEATURE_OPERATION_TIME, operator: FEATURE_OPERATOR },
];

export const channelFeatureKey = (channel: string, cloud: string, env: string, businessType: string, ability: string, feature: string) =>
  [channel, cloud, env, businessType, ability, feature].join(':');

const initialChannelValues: Record<string, string> = {
  [channelFeatureKey('NOVO42', 'ALIYUN', 'TEST', 'BANK_CARD_DEBIT', 'REFUND', 'auto_release')]: 'true',
};

interface CapabilityFeatureState {
  definitions: FeatureDefinition[];
  channelValues: Record<string, string>;
  channelHistory: Record<string, ChannelFeatureHistory[]>;
  addDefinition: (definition: FeatureDefinition) => void;
  updateDefinition: (feature: string, updates: Pick<FeatureDefinition, 'options' | 'description' | 'operationTime' | 'operator'>) => void;
  saveChannelValue: (key: string, value: string, approvalStatus: string, reason?: string) => void;
  submitChannelApproval: (key: string, value: string, reason: string) => void;
}

const historyEntry = (value: string, approvalStatus: string, reason?: string): ChannelFeatureHistory => ({
  version: String(Date.now()),
  featureValue: value,
  operator: FEATURE_OPERATOR,
  operationTime: FEATURE_OPERATION_TIME,
  approvalStatus,
  reason,
});

export const useCapabilityFeatureStore = create<CapabilityFeatureState>((set) => ({
  definitions: initialFeatureDefinitions,
  channelValues: initialChannelValues,
  channelHistory: {},
  addDefinition: (definition) => set((state) => ({ definitions: [...state.definitions, definition] })),
  updateDefinition: (feature, updates) => set((state) => ({
    definitions: state.definitions.map((definition) => definition.feature === feature ? { ...definition, ...updates } : definition),
  })),
  saveChannelValue: (key, value, approvalStatus, reason) => set((state) => ({
    channelValues: { ...state.channelValues, [key]: value },
    channelHistory: { ...state.channelHistory, [key]: [historyEntry(value, approvalStatus, reason), ...(state.channelHistory[key] ?? [])] },
  })),
  submitChannelApproval: (key, value, reason) => set((state) => ({
    channelHistory: { ...state.channelHistory, [key]: [historyEntry(value, 'Pending Approval', reason), ...(state.channelHistory[key] ?? [])] },
  })),
}));
