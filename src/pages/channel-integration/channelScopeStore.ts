import { create } from 'zustand';
import { mockCredentials } from '../../mock/data';

export type AuthType = 'basic' | 'bearer' | 'custom' | 'oauth2';

export interface CredentialItem {
  id: string;
  key: string;
  description?: string;
}

export interface AuthConfig {
  id: string;
  name: string;
  type: AuthType;
  version: number;
  credentials?: Record<string, string>;
  operator: string;
  operationTime: string;
}

const seedCredentials = (): Record<string, CredentialItem[]> =>
  structuredClone(mockCredentials) as Record<string, CredentialItem[]>;

interface ChannelScopeStore {
  credentialsByChannel: Record<string, CredentialItem[]>;
  authenticationsByChannel: Record<string, AuthConfig[]>;
  addCredential: (channelCode: string, credential: CredentialItem) => void;
  updateCredential: (channelCode: string, id: string, updates: Partial<CredentialItem>) => void;
  deleteCredential: (channelCode: string, id: string) => { success: boolean; message?: string };
  addAuthentication: (channelCode: string, auth: AuthConfig) => void;
  updateAuthentication: (channelCode: string, id: string, updates: Partial<AuthConfig>) => void;
  removeAuthentication: (channelCode: string, id: string) => void;
  getCredentials: (channelCode: string) => CredentialItem[];
  getAuthentications: (channelCode: string) => AuthConfig[];
}

export const useChannelScopeStore = create<ChannelScopeStore>((set, get) => ({
  credentialsByChannel: seedCredentials(),
  authenticationsByChannel: {},

  addCredential: (channelCode, credential) => set((state) => ({
    credentialsByChannel: {
      ...state.credentialsByChannel,
      [channelCode]: [...(state.credentialsByChannel[channelCode] ?? []), credential],
    },
  })),

  updateCredential: (channelCode, id, updates) => set((state) => ({
    credentialsByChannel: {
      ...state.credentialsByChannel,
      [channelCode]: (state.credentialsByChannel[channelCode] ?? []).map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    },
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
        a.id === id ? { ...a, ...updates, version: a.version + 1 } : a
      ),
    },
  })),

  removeAuthentication: (channelCode, id) => set((state) => ({
    authenticationsByChannel: {
      ...state.authenticationsByChannel,
      [channelCode]: (state.authenticationsByChannel[channelCode] ?? []).filter((a) => a.id !== id),
    },
  })),

  getCredentials: (channelCode) => get().credentialsByChannel[channelCode] ?? [],
  getAuthentications: (channelCode) => get().authenticationsByChannel[channelCode] ?? [],
}));
