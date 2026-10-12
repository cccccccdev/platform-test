import { create } from 'zustand';
import { generateVersion } from './types';
import type { AnnouncementKind, AnnouncementLogEntry, IterationAnnouncement, SystemAnnouncement } from './types';
import { isExpired } from './types';

const CURRENT_USER = '我爱北京天安门';

function now() {
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

function daysAgo(days: number) {
  return dayOffset(now(), -days);
}

function makeSystem(input: { title: string; durationDays: number; status: 'PUBLISHED' | 'OFFLINE'; publishTime: string }): SystemAnnouncement {
  return {
    id: `SYS-${input.publishTime.replace(/\D/g, '').slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'system',
    title: input.title,
    publisher: CURRENT_USER,
    createTime: input.publishTime,
    publishTime: input.status === 'PUBLISHED' ? input.publishTime : '',
    offlineTime: '',
    durationDays: input.durationDays,
    expireAt: input.status === 'PUBLISHED' ? dayOffset(input.publishTime, input.durationDays) : '',
    status: input.status,
  };
}

const systemSeeds: SystemAnnouncement[] = [
  makeSystem({ title: 'Access Platform production environment maintenance window', durationDays: 7, status: 'PUBLISHED', publishTime: daysAgo(2) }),
  makeSystem({ title: 'Gateway node upgrade completed for the secondary cloud', durationDays: 7, status: 'PUBLISHED', publishTime: daysAgo(1) }),
  makeSystem({ title: 'Mandatory upgrade: internal Response Code dictionary refresh', durationDays: 7, status: 'PUBLISHED', publishTime: daysAgo(3) }),
  makeSystem({ title: 'Payment channel onboarding review window moved to weekly', durationDays: 7, status: 'PUBLISHED', publishTime: daysAgo(40) }),
  makeSystem({ title: 'Scheduled database maintenance this weekend', durationDays: 7, status: 'PUBLISHED', publishTime: daysAgo(10) }),
  makeSystem({ title: 'Deprecated API reminder: /v1/legacy endpoints', durationDays: 7, status: 'PUBLISHED', publishTime: daysAgo(20) }),
];

function makeIteration(input: { title: string; content: string; version: string; status: 'PUBLISHED' | 'OFFLINE'; publishTime: string }): IterationAnnouncement {
  return {
    id: `ITER-${input.version}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'iteration',
    title: input.title,
    content: input.content,
    version: input.version,
    publisher: CURRENT_USER,
    createTime: input.publishTime,
    publishTime: input.status === 'PUBLISHED' ? input.publishTime : '',
    offlineTime: '',
    status: input.status,
  };
}

const iterationSeeds: IterationAnnouncement[] = [
  makeIteration({
    title: 'Route Matching recognizes Path Variables',
    version: 'v20261011',
    status: 'PUBLISHED',
    publishTime: daysAgo(1),
    content: [
      '## What changed',
      '',
      'Route Matching now supports **single-segment path variables**, so callback URLs no longer need one endpoint per channel operation.',
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
  }),
  makeIteration({
    title: 'Flow Group list filtering and bulk actions',
    version: 'v20261011',
    status: 'PUBLISHED',
    publishTime: daysAgo(1),
    content: [
      '## Enhancements',
      '',
      '- Flow Group list supports filtering by business type, ability and status.',
      '- Bulk publish for multiple Flow Groups within the same environment.',
      '- Empty results now show an explicit empty state instead of a blank table.',
    ].join('\n'),
  }),
  makeIteration({
    title: 'Channel Info capability view and asset routes',
    version: 'v20260907',
    status: 'PUBLISHED',
    publishTime: daysAgo(35),
    content: [
      '## Enhancements',
      '',
      '- Channel Info capability page is now a **read-only derived view** from published Flow Group versions.',
      '- Asset route configuration for `STABLECOIN` on-ramp / off-ramp / pay-out.',
      '- Institution code mapping now uses `<institutionCode>#<countryCode>` across countries.',
    ].join('\n'),
  }),
  makeIteration({
    title: 'Channel Integration rebuilt around the ability workspace',
    version: 'v20260813',
    status: 'PUBLISHED',
    publishTime: daysAgo(60),
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
      '- Release Flow Group version by environment: `DAILY` → `PRE` → `PROD`, no level skipping.',
    ].join('\n'),
  }),
  makeIteration({
    title: 'Basic Info module goes live',
    version: 'v20260813',
    status: 'PUBLISHED',
    publishTime: daysAgo(62),
    content: [
      '## Highlights',
      '',
      '- Country, Currency, Institution, Institution Type and Merchant reference data are now maintained in-platform.',
      '- Reference data changes are versioned and auditable.',
    ].join('\n'),
  }),
  makeIteration({
    title: 'Initial platform release',
    version: 'v20260713',
    status: 'PUBLISHED',
    publishTime: daysAgo(90),
    content: [
      '## Highlights',
      '',
      '- First release of the Access Platform covering Channel Integration and Basic Info.',
    ].join('\n'),
  }),
];

type AnnouncementState = {
  systemAnnouncements: SystemAnnouncement[];
  iterationAnnouncements: IterationAnnouncement[];
  logs: AnnouncementLogEntry[];
  createSystem: (input: { title: string; durationDays: number }) => SystemAnnouncement;
  createIteration: (input: { title: string; content: string }) => IterationAnnouncement;
  updateSystem: (id: string, input: { title: string; durationDays: number }) => void;
  updateIteration: (id: string, input: { title: string; content: string }) => void;
  publish: (kind: AnnouncementKind, id: string) => void;
  offline: (kind: AnnouncementKind, id: string) => void;
  settleExpired: () => void;
  resetDemoData: () => void;
};

let sequence = 0;
function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now().toString().slice(-6)}${String(sequence).padStart(2, '0')}`;
}

let logSequence = 0;
function makeLog(announcementId: string, action: AnnouncementLogEntry['action']): AnnouncementLogEntry {
  logSequence += 1;
  return { id: `LOG-${Date.now().toString().slice(-6)}${logSequence}`, announcementId, action, operator: CURRENT_USER, operatedTime: now() };
}

/** 种子数据的操作日志：按公告状态倒推应有的记录 */
function seedLogs(): AnnouncementLogEntry[] {
  const entries: AnnouncementLogEntry[] = [];
  const all = [...systemSeeds, ...iterationSeeds];
  for (const item of all) {
    entries.push(makeLog(item.id, 'CREATED'));
    if (item.status !== 'PENDING') entries.push(makeLog(item.id, 'PUBLISHED'));
    if (item.status === 'OFFLINE') entries.push(makeLog(item.id, 'OFFLINED'));
  }
  return entries.sort((left, right) => right.operatedTime.localeCompare(left.operatedTime));
}

export const useAnnouncementStore = create<AnnouncementState>((set) => ({
  systemAnnouncements: systemSeeds,
  iterationAnnouncements: iterationSeeds,
  logs: seedLogs(),

  createSystem: ({ title, durationDays }) => {
    const record: SystemAnnouncement = {
      id: nextId('SYS'),
      kind: 'system',
      title,
      publisher: CURRENT_USER,
      createTime: now(),
      publishTime: '',
      offlineTime: '',
      durationDays,
      expireAt: '',
      status: 'PENDING',
    };
    set((state) => ({
      systemAnnouncements: [record, ...state.systemAnnouncements],
      logs: [makeLog(record.id, 'CREATED'), ...state.logs],
    }));
    return record;
  },

  createIteration: ({ title, content }) => {
    const record: IterationAnnouncement = {
      id: nextId('ITER'),
      kind: 'iteration',
      title,
      content,
      // 版本号在发布时生成，新增阶段为空
      version: '',
      publisher: CURRENT_USER,
      createTime: now(),
      publishTime: '',
      offlineTime: '',
      status: 'PENDING',
    };
    set((state) => ({
      iterationAnnouncements: [record, ...state.iterationAnnouncements],
      logs: [makeLog(record.id, 'CREATED'), ...state.logs],
    }));
    return record;
  },

  updateSystem: (id, { title, durationDays }) =>
    set((state) => ({
      systemAnnouncements: state.systemAnnouncements.map((item) =>
        item.id === id ? { ...item, title, durationDays } : item,
      ),
      logs: [makeLog(id, 'UPDATED'), ...state.logs],
    })),

  // 版本号不由用户维护，更新标题与正文即可
  updateIteration: (id, { title, content }) =>
    set((state) => ({
      iterationAnnouncements: state.iterationAnnouncements.map((item) =>
        item.id === id ? { ...item, title, content } : item,
      ),
      logs: [makeLog(id, 'UPDATED'), ...state.logs],
    })),

  publish: (kind, id) => {
    const timestamp = now();
    if (kind === 'system') {
      set((state) => ({
        systemAnnouncements: state.systemAnnouncements.map((item) =>
          item.id === id
            ? { ...item, status: 'PUBLISHED', publishTime: timestamp, expireAt: dayOffset(timestamp, item.durationDays) }
            : item,
        ),
        logs: [makeLog(id, 'PUBLISHED'), ...state.logs],
      }));
      return;
    }
    set((state) => ({
      iterationAnnouncements: state.iterationAnnouncements.map((item) =>
        // 版本号在发布时刻按 v+YYYYMMDD 生成，同一天发布的多条共用同一版本
        item.id === id ? { ...item, status: 'PUBLISHED', publishTime: timestamp, version: generateVersion(timestamp) } : item,
      ),
      logs: [makeLog(id, 'PUBLISHED'), ...state.logs],
    }));
  },

  offline: (kind, id) => {
    const timestamp = now();
    if (kind === 'system') {
      set((state) => ({
        systemAnnouncements: state.systemAnnouncements.map((item) =>
          item.id === id ? { ...item, status: 'OFFLINE', offlineTime: timestamp } : item,
        ),
        logs: [makeLog(id, 'OFFLINED'), ...state.logs],
      }));
      return;
    }
    set((state) => ({
      iterationAnnouncements: state.iterationAnnouncements.map((item) =>
        item.id === id ? { ...item, status: 'OFFLINE', offlineTime: timestamp } : item,
      ),
      logs: [makeLog(id, 'OFFLINED'), ...state.logs],
    }));
  },

  /** 到期的系统公告自动转为已下线；每次读取列表前调用 */
  settleExpired: () =>
    set((state) => {
      const current = new Date();
      const hasExpired = state.systemAnnouncements.some((item) => isExpired(item, current));
      if (!hasExpired) return state;
      return {
        systemAnnouncements: state.systemAnnouncements.map((item) =>
          isExpired(item, current) ? { ...item, status: 'OFFLINE', offlineTime: now() } : item,
        ),
      };
    }),

  resetDemoData: () => set({ systemAnnouncements: systemSeeds, iterationAnnouncements: iterationSeeds }),
}));

export { CURRENT_USER };
