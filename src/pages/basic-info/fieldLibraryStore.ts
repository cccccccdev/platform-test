import { create } from 'zustand';

export const FIELD_TYPES = ['String', 'Integer', 'Long', 'BigDecimal', 'Double', 'Boolean', 'Object', 'Array', 'byte[]', 'File', 'Date'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Auto-created element field name for Array typed fields (mirrors the API config schema tree _items). */
export const ARRAY_ITEM_FIELD = '_items';

export interface FieldLibrarySubField {
  name: string;
  type: FieldType;
  description: string;
  /** Recursive: Object = user-defined children; Array = the auto _items element; leaf types = []. */
  subFields: FieldLibrarySubField[];
  /** True for the auto-created Array _items element (name locked to _items, not deletable). */
  isArrayItem?: boolean;
}

export interface FieldLibraryRecord {
  key: string;
  name: string;
  type: FieldType;
  description: string;
  subFields: FieldLibrarySubField[];
  operator: string;
  operationTime: string;
}

export const initialFieldLibraryRecords: FieldLibraryRecord[] = [
  {
    key: 'mobileNumber',
    name: 'mobileNumber',
    type: 'String',
    description: 'Recipient mobile number',
    subFields: [],
    operator: 'Bailly',
    operationTime: '2026-09-12 06:27:18',
  },
  {
    key: 'amount',
    name: 'amount',
    type: 'BigDecimal',
    description: 'Transaction amount',
    subFields: [],
    operator: 'haixia.zhang',
    operationTime: '2026-09-12 06:28:40',
  },
  {
    key: 'identity',
    name: 'identity',
    type: 'Object',
    description: 'Identity information of the order',
    subFields: [
      { name: 'requestReference', type: 'String', description: 'Upstream request reference', subFields: [] },
      { name: 'responseReference', type: 'String', description: 'Channel response reference', subFields: [] },
    ],
    operator: 'yimin.dai@palmpay-inc.com',
    operationTime: '2026-09-15 07:11:02',
  },
  {
    key: 'orderList',
    name: 'orderList',
    type: 'Array',
    description: 'List of sub-orders',
    subFields: [{ name: ARRAY_ITEM_FIELD, type: 'String', description: 'Array element', isArrayItem: true, subFields: [] }],
    operator: '冯启航 Felix',
    operationTime: '2026-09-15 07:12:33',
  },
];

// ---------------------------------------------------------------------------
// Operation log — records who changed what, with the original and new values.
// ---------------------------------------------------------------------------
export type FieldLibraryLogOperation = 'Create' | 'Modify' | 'Delete' | 'Import';

/** Demo actor applied to every in-session mutation (matches the record Operator column). */
export const CURRENT_OPERATOR = 'Current User';

export interface FieldLibraryLog {
  id: string;
  fieldName: string;
  operation: FieldLibraryLogOperation;
  /** Attribute that changed: 'Field' for create/delete/import, or 'Description' / 'Sub fields' for a modify. */
  attribute: string;
  /** Original value before the change; '—' when there was nothing before. */
  before: string;
  /** New value after the change; '—' when the field was removed. */
  after: string;
  operator: string;
  operationTime: string;
}

/** Flatten a sub-field tree into "path:type" pairs for the log's before/after value. */
export function describeSubFields(subFields: FieldLibrarySubField[]): string {
  const flat: string[] = [];
  const walk = (items: FieldLibrarySubField[], prefix: string) => {
    for (const field of items) {
      const path = prefix ? `${prefix}.${field.name}` : field.name;
      flat.push(`${path}:${field.type}`);
      if (field.subFields.length > 0) walk(field.subFields, path);
    }
  };
  walk(subFields, '');
  return flat.length ? flat.join(', ') : '—';
}

/** One-line summary of a whole field, used by Create / Delete / Import log rows. */
export function summarizeField(name: string, type: string, description: string, subFields: FieldLibrarySubField[]): string {
  const base = `${name} · ${type}${description ? ` — ${description}` : ''}`;
  return subFields.length > 0 ? `${base} (sub fields: ${describeSubFields(subFields)})` : base;
}

let seedLogSeq = 0;
function seedLogForRecord(record: FieldLibraryRecord): FieldLibraryLog {
  seedLogSeq += 1;
  return {
    id: `FL-SEED-${seedLogSeq}`,
    fieldName: record.name,
    operation: 'Create',
    attribute: 'Field',
    before: '—',
    after: summarizeField(record.name, record.type, record.description, record.subFields),
    operator: record.operator,
    operationTime: record.operationTime,
  };
}

/** Seed one "Create" log per initial record so the log is populated on first open. */
const initialFieldLibraryLogs: FieldLibraryLog[] = [...initialFieldLibraryRecords]
  .sort((a, b) => b.operationTime.localeCompare(a.operationTime))
  .map(seedLogForRecord);

interface FieldLibraryState {
  records: FieldLibraryRecord[];
  logs: FieldLibraryLog[];
  addRecord: (record: FieldLibraryRecord) => void;
  updateRecord: (record: FieldLibraryRecord) => void;
  deleteRecord: (key: string) => void;
  addLogs: (entries: FieldLibraryLog[]) => void;
}

export const useFieldLibraryStore = create<FieldLibraryState>((set) => ({
  records: initialFieldLibraryRecords,
  logs: initialFieldLibraryLogs,
  addRecord: (record) => set((state) => ({ records: [record, ...state.records] })),
  updateRecord: (record) => set((state) => ({
    records: state.records.map((item) => (item.key === record.key ? record : item)),
  })),
  deleteRecord: (key) => set((state) => ({
    records: state.records.filter((item) => item.key !== key),
  })),
  addLogs: (entries) => set((state) => ({ logs: [...entries, ...state.logs] })),
}));
