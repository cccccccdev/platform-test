import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Cascader, Input, Modal, Select, Space, Switch, Tag, Tooltip, Typography } from 'antd';
import {
  ArrowRightOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  HolderOutlined,
  ImportOutlined,
  MinusSquareOutlined,
  PlusOutlined,
  PlusSquareOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export interface BodySchemaNode {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  sourceId?: string;
  operation?: string | string[];
  targetValue?: string;
  children?: BodySchemaNode[];
}

interface ValueOption {
  label: string;
  value: string;
  type?: string;
}

interface OptionGroup {
  label: string;
  options: ValueOption[];
}

type MappingOption = ValueOption | OptionGroup;

interface Props {
  value?: BodySchemaNode[];
  onChange?: (value: BodySchemaNode[]) => void;
  sourceOptions: MappingOption[];
  dataTypeOptions: Array<{ label: string; value: string }>;
  operationOptions: Array<{ label: string; value: string; children?: Array<{ label: string; value: string }> }>;
  direction?: 'request' | 'response';
  targetOptions?: MappingOption[];
  sourcePlaceholder?: string;
  targetPlaceholder?: string;
}

type DragState = { parentPath: number[]; index: number } | null;

const createNode = (): BodySchemaNode => ({
  id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  type: 'String',
  required: false,
  description: '',
});

const inferJsonType = (value: unknown): string => {
  if (Array.isArray(value)) return 'Array';
  if (value !== null && typeof value === 'object') return 'Object';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return 'String';
    return value >= -2147483648 && value <= 2147483647 ? 'Integer' : 'Long';
  }
  return 'String';
};

const jsonObjectToNodes = (record: Record<string, unknown>): BodySchemaNode[] =>
  Object.entries(record).map(([name, value]) => {
    const type = inferJsonType(value);
    return {
      ...createNode(),
      name,
      type,
      children: type === 'Object' ? jsonObjectToNodes(value as Record<string, unknown>) : undefined,
    };
  });

const optionType = (options: MappingOption[], selected?: string): string => {
  for (const option of options) {
    if ('options' in option) {
      const match = option.options.find((item) => item.value === selected);
      if (match) return match.type ?? 'String';
    } else if (option.value === selected) return option.type ?? 'String';
  }
  return 'String';
};

const countNodes = (nodes: BodySchemaNode[]): number =>
  nodes.reduce((count, node) => count + 1 + countNodes(node.children ?? []), 0);

const collectObjectIds = (nodes: BodySchemaNode[]): string[] =>
  nodes.flatMap((node) => node.type === 'Object' ? [node.id, ...collectObjectIds(node.children ?? [])] : []);

const updateAtPath = (nodes: BodySchemaNode[], path: number[], updater: (node: BodySchemaNode) => BodySchemaNode): BodySchemaNode[] => {
  const [index, ...rest] = path;
  return nodes.map((node, nodeIndex) => {
    if (nodeIndex !== index) return node;
    if (rest.length === 0) return updater(node);
    return { ...node, children: updateAtPath(node.children ?? [], rest, updater) };
  });
};

const getSiblings = (nodes: BodySchemaNode[], parentPath: number[]): BodySchemaNode[] => {
  if (parentPath.length === 0) return nodes;
  const [index, ...rest] = parentPath;
  return getSiblings(nodes[index]?.children ?? [], rest);
};

const replaceSiblings = (nodes: BodySchemaNode[], parentPath: number[], siblings: BodySchemaNode[]): BodySchemaNode[] => {
  if (parentPath.length === 0) return siblings;
  const [index, ...rest] = parentPath;
  return nodes.map((node, nodeIndex) => nodeIndex === index
    ? { ...node, children: replaceSiblings(node.children ?? [], rest, siblings) }
    : node);
};

const requestColumns = 'minmax(155px, .9fr) 80px 20px 115px 20px minmax(200px, 1.1fr) 90px 56px minmax(120px, .75fr) 52px';
const responseColumns = 'minmax(200px, 1.1fr) 90px 56px minmax(120px, .75fr) 20px 115px 20px minmax(135px, .8fr) 80px 52px';

export default function BodySchemaMappingEditor({ value = [], onChange, sourceOptions, dataTypeOptions, operationOptions, direction = 'request', targetOptions = [], sourcePlaceholder = 'Credential or generated data', targetPlaceholder = 'Token or Expiry' }: Props) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [rootCollapsed, setRootCollapsed] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState('');
  const total = useMemo(() => countNodes(value), [value]);
  const columns = direction === 'request' ? requestColumns : responseColumns;

  const emit = (next: BodySchemaNode[]) => onChange?.(next);

  const addAt = (parentPath: number[]) => {
    const siblings = getSiblings(value, parentPath);
    emit(replaceSiblings(value, parentPath, [...siblings, createNode()]));
    if (parentPath.length > 0) {
      const parent = getSiblings(value, parentPath.slice(0, -1))[parentPath[parentPath.length - 1]];
      if (parent) setCollapsedIds((current) => {
        const next = new Set(current);
        next.delete(parent.id);
        return next;
      });
    }
  };

  const removeAt = (path: number[]) => {
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    const siblings = getSiblings(value, parentPath);
    emit(replaceSiblings(value, parentPath, siblings.filter((_, siblingIndex) => siblingIndex !== index)));
  };

  const updateNode = (path: number[], updates: Partial<BodySchemaNode>) => emit(updateAtPath(value, path, (node) => ({ ...node, ...updates })));

  const changeType = (path: number[], nextType: string) => {
    const parentPath = path.slice(0, -1);
    const node = getSiblings(value, parentPath)[path[path.length - 1]];
    if (node?.type === 'Object' && nextType !== 'Object' && (node.children?.length ?? 0) > 0) {
      Modal.confirm({
        title: 'Change field type?',
        content: 'Changing this Object to a scalar type will remove all child fields.',
        okText: 'Change Type',
        okButtonProps: { danger: true },
        onOk: () => updateNode(path, { type: nextType, children: [] }),
      });
      return;
    }
    updateNode(path, { type: nextType, children: nextType === 'Object' ? (node?.children ?? []) : undefined });
  };

  const moveSibling = (parentPath: number[], from: number, to: number) => {
    if (from === to) return;
    const siblings = [...getSiblings(value, parentPath)];
    const [moved] = siblings.splice(from, 1);
    siblings.splice(to, 0, moved);
    emit(replaceSiblings(value, parentPath, siblings));
  };

  const toggleNode = (id: string) => setCollapsedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const importJson = () => {
    try {
      const parsed: unknown = JSON.parse(jsonDraft);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        setJsonError('The ROOT value must be a JSON object.');
        return;
      }
      emit(jsonObjectToNodes(parsed as Record<string, unknown>));
      setCollapsedIds(new Set());
      setRootCollapsed(false);
      setImportOpen(false);
      setJsonDraft('');
      setJsonError('');
    } catch {
      setJsonError('Enter valid JSON before importing.');
    }
  };

  const renderNode = (node: BodySchemaNode, path: number[], depth: number): ReactNode => {
    const isObject = node.type === 'Object';
    const collapsed = collapsedIds.has(node.id);
    const parentPath = path.slice(0, -1);
    const siblingIndex = path[path.length - 1];

    return (
      <div key={node.id}>
        <div
          draggable
          onDragStart={() => setDragState({ parentPath, index: siblingIndex })}
          onDragEnd={() => setDragState(null)}
          onDragOver={(event) => {
            if (dragState && JSON.stringify(dragState.parentPath) === JSON.stringify(parentPath)) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (dragState && JSON.stringify(dragState.parentPath) === JSON.stringify(parentPath)) moveSibling(parentPath, dragState.index, siblingIndex);
            setDragState(null);
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: columns,
            gap: 8,
            alignItems: 'center',
            minHeight: 43,
            padding: '5px 8px',
            borderBottom: '1px solid #f0f0f0',
            background: dragState?.index === siblingIndex && JSON.stringify(dragState.parentPath) === JSON.stringify(parentPath) ? '#e6f4ff' : '#fff',
          }}
        >
          {direction === 'request' && (isObject ? <><span /><span /><span /><span /><span /></> : <>
            <Select value={node.sourceId} placeholder={sourcePlaceholder} options={sourceOptions} onChange={(sourceId) => updateNode(path, { sourceId })} />
            <Text style={{ fontSize: 12 }}>{optionType(sourceOptions, node.sourceId)}</Text>
            <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
            <Cascader allowClear value={node.operation as string[] | undefined} placeholder="Select operation (optional)" options={operationOptions} expandTrigger="click" onChange={(operation) => updateNode(path, { operation: operation as string[] })} />
            <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
          </>)}
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, paddingLeft: depth * 20 }}>
            <Tooltip title="Drag to reorder within this level">
              <HolderOutlined style={{ color: '#bfbfbf', cursor: 'grab', marginRight: 6 }} />
            </Tooltip>
            {isObject ? (
              <Button type="text" size="small" icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} onClick={() => toggleNode(node.id)} style={{ width: 24, padding: 0, marginRight: 2 }} />
            ) : <span style={{ width: 26 }} />}
            <Input value={node.name} placeholder="Field name" status={!node.name ? 'error' : undefined} onChange={(event) => updateNode(path, { name: event.target.value })} />
          </div>
          <Select value={node.type} options={dataTypeOptions} onChange={(nextType) => changeType(path, nextType)} />
          <div style={{ textAlign: 'center' }}><Switch size="small" checked={!!node.required} onChange={(required) => updateNode(path, { required })} /></div>
          <Input value={node.description} placeholder="Optional" onChange={(event) => updateNode(path, { description: event.target.value })} />
          {direction === 'response' && (isObject ? <><span /><span /><span /><span /><span /></> : <>
            <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
            <Cascader allowClear value={node.operation as string[] | undefined} placeholder="Select operation (optional)" options={operationOptions} expandTrigger="click" onChange={(operation) => updateNode(path, { operation: operation as string[] })} />
            <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
            <Select value={node.targetValue} placeholder={targetPlaceholder} options={targetOptions} onChange={(targetValue) => updateNode(path, { targetValue })} />
            <Text style={{ fontSize: 12 }}>{optionType(targetOptions, node.targetValue)}</Text>
          </>)}
          <Space size={0}>
            {isObject && <Tooltip title="Add child field"><Button type="text" size="small" icon={<PlusOutlined />} onClick={() => addAt(path)} /></Tooltip>}
            <Tooltip title="Delete field"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeAt(path)} /></Tooltip>
          </Space>
        </div>
        {isObject && !collapsed && (node.children ?? []).map((child, index) => renderNode(child, [...path, index], depth + 1))}
        {isObject && !collapsed && (node.children?.length ?? 0) === 0 && (
          <button type="button" onClick={() => addAt(path)} style={{ marginLeft: 48 + depth * 20, border: 0, background: 'transparent', color: '#8c8c8c', padding: '7px 0', cursor: 'pointer', fontSize: 12 }}>
            No child fields. <span style={{ color: '#1677ff' }}>Add child</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <Space size={8}>
          <Text strong>Body Schema & Mapping</Text>
          <Tag style={{ margin: 0 }}>{total} fields</Tag>
        </Space>
        <Space size={6}>
          <Tooltip title="Expand all"><Button size="small" icon={<PlusSquareOutlined />} onClick={() => { setRootCollapsed(false); setCollapsedIds(new Set()); }} /></Tooltip>
          <Tooltip title="Collapse all"><Button size="small" icon={<MinusSquareOutlined />} onClick={() => { setRootCollapsed(true); setCollapsedIds(new Set(collectObjectIds(value))); }} /></Tooltip>
          <Tooltip title="Add a child field under ROOT"><Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => addAt([])}>Add Child</Button></Tooltip>
          <Button size="small" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>Import JSON</Button>
        </Space>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 980 }}>
          <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '7px 8px', color: '#8c8c8c', fontSize: 11, background: '#fcfcfc', borderBottom: '1px solid #f0f0f0' }}>
            {direction === 'request' ? <>
              <span>SOURCE VALUE</span><span>SOURCE TYPE</span><span /><span>OPERATION</span><span /><span>FIELD</span><span>TYPE</span><span style={{ textAlign: 'center' }}>REQUIRED</span><span>DESCRIPTION</span><span />
            </> : <>
              <span>FIELD</span><span>TYPE</span><span style={{ textAlign: 'center' }}>REQUIRED</span><span>DESCRIPTION</span><span /><span>OPERATION</span><span /><span>TARGET VALUE</span><span>TARGET TYPE</span><span />
            </>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', minHeight: 44, padding: '5px 8px', background: '#f5f7ff', borderBottom: '1px solid #e8e8e8' }}>
            {direction === 'request' && <><span /><span /><span /><span /><span /></>}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button type="text" size="small" icon={rootCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} onClick={() => setRootCollapsed(!rootCollapsed)} style={{ width: 24, padding: 0, marginRight: 8 }} />
              <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>ROOT</Tag>
            </div>
            <Text strong style={{ color: '#1677ff' }}>Object</Text>
            <Text type="secondary" style={{ textAlign: 'center' }}>—</Text><Text type="secondary">—</Text>
            {direction === 'response' && <><span /><span /><span /><span /><span /></>}
            <Tooltip title="Add child field under ROOT"><Button type="text" size="small" icon={<PlusOutlined />} onClick={() => addAt([])} /></Tooltip>
          </div>
          {!rootCollapsed && (
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {value.length > 0 ? value.map((node, index) => renderNode(node, [index], 0)) : (
                <div style={{ color: '#8c8c8c', padding: '22px 36px' }}>No child fields defined under ROOT. <Button type="link" size="small" onClick={() => addAt([])}>Add child</Button></div>
              )}
            </div>
          )}
        </div>
      </div>
      <Modal
        title="Import JSON as Body Schema"
        open={importOpen}
        okText="Import"
        onOk={importJson}
        onCancel={() => { setImportOpen(false); setJsonError(''); }}
        destroyOnHidden
      >
        <Text type="secondary">Paste a JSON object. Importing replaces the fields currently defined under ROOT.</Text>
        <Input.TextArea
          value={jsonDraft}
          onChange={(event) => { setJsonDraft(event.target.value); setJsonError(''); }}
          placeholder={'{\n  "client_id": "example",\n  "customer": {\n    "name": "Ada"\n  }\n}'}
          autoSize={{ minRows: 10, maxRows: 18 }}
          status={jsonError ? 'error' : undefined}
          style={{ marginTop: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
        {jsonError && <Text type="danger" style={{ display: 'block', marginTop: 6 }}>{jsonError}</Text>}
      </Modal>
    </div>
  );
}
