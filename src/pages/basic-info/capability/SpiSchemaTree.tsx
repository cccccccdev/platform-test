import { useState } from 'react';
import { Button, Dropdown, Input, message, Modal, Popconfirm, Select, Tag, Tooltip } from 'antd';
import { CaretDownOutlined, CaretRightOutlined, CopyOutlined, DeleteOutlined, DownOutlined, ExclamationCircleFilled, HolderOutlined, MinusSquareOutlined, PlusOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { appendBusinessNode, appendTemplatePlaceholder, findNode, moveBusinessSibling, spiSchemaToMarkdown, updateNodeTree, validateSpiTree, withoutBusinessFields, type SpiFieldNode } from './spiSchemaModel';

const FIELD_TYPES = ['String', 'Integer', 'Long', 'BigDecimal', 'Boolean', 'Object', 'Array'].map((type) => ({ label: type, value: type }));
type DragState = { parentId: string | null; nodeId: string } | null;

interface Props {
  title: string;
  fields: SpiFieldNode[];
  catalog: SpiFieldNode[];
  customRoot?: boolean;
  editing: boolean;
  onChange: (fields: SpiFieldNode[]) => void;
}

export default function SpiSchemaTree({ title, fields, catalog, customRoot = false, editing, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newFieldId, setNewFieldId] = useState<string>();
  const [dragState, setDragState] = useState<DragState>(null);
  const [rootCollapsed, setRootCollapsed] = useState(false);

  const copyMarkdown = async () => {
    const fieldError = validateSpiTree(fields);
    if (fieldError) {
      message.warning(`Complete the fields before copying: ${fieldError}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(spiSchemaToMarkdown(fields));
      message.success(`${title} copied as a Markdown table.`);
    } catch {
      message.error('Could not copy to clipboard.');
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
      ...current, type,
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
      <Tooltip title="Expand all"><Button className="capability-spi-tool-square" aria-label={`Expand all ${title}`} icon={<PlusSquareOutlined />} onClick={() => { setCollapsed(new Set()); setRootCollapsed(false); }} /></Tooltip>
      <Tooltip title="Collapse all"><Button className="capability-spi-tool-square" aria-label={`Collapse all ${title}`} icon={<MinusSquareOutlined />} onClick={() => {
        const ids: string[] = [];
        const collect = (items: SpiFieldNode[]) => items.forEach((item) => { if (item.type === 'Object' || item.type === 'Array') ids.push(item.id); collect(item.children); });
        collect(fields); setCollapsed(new Set(ids)); setRootCollapsed(true);
      }} /></Tooltip>
      <Dropdown menu={{ items: [
        { key: 'markdown', label: 'Markdown' },
        { key: 'json', label: 'JSON', disabled: true, title: 'Coming soon' },
      ], onClick: ({ key }) => { if (key === 'markdown') void copyMarkdown(); } }} trigger={['click']}>
        <Button className="capability-spi-tool-copy" icon={<CopyOutlined />} aria-label={`Copy ${title}`}>
          Copy <DownOutlined className="capability-spi-copy-caret" />
        </Button>
      </Dropdown>
    </div></div>
    <div className="capability-spi-tree-scroll"><div className={`capability-spi-field-table ${editing ? 'editing' : ''}`} role="table">
      <div className="capability-spi-tree-header" role="row"><span role="columnheader">FIELD</span><span role="columnheader">TYPE</span><span role="columnheader">DESCRIPTION</span>{editing && <span role="columnheader">OPERATIONS</span>}</div>
      <div className="capability-spi-tree-root" role="row"><div role="cell"><Button type="text" size="small" icon={rootCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} aria-label={`${rootCollapsed ? 'Expand' : 'Collapse'} ${title} _order`} onClick={() => setRootCollapsed(!rootCollapsed)} /><Tag color="purple">_order</Tag></div><div role="cell">Object</div><div role="cell">—</div>{editing && <div role="cell">{(customRoot || catalog.some((node) => !fields.some((field) => field.id === node.id))) && <Tooltip title="Add field under _order"><Button type="text" size="small" icon={<PlusOutlined />} aria-label={`Add field under _order in ${title}`} onClick={() => addField(null)} /></Tooltip>}</div>}</div>
      {!rootCollapsed && (fields.length ? fields.map((node) => render(node, 0, null)) : <div className="capability-spi-empty">No fields selected. {editing && <Button type="link" onClick={() => addField(null)}>Add field under _order</Button>}</div>)}
    </div></div></div>
  </section>;
}
