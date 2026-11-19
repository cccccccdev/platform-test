/**
 * 条件赋值（Conditional Assignment）操作类共享模型。
 *
 * 形态：http 组件字段映射行的 OPERATION 操作类（与 MONEY / FORMAT / CUSTOM 等并列）。
 * 一条字段行选中 conditional assignment 后，该行字段的取值由「WHEN 条件组 → THEN 取值」决定：
 * - WHEN：结构化条件组（组间或、组内且/或），条件左值从 SPI 候选树选择。
 * - THEN：命中后该行字段的取值（来源字段 / 固定值）。
 * - DEFAULT：无分支命中时的兜底取值（必配）。
 * 求值顺序复用 Route Matching condition 组件的 First Matched + 分支顺序先例。
 */
import type { MappingOperationConfig } from './MappingOperationSelector';
import { operationNeedsConfig } from './operationConfigs';

/** 条件字段类型枚举（九种）。 */
export const CONDITIONAL_FIELD_TYPES = [
  'String',
  'byte[]',
  'integer',
  'long',
  'double',
  'Boolean',
  'file',
  'date',
  'big decimal',
] as const;

export type ConditionalFieldType = (typeof CONDITIONAL_FIELD_TYPES)[number];

export interface ConditionalAssignmentField {
  id: string;
  /** SPI 侧：候选树路径（如 ['spi', 'request', 'amount']）。 */
  path?: string[];
  /** 外部 API 侧：手输字段名（如 identificationCode）。 */
  name?: string;
  /** 字段类型（用于 Type 反显与运算符过滤）。 */
  type?: string;
}

export interface ConditionalAssignmentCondition {
  id: string;
  /** 与上一行条件的连接词；组内第一行不使用。 */
  join: 'and' | 'or';
  /** 条件左值：起始端字段 id。 */
  left?: string;
  /** 左值上叠加的取值转换操作类（与字段行 OPERATION 同源，剔除 conditional-assignment）。 */
  leftOperation?: string[];
  leftOperationConfig?: MappingOperationConfig;
  operator?: string;
  rightMode: 'field' | 'fixed';
  /** 右值为字段时：起始端字段 id。 */
  rightField?: string;
  /** 右值为固定值时：手输内容。 */
  rightFixed?: string;
  /** 右值上叠加的取值转换操作类。空值运算符下不使用。 */
  rightOperation?: string[];
  rightOperationConfig?: MappingOperationConfig;
}

export interface ConditionalAssignmentConditionGroup {
  id: string;
  /** 与上一个条件组的连接词；分支内第一组不使用。默认 or。 */
  join: 'and' | 'or';
  conditions: ConditionalAssignmentCondition[];
}

export interface ConditionalAssignmentBranch {
  id: string;
  /** First Matched：按顺序求值，命中本分支即停止。 */
  groups: ConditionalAssignmentConditionGroup[];
  /** THEN 取值模式。 */
  valueMode: 'field' | 'fixed';
  /** 取值为字段时：起始端字段 id。 */
  valueField?: string;
  /** 取值为固定值时：手输内容。 */
  valueFixed?: string;
  /** THEN 命中后叠加的 Operation（可选，与字段行 OPERATION 同源）。 */
  operation?: string[];
  operationConfig?: MappingOperationConfig;
}

export interface ConditionalAssignmentConfig {
  kind: 'conditionalAssignment';
  branches: ConditionalAssignmentBranch[];
  /** DEFAULT：无分支命中时的兜底取值（必配）。 */
  default: {
    valueMode: 'field' | 'fixed';
    valueField?: string;
    valueFixed?: string;
    /** DEFAULT 兜底取值后叠加的 Operation（可选）。 */
    operation?: string[];
    operationConfig?: MappingOperationConfig;
  };
}

/**
 * 条件运算符全集（十四种）：比较 / 区间 / 集合 / 字符串 / 空值。
 * 顺序即下拉展示顺序，与生产 condition 组件保持一致：数值区间成对相邻（> >= 与 < <=），
 * 空值组排在末尾且 is null / is not null 先于 is empty / is not empty。
 */
export const conditionOperatorOptions = [
  { label: '=', value: 'eq' },
  { label: '!=', value: 'ne' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'ge' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'le' },
  { label: 'in', value: 'in' },
  { label: 'contains', value: 'contains' },
  { label: 'starts with', value: 'startsWith' },
  { label: 'ends with', value: 'endsWith' },
  { label: 'is null', value: 'isNull' },
  { label: 'is not null', value: 'isNotNull' },
  { label: 'is empty', value: 'empty' },
  { label: 'is not empty', value: 'notEmpty' },
];

/**
 * 各字段类型可用的运算符 value 集合（用于按 Type 过滤条件关系下拉）。
 * 基线与生产一致；`in` / `starts with` / `ends with` 为本期新增，Big decimal 的
 * `is null` / `is not null` 亦为本期新增（生产当前没有）。
 * file 只保留两个空值类；byte[] / date 按 5.3 矩阵（三者均已确认，见 PRD 8.1 D-015 / D-016）。
 */
const OPERATORS_BY_TYPE: Record<string, string[]> = {
  String: ['eq', 'ne', 'in', 'contains', 'startsWith', 'endsWith', 'isNull', 'isNotNull', 'empty', 'notEmpty'],
  'byte[]': ['eq', 'ne', 'isNull', 'isNotNull'],
  integer: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'isNull', 'isNotNull'],
  long: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'isNull', 'isNotNull'],
  double: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'isNull', 'isNotNull'],
  Boolean: ['eq'],
  file: ['isNull', 'isNotNull'],
  date: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'isNull', 'isNotNull'],
  'big decimal': ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'isNull', 'isNotNull'],
};

/** 把 demo 里来源各异的大小写 / 命名（如 Long、Integer、BigDecimal）归一化到九种 Type 枚举的 key。 */
const normalizeFieldType = (type?: string): string | undefined => {
  if (!type) return undefined;
  const t = type.trim().toLowerCase();
  if (t === 'bigdecimal' || t === 'big decimal' || t === 'decimal') return 'big decimal';
  if (t === 'integer' || t === 'int') return 'integer';
  if (t === 'long') return 'long';
  if (t === 'double' || t === 'float') return 'double';
  if (t === 'boolean' || t === 'bool') return 'Boolean';
  if (t === 'byte[]' || t === 'byte' || t === 'bytes') return 'byte[]';
  if (t === 'file') return 'file';
  if (t === 'date') return 'date';
  if (t === 'string') return 'String';
  return undefined;
};

/** 按字段类型过滤条件运算符下拉选项；未知 / 未归一化类型回退为全集。 */
export const conditionOperatorsForType = (type?: string) => {
  const normalized = normalizeFieldType(type);
  return normalized && OPERATORS_BY_TYPE[normalized]
    ? conditionOperatorOptions.filter((option) => OPERATORS_BY_TYPE[normalized].includes(option.value))
    : conditionOperatorOptions;
};

/**
 * 左值是否为 Boolean 类型。
 * 命中时整行退化为「= True/False」二选一：运算符固定为 `=` 不可改、左右值操作类隐藏、右值改为 True / False。
 */
export const isBooleanFieldType = (type?: string): boolean => normalizeFieldType(type) === 'Boolean';

/**
 * 空值类运算符：不需要右侧取值，也不展示 Right Operation。
 * is empty / is not empty 与 is null / is not null 在 UI 上并存，语义区分见 PRD 5.2 R-012。
 */
export const VALUELESS_CONDITION_OPERATORS = new Set(['empty', 'notEmpty', 'isNull', 'isNotNull']);

/** 空值类运算符（is empty / is not empty / is null / is not null）不需要右侧取值。 */
export const operatorNeedsRight = (operator?: string): boolean =>
  operator ? !VALUELESS_CONDITION_OPERATORS.has(operator) : false;

export const conditionJoinOptions = [
  { label: 'And', value: 'and' },
  { label: 'Or', value: 'or' },
];

export const newId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const createConditionalField = (): ConditionalAssignmentField => ({
  id: newId('cafield'),
});

export const createCondition = (): ConditionalAssignmentCondition => ({
  id: newId('cacond'),
  join: 'and',
  rightMode: 'fixed',
});

export const createConditionGroup = (): ConditionalAssignmentConditionGroup => ({
  id: newId('cagrp'),
  join: 'or',
  conditions: [createCondition()],
});

export const createBranch = (): ConditionalAssignmentBranch => ({
  id: newId('cabranch'),
  groups: [createConditionGroup()],
  valueMode: 'fixed',
});

export const createInitialConfig = (): ConditionalAssignmentConfig => ({
  kind: 'conditionalAssignment',
  branches: [createBranch()],
  default: { valueMode: 'fixed' },
});

/** 字段展示名：SPI 侧取候选树路径末段，外部 API 侧取手输名。 */
export const conditionalFieldLabel = (field: ConditionalAssignmentField): string =>
  field.name?.trim() || (field.path?.length ? field.path[field.path.length - 1] : '');

export const conditionalFieldSelectOptions = (fields: ConditionalAssignmentField[]): { label: string; value: string }[] =>
  fields
    .filter((field) => conditionalFieldLabel(field))
    .map((field) => ({ label: conditionalFieldLabel(field), value: field.id }));

/** 按字段 id 查找字段类型。 */
export const conditionalFieldTypeById = (fields: ConditionalAssignmentField[], id?: string): string | undefined =>
  fields.find((field) => field.id === id)?.type;

/** 弹窗 Confirm 前的完整性校验：结构齐全且所有引用字段仍存在。 */
export const validateConditionalAssignmentDraft = (
  config: ConditionalAssignmentConfig,
  startFields: ConditionalAssignmentField[],
): string | undefined => {
  const startLabels = new Map(conditionalFieldSelectOptions(startFields).map((item) => [item.value, item.label]));
  if (!config.branches.length) return 'Add at least one branch.';
  for (let branchIndex = 0; branchIndex < config.branches.length; branchIndex += 1) {
    const branch = config.branches[branchIndex];
    const branchLabel = `Branch ${branchIndex + 1}`;
    if (!branch.groups.length) return `${branchLabel}: add at least one condition group.`;
    for (let groupIndex = 0; groupIndex < branch.groups.length; groupIndex += 1) {
      const group = branch.groups[groupIndex];
      const groupLabel = `${branchLabel} / condition group ${groupIndex + 1}`;
      if (!group.conditions.length) return `${groupLabel}: add at least one condition.`;
      for (let conditionIndex = 0; conditionIndex < group.conditions.length; conditionIndex += 1) {
        const condition = group.conditions[conditionIndex];
        const conditionLabel = `${groupLabel} / condition ${conditionIndex + 1}`;
        if (!condition.left) return `${conditionLabel}: select the left field.`;
        if (!startLabels.has(condition.left)) return `${conditionLabel}: the left field no longer exists.`;
        // Boolean 左值整行退化为「= True/False」：运算符固定、左右值操作类不参与，只校验右值二选一。
        if (isBooleanFieldType(conditionalFieldTypeById(startFields, condition.left))) {
          if (condition.rightFixed !== 'true' && condition.rightFixed !== 'false') return `${conditionLabel}: select True or False.`;
          continue;
        }
        if (operationNeedsConfig(condition.leftOperation) && !condition.leftOperationConfig) return `${conditionLabel}: configure the left operation.`;
        if (!condition.operator) return `${conditionLabel}: select the operator.`;
        if (operatorNeedsRight(condition.operator)) {
          if (condition.rightMode === 'field' && !condition.rightField) return `${conditionLabel}: select the right field.`;
          if (condition.rightMode === 'field' && condition.rightField && !startLabels.has(condition.rightField)) return `${conditionLabel}: the right field no longer exists.`;
          if (condition.rightMode === 'fixed' && !condition.rightFixed?.trim()) return `${conditionLabel}: enter the fixed value.`;
          if (operationNeedsConfig(condition.rightOperation) && !condition.rightOperationConfig) return `${conditionLabel}: configure the right operation.`;
        }
      }
    }
    // THEN 取值：非必填（空 = 赋空值），仅校验字段引用仍存在。
    if (branch.valueMode === 'field' && branch.valueField && !startLabels.has(branch.valueField)) return `${branchLabel} THEN: the source field no longer exists.`;
  }
  // DEFAULT 兜底取值。
  const def = config.default;
  if (!def) return 'Configure DEFAULT before saving.';
  if (def.valueMode === 'field' && def.valueField && !startLabels.has(def.valueField)) return 'DEFAULT: the source field no longer exists.';
  return undefined;
};
