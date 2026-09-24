import { useState, type ReactNode } from 'react';
import { Button, Input, Modal, Popconfirm, Select, Tag, Tooltip, Typography } from 'antd';
import { CaretDownOutlined, CaretRightOutlined, DeleteOutlined, ExclamationCircleFilled, HolderOutlined, ImportOutlined, MinusSquareOutlined, PlusOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { appendBusinessNode, appendTemplatePlaceholder, findNode, importJsonToSpiTree, moveBusinessSibling, updateNodeTree, withoutBusinessFields, type SpiFieldNode } from './spiSchemaModel';

const FIELD_TYPES = ['String', 'Integer', 'Long', 'BigDecimal', 'Boolean', 'Object', 'Array'].map((type) => ({ label: type, value: type }));
type DragState = { parentId: string | null; nodeId: string } | null;

interface Props {
  title: string;
  fields: SpiFieldNode[];
  catalog: SpiFieldNode[];
  customRoot?: boolean;
  effectTagOptions?: readonly string[];
  effectTagHeader?: ReactNode;
  editing: boolean;
  onChange: (fields: SpiFieldNode[]) => void;
}

export default function SpiSchemaTree({ title, fields, catalog, customRoot = false, effectTagOptions, effectTagHeader, editing, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newFieldId, setNewFieldId] = useState<string>();
  const [dragState, setDragState] = useState<DragState>(null);
  const [rootCollapsed, setRootCollapsed] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState('');

  const importJson = () => {
    try {
      const imported = importJsonToSpiTree(JSON.parse(jsonDraft) as unknown, catalog, fields, customRoot);
      onChange(imported);
      setCollapsed(new Set());
      setRootCollapsed(false);
      setImportOpen(false);
      setJsonDraft('');
      setJsonError('');
    } catch (error) {
      setJsonError(error instanceof SyntaxError ? 'Enter valid JSON before importing.' : error instanceof Error ? error.message : 'Could not import JSON.');
    }
  };

  const addField = (parentId: string | null) => {
    const parent = parentId ? findNode(fields, parentId) : undefined;
    const isUserField = customRoot || Boolean(parent && (parent.extension || parent.name === 'extraRequest' || parent.name === 'extraResponse'));
    const next = isUserField ? appendBusinessNode(fields, parentId, '', 'String') : appendTemplatePlaceholder(fields, parentId);
    const siblings = parentId ? findNode(next, parentId)?.children : next;
    setNewFieldId(siblings?.at(-1)?.id);
    onChange(next);
    setRootCollapsed(false);
    if (parentId) setCollapsed((current) => { const next = new Set(current); next.delete(parentId); return next; });
  };
  const toggle = (id: string) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const changeType = (node: SpiFieldNode, type: string) => {
    const update = () => onChange(updateNodeTree(fields, node.id, (current) => ({
      ...current, type, effectTag: type === 'Object' || type === 'Array' ? undefined : current.effectTag,
      children: type === 'Array' ? [{ id: `${current.id}_items`, name: '_items', type: 'String', description: '', required: false, extension: true, children: [] }]
        : type === 'Object' ? (current.type === 'Object' ? current.children : []) : [],
    })));
    if (node.children.length && type !== node.type) Modal.confirm({ title: 'Change field type?', content: `Changing ${node.name} to ${type} will remove its child fields.`, okText: 'Change type', onOk: update });
    else update();
  };
  const render = (node: SpiFieldNode, depth: number, parentId: string | null) => {
    const isContainer = node.type === 'Object' || node.type === 'Array';
    const isCollapsed = collapsed.has(node.id);
    const candidates = (findNode(catalog, node.id)?.children || []).filter((candidate) => !candidate.extension);
    const isBusinessParent = customRoot || node.extension || node.name === 'extraRequest' || node.name === 'extraResponse';
    const canAddChild = node.type === 'Object' && (isBusinessParent || candidates.some((candidate) => !node.children.some((child) => child.id === candidate.id)));
    const templateSiblings = (parentId === null ? catalog : findNode(catalog, parentId)?.children || []).filter((candidate) => !candidate.extension);
    const existingSiblings = parentId === null ? fields : findNode(fields, parentId)?.children || [];
    const availableTemplates = templateSiblings.filter((candidate) => !existingSiblings.some((sibling) => sibling.id === candidate.id));
    const isArrayItem = node.name === '_items';
    return <div key={node.id}>
      <div className={`capability-spi-tree-row ${isContainer ? 'container' : ''} ${dragState?.nodeId === node.id ? 'dragging' : ''}`} role="row"
        onDragOver={(event) => { if (dragState && parentId === dragState.parentId && node.extension && !isArrayItem) event.preventDefault(); }}
        onDrop={(event) => { event.preventDefault(); if (dragState && parentId === dragState.parentId && node.extension) onChange(moveBusinessSibling(fields, parentId, dragState.nodeId, node.id)); setDragState(null); }}>
        <div className="capability-spi-tree-name" role="cell" style={{ paddingLeft: 10 + depth * 20 }}>
          {editing && node.extension && (parentId !== null || customRoot) && !isArrayItem ? <Tooltip title="Drag to reorder at this level"><span className="capability-spi-drag-handle" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDragState({ parentId, nodeId: node.id }); }} onDragEnd={() => setDragState(null)}><HolderOutlined /></span></Tooltip> : <span className="capability-spi-drag-spacer" />}
          {isContainer ? <button type="button" className="capability-spi-tree-toggle" aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${node.name}`} aria-expanded={!isCollapsed} onClick={() => toggle(node.id)}>{isCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}</button> : <span className="capability-spi-tree-toggle-spacer" />}
          {editing && node.templatePlaceholder ? <Select autoFocus={node.id === newFieldId} placeholder="Select template field" aria-label="Select template field" options={availableTemplates.map((candidate) => ({ label: `${candidate.name} · ${candidate.type}`, value: candidate.id }))} onChange={(id) => { const candidate = availableTemplates.find((item) => item.id === id); if (candidate) onChange(updateNodeTree(fields, node.id, () => withoutBusinessFields([candidate])[0])); setNewFieldId(undefined); }} />
            : editing && node.extension && !isArrayItem ? <Input autoFocus={node.id === newFieldId} value={node.name} placeholder="Field name" aria-label={`${node.name || 'New'} field name`} onChange={(event) => onChange(updateNodeTree(fields, node.id, (current) => ({ ...current, name: event.target.value })))} /> : <span className="capability-spi-fixed-name" title={node.name}>{node.name}</span>}
        </div>
        <div role="cell">{editing && node.extension ? <Select value={node.type} options={isArrayItem ? FIELD_TYPES.filter((item) => item.value !== 'Array') : FIELD_TYPES} aria-label={`${node.name} field type`} onChange={(type) => changeType(node, type)} /> : node.type || '—'}</div>
        {effectTagOptions && <div role="cell">{editing && !isContainer ? <Select value={node.effectTag || undefined} placeholder="Select Effect Tag" options={effectTagOptions.map((tag) => ({ label: tag, value: tag }))} aria-label={`${node.name || 'New'} Effect Tag`} onChange={(effectTag) => onChange(updateNodeTree(fields, node.id, (current) => ({ ...current, effectTag })))} /> : <span className="capability-spi-description">{isContainer ? '—' : node.effectTag || '—'}</span>}</div>}
        <div role="cell">{editing ? <Input value={node.description} placeholder="Optional" aria-label={`${node.name} description`} onChange={(event) => onChange(updateNodeTree(fields, node.id, (current) => ({ ...current, description: event.target.value })))} /> : <span className="capability-spi-description">{node.description || '—'}</span>}</div>
        {editing && <div className="capability-spi-tree-actions" role="cell">
          {editing && canAddChild && <Tooltip title={`Add ${isBusinessParent ? 'business ' : ''}field under ${node.name}`}><Button type="text" size="small" icon={<PlusOutlined />} aria-label={`Add field under ${node.name}`} onClick={() => addField(node.id)} /></Tooltip>}
          {editing && !isArrayItem && <Popconfirm
            title="Delete Field?"
            description={node.children.length ? 'Child fields will also be deleted.' : undefined}
            icon={<ExclamationCircleFilled style={{ color: '#faad14' }} />}
            placement="topRight"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ className: 'capability-spi-delete-confirm-button' }}
            onConfirm={() => onChange(updateNodeTree(fields, node.id, () => null))}
          ><Button type="text" size="small" icon={<DeleteOutlined />} aria-label={`Delete ${node.name || 'field'}`} /></Popconfirm>}
        </div>}
      </div>
      {isContainer && !isCollapsed && node.children.map((child) => render(child, depth + 1, node.id))}
    </div>;
  };

  return <section className="capability-spi-section">
    <div className="capability-spi-schema-frame"><div className="capability-spi-section-head"><h2>{title}</h2><div className="capability-spi-section-tools">
      <Tooltip title="展开全部"><Button className="capability-spi-tool-square" aria-label={`展开全部 ${title}`} icon={<PlusSquareOutlined />} onClick={() => { setCollapsed(new Set()); setRootCollapsed(false); }} /></Tooltip>
      <Tooltip title="收起全部"><Button className="capability-spi-tool-square" aria-label={`收起全部 ${title}`} icon={<MinusSquareOutlined />} onClick={() => {
        const ids: string[] = [];
        const collect = (items: SpiFieldNode[]) => items.forEach((item) => { if (item.type === 'Object' || item.type === 'Array') ids.push(item.id); collect(item.children); });
        collect(fields); setCollapsed(new Set(ids)); setRootCollapsed(true);
      }} /></Tooltip>
      {editing && <Button className="capability-spi-tool-import" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>Import JSON</Button>}
    </div></div>
    <div className="capability-spi-tree-scroll"><div className={`capability-spi-field-table ${editing ? 'editing' : ''} ${effectTagOptions ? 'with-effect-tag' : ''}`} role="table">
      <div className="capability-spi-tree-header" role="row"><span role="columnheader">FIELD</span><span role="columnheader">TYPE</span>{effectTagOptions && <span role="columnheader">{effectTagHeader || 'EFFECT TAG'}</span>}<span role="columnheader">DESCRIPTION</span>{editing && <span role="columnheader">OPERATIONS</span>}</div>
      <div className="capability-spi-tree-root" role="row">
        <div role="cell"><Button type="text" size="small" icon={rootCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} aria-label={`${rootCollapsed ? 'Expand' : 'Collapse'} ${title} _order`} onClick={() => setRootCollapsed(!rootCollapsed)} /><Tag color="purple">_order</Tag></div>
        <div role="cell">Object</div>
        {effectTagOptions && <div role="cell">—</div>}
        <div role="cell">—</div>
        {editing && <div role="cell">{(customRoot || catalog.some((node) => !fields.some((field) => field.id === node.id))) && <Tooltip title="Add field under _order"><Button type="text" size="small" icon={<PlusOutlined />} aria-label={`Add field under _order in ${title}`} onClick={() => addField(null)} /></Tooltip>}</div>}
      </div>
      {!rootCollapsed && (fields.length ? fields.map((node) => render(node, 0, null)) : <div className="capability-spi-empty">No fields selected. {editing && <Button type="link" onClick={() => addField(null)}>Add field under _order</Button>}</div>)}
    </div></div></div>
    <Modal title={`Import JSON as ${title}`} open={importOpen} okText="Import" onOk={importJson} onCancel={() => { setImportOpen(false); setJsonError(''); }} destroyOnHidden>
      <Typography.Text type="secondary">Paste a JSON object. Importing replaces the fields currently defined under _order.{!customRoot && ' Public fields must match the template; add new fields under extraRequest or extraResponse.'}</Typography.Text>
      <Input.TextArea value={jsonDraft} onChange={(event) => { setJsonDraft(event.target.value); setJsonError(''); }} placeholder={'{\n  "route": {\n    "channel": "example"\n  }\n}'} autoSize={{ minRows: 10, maxRows: 18 }} status={jsonError ? 'error' : undefined} className="capability-spi-import-json-input" />
      {jsonError && <Typography.Text type="danger" className="capability-spi-import-error">{jsonError}</Typography.Text>}
    </Modal>
  </section>;
}
