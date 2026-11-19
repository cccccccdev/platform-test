import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Alert, Button, Checkbox, Drawer, Input, Segmented, Select, Space, Switch, Tag, Typography, message } from 'antd';
import { AlignLeftOutlined, CloseOutlined, HolderOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import MappingOperationSelector, { type MappingOperationConfig } from './MappingOperationSelector';
import { mappingOperationOptions } from './mappingOperationOptions';
import { operationNeedsConfig } from './operationConfigs';

const { Text } = Typography;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

type ValueOption = { label: string; value: string; type?: string };
/** 取值来源：SPI 字段 / Global Variable。生产下拉即这两项。 */
type ValueSource = 'spi' | 'global';
type ConditionRow = { id: string; relation: 'AND' | 'OR'; leftSource: ValueSource; leftValue: string; leftType: string; leftOperation?: string[]; leftOperationConfig?: MappingOperationConfig; operator: string; rightSource: ValueSource; rightValue: string; rightOperation?: string[]; rightOperationConfig?: MappingOperationConfig };
type ConditionGroup = { id: string; relation: 'AND' | 'OR'; conditions: ConditionRow[] };
export type ConditionBranchConfig = { branchName: string; scriptMode: boolean; groups: ConditionGroup[]; script: string };

const sourceOptions = [{ value: 'spi', label: 'SPI Field' }, { value: 'global', label: 'Global Variable' }];

/**
 * 取值转换的操作类：直接复用字段映射的那份清单，只剔除 CONDITIONAL ASSIGNMENT
 * ——条件分支里再嵌一层条件赋值没有语义，也会让求值变成递归。
 */
const conditionOperationOptions = mappingOperationOptions.filter((option) => option.value !== 'conditional-assignment');

/** 运算符按左值类型过滤；生产把这份清单称为「{type} operators」。 */
const normalizeConditionType = (type?: string): string => {
  const t = (type ?? '').trim().toLowerCase();
  if (t === 'bigdecimal' || t === 'big decimal' || t === 'decimal') return 'bigDecimal';
  if (t === 'integer' || t === 'int') return 'integer';
  if (t === 'long') return 'long';
  if (t === 'double' || t === 'float') return 'double';
  if (t === 'boolean' || t === 'bool') return 'boolean';
  if (t === 'byte[]' || t === 'byte' || t === 'bytes') return 'byte[]';
  if (t === 'file') return 'file';
  if (t === 'date') return 'date';
  return 'string';
};

/**
 * 九种类型各自的运算符集合。
 * 基线取自生产：String 有 contains 与四个空值类；数值型有区间与 is null / is not null，没有 is empty。
 * 本期新增：String 的 in / starts with / ends with、数值型的 in、Big decimal 的两个空值类。
 * file 只有 is null / is not null；byte[] / date 按 5.3 矩阵（均已确认，见 PRD 8.1 D-015 / D-016）。
 */
const OPERATORS_BY_TYPE: Record<string, string[]> = {
  string: ['=', '!=', 'in', 'contains', 'starts with', 'ends with', 'is null', 'is not null', 'is empty', 'is not empty'],
  integer: ['=', '!=', '>', '>=', '<', '<=', 'in', 'is null', 'is not null'],
  long: ['=', '!=', '>', '>=', '<', '<=', 'in', 'is null', 'is not null'],
  double: ['=', '!=', '>', '>=', '<', '<=', 'in', 'is null', 'is not null'],
  bigDecimal: ['=', '!=', '>', '>=', '<', '<=', 'in', 'is null', 'is not null'],
  date: ['=', '!=', '>', '>=', '<', '<=', 'is null', 'is not null'],
  boolean: ['='],
  'byte[]': ['=', '!=', 'is null', 'is not null'],
  file: ['is null', 'is not null'],
};
const operatorsFor = (type?: string) => OPERATORS_BY_TYPE[normalizeConditionType(type)] ?? OPERATORS_BY_TYPE.string;
const isBooleanType = (type?: string) => normalizeConditionType(type) === 'boolean';
/**
 * 空值类运算符：不需要右值。
 * is empty / is not empty 与 is null / is not null 并存，语义区分与字段映射条件赋值一致。
 */
const VALUELESS_OPERATORS = new Set(['is empty', 'is not empty', 'is null', 'is not null']);
const isValueless = (operator: string) => VALUELESS_OPERATORS.has(operator);
/** Boolean 左值的右值只有这两个，用按钮二选一。 */
const booleanValueOptions = [{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }];

const GROOVY_TEMPLATE = `def execute(param) {
    // TODO: read values from param after the input contract is finalized.
    // Return true when this branch should match; otherwise return false.
    return false;
}

execute(param);`;

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
const createRow = (): ConditionRow => ({ id: uid('condition'), relation: 'AND', leftSource: 'spi', leftValue: '', leftType: '', operator: '', rightSource: 'spi', rightValue: '' });
const createGroup = (): ConditionGroup => ({ id: uid('group'), relation: 'AND', conditions: [createRow()] });

/** 旧数据里来源可能是 endpoint，统一收敛为 spi，避免 Select 回显成空白。 */
const normalizeSource = (source: unknown): ValueSource => (source === 'global' ? 'global' : 'spi');

/** 深色 Groovy 编辑器：行号 + 格式化 + 重置，对应生产里的脚本输入区。 */
function ScriptEditor({ value, readOnly, onChange }: { value: string; readOnly: boolean; onChange: (next: string) => void }) {
  const lines = value.split('\n');
  const format = () => onChange(lines.map((line) => line.replace(/\s+$/g, '')).join('\n').trim());
  return <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid #303030', background: '#1f1f1f' }}>
    <div style={{ position: 'absolute', top: 6, right: 8, zIndex: 2, display: 'flex', gap: 2 }}>
      <Button type="text" size="small" aria-label="Format script" title="Format script" disabled={readOnly} icon={<AlignLeftOutlined />} style={{ color: '#bfbfbf' }} onClick={format} />
      <Button type="text" size="small" aria-label="Reset script" title="Reset to template" disabled={readOnly} icon={<CloseOutlined />} style={{ color: '#bfbfbf' }} onClick={() => onChange(GROOVY_TEMPLATE)} />
    </div>
    <div style={{ display: 'flex', maxHeight: 330, overflow: 'auto' }}>
      <pre style={{
        margin: 0,
        padding: '12px 8px 12px 10px',
        textAlign: 'right',
        color: '#5f6672',
        fontSize: 11.5,
        lineHeight: '18px',
        userSelect: 'none',
        background: '#191919',
        minWidth: 34,
      }}>{lines.map((_, index) => index + 1).join('\n')}</pre>
      <textarea
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        rows={Math.max(lines.length, 10)}
        onChange={(event) => onChange(event.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          resize: 'vertical',
          border: 0,
          outline: 'none',
          background: 'transparent',
          color: '#e8e8e8',
          fontFamily: MONO,
          fontSize: 11.5,
          lineHeight: '18px',
          padding: '12px 10px',
        }}
      />
    </div>
  </div>;
}

export default function ConditionConfigurationDrawer({ open, targetComponent, fieldOptions, globalVariableOptions = [], value, onClose, onSave, readOnly = false }: { open: boolean; targetComponent: string; fieldOptions: ValueOption[]; globalVariableOptions?: ValueOption[]; value?: ConditionBranchConfig; onClose: () => void; onSave: (value: ConditionBranchConfig) => void; readOnly?: boolean }) {
  const [branchName, setBranchName] = useState('');
  const [scriptMode, setScriptMode] = useState(false);
  const [groups, setGroups] = useState<ConditionGroup[]>([createGroup()]);
  const [script, setScript] = useState(GROOVY_TEMPLATE);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const globals = useMemo(() => globalVariableOptions.map((option) => ({ ...option, type: option.type ?? 'String' })), [globalVariableOptions]);

  useEffect(() => {
    if (!open) return;
    setBranchName(value?.branchName ?? '');
    setScriptMode(value?.scriptMode ?? false);
    setGroups(value?.groups?.length
      ? value.groups.map((group) => ({
        ...group,
        conditions: group.conditions.map((row) => ({
          ...row,
          leftSource: normalizeSource(row.leftSource),
          rightSource: normalizeSource(row.rightSource),
          rightValue: isValueless(row.operator) ? '' : row.rightValue,
        })),
      }))
      : [createGroup()]);
    setScript(value?.script ?? GROOVY_TEMPLATE);
    setSubmitAttempted(false);
  }, [open, value]);

  const optionsFor = (source: ValueSource) => source === 'global' ? globals : fieldOptions;
  const patchGroup = (groupId: string, updates: Partial<ConditionGroup>) => setGroups((current) => current.map((group) => group.id === groupId ? { ...group, ...updates } : group));
  const patchRow = (group: ConditionGroup, rowId: string, updates: Partial<ConditionRow>) => patchGroup(group.id, { conditions: group.conditions.map((row) => row.id === rowId ? { ...row, ...updates } : row) });
  const selectLeftValue = (group: ConditionGroup, row: ConditionRow, leftValue: string) => {
    const leftType = optionsFor(row.leftSource).find((option) => option.value === leftValue)?.type ?? 'String';
    // 左值换了类型，原运算符与已叠加的取值转换可能都不再适用，一并清空，避免存下类型不匹配的配置。
    // Boolean 例外：运算符固定为 `=`，直接补齐而不是清空。
    patchRow(group, row.id, {
      leftValue,
      leftType,
      leftOperation: undefined,
      leftOperationConfig: undefined,
      operator: isBooleanType(leftType) ? '=' : '',
      rightValue: '',
      rightOperation: undefined,
      rightOperationConfig: undefined,
    });
  };

  /**
   * 校验只在点过 Save 之后显示，避免刚打开就满屏红字。
   * 生产的报错是「类型 + 取值」两条并列（取值是复合控件：来源 + 字段），这里照此还原。
   */
  const showErrors = submitAttempted && !readOnly;
  const errorsFor = (row: ConditionRow) => {
    if (!showErrors) return {} as { leftType?: string; leftValue?: string; leftOperation?: string; operator?: string; rightType?: string; rightValue?: string; rightOperation?: string };
    const errors: { leftType?: string; leftValue?: string; leftOperation?: string; operator?: string; rightType?: string; rightValue?: string; rightOperation?: string } = {};
    if (!row.leftValue) {
      errors.leftType = 'Left Type is required.';
      errors.leftValue = 'Left Value is required.';
    }
    // Boolean 左值：运算符固定、左右值操作类不参与，只校验右值二选一。
    if (isBooleanType(row.leftType)) {
      if (row.rightValue !== 'true' && row.rightValue !== 'false') errors.rightValue = 'Select True or False.';
      return errors;
    }
    // 选了需要配置的操作类但没配置，同样拦住保存（红框由操作类选择器自己画）。
    if (operationNeedsConfig(row.leftOperation) && !row.leftOperationConfig) errors.leftOperation = 'Left Operation configuration is required.';
    if (!row.operator) errors.operator = 'Operator is required.';
    // 空值运算符不需要右值；运算符还没选时右值同样算缺失。
    if (!row.operator || !isValueless(row.operator)) {
      if (!row.rightValue) {
        errors.rightType = 'Right Type is required.';
        errors.rightValue = 'Right Value is required.';
      }
      if (operationNeedsConfig(row.rightOperation) && !row.rightOperationConfig) errors.rightOperation = 'Right Operation configuration is required.';
    }
    return errors;
  };

  const describeRow = (row: ConditionRow) => {
    const right = isValueless(row.operator) ? '' : (row.rightValue || '-');
    return `${row.leftValue || '-'} ${row.operator || '-'}${right ? ` ${right}` : ''}`;
  };
  const describeGroup = (group: ConditionGroup) => group.conditions
    .map((row, index) => index === 0 ? describeRow(row) : `${row.relation} ${describeRow(row)}`)
    .join(' ');
  const expression = scriptMode
    ? 'Custom script'
    : `( ${groups.map((group, index) => index === 0 ? describeGroup(group) : `${group.relation} ${describeGroup(group)}`).join(' ')} )`;
  const branchNameError = showErrors && !branchName.trim();
  const errorText: CSSProperties = { color: '#ff4d4f', fontSize: 11, marginTop: 4, lineHeight: 1.5 };

  const save = () => {
    setSubmitAttempted(true);
    if (readOnly) return;
    if (!branchName.trim()) return;
    if (!scriptMode) {
      const incomplete = groups.some((group) => group.conditions.length === 0 || group.conditions.some((row) => {
        if (!row.leftValue) return true;
        // Boolean 左值：运算符固定为 `=`，没有操作类，只看右值是否二选一。
        if (isBooleanType(row.leftType)) return row.rightValue !== 'true' && row.rightValue !== 'false';
        if (!row.operator) return true;
        if (operationNeedsConfig(row.leftOperation) && !row.leftOperationConfig) return true;
        if (!isValueless(row.operator)) {
          if (!row.rightValue) return true;
          if (operationNeedsConfig(row.rightOperation) && !row.rightOperationConfig) return true;
        }
        return false;
      }));
      if (incomplete) {
        message.error('Complete every highlighted field before saving.');
        return;
      }
    }
    onSave({ branchName: branchName.trim(), scriptMode, groups, script });
  };

  const header = <div style={{ fontSize: 12, color: '#8c8c8c' }}>condition &gt; {targetComponent || 'Unknown'}</div>;

  return <Drawer
    title="Configure Branch Conditions"
    width={600}
    open={open}
    onClose={onClose}
    footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={readOnly ? onClose : save}>{readOnly ? 'Close' : 'Save'}</Button></div>}
  >
    {header}

    <section style={{ marginTop: 16 }}>
      <Text strong style={{ fontSize: 13 }}>Branch Information</Text>
      <div style={{ marginTop: 14 }}>
        <Text strong style={{ fontSize: 12 }}><span style={{ color: '#ff4d4f' }}>* </span>Branch Name</Text>
        <Input disabled={readOnly} status={branchNameError ? 'error' : undefined} value={branchName} onChange={(event) => setBranchName(event.target.value)} placeholder="e.g. Card payment callback" style={{ marginTop: 7 }} />
        {branchNameError && <div style={errorText}>Branch Name is required.</div>}
      </div>
      <div style={{ marginTop: 14 }}>
        <Text strong style={{ fontSize: 12 }}>Target Component</Text>
        <Input disabled value={targetComponent} style={{ marginTop: 7 }} />
      </div>
    </section>

    <div style={{ borderTop: '1px solid #f0f0f0', margin: '18px 0' }} />

    <section>
      <Text strong style={{ fontSize: 13 }}>Condition Expression</Text>
      <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <Text strong style={{ fontSize: 12 }}>Script Mode</Text>
            <div style={{ color: '#8c8c8c', fontSize: 11.5, marginTop: 5, lineHeight: 1.5 }}>
              {scriptMode
                ? 'Use Groovy script for this branch expression. The structured condition builder is hidden while this mode is enabled.'
                : 'Use structured condition builder for this branch. Turn on the switch to write a Groovy script instead.'}
            </div>
          </div>
          <Switch disabled={readOnly} size="small" checked={scriptMode} onChange={setScriptMode} />
        </div>
      </div>
    </section>

    {scriptMode ? <section style={{ marginTop: 16 }}>
      <div style={{ marginTop: 2 }}>
        <Text strong style={{ fontSize: 12 }}><span style={{ color: '#ff4d4f' }}>* </span>Custom Script</Text>
        <div style={{ marginTop: 7 }}><ScriptEditor value={script} readOnly={readOnly} onChange={setScript} /></div>
      </div>
      <div style={{ color: '#8c8c8c', fontSize: 11.5, lineHeight: 1.6, marginTop: 12 }}>
        Script input and output contracts will be finalized during development. This branch uses the same First Matched order as structured branches.
      </div>
      <div style={{ color: '#8c8c8c', fontSize: 11.5, marginTop: 6 }}>Please write in Groovy.</div>
    </section> : <>
      <Alert
        type="info"
        showIcon={false}
        message="Dynamic values inherit their configured type. Only fields matching the left value type can be selected on the right."
        style={{ margin: '14px 0', background: '#e6f4ff', border: '1px solid #bae0ff', fontSize: 11.5 }}
      />
      {groups.map((group, groupIndex) => <div key={group.id}>
        {groupIndex > 0 && <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
          <Button
            size="small"
            shape="round"
            disabled={readOnly}
            onClick={() => patchGroup(group.id, { relation: group.relation === 'AND' ? 'OR' : 'AND' })}
            style={{ minWidth: 66, fontSize: 11, letterSpacing: 0.6, fontWeight: 600, color: '#1f2a3d', borderColor: '#cfd7e5' }}
          >{group.relation}</Button>
        </div>}
        <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ flex: 1, fontSize: 12 }}><span style={{ color: '#ff4d4f' }}>* </span>Condition Group {groupIndex + 1}</Text>
          </div>

          {group.conditions.map((row, rowIndex) => {
            const booleanLeft = isBooleanType(row.leftType);
            const rightOptions = optionsFor(row.rightSource).filter((option) => !row.leftType || (option.type ?? 'String') === row.leftType);
            const valueless = isValueless(row.operator);
            const errors = errorsFor(row);
            const typeTag = (empty: boolean, message?: string) => (
              <Tag
                style={{
                  margin: 0,
                  fontSize: 10.5,
                  background: '#fff',
                  color: message ? '#ff4d4f' : '#8c8c8c',
                  borderColor: message ? '#ff4d4f' : '#e5e7eb',
                }}
              >{empty ? 'Select type' : row.leftType}</Tag>
            );
            return <div key={row.id} style={{ marginTop: rowIndex === 0 ? 12 : 16 }}>
              {rowIndex > 0 && <div style={{ marginBottom: 8 }}>
                <Button size="small" shape="round" disabled={readOnly} onClick={() => patchRow(group, row.id, { relation: row.relation === 'AND' ? 'OR' : 'AND' })} style={{ minWidth: 54, fontSize: 10.5, fontWeight: 600, color: '#1f2a3d' }}>{row.relation}</Button>
              </div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text strong style={{ fontSize: 12 }}>Left Value</Text>
                {typeTag(!row.leftType, errors.leftType)}
              </div>
              <Space.Compact block>
                <Select
                  disabled={readOnly}
                  value={row.leftSource}
                  options={sourceOptions}
                  status={errors.leftValue ? 'error' : undefined}
                  style={{ width: 132 }}
                  onChange={(leftSource: ValueSource) => patchRow(group, row.id, { leftSource, leftValue: '', leftType: '', leftOperation: undefined, leftOperationConfig: undefined, operator: '', rightValue: '' })}
                />
                <Select
                  showSearch
                  disabled={readOnly}
                  value={row.leftValue || undefined}
                  placeholder={row.leftSource === 'global' ? 'Select global variable' : 'Select SPI field'}
                  optionFilterProp="label"
                  options={optionsFor(row.leftSource)}
                  status={errors.leftValue ? 'error' : undefined}
                  style={{ flex: 1 }}
                  onChange={(leftValue) => selectLeftValue(group, row, leftValue)}
                />
              </Space.Compact>
              {errors.leftType && <div style={errorText}>{errors.leftType}</div>}
              {errors.leftValue && <div style={errorText}>{errors.leftValue}</div>}

              {/* Boolean 左值没有可转换的对象（值只有 True / False），整段不渲染。 */}
              {!booleanLeft && <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
                  <Text strong style={{ fontSize: 12 }}>Left Operation</Text>
                  {typeTag(!row.leftType, errors.leftOperation)}
                </div>
                <MappingOperationSelector
                  value={row.leftOperation}
                  config={row.leftOperationConfig}
                  placeholder="Optional"
                  options={conditionOperationOptions}
                  fieldOptions={optionsFor(row.leftSource).map((option) => ({ label: option.label, value: option.value }))}
                  readOnly={readOnly}
                  onChange={(leftOperation, leftOperationConfig) => patchRow(group, row.id, { leftOperation, leftOperationConfig })}
                />
                {errors.leftOperation && <div style={errorText}>{errors.leftOperation}</div>}
              </>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
                <Text strong style={{ fontSize: 12 }}>Operator</Text>
                <Text type="secondary" style={{ fontSize: 10.5 }}>{booleanLeft ? 'Fixed for Boolean' : row.leftType ? `${row.leftType} operators` : 'Select left type first'}</Text>
              </div>
              <Select
                disabled={readOnly || !row.leftType || booleanLeft}
                value={booleanLeft ? '=' : row.operator || undefined}
                placeholder="Select operator"
                options={operatorsFor(row.leftType).map((operator) => ({ value: operator, label: operator }))}
                status={errors.operator ? 'error' : undefined}
                style={{ width: '100%' }}
                onChange={(operator) => patchRow(group, row.id, { operator, rightValue: '', rightOperation: undefined, rightOperationConfig: undefined })}
              />
              {errors.operator && <div style={errorText}>{errors.operator}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
                <Text strong style={{ fontSize: 12 }}>Right Value</Text>
                {typeTag(!row.leftType, errors.rightType)}
              </div>
              {booleanLeft
                ? <>
                  <Segmented
                    block
                    disabled={readOnly}
                    value={row.rightValue === 'true' || row.rightValue === 'false' ? row.rightValue : undefined}
                    options={booleanValueOptions}
                    onChange={(next) => patchRow(group, row.id, { rightValue: String(next) })}
                  />
                  {errors.rightValue && <div style={errorText}>{errors.rightValue}</div>}
                </>
                : valueless
                ? <Input disabled value="—" />
                : <Space.Compact block>
                  <Select
                    disabled={readOnly || !row.leftType}
                    value={row.rightSource}
                    options={sourceOptions}
                    status={errors.rightValue ? 'error' : undefined}
                    style={{ width: 132 }}
                    onChange={(rightSource: ValueSource) => patchRow(group, row.id, { rightSource, rightValue: '', rightOperation: undefined, rightOperationConfig: undefined })}
                  />
                  <Select
                    showSearch
                    disabled={readOnly || !row.leftType}
                    value={row.rightValue || undefined}
                    placeholder={row.rightSource === 'global' ? 'Select global variable' : 'Select SPI field'}
                    optionFilterProp="label"
                    options={rightOptions}
                    status={errors.rightValue ? 'error' : undefined}
                    style={{ flex: 1 }}
                    onChange={(rightValue) => patchRow(group, row.id, { rightValue, rightOperation: undefined, rightOperationConfig: undefined })}
                  />
                </Space.Compact>}
              {errors.rightType && <div style={errorText}>{errors.rightType}</div>}
              {errors.rightValue && <div style={errorText}>{errors.rightValue}</div>}

              {/* 空值运算符没有右值可取，Boolean 的右值只有 True/False，两种情况都没有可转换的对象。 */}
              {!valueless && !booleanLeft && <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
                  <Text strong style={{ fontSize: 12 }}>Right Operation</Text>
                  {typeTag(!row.leftType, errors.rightOperation)}
                </div>
                <MappingOperationSelector
                  value={row.rightOperation}
                  config={row.rightOperationConfig}
                  placeholder="Optional"
                  options={conditionOperationOptions}
                  fieldOptions={optionsFor(row.rightSource).map((option) => ({ label: option.label, value: option.value }))}
                  readOnly={readOnly}
                  onChange={(rightOperation, rightOperationConfig) => patchRow(group, row.id, { rightOperation, rightOperationConfig })}
                />
                {errors.rightOperation && <div style={errorText}>{errors.rightOperation}</div>}
              </>}

              <Space style={{ marginTop: 10 }}>
                <Button disabled={readOnly} size="small" icon={<PlusOutlined />} onClick={() => patchGroup(group.id, { conditions: [...group.conditions, createRow()] })}>Add Condition</Button>
                <Button disabled={readOnly || group.conditions.length === 1} size="small" icon={<MinusOutlined />} onClick={() => patchGroup(group.id, { conditions: group.conditions.filter((item) => item.id !== row.id) })}>Remove Condition</Button>
              </Space>
            </div>;
          })}
        </div>
      </div>)}

      <Space style={{ marginTop: 12 }}>
        <Button disabled={readOnly} icon={<PlusOutlined />} onClick={() => setGroups((current) => [...current, createGroup()])}>Add Group</Button>
        <Button disabled={readOnly || groups.length === 1} icon={<MinusOutlined />} onClick={() => setGroups((current) => current.slice(0, -1))}>Remove Group</Button>
      </Space>

      <div style={{
        marginTop: 14,
        marginBottom: 8,
        padding: '9px 12px',
        borderRadius: 6,
        background: '#f5f7fa',
        border: '1px solid #eef2f7',
        color: '#41506b',
        fontFamily: MONO,
        fontSize: 11.5,
        letterSpacing: 0.6,
        wordBreak: 'break-all',
      }}>{expression}</div>
    </>}
  </Drawer>;
}

type ConditionBranchSummary = { id: string; name: string; target: string; summary: string };

export function ConditionNodeDrawer({ open, branches, name = 'Condition', endCurrentFlow, onClose, onSave, onSelectBranch, readOnly = false }: { open: boolean; branches: ConditionBranchSummary[]; name?: string; endCurrentFlow: boolean; onClose: () => void; onSave: (value: { name: string; endCurrentFlow: boolean; branchOrder: string[] }) => void; onSelectBranch?: (branchId: string) => void; readOnly?: boolean }) {
  const [conditionName, setConditionName] = useState(name);
  const [endFlow, setEndFlow] = useState(endCurrentFlow);
  const [orderedBranches, setOrderedBranches] = useState<ConditionBranchSummary[]>([]);
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
    ><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HolderOutlined style={{ color: '#8190a8' }} /><Text strong style={{ flex: 1 }}>{branch.name || `Branch ${index + 1}`}</Text><Text style={{ color: '#71809b', fontSize: 13 }}>{branch.target}</Text></div><div style={{ marginTop: 10, padding: '10px 11px', borderRadius: 7, background: '#eef2f7', color: '#243047', fontFamily: MONO, fontSize: 12, lineHeight: 1.5 }}>{branch.summary || 'Condition not configured'}</div></div>)}</div><div style={{ color: '#71809b', fontSize: 13, lineHeight: 1.65, marginTop: 14 }}>Drag to change priority. Select a branch to view or edit its conditions.</div></section>
    {divider}
    <section><h3 style={{ margin: 0, color: '#1f2a3d' }}>Default Handling</h3><div style={{ border: '1px solid #cfd7e5', borderRadius: 8, padding: 16, marginTop: 12 }}><Checkbox disabled={readOnly} checked={endFlow} onChange={(event) => setEndFlow(event.target.checked)}>End Current Flow</Checkbox><div style={{ color: '#71809b', fontSize: 13, lineHeight: 1.65, margin: '8px 0 0 28px' }}>Ends the flow normally when no branch matches. When disabled, the flow ends and an alert is triggered.</div></div></section>
  </Drawer>;
}
