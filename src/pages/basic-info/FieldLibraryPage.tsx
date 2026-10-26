import { Fragment, useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, Empty, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, ExclamationCircleFilled, PlusOutlined } from '@ant-design/icons';
import {
  ARRAY_ITEM_FIELD,
  CURRENT_OPERATOR,
  FIELD_TYPES,
  describeSubFields,
  summarizeField,
  type FieldLibraryLog,
  type FieldLibraryLogOperation,
  type FieldLibraryRecord,
  type FieldLibrarySubField,
  type FieldType,
  useFieldLibraryStore,
} from './fieldLibraryStore';
import './FieldLibraryPage.css';

const { Title } = Typography;

function operationTimeNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

let fieldLogSeq = 0;
/** Build one operation-log row stamped with the current operator and time. */
function makeFieldLog(entry: { fieldName: string; operation: FieldLibraryLogOperation; attribute: string; before: string; after: string }): FieldLibraryLog {
  fieldLogSeq += 1;
  return {
    ...entry,
    id: `FL-LOG-${Date.now().toString().slice(-6)}${fieldLogSeq}`,
    operator: CURRENT_OPERATOR,
    operationTime: operationTimeNow(),
  };
}

// Field name rule aligned with the SPI / API schema tree (spiSchemaModel): the
// first character must be a letter or underscore; digits are not allowed as the
// leading character. Letters, digits and underscores are allowed afterwards.
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NAME_PATTERN_MESSAGE = 'Must start with a letter or underscore; use letters, numbers and underscores only';

const typeOptions = FIELD_TYPES.map((type) => ({ label: type, value: type }));
// The auto-created Array _items element may be any type EXCEPT Array (no nested arrays).
const arrayItemTypeOptions = FIELD_TYPES.filter((type) => type !== 'Array').map((type) => ({ label: type, value: type }));

const LOG_OPERATION_COLOR: Record<FieldLibraryLogOperation, string> = {
  Create: 'green',
  Modify: 'blue',
  Delete: 'red',
  Import: 'geekblue',
};

// ---------------------------------------------------------------------------
// Bulk import / export as JSON (no file upload in the demo: the import source is
// pasted JSON text, and the export artifact is a downloaded .json file).
// ---------------------------------------------------------------------------
function downloadJson(fileName: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Recursively project a Field Library sub field into a plain JSON object. */
function subFieldToJson(field: FieldLibrarySubField): Record<string, unknown> {
  const node: Record<string, unknown> = { name: field.name, type: field.type, description: field.description };
  if (field.subFields.length > 0) node.subFields = field.subFields.map(subFieldToJson);
  return node;
}

/** Parse a pasted JSON array of field definitions into validated records. */
function parseImportJson(raw: string, existingRoots: Set<string>): { imported: FieldLibraryRecord[]; failures: string[] } {
  const failures: string[] = [];
  const imported: FieldLibraryRecord[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { imported: [], failures: ['The pasted text is not valid JSON.'] };
  }
  if (!Array.isArray(parsed)) {
    return { imported: [], failures: ['Top-level JSON must be an array of field objects.'] };
  }
  const seen = new Set<string>();
  const build = (candidate: unknown, path: string, isRoot: boolean): FieldLibrarySubField | null => {
    if (!candidate || typeof candidate !== 'object') {
      failures.push(`${path}: each field must be an object`);
      return null;
    }
    const entry = candidate as Record<string, unknown>;
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const type = typeof entry.type === 'string' ? entry.type : '';
    const description = typeof entry.description === 'string' ? entry.description : '';
    if (!name) { failures.push(`${path || '(root)'}: "name" is required`); return null; }
    if (!FIELD_TYPES.includes(type as FieldType)) { failures.push(`${path}: unknown Type "${type || '(empty)'}"`); return null; }
    if (description.trim() === '') { failures.push(`${path}: "description" is required`); return null; }
    if (!NAME_PATTERN.test(name)) { failures.push(`${path}: name breaks the naming rule (start with a letter or underscore)`); return null; }
    if (isRoot && (seen.has(name) || existingRoots.has(name))) { failures.push(`${path}: "${name}" already exists in the field library`); return null; }
    seen.add(name);
    let subFields: FieldLibrarySubField[] = [];
    const rawSubs = Array.isArray(entry.subFields) ? entry.subFields : [];
    if (type === 'Object') {
      const children = rawSubs
        .map((sub, index) => build(sub, `${path || '(root)'}.${index + 1}`, false))
        .filter((node): node is FieldLibrarySubField => node !== null);
      const real = children.filter((child) => !child.isArrayItem);
      if (real.length === 0) { failures.push(`${path}: every Object must declare at least one sub field`); return null; }
      subFields = children;
    } else if (type === 'Array') {
      const item = rawSubs.find((sub) => {
        const subEntry = sub as Record<string, unknown>;
        return subEntry && typeof subEntry === 'object' && subEntry.name === ARRAY_ITEM_FIELD;
      });
      if (item) {
        const built = build(item, `${path}._items`, false);
        subFields = built ? [built] : [{ name: ARRAY_ITEM_FIELD, type: 'String', description: '', isArrayItem: true, subFields: [] }];
      } else {
        subFields = [{ name: ARRAY_ITEM_FIELD, type: 'String', description: '', isArrayItem: true, subFields: [] }];
      }
    }
    const node: FieldLibrarySubField = { name, type: type as FieldType, description, subFields };
    if (name === ARRAY_ITEM_FIELD) node.isArrayItem = true;
    return node;
  };
  parsed.forEach((entry, index) => {
    const node = build(entry, `row ${index + 1}`, true);
    if (node) {
      imported.push({
        key: node.name,
        name: node.name,
        type: node.type,
        description: node.description,
        subFields: node.subFields,
        operator: 'Current User',
        operationTime: operationTimeNow(),
      });
    }
  });
  return { imported, failures };
}

// ---------------------------------------------------------------------------
// Recursive draft model (mirrors FieldLibrarySubField but used while editing).
// ---------------------------------------------------------------------------
interface DraftNode {
  name: string;
  // '' means "not selected yet" — the user must pick a type explicitly.
  type: FieldType | '';
  description: string;
  subFields: DraftNode[];
  isArrayItem?: boolean;
}

const blankChild = (): DraftNode => ({ name: '', type: '', description: '', subFields: [] });
const blankArrayItem = (): DraftNode => ({ name: ARRAY_ITEM_FIELD, type: '', isArrayItem: true, description: '', subFields: [] });

/** Recompute a node's children when its type changes (mirrors API config changeType). */
function recomputeChildren(node: DraftNode, newType: FieldType | ''): DraftNode[] {
  if (newType === 'Array') {
    const existing = node.subFields.find((child) => child.isArrayItem);
    return existing ? node.subFields : [blankArrayItem()];
  }
  if (newType === 'Object') {
    // Switching to Object auto-brings a blank sub-field row; keep existing children when already Object.
    return node.type === 'Object' ? node.subFields : [blankChild()];
  }
  return [];
}

// --- immutable helpers operating on a subFields array by numeric path ---
function mapNode(nodes: DraftNode[], path: number[], fn: (node: DraftNode) => DraftNode): DraftNode[] {
  const [head, ...rest] = path;
  if (head === undefined) return nodes;
  return nodes.map((node, index) => {
    if (index !== head) return node;
    return rest.length === 0 ? fn(node) : { ...node, subFields: mapNode(node.subFields, rest, fn) };
  });
}

function insertNode(nodes: DraftNode[], path: number[], child: DraftNode): DraftNode[] {
  if (path.length === 0) return [...nodes, child];
  const [head, ...rest] = path;
  return nodes.map((node, index) => (index === head ? { ...node, subFields: insertNode(node.subFields, rest, child) } : node));
}

function removeNode(nodes: DraftNode[], path: number[]): DraftNode[] {
  if (path.length === 1) return nodes.filter((_, index) => index !== path[0]);
  const [head, ...rest] = path;
  return nodes.map((node, index) => (index === head ? { ...node, subFields: removeNode(node.subFields, rest) } : node));
}

function getNode(nodes: DraftNode[], path: number[]): DraftNode | undefined {
  if (path.length === 0) return undefined;
  const [head, ...rest] = path;
  const node = nodes[head];
  if (!node) return undefined;
  return rest.length === 0 ? node : getNode(node.subFields, rest);
}

function cloneSub(field: FieldLibrarySubField): DraftNode {
  return { name: field.name, type: field.type, description: field.description, isArrayItem: field.isArrayItem, subFields: field.subFields.map(cloneSub) };
}

function recordToDraft(record: FieldLibraryRecord): DraftNode {
  return { name: record.name, type: record.type, description: record.description, subFields: record.subFields.map(cloneSub) };
}

/** Drop blank (name-empty) children and produce the persistable record shape. */
function cleanNode(node: DraftNode): FieldLibrarySubField {
  const children = node.subFields
    .filter((child) => child.isArrayItem || child.name.trim().length > 0)
    .map(cleanNode);
  const result: FieldLibrarySubField = {
    name: node.name.trim(),
    type: node.type as FieldType,
    description: node.description.trim(),
    subFields: children,
  };
  if (node.isArrayItem) result.isArrayItem = true;
  return result;
}

interface DraftErrors {
  name?: string;
  type?: string;
  description?: string;
  tree?: string;
}

/** Recursive validation: every named node needs a type; every Object (any level) must contain at least one named sub field. */
function checkTree(node: DraftNode, isCreate: boolean): string | null {
  // A blank (name-empty) row is dropped on save, so it should not block validation.
  if (!node.name.trim() && !node.isArrayItem) return null;
  if (node.type === 'Object') {
    const real = node.subFields.filter((child) => !child.isArrayItem);
    if (real.length === 0 || real.every((child) => !child.name.trim())) {
      return 'Every Object type field must contain at least one sub field';
    }
    for (const child of real) {
      if (child.name.trim() && !NAME_PATTERN.test(child.name.trim())) {
        return NAME_PATTERN_MESSAGE;
      }
      const childMessage = checkTree(child, isCreate);
      if (childMessage) return childMessage;
    }
  } else if (node.type === 'Array') {
    const item = node.subFields.find((child) => child.isArrayItem);
    if (item) {
      const childMessage = checkTree(item, isCreate);
      if (childMessage) return childMessage;
    }
  } else if (!node.type) {
    return 'Please select a type for every field';
  }
  return null;
}

function validateDraft(root: DraftNode, isCreate: boolean): DraftErrors {
  const errors: DraftErrors = {};
  if (isCreate) {
    if (!root.name.trim()) errors.name = 'Enter field name';
    else if (!NAME_PATTERN.test(root.name.trim())) errors.name = NAME_PATTERN_MESSAGE;
    if (!root.type) errors.type = 'Select type';
  }
  if (!root.description.trim()) errors.description = 'Enter description';
  const treeMessage = checkTree(root, isCreate);
  if (treeMessage) errors.tree = treeMessage;
  return errors;
}

type ModalMode = 'create' | 'modify' | 'view' | null;

export default function FieldLibraryPage() {
  const records = useFieldLibraryStore((state) => state.records);
  const logs = useFieldLibraryStore((state) => state.logs);
  const addRecord = useFieldLibraryStore((state) => state.addRecord);
  const updateRecord = useFieldLibraryStore((state) => state.updateRecord);
  const deleteRecord = useFieldLibraryStore((state) => state.deleteRecord);
  const addLogs = useFieldLibraryStore((state) => state.addLogs);

  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<FieldType | undefined>(undefined);
  const [query, setQuery] = useState({ name: '', type: undefined as FieldType | undefined });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingRecord, setEditingRecord] = useState<FieldLibraryRecord | null>(null);
  const [draftRoot, setDraftRoot] = useState<DraftNode>({ name: '', type: '', description: '', subFields: [] });
  const [errors, setErrors] = useState<DraftErrors>({});

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkIssues, setBulkIssues] = useState<string[]>([]);

  const [logOpen, setLogOpen] = useState(false);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const nameMatches = record.name.toLowerCase().includes(query.name.trim().toLowerCase());
    const typeMatches = !query.type || record.type === query.type;
    return nameMatches && typeMatches;
  }), [query, records]);

  // View-only shells out: root identity (name/type) is locked unless creating,
  // but sub-field structure can still be edited when modifying.
  const createMode = modalMode === 'create';
  const isView = modalMode === 'view';
  const rootLocked = modalMode !== 'create'; // root name/type locked in modify & view
  const opsVisible = !isView; // add / delete sub fields allowed in create & modify
  const descEditable = !isView; // descriptions editable in create & modify
  const hideOps = isView; // collapse the grid to 3 columns in view mode

  const resetDraft = () => {
    setDraftRoot({ name: '', type: '', description: '', subFields: [] });
    setErrors({});
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingRecord(null);
    resetDraft();
    setModalOpen(true);
  };

  const openModify = (record: FieldLibraryRecord) => {
    setModalMode('modify');
    setEditingRecord(record);
    setDraftRoot(recordToDraft(record));
    setErrors({});
    setModalOpen(true);
  };

  const openView = (record: FieldLibraryRecord) => {
    setModalMode('view');
    setEditingRecord(record);
    setDraftRoot(recordToDraft(record));
    setErrors({});
    setModalOpen(true);
  };

  const patchNode = (path: number[], patch: Partial<DraftNode>) => {
    setDraftRoot((previous) => {
      if (path.length === 0) {
        const next: DraftNode = { ...previous, ...patch };
        if (patch.type && patch.type !== previous.type) next.subFields = recomputeChildren(previous, patch.type);
        return next;
      }
      const apply = (node: DraftNode): DraftNode => {
        const next: DraftNode = { ...node, ...patch };
        if (patch.type && patch.type !== node.type) next.subFields = recomputeChildren(node, patch.type);
        return next;
      };
      return { ...previous, subFields: mapNode(previous.subFields, path, apply) };
    });
  };

  const addChild = (parentPath: number[]) => {
    setDraftRoot((previous) => ({ ...previous, subFields: insertNode(previous.subFields, parentPath, blankChild()) }));
  };

  const removeChild = (path: number[]) => {
    setDraftRoot((previous) => {
      let children = removeNode(previous.subFields, path);
      // An Object parent with no children left should always show one blank row.
      if (path.length >= 1) {
        const parentPath = path.slice(0, -1);
        const parent = getNode(children, parentPath);
        if (parent && parent.type === 'Object' && parent.subFields.length === 0) {
          children = insertNode(children, parentPath, blankChild());
        }
      }
      return { ...previous, subFields: children };
    });
  };

  const save = () => {
    if (modalMode === 'view') {
      setModalOpen(false);
      return;
    }
    const isCreate = createMode;
    const nextErrors = validateDraft(draftRoot, isCreate);
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.type || nextErrors.description || nextErrors.tree) {
      message.error('Please fix the highlighted fields');
      return;
    }

    const cleaned = cleanNode(draftRoot);

    if (isCreate) {
      if (records.some((record) => record.name === cleaned.name)) {
        setErrors({ ...nextErrors, name: 'Field name already exists' });
        message.error('Field name already exists');
        return;
      }
      addRecord({
        key: cleaned.name,
        name: cleaned.name,
        type: cleaned.type,
        description: cleaned.description,
        subFields: cleaned.subFields,
        operator: CURRENT_OPERATOR,
        operationTime: operationTimeNow(),
      });
      addLogs([makeFieldLog({
        fieldName: cleaned.name,
        operation: 'Create',
        attribute: 'Field',
        before: '—',
        after: summarizeField(cleaned.name, cleaned.type, cleaned.description, cleaned.subFields),
      })]);
      message.success('Field created');
    } else if (editingRecord) {
      const changes: FieldLibraryLog[] = [];
      if (editingRecord.description !== cleaned.description) {
        changes.push(makeFieldLog({
          fieldName: editingRecord.name,
          operation: 'Modify',
          attribute: 'Description',
          before: editingRecord.description || '—',
          after: cleaned.description || '—',
        }));
      }
      if (JSON.stringify(editingRecord.subFields) !== JSON.stringify(cleaned.subFields)) {
        changes.push(makeFieldLog({
          fieldName: editingRecord.name,
          operation: 'Modify',
          attribute: 'Sub fields',
          before: describeSubFields(editingRecord.subFields),
          after: describeSubFields(cleaned.subFields),
        }));
      }
      if (changes.length === 0) {
        message.info('No changes to save');
        setModalOpen(false);
        return;
      }
      updateRecord({
        ...editingRecord,
        description: cleaned.description,
        subFields: cleaned.subFields,
        operator: CURRENT_OPERATOR,
        operationTime: operationTimeNow(),
      });
      addLogs(changes);
      message.success('Field updated');
    }
    setModalOpen(false);
  };

  const handleDelete = (record: FieldLibraryRecord) => {
    deleteRecord(record.key);
    addLogs([makeFieldLog({
      fieldName: record.name,
      operation: 'Delete',
      attribute: 'Field',
      before: summarizeField(record.name, record.type, record.description, record.subFields),
      after: '—',
    })]);
    message.success('Field deleted');
  };

  // --- Bulk import (JSON) / export (JSON) ----------------------------------
  const closeBulk = () => {
    setBulkOpen(false);
    setBulkJson('');
    setBulkIssues([]);
  };

  const downloadTemplate = () => {
    downloadJson('field-library-template.json', [
      { name: 'mobileNumber', type: 'String', description: 'Recipient mobile number', subFields: [] },
      { name: 'identity', type: 'Object', description: 'Identity information of the order', subFields: [
        { name: 'requestReference', type: 'String', description: 'Upstream request reference', subFields: [] },
        { name: 'responseReference', type: 'String', description: 'Channel response reference', subFields: [] },
      ] },
      { name: 'orderList', type: 'Array', description: 'List of sub-orders', subFields: [
        { name: '_items', type: 'String', description: 'Array element', subFields: [] },
      ] },
    ]);
    message.success('Template downloaded');
  };

  const exportRecords = () => {
    const data = records.map((record) => ({
      name: record.name,
      type: record.type,
      description: record.description,
      subFields: record.subFields.map(subFieldToJson),
    }));
    downloadJson('field-library-export.json', data);
    message.success('Field library exported');
  };

  const handleBulkOk = () => {
    if (!bulkJson.trim()) {
      message.error('Paste JSON to import');
      return;
    }
    const existingRoots = new Set(records.map((record) => record.name));
    const { imported, failures } = parseImportJson(bulkJson, existingRoots);
    if (imported.length === 0) {
      // Keep the modal open so the user can read the reasons and re-paste.
      setBulkIssues(failures.slice(0, 8));
      message.error('No valid fields found; see the reasons in the dialog');
      return;
    }
    imported.forEach(addRecord);
    addLogs(imported.map((record) => makeFieldLog({
      fieldName: record.name,
      operation: 'Import',
      attribute: 'Field',
      before: '—',
      after: summarizeField(record.name, record.type, record.description, record.subFields),
    })));
    closeBulk();
    message.success(`Imported ${imported.length} field(s)${failures.length > 0 ? `, skipped ${failures.length} invalid row(s)` : ''}`);
  };

  const renderNode = (node: DraftNode, path: number[]) => {
    const isContainer = node.type === 'Object' || node.type === 'Array';
    const nameInvalid = createMode && !node.isArrayItem && node.name.trim() !== '' && !NAME_PATTERN.test(node.name.trim());
    return (
      <Fragment key={`n-${path.join('-')}`}>
        <div className={`field-library-tree-row ${isContainer ? 'container' : ''}`}>
          <div className="field-library-tree-name">
            {node.isArrayItem ? (
              <Tag color="purple">{node.name}</Tag>
            ) : isView ? (
              <span className="field-library-fixed-name">{node.name || '—'}</span>
            ) : (
              <Input
                value={node.name}
                placeholder="Field name"
                status={nameInvalid ? 'error' : undefined}
                onChange={(event) => patchNode(path, { name: event.target.value })}
              />
            )}
          </div>
          <div>
            {isView ? (
              <span className="field-library-fixed-value">{node.type}</span>
            ) : (
              <Select
                value={node.type || undefined}
                placeholder="Type"
                style={{ width: '100%' }}
                popupMatchSelectWidth={false}
                options={node.isArrayItem ? arrayItemTypeOptions : typeOptions}
                onChange={(value) => patchNode(path, { type: value })}
              />
            )}
          </div>
          <div>
            {descEditable ? (
              <Input
                value={node.description}
                placeholder="Description"
                onChange={(event) => patchNode(path, { description: event.target.value })}
              />
            ) : (
              <span className="field-library-fixed-name">{node.description || '—'}</span>
            )}
          </div>
          {opsVisible && (
            <div className="field-library-tree-actions">
              {node.type === 'Object' && (
                <Tooltip title="Add sub field">
                  <Button type="text" icon={<PlusOutlined />} aria-label="Add sub field" onClick={() => addChild(path)} />
                </Tooltip>
              )}
              {!node.isArrayItem && (
                <Popconfirm
                  title="Delete field?"
                  okText="Delete"
                  cancelText="Cancel"
                  onConfirm={() => removeChild(path)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete field" />
                </Popconfirm>
              )}
            </div>
          )}
        </div>
        {isContainer && node.subFields.length > 0 && (
          <div className="field-library-nested">
            {node.subFields.map((child, index) => renderNode(child, [...path, index]))}
          </div>
        )}
      </Fragment>
    );
  };

  const columns = [
    { title: 'Field Name', dataIndex: 'name', key: 'name', width: 220 },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: string) => <Tag color={type === 'Object' || type === 'Array' ? 'geekblue' : 'default'}>{type}</Tag>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 300, ellipsis: true },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 200 },
    { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 180 },
    {
      title: 'Operation',
      key: 'operation',
      width: 220,
      render: (_: unknown, record: FieldLibraryRecord) => (
        <Space size={4}>
          <Button type="link" onClick={() => openView(record)}>View Detail</Button>
          <Button type="link" onClick={() => openModify(record)}>Modify</Button>
          <Popconfirm
            title="Delete field?"
            description="This field will be permanently removed from the library."
            icon={<ExclamationCircleFilled style={{ color: '#faad14' }} />}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const hasDraftError = Boolean(errors.name || errors.type || errors.description || errors.tree);
  const isRootContainer = draftRoot.type === 'Object' || draftRoot.type === 'Array';

  return (
    <div className="institution-type-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info' }, { title: 'Field Library' }]} />
        <div className="state-machine-title-line"><Title level={4}>Field Library</Title></div>
      </section>

      <div className="announcement-content">
        <div className="announcement-filter-panel">
          <div className="announcement-filters">
            <label><span>Field Name :</span><Input value={nameFilter} placeholder="Field Name" onChange={(event) => setNameFilter(event.target.value)} /></label>
            <label><span>Type :</span><Select allowClear showSearch value={typeFilter} placeholder="Type" options={typeOptions} onChange={setTypeFilter} /></label>
          </div>
          <Space className="announcement-filter-actions">
            <Button onClick={() => { setNameFilter(''); setTypeFilter(undefined); setQuery({ name: '', type: undefined }); }}>Reset</Button>
            <Button type="primary" onClick={() => setQuery({ name: nameFilter, type: typeFilter })}>Query</Button>
          </Space>
        </div>

        <div className="announcement-table-panel">
          <div className="announcement-create">
            <Space>
              <Button type="primary" onClick={openCreate}>Create</Button>
              <Button type="primary" onClick={() => { setBulkIssues([]); setBulkOpen(true); }}>Import JSON</Button>
              <Button icon={<DownloadOutlined />} onClick={exportRecords}>Download</Button>
              <Button onClick={() => setLogOpen(true)}>Log</Button>
            </Space>
          </div>
          <Table<FieldLibraryRecord>
            className="announcement-table"
            dataSource={filteredRecords}
            columns={columns}
            rowKey="key"
            scroll={{ x: 1090 }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `Total ${total} items` }}
          />
        </div>
      </div>

      <Modal
        className="field-library-modal"
        title={modalMode === 'view' ? 'Field Detail' : modalMode === 'modify' ? 'Modify Field' : 'Create Field'}
        open={modalOpen}
        width={900}
        okText={modalMode === 'view' ? 'Close' : 'Save'}
        cancelText="Cancel"
        onOk={save}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        {hasDraftError && (
          <div className="field-library-error-banner">
            {errors.name || errors.type || errors.description || errors.tree}
          </div>
        )}

        <section className="field-library-schema">
          <div className="field-library-schema-head">
            <h2>Field Schema</h2>
          </div>
          <div className="field-library-schema-scroll">
            <div className={`field-library-field-table editing ${hideOps ? 'no-ops' : ''}`}>
              <div className="field-library-tree-header">
                <span>FIELD</span>
                <span>TYPE</span>
                <span>DESCRIPTION</span>
                {opsVisible && <span>OPERATIONS</span>}
              </div>

              {/* Root row: the field being defined (mirrors _order in API config). */}
              <div className="field-library-tree-root">
                <div className="field-library-tree-name">
                  {rootLocked ? <Tag color="purple">{draftRoot.name}</Tag> : (
                    <Input
                      value={draftRoot.name}
                      placeholder="Field Name"
                      status={errors.name ? 'error' : undefined}
                      onChange={(event) => patchNode([], { name: event.target.value })}
                    />
                  )}
                </div>
                <div>
                  {rootLocked ? <span className="field-library-fixed-value">{draftRoot.type}</span> : (
                    <Select
                      value={draftRoot.type || undefined}
                      placeholder="Type"
                      style={{ width: '100%' }}
                      popupMatchSelectWidth={false}
                      options={typeOptions}
                      status={errors.type ? 'error' : undefined}
                      onChange={(value) => patchNode([], { type: value })}
                    />
                  )}
                </div>
                <div>
                  {descEditable ? (
                    <Input
                      value={draftRoot.description}
                      placeholder="Description"
                      status={errors.description ? 'error' : undefined}
                      onChange={(event) => patchNode([], { description: event.target.value })}
                    />
                  ) : (
                    <span className="field-library-fixed-name">{draftRoot.description || '—'}</span>
                  )}
                </div>
                {opsVisible && (
                  <div className="field-library-tree-actions">
                    {draftRoot.type === 'Object' && (
                      <Tooltip title="Add sub field">
                        <Button type="text" icon={<PlusOutlined />} aria-label="Add sub field" onClick={() => addChild([])} />
                      </Tooltip>
                    )}
                    <span className="field-library-row-note">Root</span>
                  </div>
                )}
              </div>

              {/* Children (Object sub fields / Array _items) render recursively at any level. */}
              {isRootContainer && (
                <div className="field-library-nested">
                  {draftRoot.subFields.map((child, index) => renderNode(child, [index]))}
                </div>
              )}
            </div>
          </div>
        </section>
      </Modal>

      <Modal
        title="Import JSON"
        open={bulkOpen}
        okText="Import"
        cancelText="Cancel"
        width={680}
        destroyOnHidden
        onOk={handleBulkOk}
        onCancel={closeBulk}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="JSON import format"
          description={(
            <>
              Paste a JSON array of field objects. Each object needs <b>name</b>, <b>type</b> (one of the 11 supported types),
              and <b>description</b>. Nested sub fields go in a <code>subFields</code> array; an Object needs at least one sub field,
              and an Array&apos;s element is declared as a <code>_items</code> entry. Import adds every valid root field to the library.
            </>
          )}
        />
        <Input.TextArea
          value={bulkJson}
          onChange={(event) => { setBulkJson(event.target.value); setBulkIssues([]); }}
          placeholder={'[\n  { "name": "mobileNumber", "type": "String", "description": "Recipient mobile number", "subFields": [] }\n]'}
          autoSize={{ minRows: 10, maxRows: 18 }}
          className="field-library-json-input"
        />
        <div style={{ marginTop: 16 }}>
          <Button type="link" style={{ paddingLeft: 0 }} onClick={downloadTemplate}>Download Template</Button>
        </div>
        {bulkIssues.length > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginTop: 16 }}
            message="No valid fields were imported"
            description={(
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {bulkIssues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            )}
          />
        )}
      </Modal>

      <Modal
        title="Operation Log"
        open={logOpen}
        width={1040}
        footer={<Button onClick={() => setLogOpen(false)}>Close</Button>}
        onCancel={() => setLogOpen(false)}
        destroyOnHidden
      >
        {logs.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No operation recorded" />
        ) : (
          <Table<FieldLibraryLog>
            className="announcement-table"
            rowKey="id"
            size="small"
            dataSource={logs}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `Total ${total} items` }}
            columns={[
              { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 170 },
              { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 130 },
              { title: 'Operation', dataIndex: 'operation', key: 'operation', width: 110, render: (value: FieldLibraryLogOperation) => <Tag color={LOG_OPERATION_COLOR[value]}>{value}</Tag> },
              { title: 'Field', dataIndex: 'fieldName', key: 'fieldName', width: 150 },
              { title: 'Attribute', dataIndex: 'attribute', key: 'attribute', width: 120 },
              { title: 'Original Value', dataIndex: 'before', key: 'before', width: 300, render: (value: string) => <span className="field-library-log-value">{value}</span> },
              { title: 'New Value', dataIndex: 'after', key: 'after', width: 300, render: (value: string) => <span className="field-library-log-value">{value}</span> },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
