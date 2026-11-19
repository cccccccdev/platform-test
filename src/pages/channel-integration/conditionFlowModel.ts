/**
 * condition 节点的纯模型函数（无 JSX），供画布节点与编辑页共用。
 * 单独成文件是为了让 ConditionFlowNode.tsx 只导出组件，保住 Fast Refresh。
 */

/** 每个分支一个底部 source handle，边必须显式绑定，否则所有出边都会挤在第一个手柄上。 */
export const conditionHandleId = (index: number) => `branch-${index}`;

/**
 * 分支条件是否配置完整。Issues 徽标与分支摘要都以它为准：
 * 脚本模式下看脚本是否非空；结构化模式下要求每组至少一条、且每条左值与运算符齐全。
 */
export function isBranchConfigured(condition: unknown): boolean {
  const config = condition as { scriptMode?: boolean; script?: string; groups?: Array<{ conditions?: Array<{ leftValue?: string; operator?: string }> }> } | undefined;
  if (!config) return false;
  if (config.scriptMode) return Boolean(String(config.script ?? '').trim());
  const groups = config.groups;
  if (!Array.isArray(groups) || groups.length === 0) return false;
  return groups.every((group) => Array.isArray(group?.conditions) && group.conditions.length > 0
    && group.conditions.every((row) => Boolean(row?.leftValue) && Boolean(row?.operator)));
}
