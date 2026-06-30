import { create } from 'zustand';
import { mockCredentials } from '../../mock/data';

export type AuthType = 'basic' | 'bearer' | 'custom' | 'oauth2';

export interface CredentialItem {
  id: string;
  key: string;
  description?: string;
}

export interface VariableItem {
  id: string;
  name: string;
  value: string;
}

export interface AuthConfig {
  id: string;
  name: string;
  type: AuthType;
  version: string;
  credentials?: Record<string, string>;
  operator: string;
  operationTime: string;
}

const seedCredentials = (): Record<string, CredentialItem[]> =>
  structuredClone(mockCredentials) as Record<string, CredentialItem[]>;

interface ChannelScopeStore {
  credentialsByChannel: Record<string, CredentialItem[]>;
  credentialVersionByChannel: Record<string, string>;
  globalVariablesByChannel: Record<string, VariableItem[]>;
  globalVariableVersionByChannel: Record<string, string>;
  orderVariablesByChannel: Record<string, VariableItem[]>;
  orderVariableVersionByChannel: Record<string, string>;
  authenticationsByChannel: Record<string, AuthConfig[]>;
  addCredential: (channelCode: string, credential: CredentialItem) => void;
  updateCredential: (channelCode: string, id: string, updates: Partial<CredentialItem>) => void;
  deleteCredential: (channelCode: string, id: string) => { success: boolean; message?: string };
  addAuthentication: (channelCode: string, auth: AuthConfig) => void;
  updateAuthentication: (channelCode: string, id: string, updates: Partial<AuthConfig>) => void;
  removeAuthentication: (channelCode: string, id: string) => void;
  addGlobalVariable: (channelCode: string, variable: VariableItem) => void;
  updateGlobalVariableValue: (channelCode: string, variableId: string, value: string) => void;
  addOrderVariable: (channelCode: string, variable: VariableItem) => void;
  getCredentials: (channelCode: string) => CredentialItem[];
  getAuthentications: (channelCode: string) => AuthConfig[];
}

export const timestampVersion = () => {
  const date = new Date();
  const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('');
};

export const useChannelScopeStore = create<ChannelScopeStore>((set, get) => ({
  credentialsByChannel: seedCredentials(),
  credentialVersionByChannel: { GTB_NG: '20260628111000', ZENITH_NG: '20260628111000', PAYSTACK_NG: '20260628111000' },
  globalVariablesByChannel: { GTB_NG: [], ZENITH_NG: [], PAYSTACK_NG: [] },
  globalVariableVersionByChannel: { GTB_NG: '20260628110000', ZENITH_NG: '20260628110000', PAYSTACK_NG: '20260628110000' },
  orderVariablesByChannel: {
    GTB_NG: [{ id: 'order_request_reference', name: 'requestReference', value: '{{order.requestReference}}' }],
    ZENITH_NG: [],
    PAYSTACK_NG: [],
  },
  orderVariableVersionByChannel: { GTB_NG: '20260628110500', ZENITH_NG: '20260628110500', PAYSTACK_NG: '20260628110500' },
  authenticationsByChannel: {},

  addCredential: (channelCode, credential) => set((state) => ({
    credentialsByChannel: {
      ...state.credentialsByChannel,
      [channelCode]: [...(state.credentialsByChannel[channelCode] ?? []), credential],
    },
    credentialVersionByChannel: { ...state.credentialVersionByChannel, [channelCode]: timestampVersion() },
  })),

  updateCredential: (channelCode, id, updates) => set((state) => ({
    credentialsByChannel: {
      ...state.credentialsByChannel,
      [channelCode]: (state.credentialsByChannel[channelCode] ?? []).map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    },
    credentialVersionByChannel: { ...state.credentialVersionByChannel, [channelCode]: timestampVersion() },
  })),

  deleteCredential: (_channelCode, _id) => {
    return { success: true };
  },

  addAuthentication: (channelCode, auth) => set((state) => ({
    authenticationsByChannel: {
      ...state.authenticationsByChannel,
      [channelCode]: [...(state.authenticationsByChannel[channelCode] ?? []), auth],
    },
  })),

  updateAuthentication: (channelCode, id, updates) => set((state) => ({
    authenticationsByChannel: {
      ...state.authenticationsByChannel,
      [channelCode]: (state.authenticationsByChannel[channelCode] ?? []).map((a) =>
        a.id === id ? { ...a, ...updates, version: timestampVersion() } : a
      ),
    },
  })),

  removeAuthentication: (channelCode, id) => set((state) => ({
    authenticationsByChannel: {
      ...state.authenticationsByChannel,
      [channelCode]: (state.authenticationsByChannel[channelCode] ?? []).filter((a) => a.id !== id),
    },
  })),

  addGlobalVariable: (channelCode, variable) => set((state) => ({
    globalVariablesByChannel: {
      ...state.globalVariablesByChannel,
      [channelCode]: [...(state.globalVariablesByChannel[channelCode] ?? []), variable],
    },
    globalVariableVersionByChannel: { ...state.globalVariableVersionByChannel, [channelCode]: timestampVersion() },
  })),

  updateGlobalVariableValue: (channelCode, variableId, value) => set((state) => ({
    globalVariablesByChannel: {
      ...state.globalVariablesByChannel,
      [channelCode]: (state.globalVariablesByChannel[channelCode] ?? []).map((variable) =>
        variable.id === variableId ? { ...variable, value } : variable
      ),
    },
    globalVariableVersionByChannel: { ...state.globalVariableVersionByChannel, [channelCode]: timestampVersion() },
  })),

  addOrderVariable: (channelCode, variable) => set((state) => ({
    orderVariablesByChannel: {
      ...state.orderVariablesByChannel,
      [channelCode]: [...(state.orderVariablesByChannel[channelCode] ?? []), variable],
    },
    orderVariableVersionByChannel: { ...state.orderVariableVersionByChannel, [channelCode]: timestampVersion() },
  })),

  getCredentials: (channelCode) => get().credentialsByChannel[channelCode] ?? [],
  getAuthentications: (channelCode) => get().authenticationsByChannel[channelCode] ?? [],
}));
