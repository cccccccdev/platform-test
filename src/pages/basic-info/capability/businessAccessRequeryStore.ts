import { ADMISSION_EXTERNAL_STATE_MACHINE, BAL_REQUERY_STATE_MACHINE } from './inboundStateMachineReferenceData';

export interface BusinessAccessRequeryConfig {
  enabled: boolean;
  configured: boolean;
  strategy: BusinessAccessRequeryStrategy;
  stateMachineName: string;
  hasBalException: boolean;
  balExceptionSourceState: string;
  hasBalExceptionTransition: boolean;
  exceptionMainState: 'PENDING' | 'FAIL' | null;
  operator: string;
  operationTime: string;
}

export interface BusinessAccessRequeryStrategy {
  windowStartSeconds: number;
  windowEndSeconds: number;
  intervalSeconds: number;
  queryTimeoutSeconds: number;
}

const STORAGE_KEY = 'basic-info-business-access-requery-configs';
const configKey = (businessType: string, ability: string) => `${businessType}:${ability}`;
const DEFAULT_STRATEGY: BusinessAccessRequeryStrategy = {
  windowStartSeconds: 5,
  windowEndSeconds: 3600,
  intervalSeconds: 30,
  queryTimeoutSeconds: 5,
};

const DEFAULT_CONFIGS: Record<string, BusinessAccessRequeryConfig> = {
  [configKey('FUNDS_IN', 'BIZ_TYPE_NOTIFY')]: { enabled: true, configured: true, strategy: DEFAULT_STRATEGY, stateMachineName: BAL_REQUERY_STATE_MACHINE, hasBalException: true, balExceptionSourceState: 'INIT', hasBalExceptionTransition: true, exceptionMainState: 'PENDING', operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
  [configKey('FUNDS_IN', 'STABLECOIN_NOTIFY')]: { enabled: true, configured: true, strategy: DEFAULT_STRATEGY, stateMachineName: BAL_REQUERY_STATE_MACHINE, hasBalException: true, balExceptionSourceState: 'INIT', hasBalExceptionTransition: true, exceptionMainState: 'PENDING', operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
  [configKey('FUNDS_IN', 'ADMISSION_CHECK_INTERNAL')]: { enabled: true, configured: true, strategy: DEFAULT_STRATEGY, stateMachineName: BAL_REQUERY_STATE_MACHINE, hasBalException: true, balExceptionSourceState: 'INIT', hasBalExceptionTransition: true, exceptionMainState: 'PENDING', operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
  [configKey('FUNDS_IN', 'ADMISSION_CHECK_EXTERNAL')]: { enabled: false, configured: true, strategy: DEFAULT_STRATEGY, stateMachineName: ADMISSION_EXTERNAL_STATE_MACHINE, hasBalException: true, balExceptionSourceState: 'INIT', hasBalExceptionTransition: true, exceptionMainState: 'PENDING', operator: 'System preset', operationTime: '2026-09-20 00:00:00' },
};

function readStoredConfigs(): Record<string, BusinessAccessRequeryConfig> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getBusinessAccessRequeryConfig(
  businessType: string,
  ability: string,
): BusinessAccessRequeryConfig | undefined {
  const key = configKey(businessType, ability);
  const stored = readStoredConfigs()[key];
  const defaults = DEFAULT_CONFIGS[key];
  if (stored || defaults) {
    const baseline = defaults ?? {
      enabled: false,
      configured: false,
      strategy: DEFAULT_STRATEGY,
      stateMachineName: 'No linked State Machine',
      hasBalException: false,
      balExceptionSourceState: 'Request execution state',
      hasBalExceptionTransition: false,
      exceptionMainState: null,
      operator: 'Not configured',
      operationTime: '—',
    };
    return {
      ...baseline,
      ...stored,
      strategy: { ...baseline.strategy, ...stored?.strategy },
    } as BusinessAccessRequeryConfig;
  }
  return {
    enabled: false,
    configured: false,
    strategy: DEFAULT_STRATEGY,
    stateMachineName: 'No linked State Machine',
    hasBalException: false,
    balExceptionSourceState: 'Request execution state',
    hasBalExceptionTransition: false,
    exceptionMainState: null,
    operator: 'Not configured',
    operationTime: '—',
  };
}

export function saveBusinessAccessRequeryConfig(
  businessType: string,
  ability: string,
  enabled: boolean,
): BusinessAccessRequeryConfig {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const existing = getBusinessAccessRequeryConfig(businessType, ability) as BusinessAccessRequeryConfig;
  const config: BusinessAccessRequeryConfig = {
    ...existing,
    enabled: existing.configured ? existing.enabled : enabled,
    configured: true,
    strategy: existing.strategy,
    operator: 'Current User',
    operationTime: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
  const configs = readStoredConfigs();
  configs[configKey(businessType, ability)] = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  return config;
}
