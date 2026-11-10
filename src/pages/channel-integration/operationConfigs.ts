/**
 * Operation 配置模型。
 *
 * `DecimalScaleConfig` 仍定义在 MappingOperationSelector 中（存量逻辑未动），
 * 这里只补充生产上会弹出 Operation Config 的另外五类 operation。
 */

export type OperationKind =
  | 'typeConvert'
  | 'customScript'
  | 'phoneNumberOperate'
  | 'fieldConcat'
  | 'stringToDate';

export interface TypeConvertRow {
  id: string;
  inner: string;
  outer: string;
}

export interface TypeConvertConfig {
  kind: 'typeConvert';
  rows: TypeConvertRow[];
}

export interface CustomScriptConfig {
  kind: 'customScript';
  script: string;
}

export interface PhoneNumberOperateConfig {
  kind: 'phoneNumberOperate';
  removeCountryCodeZero: boolean;
  removePhoneNumberZero: boolean;
}

export interface FieldConcatConfig {
  kind: 'fieldConcat';
  field?: string[];
  rule?: string;
}

export interface StringToDateConfig {
  kind: 'stringToDate';
  customFormat: boolean;
  stringFieldType?: string;
  customFormatValue?: string;
}

export type OperationConfig =
  | TypeConvertConfig
  | CustomScriptConfig
  | PhoneNumberOperateConfig
  | FieldConcatConfig
  | StringToDateConfig;

/** operation 的二级值 → 弹窗类型。未列出的 operation 选中后不弹窗。 */
const OPERATION_KINDS: Record<string, OperationKind> = {
  'verify-type-convert': 'typeConvert',
  custom: 'customScript',
  'phone-number-operate': 'phoneNumberOperate',
  'field-concat': 'fieldConcat',
  'string-to-date': 'stringToDate',
};

export const operationKindOf = (operation?: string[]): OperationKind | undefined =>
  operation?.[1] ? OPERATION_KINDS[operation[1]] : undefined;

export const customScriptTemplate = 'let execute = (param) => {\n    return null;\n}\n\nexecute(param);';

export const stringFieldTypeOptions = [
  { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
  { label: 'HH:mm:ss', value: 'HH:mm:ss' },
  { label: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", value: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" },
  { label: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", value: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX" },
  { label: "yyyy-MM-dd'T'HH:mm:ssX", value: "yyyy-MM-dd'T'HH:mm:ssX" },
  { label: 'yyyyMMdd', value: 'yyyyMMdd' },
  { label: 'yyyyMMddHHmmss', value: 'yyyyMMddHHmmss' },
];

export const concatRuleOptions = [
  { label: '/', value: '/' },
  { label: ',', value: ',' },
  { label: 'Space', value: ' ' },
  { label: '.', value: '.' },
  { label: ':', value: ':' },
];

export const createTypeConvertRow = (): TypeConvertRow => ({
  id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  inner: '',
  outer: '',
});

export const defaultOperationConfig = (kind: OperationKind): OperationConfig => {
  switch (kind) {
    case 'typeConvert':
      return { kind, rows: [createTypeConvertRow()] };
    case 'customScript':
      return { kind, script: customScriptTemplate };
    case 'phoneNumberOperate':
      return { kind, removeCountryCodeZero: false, removePhoneNumberZero: false };
    case 'fieldConcat':
      return { kind };
    case 'stringToDate':
      return { kind, customFormat: false };
  }
};

/** 选中值下方那一行摘要，空字符串表示不展示。 */
export const operationConfigSummary = (kind: OperationKind, config?: OperationConfig): string => {  if (!config || config.kind !== kind) return '';
  switch (config.kind) {
    case 'typeConvert':
      return config.rows.length ? `${config.rows.length} type mapping${config.rows.length > 1 ? 's' : ''}` : '';
    case 'customScript':
      return config.script ? 'Script configured' : '';
    case 'phoneNumberOperate': {
      const parts = [
        config.removeCountryCodeZero ? 'country code' : '',
        config.removePhoneNumberZero ? 'phone number' : '',
      ].filter(Boolean);
      return parts.length ? `Remove leading zero: ${parts.join(' + ')}` : '';
    }
    case 'fieldConcat': {
      const field = config.field?.[config.field.length - 1] ?? '';
      const rule = config.rule === ' ' ? 'space' : config.rule ?? '';
      return field && rule ? `${field} · "${rule}"` : '';
    }
    case 'stringToDate':
      return config.customFormat ? config.customFormatValue || 'Custom format' : config.stringFieldType ?? '';
  }
};

const DECIMAL_SCALE_OPERATIONS = new Set(['enforce-exact-decimal-scale', 'ensure-minimum-decimal-scale']);

/** 选中后必须配完才能保存的 operation（含小数位换算）。 */
export const operationNeedsConfig = (operation?: string | string[]): boolean => {
  if (!Array.isArray(operation) || !operation.length) return false;
  if (operation[0] === 'money' && DECIMAL_SCALE_OPERATIONS.has(operation[1])) return true;
  return Boolean(operationKindOf(operation));
};

const visitRecords = (
  value: unknown,
  visit: (record: Record<string, unknown>) => void,
  seen: WeakSet<object>,
): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => visitRecords(item, visit, seen));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  const record = value as Record<string, unknown>;
  visit(record);
  Object.values(record).forEach((child) => visitRecords(child, visit, seen));
};

/**
 * 保存前校验：选了需要配置的 operation 但没配过，则返回一句可展示的错误。
 * 覆盖 Body 树、扁平表、Path 变量映射、Target Mapping 等所有挂载点。
 */
export const validateOperationConfigs = (sources: unknown[]): string | undefined => {
  const seen = new WeakSet<object>();
  let message: string | undefined;
  for (const source of sources) {
    if (message) break;
    visitRecords(source, (record) => {
      if (message) return;
      if (!operationNeedsConfig(record.operation as string[] | string | undefined)) return;
      if (record.operationConfig) return;
      const label = typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : typeof record.targetValue === 'string' && record.targetValue
          ? record.targetValue
          : '';
      message = label
        ? `Configure the operation selected for ${label} before saving.`
        : 'Configure every selected operation before saving.';
    }, seen);
  }
  return message;
};
