/**
 * 操作类（Operation）执行后的字段类型。
 *
 * 字段映射表里 OPERATION 右侧新增的 TYPE 列用它取值：
 * - 只有「结果类型可确定」的操作类才返回类型；
 * - 不改变取值类型、或结果取决于配置/脚本的，返回 undefined（列里置空）；
 * - 未选操作类同样返回 undefined。
 *
 * 判定口径以操作类语义为准，不读源字段类型：源字段类型已经在 SOURCE TYPE / FIELD TYPE 列里。
 */

/** operation 二级值 → 执行后类型。未列出的二级值视为结果不可确定。 */
const RESULT_TYPE_BY_OPERATION: Record<string, string> = {
  // MONEY
  'enforce-exact-decimal-scale': 'BigDecimal',
  'ensure-minimum-decimal-scale': 'BigDecimal',
  'main-to-fractional': 'BigDecimal',
  'main-to-fractional-long': 'Long',
  // FORMAT
  'string-to-date': 'Date',
  'all-to-string': 'String',
  'string-to-integer': 'Integer',
  timestamp: 'Long',
  // CONVERT：只收录恒为字符串的重写类操作类
  'chain-code-inner-to-outer': 'String',
  'chain-code-outer-to-inner': 'String',
  'institution-inner-to-outer': 'String',
  'institution-outer-to-inner': 'String',
  'convert-to-uppercase': 'String',
  'convert-to-lowercase': 'String',
};

/**
 * 取得操作类执行后的字段类型。
 * 兼容历史上以字符串形式存下的 operation（如 'custom'）。
 */
export const operationResultType = (operation?: string | string[]): string | undefined => {
  if (!operation) return undefined;
  const key = Array.isArray(operation) ? operation[1] : operation;
  return key ? RESULT_TYPE_BY_OPERATION[key] : undefined;
};
