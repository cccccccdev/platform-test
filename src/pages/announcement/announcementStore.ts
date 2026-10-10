import { create } from 'zustand';
import type { AnnouncementDraft, AnnouncementKind, IterationAnnouncement, SystemAnnouncement } from './types';

const CURRENT_USER = '我爱北京天安门';

function operationTimeNow() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function dayOffset(base: string, days: number) {
  const date = new Date(base.replace(/-/g, '/'));
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBeforeNow(days: number) {
  return dayOffset(operationTimeNow(), -days);
}

const systemSeeds: SystemAnnouncement[] = [
  {
    id: 'SYS-2026-0031',
    kind: 'system',
    title: 'Access Platform production environment maintenance window',
    content: [
      '## Scope',
      '',
      'The Access Platform will be unavailable for **scheduled maintenance** while the runtime gateway nodes are patched.',
      '',
      '### Affected modules',
      '',
      '- Channel Integration — Flow Group publish will be blocked during the window',
      '- Channel Info — environment configuration is read-only during the window',
      '- Order Query Center — history queries remain available',
      '',
      '### What you need to do',
      '',
      '1. Finish any pending Flow Group releases **before** `2026-10-09 22:00 (GMT+8)`.',
      '2. Avoid triggering publish actions during the window; queued submissions resume automatically.',
      '3. Check the deployment board before starting urgent channel onboarding.',
      '',
      '> Orders already submitted continue to be processed during the window.',
    ].join('\n'),
    publisher: 'Platform Operations',
    publishTime: daysBeforeNow(2),
    durationDays: 7,
    expireAt: dayOffset(daysBeforeNow(2), 7),
    status: 'PUBLISHED',
  },
  {
    id: 'SYS-2026-0030',
    kind: 'system',
    title: 'Gateway node upgrade completed for the secondary cloud',
    content: [
      '## What changed',
      '',
      'The secondary cloud gateway nodes were upgraded to the latest patch release.',
      '',
      '- No configuration changes are required on your side.',
      '- Callback endpoints remain unchanged.',
      '',
      '### Verification',
      '',
      '```text',
      'Daily   : healthy',
      'PRE     : healthy',
      'PROD    : healthy',
      '```',
    ].join('\n'),
    publisher: 'Platform Operations',
    publishTime: daysBeforeNow(1),
    durationDays: 7,
    expireAt: dayOffset(daysBeforeNow(1), 7),
    status: 'PUBLISHED',
  },
  {
    id: 'SYS-2026-0029',
    kind: 'system',
    title: 'Mandatory upgrade: internal Response Code dictionary refresh',
    content: [
      '## Why this matters',
      '',
      'A new batch of internal standard response codes was merged into Basic Info. Channel-specific mapping still points at the old codes.',
      '',
      '### Action required',
      '',
      'Update the External → Internal response code mapping for these abilities before the enforcement date:',
      '',
      '| Business Type | Ability | Impact |',
      '| --- | --- | --- |',
      '| `WALLET_DEBIT` | `TRANSFER` | High |',
      '| `WALLET_CREDIT` | `TRANSFER` | High |',
      '| `PAYPAL_US` | `TRANSACTION` | Medium |',
      '',
      '```text',
      'Endpoint + BT + Ability + Channel Response Code',
      '  -> Gateway Sub State -> Main State -> PP Response Code',
      '```',
      '',
      '- Legacy codes remain readable and are mapped as aliases.',
      '- Do **not** delete existing mapping records; the platform treats consumed codes as factual contracts.',
    ].join('\n'),
    publisher: 'Platform Operations',
    publishTime: daysBeforeNow(20),
    durationDays: 7,
    expireAt: dayOffset(daysBeforeNow(20), 7),
    status: 'PUBLISHED',
  },
  {
    id: 'SYS-2026-0025',
    kind: 'system',
    title: 'Payment channel onboarding review window moved to weekly',
    content: [
      'The onboarding review meeting now runs **every Wednesday** instead of twice a week.',
      '',
      '- Submit the PRD and debug report at least one day before the slot.',
      '- Debug report must include the channel response code evidence.',
    ].join('\n'),
    publisher: 'Platform Operations',
    publishTime: daysBeforeNow(45),
    durationDays: 7,
    expireAt: dayOffset(daysBeforeNow(45), 7),
    status: 'PUBLISHED',
  },
];

const iterationSeeds: IterationAnnouncement[] = [
  {
    id: 'ITER-2-1-0',
    kind: 'iteration',
    title: 'Release 2.1.0 — Route Matching recognizes Path Variables',
    content: [
      '## What changed',
      '',
      'Route Matching now supports **single-segment path variables** so callback URLs no longer need one endpoint per channel operation.',
      '',
      '### New in this release',
      '',
      '1. `{variableName}` placeholders in the inbound path.',
      '2. Conflict detection between structurally identical templates — `/api/{sessionId}` and `/api/{requestId}` cannot coexist.',
      '3. Static segments win over variables: `/api/alex` is matched before `/api/{name}`.',
      '4. Path variables resolve into the `Path Variables` context panel automatically.',
      '',
      '### Action required',
      '',
      '> Flow resolution uses the **matched template URI** to build the route key, not the request URI carrying real variable values.',
      '',
      'Review existing callback endpoints and collapse duplicated paths where the channel contract allows it.',
    ].join('\n'),
    publisher: 'Product Team',
    publishTime: daysBeforeNow(1),
    version: '2.1.0',
    status: 'PUBLISHED',
  },
  {
    id: 'ITER-2-0-0',
    kind: 'iteration',
    title: 'Release 2.0.0 — Channel Integration rebuilt around the ability workspace',
    content: [
      '## Highlights',
      '',
      'The Channel Integration module was reorganised around `Channel + Business Type + Ability` workspaces.',
      '',
      '### Breaking changes',
      '',
      '- Flow configuration moved from the Action entry to the **Flow Group** entry.',
      '- Route Matching became a Channel-level module; inbound endpoints created before 2.0 stay visible under Metadata as legacy records.',
      '- The `network` component is **legacy only** and cannot be added to new flows; use `http`.',
      '',
      '### Enhancements',
      '',
      '- Visual Flow editing with component palette and canvas.',
      '- Gateway state machine is referenced on the ability record and locks once a flow group exists.',
      '- Release flow group version by environment: `DAILY` → `PRE` → `PROD`, no level skipping.',
    ].join('\n'),
    publisher: 'Product Team',
    publishTime: daysBeforeNow(60),
    version: '2.0.0',
    status: 'PUBLISHED',
  },
  {
    id: 'ITER-2-0-1',
    kind: 'iteration',
    title: 'Release 2.0.1 — Channel Info capability view and asset routes',
    content: [
      '## Enhancements',
      '',
      '- Channel Info capability page is now a **read-only derived view** from published flow group versions.',
      '- Asset route configuration for `STABLECOIN` on-ramp / off-ramp / pay-out.',
      '- Institution code mapping now uses `<institutionCode>#<countryCode>` across countries.',
    ].join('\n'),
    publisher: 'Product Team',
    publishTime: daysBeforeNow(35),
    version: '2.0.1',
    status: 'PUBLISHED',
  },
];

type AnnouncementState = {
  systemAnnouncements: SystemAnnouncement[];
  iterationAnnouncements: IterationAnnouncement[];
  drafts: AnnouncementDraft[];
  publishSystem: (input: { title: string; content: string; durationDays: number; publisher?: string }) => SystemAnnouncement;
  publishIteration: (input: { title: string; content: string; version: string; publisher?: string }) => IterationAnnouncement;
  saveDraft: (input: Omit<AnnouncementDraft, 'id' | 'updateTime'> & { id?: string }) => AnnouncementDraft;
  deleteDraft: (id: string) => void;
  deleteAnnouncement: (kind: AnnouncementKind, id: string) => void;
  resetDemoData: () => void;
};

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
  systemAnnouncements: systemSeeds,
  iterationAnnouncements: iterationSeeds,
  drafts: [],

  publishSystem: ({ title, content, durationDays, publisher }) => {
    const publishTime = operationTimeNow();
    const record: SystemAnnouncement = {
      id: nextId('SYS'),
      kind: 'system',
      title,
      content,
      publisher: publisher ?? CURRENT_USER,
      publishTime,
      durationDays,
      expireAt: dayOffset(publishTime, durationDays),
      status: 'PUBLISHED',
    };
    set((state) => ({ systemAnnouncements: [record, ...state.systemAnnouncements] }));
    return record;
  },

  publishIteration: ({ title, content, version, publisher }) => {
    const record: IterationAnnouncement = {
      id: nextId('ITER'),
      kind: 'iteration',
      title,
      content,
      publisher: publisher ?? CURRENT_USER,
      publishTime: operationTimeNow(),
      version,
      status: 'PUBLISHED',
    };
    set((state) => ({ iterationAnnouncements: [record, ...state.iterationAnnouncements] }));
    return record;
  },

  saveDraft: ({ id, kind, title, content, durationDays }) => {
    const existing = id ? get().drafts.find((draft) => draft.id === id) : undefined;
    const draft: AnnouncementDraft = {
      id: existing?.id ?? nextId('DRAFT'),
      kind,
      title,
      content,
      durationDays,
      updateTime: operationTimeNow(),
    };
    set((state) => ({
      drafts: existing
        ? state.drafts.map((item) => (item.id === existing.id ? draft : item))
        : [draft, ...state.drafts],
    }));
    return draft;
  },

  deleteDraft: (id) => set((state) => ({ drafts: state.drafts.filter((draft) => draft.id !== id) })),

  deleteAnnouncement: (kind, id) =>
    set((state) =>
      kind === 'system'
        ? { systemAnnouncements: state.systemAnnouncements.filter((item) => item.id !== id) }
        : { iterationAnnouncements: state.iterationAnnouncements.filter((item) => item.id !== id) },
    ),

  resetDemoData: () => set({ systemAnnouncements: systemSeeds, iterationAnnouncements: iterationSeeds, drafts: [] }),
}));

export { CURRENT_USER };