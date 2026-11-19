/**
 * 条件赋值配置弹窗（操作类方案，单目标字段）。
 *
 * 一条字段行选中 conditional assignment 操作类后，该行字段的取值由本弹窗决定：
 * - WHEN：结构化条件组（组间或、组内且/或），条件左值从字段候选树选择，按字段 Type 过滤运算符。
 * - THEN：命中后该行字段的取值（来源字段 / 固定值），可叠加 Operation，最终写入目标字段（该行 FIELD 名）。
 * - DEFAULT：无分支命中时的兜底取值（必配）。
 * - 分支自上而下 First Matched。
 *
 * 交互与视觉对齐 `ConditionConfigurationDrawer`（condition 组件已在生产）：纵向堆叠字段、
 * 标签右侧 Type 反显小组件、圆形 AND/OR 连接器、字段级红框与逐条错误文案、底部表达式预览。
 * 条件左值 / 右值下方各有一个操作类选择框（复用字段映射的 operation 选择器）。
 */
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Alert, Button, Cascader, Input, Modal, Segmented, Select, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, DownOutlined, MinusOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import MappingOperationSelector, { type MappingOperationConfig, type MappingOperationOption } from './MappingOperationSelector';
import { operationNeedsConfig } from './operationConfigs';
import { operationResultType } from './operationResultType';
import {
  conditionOperatorOptions,
  conditionOperatorsForType,
  conditionalFieldTypeById,
  createBranch,
  createCondition,
  createConditionGroup,
  createInitialConfig,
  isBooleanFieldType,
  operatorNeedsRight,
  validateConditionalAssignmentDraft,
  type ConditionalAssignmentBranch,
  type ConditionalAssignmentConfig,
  type ConditionalAssignmentCondition,
  type ConditionalAssignmentConditionGroup,
  type ConditionalAssignmentField,
} from './conditionalAssignmentModel';

const { Text } = Typography;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/** 取值方式下拉：沿用 condition 右值的「紧凑组里一个 132px 下拉 + 取值控件」形态。 */
const valueModeOptions = [{ label: 'Fixed Value', value: 'fixed' }, { label: 'Field', value: 'field' }];

/** Boolean 左值的右值只有这两个，用按钮二选一，不给文本输入。 */
const booleanValueOptions = [{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }];

interface Props {
  config?: ConditionalAssignmentConfig;
  /** 条件左值与字段取值的候选（SPI 候选树拍平后的字段列表，带 path 与 type）。 */
  startFields: ConditionalAssignmentField[];
  /** 本行字段名（目标字段，只读展示）。 */
  targetLabel?: string;
  /** 本行目标字段声明的类型（THEN/DEFAULT 的 Target Field 右上角回显）；取不到时显示「—」。 */
  targetType?: string;
  /** THEN/DEFAULT 叠加 Operation 的候选（去掉 conditional-assignment 自身，避免嵌套）。 */
  operationOptions: MappingOperationOption[];
  /** 字段选择框的占位提示（request 用 SPI 字段，response 用外部 API 字段名）。 */
  fieldPlaceholder?: string;
  onCancel: () => void;
  onConfirm: (config: ConditionalAssignmentConfig) => void;
}

interface FieldTreeNode {
  label: string;
  value: string;
  children?: FieldTreeNode[];
}

/** 把拍平字段列表重建为分级 Cascader 树（节点 value = 逐级点分完整路径，与字段行 Cascader 一致）。 */
const buildFieldTree = (fields: ConditionalAssignmentField[]): FieldTreeNode[] => {
  const root: FieldTreeNode[] = [];
  const nodeMap = new Map<string, FieldTreeNode>();
  for (const field of fields) {
    const path = field.path && field.path.length ? field.path : (field.id ? field.id.split('.') : []);
    if (!path.length) continue;
    let level = root;
    for (let i = 0; i < path.length; i += 1) {
      const value = path.slice(0, i + 1).join('.');
      const label = path[i];
      let node = nodeMap.get(value);
      if (!node) {
        node = { label, value };
        nodeMap.set(value, node);
        level.push(node);
      }
      if (i < path.length - 1) {
        node.children = node.children ?? [];
        level = node.children;
      }
    }
  }
  return root;
};

/** 字段 id（点分路径）→ Cascader 选中值数组（逐级点分完整路径）。 */
const idToPath = (id?: string): string[] | undefined => {
  if (!id) return undefined;
  const segs = id.split('.');
  return segs.map((_, i) => segs.slice(0, i + 1).join('.'));
};

const operatorLabel = (operator?: string): string =>
  conditionOperatorOptions.find((option) => option.value === operator)?.label ?? '';

export default function ConditionalAssignmentConfigModal({ config, startFields, targetLabel, targetType, operationOptions, fieldPlaceholder = 'Select SPI field', onCancel, onConfirm }: Props) {
  const fieldTree = useMemo(() => buildFieldTree(startFields), [startFields]);
  const typeById = (id?: string) => conditionalFieldTypeById(startFields, id);
  const operationOptionsWithoutConditional = useMemo(
    () => operationOptions.filter((option) => option.value !== 'conditional-assignment'),
    [operationOptions],
  );

  const [draft, setDraft] = useState<ConditionalAssignmentConfig>(() =>
    config ? JSON.parse(JSON.stringify(config)) as ConditionalAssignmentConfig : createInitialConfig());
  const [error, setError] = useState<string | undefined>();
  /** 校验只在点过 Confirm 之后显示，避免刚打开就满屏红字（与 condition 一致）。 */
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const update = (mutate: (next: ConditionalAssignmentConfig) => void) => {
    const next = JSON.parse(JSON.stringify(draft)) as ConditionalAssignmentConfig;
    mutate(next);
    setDraft(next);
    setError(undefined);
  };

  const updateBranch = (branchId: string, mutate: (branch: ConditionalAssignmentBranch) => void) =>
    update((next) => {
      const branch = next.branches.find((item) => item.id === branchId);
      if (branch) mutate(branch);
    });

  const updateGroup = (branchId: string, groupId: string, mutate: (group: ConditionalAssignmentConditionGroup) => void) =>
    updateBranch(branchId, (branch) => {
      const group = branch.groups.find((item) => item.id === groupId);
      if (group) mutate(group);
    });

  const updateCondition = (branchId: string, groupId: string, conditionId: string, updates: Partial<ConditionalAssignmentCondition>) =>
    updateGroup(branchId, groupId, (group) => {
      const condition = group.conditions.find((item) => item.id === conditionId);
      if (condition) Object.assign(condition, updates);
    });

  const moveBranch = (branchId: string, offset: -1 | 1) =>
    update((next) => {
      const index = next.branches.findIndex((item) => item.id === branchId);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= next.branches.length) return;
      const [item] = next.branches.splice(index, 1);
      next.branches.splice(target, 0, item);
    });

  const handleConfirm = () => {
    setSubmitAttempted(true);
    const draftError = validateConditionalAssignmentDraft(draft, startFields);
    if (draftError) {
      setError(draftError);
      return;
    }
    onConfirm(draft);
  };

  const showErrors = submitAttempted;
  const errorText: CSSProperties = { color: '#ff4d4f', fontSize: 11, marginTop: 4, lineHeight: 1.5 };

  /**
   * 类型反显小组件：空值默认显示 Select type，有错转红（与 condition 的 typeTag 同款）。
   * emptyText 用于「本来就没有类型」的位置（固定值、未选操作类、目标字段类型未知），显示「—」而不是催选。
   */
  const typeTag = (type?: string, message?: string, emptyText = 'Select type') => (
    <Tag
      style={{
        margin: 0,
        fontSize: 10.5,
        background: '#fff',
        color: message ? '#ff4d4f' : '#8c8c8c',
        borderColor: message ? '#ff4d4f' : '#e5e7eb',
      }}
    >{type || emptyText}</Tag>
  );

  /** 字段标签行：左侧标签，右侧 type 小组件或辅助说明（与 condition 的字段行同款，不额外加星号）。 */
  const labelRow = (label: string, right?: ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
      <Text strong style={{ fontSize: 12 }}>{label}</Text>
      {right}
    </div>
  );

  const errorLine = (message?: string) => (message ? <div style={errorText}>{message}</div> : null);

  /** 字段选择段：分级 Cascader + 右侧 type 回显（复用 child 行的展示形式）。 */
  const fieldSelect = (
    value?: string,
    onChange?: (id: string) => void,
    placeholder = fieldPlaceholder,
    options?: FieldTreeNode[],
    hasError = false,
  ) => (
    <Cascader
      value={idToPath(value)}
      options={options ?? fieldTree}
      onChange={(path) => onChange?.(path?.[path.length - 1])}
      placeholder={placeholder}
      showSearch
      expandTrigger="click"
      status={hasError ? 'error' : undefined}
      style={{ flex: 1, minWidth: 0 }}
    />
  );

  /** 单条条件：Left Value → Left Operation → Operator → Right Value → Right Operation。 */
  const renderCondition = (
    branch: ConditionalAssignmentBranch,
    group: ConditionalAssignmentConditionGroup,
    condition: ConditionalAssignmentCondition,
    conditionIndex: number,
  ) => {
    const leftType = typeById(condition.left);
    /** Boolean 左值：整行退化为「= True/False」，运算符锁定、左右值操作类都不参与。 */
    const booleanLeft = isBooleanFieldType(leftType);
    const operatorOptions = conditionOperatorsForType(leftType);
    const needsRight = operatorNeedsRight(condition.operator);
    const leftMissing = showErrors && !condition.left;
    const rightMissing = showErrors && needsRight && ((condition.rightMode === 'field' && !condition.rightField) || (condition.rightMode === 'fixed' && !condition.rightFixed?.trim()));
    const leftOperationMissing = showErrors && !booleanLeft && operationNeedsConfig(condition.leftOperation) && !condition.leftOperationConfig;
    const rightOperationMissing = showErrors && !booleanLeft && needsRight && operationNeedsConfig(condition.rightOperation) && !condition.rightOperationConfig;
    // 右值候选与左值完全一致（同一棵字段树），不按类型裁剪：
    // 裁剪会让右值下拉只剩根节点，且两边 Type 命名口径不统一时容易筛空。
    const rightTree = fieldTree;

    return <div key={condition.id} style={{ marginTop: conditionIndex === 0 ? 12 : 18 }}>
      {conditionIndex > 0 && <div style={{ marginBottom: 8 }}>
        <Button
          size="small"
          shape="round"
          onClick={() => updateCondition(branch.id, group.id, condition.id, { join: condition.join === 'and' ? 'or' : 'and' })}
          style={{ minWidth: 54, fontSize: 10.5, fontWeight: 600, color: '#1f2a3d' }}
        >{condition.join.toUpperCase()}</Button>
      </div>}

      {labelRow('Left Value', typeTag(condition.left ? leftType ?? 'String' : undefined, leftMissing ? 'Left Value is required.' : undefined))}
      {fieldSelect(condition.left, (left) => {
        // 切换左值字段后，若已选运算符不在新 type 的可用集合里，一并清空；
        // 左值类型变了，已叠加的取值转换也可能不再适用，同样清掉。
        // 切到 Boolean：运算符固定为 `=`、右值强制固定值二选一，已配的左右值操作类与右值一并重置。
        if (isBooleanFieldType(typeById(left))) {
          updateCondition(branch.id, group.id, condition.id, {
            left,
            leftOperation: undefined,
            leftOperationConfig: undefined,
            operator: 'eq',
            rightMode: 'fixed',
            rightField: undefined,
            rightFixed: undefined,
            rightOperation: undefined,
            rightOperationConfig: undefined,
          });
          return;
        }
        const operators = conditionOperatorsForType(typeById(left));
        const operatorStillValid = condition.operator && operators.some((option) => option.value === condition.operator);
        updateCondition(branch.id, group.id, condition.id, {
          left,
          leftOperation: undefined,
          leftOperationConfig: undefined,
          ...(operatorStillValid ? {} : { operator: undefined }),
        });
      }, fieldPlaceholder, fieldTree, leftMissing)}
      {errorLine(showErrors && !condition.left ? 'Left Value is required.' : undefined)}

      {/* Boolean 左值没有可转换的对象（值只有 True / False），整段不渲染。 */}
      {!booleanLeft && <>
        {labelRow('Left Operation', typeTag(condition.left ? leftType ?? 'String' : undefined, leftOperationMissing ? 'Left Operation configuration is required.' : undefined))}
        <MappingOperationSelector
          value={condition.leftOperation}
          config={condition.leftOperationConfig}
          placeholder="Optional"
          options={operationOptionsWithoutConditional}
          fieldOptions={startFields.map((field) => ({ label: field.name ?? field.id, value: field.id }))}
          onChange={(leftOperation, leftOperationConfig) => updateCondition(branch.id, group.id, condition.id, { leftOperation, leftOperationConfig })}
        />
        {errorLine(leftOperationMissing ? 'Left Operation configuration is required.' : undefined)}
      </>}

      {labelRow('Operator', <Text type="secondary" style={{ fontSize: 10.5 }}>{booleanLeft ? 'Fixed for Boolean' : leftType ? `${leftType} operators` : 'Select left type first'}</Text>)}
      <Select
        disabled={!condition.left || booleanLeft}
        value={booleanLeft ? 'eq' : condition.operator}
        placeholder="Select operator"
        options={operatorOptions.map((option) => ({ value: option.value, label: option.label }))}
        status={showErrors && !condition.operator && !booleanLeft ? 'error' : undefined}
        style={{ width: '100%' }}
        onChange={(operator) => updateCondition(branch.id, group.id, condition.id, {
          operator,
          rightFixed: undefined,
          rightOperation: undefined,
          rightOperationConfig: undefined,
        })}
      />
      {errorLine(showErrors && !condition.operator && !booleanLeft ? 'Operator is required.' : undefined)}

      {labelRow('Right Value', typeTag(condition.left ? leftType ?? 'String' : undefined, rightMissing ? 'Right Value is required.' : undefined))}
      {booleanLeft
        /* Boolean 只可能是 True / False，直接给二选一按钮，不给取值方式与文本输入。 */
        ? <>
          <Segmented
            block
            value={condition.rightFixed === 'true' || condition.rightFixed === 'false' ? condition.rightFixed : undefined}
            options={booleanValueOptions}
            onChange={(next) => updateCondition(branch.id, group.id, condition.id, { rightMode: 'fixed', rightFixed: String(next) })}
          />
          {errorLine(showErrors && condition.rightFixed !== 'true' && condition.rightFixed !== 'false' ? 'Select True or False.' : undefined)}
        </>
        : needsRight
        ? <>
          {/* 取值方式切换沿用 condition 右值那一套：紧凑组里一个 132px 下拉 + 取值控件。 */}
          <Space.Compact block>
            <Select
              value={condition.rightMode}
              options={valueModeOptions}
              status={rightMissing ? 'error' : undefined}
              style={{ width: 132 }}
              onChange={(next) => updateCondition(branch.id, group.id, condition.id, {
                rightMode: next as 'field' | 'fixed',
                rightFixed: undefined,
                rightField: undefined,
                rightOperation: undefined,
                rightOperationConfig: undefined,
              })}
            />
            {condition.rightMode === 'field'
              ? fieldSelect(condition.rightField, (rightField) => updateCondition(branch.id, group.id, condition.id, {
                rightField,
                rightOperation: undefined,
                rightOperationConfig: undefined,
              }), fieldPlaceholder, rightTree, Boolean(rightMissing))
              : <Input
                style={{ flex: 1 }}
                placeholder="(empty)"
                status={rightMissing ? 'error' : undefined}
                value={condition.rightFixed}
                onChange={(event) => updateCondition(branch.id, group.id, condition.id, {
                  rightFixed: event.target.value,
                  rightOperation: undefined,
                  rightOperationConfig: undefined,
                })}
              />}
          </Space.Compact>
          {errorLine(rightMissing ? (condition.rightMode === 'field' ? 'Right Value is required.' : 'Fixed value is required.') : undefined)}

          {/* 空值运算符没有右值可取，也就没有可转换的对象。 */}
          {labelRow('Right Operation', typeTag(condition.left ? leftType ?? 'String' : undefined, rightOperationMissing ? 'Right Operation configuration is required.' : undefined))}
          <MappingOperationSelector
            value={condition.rightOperation}
            config={condition.rightOperationConfig}
            placeholder="Optional"
            options={operationOptionsWithoutConditional}
            fieldOptions={startFields.map((field) => ({ label: field.name ?? field.id, value: field.id }))}
            onChange={(rightOperation, rightOperationConfig) => updateCondition(branch.id, group.id, condition.id, { rightOperation, rightOperationConfig })}
          />
          {errorLine(rightOperationMissing ? 'Right Operation configuration is required.' : undefined)}
        </>
        : <Input disabled value="—" />}

      <Space style={{ marginTop: 10 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={() => updateGroup(branch.id, group.id, (item) => { item.conditions.push(createCondition()); })}>Add Condition</Button>
        <Button size="small" icon={<MinusOutlined />} disabled={group.conditions.length === 1} onClick={() => updateGroup(branch.id, group.id, (item) => { item.conditions = item.conditions.filter((sub) => sub.id !== condition.id); })}>Remove Condition</Button>
      </Space>
    </div>;
  };

  /** WHEN 表达式预览（等宽字体，与 condition 底部的预览框同款）。 */
  const describeCondition = (condition: ConditionalAssignmentCondition) => {
    const left = startFields.find((field) => field.id === condition.left)?.name ?? '-';
    const right = !operatorNeedsRight(condition.operator)
      ? ''
      : condition.rightMode === 'field'
        ? startFields.find((field) => field.id === condition.rightField)?.name ?? '-'
        : condition.rightFixed || '-';
    return `${left} ${operatorLabel(condition.operator) || '-'}${right ? ` ${right}` : ''}`;
  };
  const describeBranch = (branch: ConditionalAssignmentBranch) => branch.groups
    .map((group, groupIndex) => {
      const text = group.conditions
        .map((condition, index) => index === 0 ? describeCondition(condition) : `${condition.join.toUpperCase()} ${describeCondition(condition)}`)
        .join(' ');
      return groupIndex === 0 ? text : `${group.join.toUpperCase()} ${text}`;
    })
    .join(' • ');

  /** THEN / DEFAULT 的取值段：取到值之后可再叠加一个操作类，最后写入目标字段。 */
  const assignmentSection = (
    title: string,
    tone: { border: string; background: string; color: string },
    mode: 'field' | 'fixed',
    fieldValue: string | undefined,
    fixedValue: string | undefined,
    operation: string[] | undefined,
    operationConfig: MappingOperationConfig | undefined,
    onModeChange: (mode: 'field' | 'fixed') => void,
    onFieldChange: (id: string) => void,
    onFixedChange: (value: string) => void,
    onOperationChange: (operation?: string[], config?: MappingOperationConfig) => void,
  ) => <div style={{ border: `1px solid ${tone.border}`, background: tone.background, borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
    <Text strong style={{ color: tone.color, fontSize: 13 }}>{title}</Text>
    {/* 三段都带类型反显：Value 取来源字段声明的类型，Operation 取操作类执行后的类型，Target Field 取目标字段声明的类型。 */}
    {labelRow('Value', typeTag(mode === 'field' ? typeById(fieldValue) : undefined, undefined, '—'))}
    <Space.Compact block>
      <Select
        value={mode}
        options={valueModeOptions}
        style={{ width: 132 }}
        onChange={(next) => onModeChange(next as 'field' | 'fixed')}
      />
      {mode === 'field'
        ? fieldSelect(fieldValue, onFieldChange, fieldPlaceholder, fieldTree)
        : <Input style={{ flex: 1 }} placeholder="(empty)" value={fixedValue} onChange={(event) => onFixedChange(event.target.value)} />}
    </Space.Compact>
    {labelRow('Operation', typeTag(operationResultType(operation), undefined, '—'))}
    <MappingOperationSelector
      value={operation}
      config={operationConfig}
      options={operationOptionsWithoutConditional}
      placeholder="Optional"
      fieldOptions={startFields.map((field) => ({ label: field.name ?? field.id, value: field.id }))}
      onChange={onOperationChange}
    />
    {labelRow('Target Field', typeTag(targetType, undefined, '—'))}
    <Input disabled value={targetLabel || ''} placeholder="Target field" />
  </div>;

  return (
    <Modal
      open
      width={880}
      title="Conditional Assignment Config"
      okText="Confirm"
      cancelText="Cancel"
      onCancel={onCancel}
      onOk={handleConfirm}
    >
      <div style={{ maxHeight: '66vh', overflowY: 'auto', paddingRight: 6 }}>
        <Alert
          type="info"
          showIcon={false}
          message={targetLabel ? `Target field: ${targetLabel}. Branches are evaluated in order — the first match wins.` : 'Branches are evaluated in order — the first match wins.'}
          style={{ background: '#e6f4ff', border: '1px solid #bae0ff', fontSize: 11.5, marginBottom: 12 }}
        />
        {error && <Alert type="error" showIcon style={{ marginBottom: 12, fontSize: 12 }} message={error} />}

        {draft.branches.map((branch, branchIndex) => <div
          key={branch.id}
          style={{ border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', padding: '12px 14px', marginBottom: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Space size={8}>
              <Text strong style={{ fontSize: 13 }}>Branch {branchIndex + 1}</Text>
              <Tag style={{ margin: 0, fontSize: 10.5 }}>First Matched</Tag>
            </Space>
            <Space size={0}>
              <Button size="small" type="text" aria-label="Move branch up" icon={<UpOutlined />} disabled={branchIndex === 0} onClick={() => moveBranch(branch.id, -1)} />
              <Button size="small" type="text" aria-label="Move branch down" icon={<DownOutlined />} disabled={branchIndex === draft.branches.length - 1} onClick={() => moveBranch(branch.id, 1)} />
              <Button size="small" type="text" danger aria-label="Remove branch" icon={<DeleteOutlined />} disabled={draft.branches.length === 1} onClick={() => update((next) => { next.branches = next.branches.filter((item) => item.id !== branch.id); })} />
            </Space>
          </div>

          {branch.groups.map((group, groupIndex) => <div key={group.id}>
            {groupIndex > 0 && <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
              <Button
                size="small"
                shape="round"
                onClick={() => updateGroup(branch.id, group.id, (item) => { item.join = item.join === 'and' ? 'or' : 'and'; })}
                style={{ minWidth: 66, fontSize: 11, letterSpacing: 0.6, fontWeight: 600, color: '#1f2a3d', borderColor: '#cfd7e5' }}
              >{group.join.toUpperCase()}</Button>
            </div>}
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 12 }}><span style={{ color: '#ff4d4f' }}>* </span>Condition Group {groupIndex + 1}</Text>
                <Button size="small" type="text" danger aria-label="Remove condition group" disabled={branch.groups.length === 1} icon={<DeleteOutlined />} onClick={() => updateBranch(branch.id, (item) => { item.groups = item.groups.filter((sub) => sub.id !== group.id); })} />
              </div>
              {group.conditions.map((condition, conditionIndex) => renderCondition(branch, group, condition, conditionIndex))}
            </div>
          </div>)}

          <Space style={{ marginTop: 12 }}>
            <Button size="small" icon={<PlusOutlined />} onClick={() => updateBranch(branch.id, (item) => { item.groups.push(createConditionGroup()); })}>Add Group</Button>
            <Button size="small" icon={<MinusOutlined />} disabled={branch.groups.length === 1} onClick={() => updateBranch(branch.id, (item) => { item.groups = item.groups.slice(0, -1); })}>Remove Group</Button>
          </Space>

          <div style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 6,
            background: '#f5f7fa',
            border: '1px solid #eef2f7',
            color: '#41506b',
            fontFamily: MONO,
            fontSize: 11.5,
            letterSpacing: 0.4,
            wordBreak: 'break-all',
          }}>( {describeBranch(branch)} )</div>

          {assignmentSection(
            'THEN — executed when this branch matches',
            { border: '#b7eb8f', background: '#f6ffed', color: '#389e0d' },
            branch.valueMode,
            branch.valueField,
            branch.valueFixed,
            branch.operation,
            branch.operationConfig,
            (valueMode) => updateBranch(branch.id, (item) => { item.valueMode = valueMode; item.valueField = undefined; item.valueFixed = undefined; }),
            (valueField) => updateBranch(branch.id, (item) => { item.valueField = valueField; }),
            (valueFixed) => updateBranch(branch.id, (item) => { item.valueFixed = valueFixed; }),
            (operation, operationConfig) => updateBranch(branch.id, (item) => { item.operation = operation; item.operationConfig = operationConfig; }),
          )}
        </div>)}

        <Button block type="dashed" icon={<PlusOutlined />} onClick={() => update((next) => { next.branches.push(createBranch()); })}>Add Branch</Button>

        {assignmentSection(
          'DEFAULT — executed when no branch matches (required)',
          { border: '#ffe58f', background: '#fffbe6', color: '#d48806' },
          draft.default.valueMode,
          draft.default.valueField,
          draft.default.valueFixed,
          draft.default.operation,
          draft.default.operationConfig,
          (valueMode) => update((next) => { next.default.valueMode = valueMode; next.default.valueField = undefined; next.default.valueFixed = undefined; }),
          (valueField) => update((next) => { next.default.valueField = valueField; }),
          (valueFixed) => update((next) => { next.default.valueFixed = valueFixed; }),
          (operation, operationConfig) => update((next) => { next.default.operation = operation; next.default.operationConfig = operationConfig; }),
        )}
      </div>
    </Modal>
  );
}
