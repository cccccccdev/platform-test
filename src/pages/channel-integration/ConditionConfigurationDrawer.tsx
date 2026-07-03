import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Drawer, Input, Select, Space, Switch, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;
type ValueOption = { label: string; value: string; type?: string };
type ConditionRow = { id: string; relation: 'AND' | 'OR'; leftSource: 'field' | 'fixed'; leftValue: string; leftType: string; operator: string; rightSource: 'field' | 'fixed'; rightValue: string };
type ConditionGroup = { id: string; relation: 'AND' | 'OR'; conditions: ConditionRow[] };
export type ConditionBranchConfig = { branchName: string; scriptMode: boolean; groups: ConditionGroup[]; script: string };

const createRow = (): ConditionRow => ({ id: `condition_${Date.now()}_${Math.random()}`, relation: 'AND', leftSource: 'field', leftValue: '', leftType: 'String', operator: '=', rightSource: 'fixed', rightValue: '' });
const createGroup = (): ConditionGroup => ({ id: `group_${Date.now()}_${Math.random()}`, relation: 'AND', conditions: [createRow()] });
const operators = ['=', '!=', '>', '>=', '<', '<=', 'contains', 'exists', 'not exists'].map((value) => ({ value }));
const types = ['String', 'Integer', 'Long', 'Double', 'BigDecimal', 'Boolean'].map((value) => ({ value }));
const noRightValue = ['exists', 'not exists'];

export default function ConditionConfigurationDrawer({ open, targetComponent, fieldOptions, value, onClose, onSave, readOnly = false }: { open: boolean; targetComponent: string; fieldOptions: ValueOption[]; value?: ConditionBranchConfig; onClose: () => void; onSave: (value: ConditionBranchConfig) => void; readOnly?: boolean }) {
  const [branchName, setBranchName] = useState('');
  const [scriptMode, setScriptMode] = useState(false);
  const [groups, setGroups] = useState<ConditionGroup[]>([createGroup()]);
  const [script, setScript] = useState('def execute(param) {\n    return false;\n}\n\nexecute(param);');
  useEffect(() => {
    if (!open) return;
    setBranchName(value?.branchName ?? '');
    setScriptMode(value?.scriptMode ?? false);
    setGroups(value?.groups?.length ? value.groups : [createGroup()]);
    setScript(value?.script ?? 'def execute(param) {\n    return false;\n}\n\nexecute(param);');
  }, [open, value]);
  const patchGroup = (groupId: string, updates: Partial<ConditionGroup>) => setGroups((current) => current.map((group) => group.id === groupId ? { ...group, ...updates } : group));
  const patchRow = (group: ConditionGroup, rowId: string, updates: Partial<ConditionRow>) => patchGroup(group.id, { conditions: group.conditions.map((row) => row.id === rowId ? { ...row, ...updates } : row) });
  return <Drawer title={<Space><span>Configure Branch Conditions</span><Tag color="orange">condition → {targetComponent || 'Unknown'}</Tag></Space>} width={760} open={open} onClose={onClose} extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => onSave({ branchName, scriptMode, groups, script })}>Save</Button></Space>}>
    <Alert type="info" showIcon message="Branches are evaluated in order. The first matched branch is executed." style={{ marginBottom: 14 }} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}><div><Text type="secondary">Branch Name</Text><Input disabled={readOnly} value={branchName} onChange={(event) => setBranchName(event.target.value)} placeholder="e.g. Card payment callback" style={{ marginTop: 6 }} /></div><div><Text type="secondary">Target Component</Text><Input disabled value={targetComponent} style={{ marginTop: 6 }} /></div></div>
    <Card size="small" title={<Space><Switch disabled={readOnly} size="small" checked={scriptMode} onChange={setScriptMode} />Script Mode</Space>}>
      {scriptMode ? <div><Text type="secondary">Return true when this branch should match; otherwise return false.</Text><Input.TextArea value={script} onChange={(event) => setScript(event.target.value)} rows={16} style={{ marginTop: 8, fontFamily: 'monospace', background: '#1f1f1f', color: '#f5f5f5' }} /></div> : <div>
        {groups.map((group, groupIndex) => <div key={group.id}>
          {groupIndex > 0 && <Button size="small" type="dashed" onClick={() => patchGroup(group.id, { relation: group.relation === 'AND' ? 'OR' : 'AND' })}>{group.relation}</Button>}
          <div style={{ marginTop: 8, border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}><div style={{ padding: '9px 12px', background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}><Text strong>Condition Group {groupIndex + 1}</Text><Button disabled={readOnly || groups.length === 1} type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setGroups((current) => current.filter((item) => item.id !== group.id))}>Delete Group</Button></div>
            {group.conditions.map((row, rowIndex) => <div key={row.id} style={{ padding: 10, borderTop: '1px solid #f0f0f0' }}>
              {rowIndex > 0 && <Button size="small" type="dashed" onClick={() => patchRow(group, row.id, { relation: row.relation === 'AND' ? 'OR' : 'AND' })}>{row.relation}</Button>}
              <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(150px,1fr) 120px 110px minmax(150px,1fr) 34px', gap: 8, marginTop: rowIndex > 0 ? 8 : 0 }}>
                <Select disabled={readOnly} value={row.leftSource} options={[{ value: 'field', label: 'Context Field' }, { value: 'fixed', label: 'Fixed Value' }]} onChange={(leftSource) => patchRow(group, row.id, { leftSource })} />
                {row.leftSource === 'field' ? <Select disabled={readOnly} value={row.leftValue || undefined} placeholder="Left field" options={fieldOptions} onChange={(leftValue) => patchRow(group, row.id, { leftValue })} /> : <Input disabled={readOnly} value={row.leftValue} onChange={(event) => patchRow(group, row.id, { leftValue: event.target.value })} placeholder="Left value" />}
                <Select disabled={readOnly || row.leftSource === 'field'} value={row.leftType} options={types} onChange={(leftType) => patchRow(group, row.id, { leftType })} />
                <Select disabled={readOnly} value={row.operator} options={operators} onChange={(operator) => patchRow(group, row.id, { operator })} />
                {noRightValue.includes(row.operator) ? <span /> : row.rightSource === 'field' ? <Select disabled={readOnly} value={row.rightValue || undefined} placeholder="Right field" options={fieldOptions} onChange={(rightValue) => patchRow(group, row.id, { rightValue })} /> : <Input disabled={readOnly} value={row.rightValue} onChange={(event) => patchRow(group, row.id, { rightValue: event.target.value })} placeholder="Fixed value or EMPTY_STR" />}
                <Button disabled={readOnly || group.conditions.length === 1} type="text" danger icon={<DeleteOutlined />} onClick={() => patchGroup(group.id, { conditions: group.conditions.filter((item) => item.id !== row.id) })} />
              </div>
            </div>)}
            <div style={{ padding: 10 }}><Button disabled={readOnly} type="dashed" size="small" icon={<PlusOutlined />} onClick={() => patchGroup(group.id, { conditions: [...group.conditions, createRow()] })}>Add Condition</Button></div>
          </div>
        </div>)}
        <Button disabled={readOnly} style={{ marginTop: 12 }} type="dashed" icon={<PlusOutlined />} onClick={() => setGroups((current) => [...current, createGroup()])}>Add Group</Button>
      </div>}
    </Card>
  </Drawer>;
}

export function ConditionNodeDrawer({ open, branches, endCurrentFlow, onClose, onSave, readOnly = false }: { open: boolean; branches: Array<{ name: string; target: string; summary: string }>; endCurrentFlow: boolean; onClose: () => void; onSave: (value: { endCurrentFlow: boolean }) => void; readOnly?: boolean }) {
  const [endFlow, setEndFlow] = useState(endCurrentFlow);
  useEffect(() => { if (open) setEndFlow(endCurrentFlow); }, [open, endCurrentFlow]);
  return <Drawer title="condition Configuration" width={620} open={open} onClose={onClose} extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => onSave({ endCurrentFlow: endFlow })}>Save</Button></Space>}>
    <div style={{ marginBottom: 14 }}><Text type="secondary">Branch Match Mode</Text><Select disabled value="first_matched" options={[{ value: 'first_matched', label: 'First Matched' }]} style={{ width: '100%', marginTop: 6 }} /></div>
    <Card size="small" title="Branch Order"><Text type="secondary">Branches follow the outgoing connection order. Click an outgoing line to configure its expression.</Text>{branches.map((branch, index) => <div key={`${branch.target}_${index}`} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><Space><Tag>{index + 1}</Tag><Text strong>{branch.name || `Branch ${index + 1}`}</Text><Text>→ {branch.target}</Text></Space><div style={{ color: '#8c8c8c', fontSize: 11, margin: '4px 0 0 34px' }}>{branch.summary || 'Condition not configured'}</div></div>)}</Card>
    <Checkbox disabled={readOnly} checked={endFlow} onChange={(event) => setEndFlow(event.target.checked)} style={{ marginTop: 16 }}>End Current Flow when no branch matches</Checkbox>
  </Drawer>;
}
