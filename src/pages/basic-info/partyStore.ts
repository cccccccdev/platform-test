import { create } from 'zustand';

/**
 * Backend alignment note (demo projection only):
 * internal / external parties live in ONE table and are distinguished by a
 * `type` tag. The demo keeps the same shape so the future PRD can rely on
 * "single table + tag" instead of two separate entities.
 */
export type PartyType = 'internalParty' | 'externalParty';

export const PARTY_TYPE_LABEL: Record<PartyType, string> = {
  internalParty: 'Internal Party',
  externalParty: 'External Party',
};

export interface PartyRecord {
  /** Party code. Internal = uppercase letters + underscore only. External = digits allowed too. */
  code: string;
  officialName: string;
  type: PartyType;
  operator: string;
  operationTime: string;
}

interface PartyStore {
  parties: PartyRecord[];
  addParty: (party: Omit<PartyRecord, 'operator' | 'operationTime'>) => void;
}

// Mirrors the existing production list so the demo starts from a familiar state.
const DEMO_INTERNAL_PARTIES: PartyRecord[] = [
  { code: 'PALMPAY', officialName: '', type: 'internalParty', operator: 'Bailly', operationTime: '2025-08-07 05:43:41' },
  { code: 'JUPITER', officialName: '', type: 'internalParty', operator: 'Bailly', operationTime: '2025-08-07 06:25:43' },
  { code: 'FLEXIBANK', officialName: '', type: 'internalParty', operator: 'System', operationTime: '2025-01-20 06:45:41' },
  { code: 'FLEXI', officialName: '', type: 'internalParty', operator: 'Bailly', operationTime: '2025-08-07 10:01:05' },
  { code: 'CHETONA', officialName: '', type: 'internalParty', operator: 'Bailly', operationTime: '2025-08-07 10:01:09' },
  { code: 'BLOOMS', officialName: '', type: 'internalParty', operator: 'Bailly', operationTime: '2025-08-07 10:01:14' },
  { code: 'ONELOOP', officialName: 'ONELOOP (PTE.) LIMITED', type: 'internalParty', operator: 'Bailly', operationTime: '2025-08-07 11:13:28' },
  { code: 'PALMPAYHK', officialName: '', type: 'internalParty', operator: 'Burmy 管秉钰', operationTime: '2025-09-03 03:46:32' },
  { code: 'PALMPAYBD', officialName: '', type: 'internalParty', operator: '冯启航 Felix', operationTime: '2025-10-16 11:03:11' },
  { code: 'TMUL', officialName: '', type: 'internalParty', operator: '王捷 Jie', operationTime: '2025-11-21 09:35:47' },
];

// External parties are third-party organisations; their IDs are allowed to carry digits.
const DEMO_EXTERNAL_PARTIES: PartyRecord[] = [
  { code: 'O1234', officialName: 'Onafriq Ltd', type: 'externalParty', operator: 'Bailly', operationTime: '2026-09-02 10:00:00' },
  { code: 'H8899', officialName: 'HashKey Exchange', type: 'externalParty', operator: 'Rick', operationTime: '2026-09-08 14:30:00' },
  { code: 'A5501', officialName: 'AICAPAY', type: 'externalParty', operator: 'Abe', operationTime: '2026-09-11 16:05:00' },
];

function formatOperationTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export const usePartyStore = create<PartyStore>((set) => ({
  parties: [...DEMO_INTERNAL_PARTIES, ...DEMO_EXTERNAL_PARTIES],
  addParty: (party) => set((state) => ({
    parties: [...state.parties, {
      ...party,
      operator: 'Current User',
      operationTime: formatOperationTime(),
    }],
  })),
}));
