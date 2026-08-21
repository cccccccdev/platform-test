import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Drawer, Input, Select, Space, Switch, Tag, Typography } from 'antd';
import { HolderOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;
type ValueOption = { label: string; value: string; type?: string };
type ValueSource = 'endpoint' | 'global';
type ConditionRow = { id: string; relation: 'AND' | 'OR'; leftSource: ValueSource; leftValue: string; leftType: string; operator: string; rightSource: ValueSource; rightValue: string };
type ConditionGroup = { id: string; relation: 'AND' | 'OR'; conditions: ConditionRow[] };
export type ConditionBranchConfig = { branchName: string; scriptMode: boolean; groups: ConditionGroup[]; script: string };

const createRow = (): ConditionRow => ({ id: `condition_${Date.now()}_${Math.random()}`, relation: 'AND', leftSource: 'endpoint', leftValue: '', leftType: '', operator: '', rightSource: 'endpoint', rightValue: '' });
const createGroup = (): ConditionGroup => ({ id: `group_${Date.now()}_${Math.random()}`, relation: 'AND', conditions: [createRow()] });
const operators = ['=', '!=', '>', '>=', '<', '<=', 'contains'].map((value) => ({ value }));
const sourceOptions = [{ value: 'endpoint', label: 'Endpoint Param' }, { value: 'global', label: 'Global Variable' }];

export default function ConditionConfigurationDrawer({ open, targetComponent, fieldOptions, globalVariableOptions = [], value, onClose, onSave, readOnly = false }: { open: boolean; targetComponent: string; fieldOptions: ValueOption[]; globalVariableOptions?: ValueOption[]; value?: ConditionBranchConfig; onClose: () => void; onSave: (value: ConditionBranchConfig) => void; readOnly?: boolean }) {
  const [branchName, setBranchName] = useState('');
  const [scriptMode, setScriptMode] = useState(false);
  const [groups, setGroups] = useState<ConditionGroup[]>([createGroup()]);
  const [script, setScript] = useState('def execute(param) {\n    return false;\n}\n\nexecute(param);');
  const globals = useMemo(() => globalVariableOptions.map((option) => ({ ...option, type: 'String' })), [globalVariableOptions]);

  useEffect(() => {
    if (!open) return;
    setBranchName(value?.branchName ?? '');
    setScriptMode(value?.scriptMode ?? false);
    setGroups(value?.groups?.length ? value.groups.map((group) => ({ ...group, conditions: group.conditions.map((row) => ({ ...row, leftSource: row.leftSource === 'global' ? 'global' : 'endpoint', rightSource: row.rightSource === 'global' ? 'global' : 'endpoint', rightValue: (row.rightSource as string) === 'fixed' ? '' : row.rightValue })) })) : [createGroup()]);
    setScript(value?.script ?? 'def execute(param) {\n    return false;\n}\n\nexecute(param);');
  }, [open, value]);

  const optionsFor = (source: ValueSource) => source === 'global' ? globals : fieldOptions;
  const patchGroup = (groupId: string, updates: Partial<ConditionGroup>) => setGroups((current) => current.map((group) => group.id === groupId ? { ...group, ...updates } : group));
  const patchRow = (group: ConditionGroup, rowId: string, updates: Partial<ConditionRow>) => patchGroup(group.id, { conditions: group.conditions.map((row) => row.id === rowId ? { ...row, ...updates } : row) });
  const selectLeftValue = (group: ConditionGroup, row: ConditionRow, leftValue: string) => {
    const leftType = optionsFor(row.leftSource).find((option) => option.value === leftValue)?.type ?? 'String';
    patchRow(group, row.id, { leftValue, leftType, operator: '', rightValue: '' });
  };

  return <Drawer title="Configure Branch Conditions" width={560} open={open} onClose={onClose} extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => onSave({ branchName, scriptMode, groups, script })}>Save</Button></Space>}>
    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 18 }}>condition -&gt; {targetComponent || 'Unknown'}</div>
    <section>
      <Text strong>Branch Information</Text>
      <div style={{ marginTop: 14 }}><Text strong><span style={{ color: '#ff4d4f' }}>* </span>Branch Name</Text><Input disabled={readOnly} value={branchName} onChange={(event) => setBranchName(event.target.value)} placeholder="e.g. Card payment callback" style={{ marginTop: 7 }} /></div>
      <div style={{ marginTop: 14 }}><Text strong>Target Component</Text><Input disabled value={targetComponent} style={{ marginTop: 7 }} /></div>
    </section>
    <div style={{ borderTop: '1px solid #e5e7eb', margin: '18px 0' }} />
    <Text strong>Condition Expression</Text>
    <Card size="small" style={{ marginTop: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div><Text strong>Script Mode</Text><div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>Use structured condition builder for this branch. Turn on the switch to write a Groovy script instead.</div></div><Switch disabled={readOnly} size="small" checked={scriptMode} onChange={setScriptMode} /></div></Card>
    {scriptMode ? <Input.TextArea disabled={readOnly} value={script} onChange={(event) => setScript(event.target.value)} rows={16} style={{ marginTop: 12, fontFamily: 'monospace', background: '#1f1f1f', color: '#f5f5f5' }} /> : <>
      <Alert banner showIcon={false} type="info" message="Dynamic values inherit their configured type. Only fields matching the left value type can be selected on the right." style={{ margin: '12px 0' }} />
      {groups.map((group, groupIndex) => <div key={group.id} style={{ marginBottom: 12 }}>
        {groupIndex > 0 && <Button size="small" onClick={() => patchGroup(group.id, { relation: group.relation === 'AND' ? 'OR' : 'AND' })}>{group.relation}</Button>}
        <Card size="small" style={{ marginTop: groupIndex > 0 ? 8 : 0 }}>
          <Text strong><span style={{ color: '#ff4d4f' }}>* </span>Condition Group {groupIndex + 1}</Text>
          {group.conditions.map((row, rowIndex) => {
            const rightOptions = optionsFor(row.rightSource).filter((option) => !row.leftType || (option.type ?? 'String') === row.leftType);
            return <div key={row.id} style={{ marginTop: 14 }}>
              {rowIndex > 0 && <Button size="small" style={{ marginBottom: 8 }} onClick={() => patchRow(group, row.id, { relation: row.relation === 'AND' ? 'OR' : 'AND' })}>{row.relation}</Button>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><Text strong style={{ fontSize: 12 }}>Left Value</Text><Tag bordered={false}>{row.leftType || 'Select type'}</Tag></div>
              <Space.Compact block><Select disabled={readOnly} value={row.leftSource} options={sourceOptions} style={{ width: 145 }} onChange={(leftSource: ValueSource) => patchRow(group, row.id, { leftSource, leftValue: '', leftType: '', operator: '', rightValue: '' })} /><Select showSearch disabled={readOnly} value={row.leftValue || undefined} placeholder={row.leftSource === 'endpoint' ? 'Select endpoint param' : 'Select global variable'} options={optionsFor(row.leftSource)} style={{ flex: 1 }} onChange={(leftValue) => selectLeftValue(group, row, leftValue)} /></Space.Compact>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 6px' }}><Text strong style={{ fontSize: 12 }}>Operator</Text>{!row.leftType && <Text type="secondary" style={{ fontSize: 11 }}>Select left type first</Text>}</div>
              <Select disabled={readOnly || !row.leftType} value={row.operator || undefined} options={operators} style={{ width: '100%' }} onChange={(operator) => patchRow(group, row.id, { operator })} />
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 6px' }}><Text strong style={{ fontSize: 12 }}>Right Value</Text><Tag bordered={false}>{row.leftType || 'Type'}</Tag></div>
              <Space.Compact block><Select disabled={readOnly || !row.leftType} value={row.rightSource} options={sourceOptions} style={{ width: 145 }} onChange={(rightSource: ValueSource) => patchRow(group, row.id, { rightSource, rightValue: '' })} /><Select showSearch disabled={readOnly || !row.leftType} value={row.rightValue || undefined} placeholder={row.rightSource === 'endpoint' ? 'Select endpoint param' : 'Select global variable'} options={rightOptions} style={{ flex: 1 }} onChange={(rightValue) => patchRow(group, row.id, { rightValue })} /></Space.Compact>
              <Space style={{ marginTop: 10 }}><Button disabled={readOnly} size="small" icon={<PlusOutlined />} onClick={() => patchGroup(group.id, { conditions: [...group.conditions, createRow()] })}>Add Condition</Button><Button disabled={readOnly || group.conditions.length === 1} size="small" onClick={() => patchGroup(group.id, { conditions: group.conditions.filter((item) => item.id !== row.id) })}>Sub Condition</Button></Space>
            </div>;
          })}
        </Card>
      </div>)}
      <Space><Button disabled={readOnly} icon={<PlusOutlined />} onClick={() => setGroups((current) => [...current, createGroup()])}>Add Group</Button><Button disabled={readOnly || groups.length === 1} onClick={() => setGroups((current) => current.slice(0, -1))}>Sub Group</Button></Space>
      <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', color: '#334155', fontFamily: 'monospace', fontSize: 12 }}>(= =)</div>
    </>}
  </Drawer>;
}

type ConditionBranchSummary = { id: string; name: string; target: string; summary: string };

export function ConditionNodeDrawer({ open, branches, name = 'Condition', endCurrentFlow, onClose, onSave, onSelectBranch, readOnly = false }: { open: boolean; branches: ConditionBranchSummary[]; name?: string; endCurrentFlow: boolean; onClose: () => void; onSave: (value: { name: string; endCurrentFlow: boolean; branchOrder: string[] }) => void; onSelectBranch?: (branchId: string) => void; readOnly?: boolean }) {
  const [conditionName, setConditionName] = useState(name);
  const [endFlow, setEndFlow] = useState(endCurrentFlow);
  const [orderedBranches, setOrderedBranches] = useState<ConditionBranchSummary[]>(branches);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const branchSignature = JSON.stringify(branches);
  useEffect(() => {
    if (!open) return;
    setConditionName(name);
    setEndFlow(endCurrentFlow);
    setOrderedBranches(JSON.parse(branchSignature) as ConditionBranchSummary[]);
    setDraggedId(null);
  }, [open, name, endCurrentFlow, branchSignature]);
  const moveBranch = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setOrderedBranches((current) => {
      const from = current.findIndex((branch) => branch.id === draggedId);
      const to = current.findIndex((branch) => branch.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const divider = <div style={{ borderTop: '1px solid #d9dee8', margin: '24px 0' }} />;
  return <Drawer
    title={<div><div style={{ fontWeight: 600, color: '#1f2a3d' }}>Configure Condition</div><div style={{ fontSize: 13, fontWeight: 400, color: '#71809b', marginTop: 2 }}>Configure branch priority and unmatched handling.</div></div>}
    width={430}
    open={open}
    onClose={onClose}
    footer={!readOnly && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button onClick={onClose}>Cancel</Button><Button type="primary" disabled={!conditionName.trim()} onClick={() => onSave({ name: conditionName.trim(), endCurrentFlow: endFlow, branchOrder: orderedBranches.map((branch) => branch.id) })}>Save</Button></div>}
  >
    <section><h3 style={{ margin: 0, color: '#1f2a3d' }}>Basic Info</h3><div style={{ marginTop: 22 }}><Text strong><span style={{ color: '#ff4d4f' }}>* </span>Name</Text><Input disabled={readOnly} value={conditionName} onChange={(event) => setConditionName(event.target.value)} style={{ marginTop: 8 }} /></div></section>
    {divider}
    <section><h3 style={{ margin: 0, color: '#1f2a3d' }}>Match Strategy</h3><div style={{ marginTop: 22 }}><Text strong>Branch Match Mode</Text><Select disabled value="first_matched" options={[{ value: 'first_matched', label: 'First Matched' }]} style={{ width: '100%', marginTop: 8 }} /><div style={{ color: '#71809b', fontSize: 13, lineHeight: 1.65, marginTop: 12 }}>Fixed to First Matched. Branches are evaluated from top to bottom and execution follows the first match.</div></div></section>
    {divider}
    <section><h3 style={{ margin: 0, color: '#1f2a3d' }}>Branch Order</h3><div style={{ marginTop: 12, display: 'grid', gap: 10 }}>{orderedBranches.map((branch, index) => <div
      key={branch.id}
      draggable={!readOnly}
      onDragStart={() => setDraggedId(branch.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => moveBranch(branch.id)}
      onDragEnd={() => setDraggedId(null)}
      onClick={() => onSelectBranch?.(branch.id)}
      style={{ border: '1px solid #cfd7e5', borderRadius: 8, padding: '13px 14px', background: draggedId === branch.id ? '#f5f8fc' : '#fff', cursor: readOnly ? (onSelectBranch ? 'pointer' : 'default') : 'grab', opacity: draggedId === branch.id ? 0.65 : 1 }}
    ><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HolderOutlined style={{ color: '#8190a8' }} /><Text strong style={{ flex: 1 }}>{branch.name || `Branch ${index + 1}`}</Text><Text style={{ color: '#71809b', fontSize: 13 }}>{branch.target}</Text></div><div style={{ marginTop: 10, padding: '10px 11px', borderRadius: 7, background: '#eef2f7', color: '#243047', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.5 }}>{branch.summary || 'Condition not configured'}</div></div>)}</div><div style={{ color: '#71809b', fontSize: 13, lineHeight: 1.65, marginTop: 14 }}>Drag to change priority. Select a branch to view or edit its conditions.</div></section>
    {divider}
    <section><h3 style={{ margin: 0, color: '#1f2a3d' }}>Default Handling</h3><div style={{ border: '1px solid #cfd7e5', borderRadius: 8, padding: 16, marginTop: 12 }}><Checkbox disabled={readOnly} checked={endFlow} onChange={(event) => setEndFlow(event.target.checked)}>End Current Flow</Checkbox><div style={{ color: '#71809b', fontSize: 13, lineHeight: 1.65, margin: '8px 0 0 28px' }}>Ends the flow normally when no branch matches. When disabled, the flow ends and an alert is triggered.</div></div></section>
  </Drawer>;
}
