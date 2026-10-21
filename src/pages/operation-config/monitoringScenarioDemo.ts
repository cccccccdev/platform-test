export type LogicalOperator = 'AND' | 'OR';
export type EvaluationMode = 'DIRECT_EVALUATION' | 'STATE_BRANCHING';
export type StateOperator = 'IS_TRUE' | 'IS_FALSE';
export type ActionType = 'SEND_MQ' | 'SET_SCENARIO_STATE';

export type MetricSource = {
  key: string;
  metricCode: string;
  tagCode: string;
  parameters: string;
};

export type ExpressionCondition = {
  key: string;
  relation: LogicalOperator;
  metricKey: string;
  operator: string;
  value: number | null;
};

export type ConditionGroup = {
  key: string;
  relation: LogicalOperator;
  conditions: ExpressionCondition[];
};

export type ScenarioAction = {
  key: string;
  type: ActionType;
  context?: string;
  stateValue?: boolean;
};

export type ConsecutiveMatchGate = {
  requiredCount: number | null;
};

export type StateBranch = {
  key: string;
  branchCode: string;
  description: string;
  stateOperator: StateOperator;
  groups: ConditionGroup[];
  consecutiveMatchGate: ConsecutiveMatchGate;
  actions: ScenarioAction[];
};

export type ScenarioConfig = {
  metricSources: MetricSource[];
  evaluationMode: EvaluationMode | null;
  matchGroups: ConditionGroup[];
  directConsecutiveMatchGate: ConsecutiveMatchGate;
  directActions: ScenarioAction[];
  branches: StateBranch[];
};

export type ScenarioDefinition = {
  key: string;
  scenarioCode: string;
  country: string;
  tenant: string;
  description: string;
  operator: string;
  operationTime: string;
};

export const nibssScenarioCode = 'ng_nibss_payout_success_rate_abnormal';
export const hydrogenScenarioCode = 'ng_hydrogen_payout_success_rate_abnormal';

const scenarioDefinitions: ScenarioDefinition[] = [
  {
    key: nibssScenarioCode,
    scenarioCode: nibssScenarioCode,
    country: 'NG',
    tenant: 'PALMPAY',
    description: '识别 NIBSS 出金成功率异常，并在进入异常和恢复时发送通用 MQ 消息',
    operator: 'Abe',
    operationTime: '2026-10-15 11:40:00',
  },
  {
    key: hydrogenScenarioCode,
    scenarioCode: hydrogenScenarioCode,
    country: 'NG',
    tenant: 'PALMPAY',
    description: '识别 HYDROGEN 出金成功率异常，发现异常时发送通用 MQ 消息',
    operator: 'Abe',
    operationTime: '2026-10-15 16:20:00',
  },
];

export const CODE_PATTERN = /^[a-z0-9_]+$/;
export const BRANCH_CODE_PATTERN = /^[A-Z0-9_]+$/;
export const CODE_MAX_LENGTH = 64;
export const DESCRIPTION_MAX_LENGTH = 200;

const condition = (
  key: string,
  metricKey: string,
  operator: string,
  value: number | null,
  relation: LogicalOperator = 'AND',
): ExpressionCondition => ({ key, metricKey, operator, value, relation });

const demoParameters = (channelMin: string) => `{\n  "party": "PALMPAY",\n  "channelMin": "${channelMin}",\n  "businessMin": "BANK_ACCOUNT_CREDIT#TRANSFER"\n}`;

const buildMetricSources = (channelMin: string): MetricSource[] => [
  {
    key: 'one-minute',
    metricCode: 'success_rate_1m',
    tagCode: 'tag_channel_route_orde_rate_success_1_min',
    parameters: demoParameters(channelMin),
  },
  {
    key: 'ten-minute',
    metricCode: 'success_rate_10m',
    tagCode: 'tag_channel_route_order_rate_success_10_min',
    parameters: demoParameters(channelMin),
  },
  {
    key: 'one-minute-count',
    metricCode: 'order_count_1m',
    tagCode: 'demo_channel_route_order_count_1_min',
    parameters: demoParameters(channelMin),
  },
  {
    key: 'ten-minute-count',
    metricCode: 'order_count_10m',
    tagCode: 'demo_channel_route_order_count_10_min',
    parameters: demoParameters(channelMin),
  },
];

const buildDetectedGroups = (tenMinuteMinCount: number): ConditionGroup[] => [
  {
    key: 'detected-primary',
    relation: 'AND',
    conditions: [
      condition('detected-p1-volume', 'one-minute-count', '>=', 30),
      condition('detected-p1-value', 'one-minute', '<', 0.9),
    ],
  },
  {
    key: 'detected-fallback',
    relation: 'OR',
    conditions: [
      condition('detected-p1-insufficient', 'one-minute-count', '<', 30),
      condition('detected-p2-volume', 'ten-minute-count', '>=', tenMinuteMinCount),
      condition('detected-p2-value', 'ten-minute', '<', 0.9),
    ],
  },
];

const buildRecoveredGroups = (tenMinuteMinCount: number): ConditionGroup[] => [
  {
    key: 'recovered-primary',
    relation: 'AND',
    conditions: [
      condition('recovered-p1-volume', 'one-minute-count', '>=', 30),
      condition('recovered-p1-value', 'one-minute', '>=', 0.9),
    ],
  },
  {
    key: 'recovered-fallback',
    relation: 'OR',
    conditions: [
      condition('recovered-p1-insufficient', 'one-minute-count', '<', 30),
      condition('recovered-p2-volume', 'ten-minute-count', '>=', tenMinuteMinCount),
      condition('recovered-p2-value', 'ten-minute', '>=', 0.9),
    ],
  },
];

const sendMqAction = (key: string, channelMin: string): ScenarioAction => ({ key, type: 'SEND_MQ', context: demoParameters(channelMin) });
const setStateAction = (key: string, stateValue: boolean): ScenarioAction => ({ key, type: 'SET_SCENARIO_STATE', stateValue });

const nibssInitialConfig: ScenarioConfig = {
  metricSources: buildMetricSources('NIBSS'),
  evaluationMode: 'STATE_BRANCHING',
  matchGroups: [],
  directConsecutiveMatchGate: { requiredCount: 1 },
  directActions: [],
  branches: [
    {
      key: 'detected',
      branchCode: 'DETECTED',
      description: '识别出金成功率异常，发送异常消息并将场景状态设为 true',
      stateOperator: 'IS_FALSE',
      groups: buildDetectedGroups(30),
      consecutiveMatchGate: { requiredCount: 6 },
      actions: [sendMqAction('detected-mq', 'NIBSS'), setStateAction('detected-state', true)],
    },
    {
      key: 'recovered',
      branchCode: 'RECOVERED',
      description: '在异常状态下识别成功率恢复，发送恢复消息并将场景状态设为 false',
      stateOperator: 'IS_TRUE',
      groups: buildRecoveredGroups(30),
      consecutiveMatchGate: { requiredCount: 6 },
      actions: [sendMqAction('recovered-mq', 'NIBSS'), setStateAction('recovered-state', false)],
    },
  ],
};

const hydrogenInitialConfig: ScenarioConfig = {
  metricSources: buildMetricSources('HYDROGEN'),
  evaluationMode: 'DIRECT_EVALUATION',
  matchGroups: buildDetectedGroups(300),
  directConsecutiveMatchGate: { requiredCount: 1 },
  directActions: [sendMqAction('hydrogen-abnormal-mq', 'HYDROGEN')],
  branches: [],
};

const cloneConfig = (config: ScenarioConfig): ScenarioConfig => JSON.parse(JSON.stringify(config)) as ScenarioConfig;

const emptyScenarioConfig = (): ScenarioConfig => ({
  metricSources: [],
  evaluationMode: null,
  matchGroups: [],
  directConsecutiveMatchGate: { requiredCount: null },
  directActions: [],
  branches: [],
});

const isJsonObject = (value?: string) => {
  if (!value?.trim()) return false;
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
};

export function isScenarioConfigComplete(config: ScenarioConfig) {
  const metricKeys = new Set(config.metricSources.map((metric) => metric.key));
  const metricCodes = config.metricSources.map((metric) => metric.metricCode);
  const metricsComplete = config.metricSources.length > 0
    && config.metricSources.every((metric) => CODE_PATTERN.test(metric.metricCode)
      && metric.tagCode.trim().length > 0
      && isJsonObject(metric.parameters))
    && new Set(metricCodes).size === metricCodes.length;

  const groupsComplete = (groups: ConditionGroup[]) => groups.length > 0
    && groups.every((group) => group.conditions.length > 0
      && group.conditions.every((item) => metricKeys.has(item.metricKey) && item.value !== null));
  const actionsComplete = (actions: ScenarioAction[]) => actions.length > 0
    && actions.every((action) => action.type === 'SEND_MQ'
      ? isJsonObject(action.context)
      : typeof action.stateValue === 'boolean');
  const countGateComplete = (gate: ConsecutiveMatchGate) => gate.requiredCount !== null
    && Number.isInteger(gate.requiredCount)
    && gate.requiredCount >= 1;

  if (!metricsComplete) return false;
  if (config.evaluationMode === 'DIRECT_EVALUATION') {
    return groupsComplete(config.matchGroups)
      && countGateComplete(config.directConsecutiveMatchGate)
      && actionsComplete(config.directActions);
  }

  const branchCodes = config.branches.map((branch) => branch.branchCode);
  return config.branches.length > 0
    && config.branches.every((branch) => BRANCH_CODE_PATTERN.test(branch.branchCode)
      && branch.description.trim().length > 0
      && branch.description.length <= DESCRIPTION_MAX_LENGTH
      && groupsComplete(branch.groups)
      && countGateComplete(branch.consecutiveMatchGate)
      && actionsComplete(branch.actions))
    && new Set(branchCodes).size === branchCodes.length;
}

let appliedConfigs: Record<string, ScenarioConfig> = {
  [nibssScenarioCode]: cloneConfig(nibssInitialConfig),
  [hydrogenScenarioCode]: cloneConfig(hydrogenInitialConfig),
};
let scenarioEnabledByCode: Record<string, boolean> = {
  [nibssScenarioCode]: false,
  [hydrogenScenarioCode]: false,
};

export function getScenarioDefinition(scenarioCode: string) {
  return scenarioDefinitions.find((scenario) => scenario.scenarioCode === scenarioCode) ?? scenarioDefinitions[0];
}

export function getScenarioDefinitions() {
  return scenarioDefinitions.map((scenario) => ({ ...scenario }));
}

export function createScenario(scenarioCode: string, country: string, tenant: string, description: string) {
  if (scenarioDefinitions.some((scenario) => scenario.scenarioCode === scenarioCode)) return false;
  const now = new Date();
  const operationTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  scenarioDefinitions.push({
    key: scenarioCode,
    scenarioCode,
    country: country.trim(),
    tenant: tenant.trim(),
    description: description.trim(),
    operator: 'Abe',
    operationTime,
  });
  appliedConfigs = { ...appliedConfigs, [scenarioCode]: emptyScenarioConfig() };
  scenarioEnabledByCode = { ...scenarioEnabledByCode, [scenarioCode]: false };
  return true;
}

export function getAppliedScenarioConfig(scenarioCode: string) {
  return cloneConfig(appliedConfigs[scenarioCode] ?? nibssInitialConfig);
}

export function saveAppliedScenarioConfig(scenarioCode: string, config: ScenarioConfig) {
  appliedConfigs = { ...appliedConfigs, [scenarioCode]: cloneConfig(config) };
}

export function getScenarioEnabled(scenarioCode: string) {
  return scenarioEnabledByCode[scenarioCode] ?? false;
}

export function saveScenarioEnabled(scenarioCode: string, enabled: boolean) {
  scenarioEnabledByCode = { ...scenarioEnabledByCode, [scenarioCode]: enabled };
}
