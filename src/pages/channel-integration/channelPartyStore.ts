import { create } from 'zustand';
import { mockChannels } from '../../mock/data';
import type { PartyType } from '../basic-info/partyStore';

/**
 * Channel Integration > Channel List > Party
 * Supported parties of a channel. The selectable values come from
 * Basic Info > Party (internal / external), tagged by `type`.
 */
export interface ChannelPartyRecord {
  party: string;
  type: PartyType;
  operator: string;
  operationTime: string;
}

interface ChannelPartyStore {
  recordsByChannel: Record<string, ChannelPartyRecord[]>;
  addRecord: (
    channelCode: string,
    record: Pick<ChannelPartyRecord, 'party' | 'type'>,
  ) => void;
}

function formatOperationTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Channels already maintain their supported parties, so start from that state.
const INITIAL_RECORDS: Record<string, ChannelPartyRecord[]> = Object.fromEntries(
  mockChannels.map((channel) => [
    channel.code,
    channel.party.map((party) => ({
      party,
      // Existing supported parties are all internal parties.
      type: 'internalParty' as PartyType,
      operator: channel.operator,
      operationTime: channel.operationTime,
    })),
  ]),
);

export const useChannelPartyStore = create<ChannelPartyStore>((set) => ({
  recordsByChannel: INITIAL_RECORDS,
  addRecord: (channelCode, record) => set((state) => ({
    recordsByChannel: {
      ...state.recordsByChannel,
      [channelCode]: [
        ...(state.recordsByChannel[channelCode] ?? []),
        { ...record, operator: 'Current User', operationTime: formatOperationTime() },
      ],
    },
  })),
}));
