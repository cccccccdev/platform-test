export type DeployEnvironment = 'DAILY' | 'PRE' | 'PROD';
export type DeployStatus = 'DRAFT' | DeployEnvironment;

export interface FieldLimitState {
  mandatory: boolean;
  pattern: string;
  minLength: string;
  maxLength: string;
  status?: DeployStatus;
  operateTime?: string;
  operator?: string;
}

export interface CountryApiLimitState {
  submitted: boolean;
  fields: Record<string, FieldLimitState>;
}

export type ApiLimitStore = Record<string, CountryApiLimitState>;

export const apiLimitScopeKey = (businessType: string, service: string, action: string, country: string) =>
  JSON.stringify([businessType, service, action, country]);

const sourceStatus: Record<DeployEnvironment, DeployStatus> = {
  DAILY: 'DRAFT',
  PRE: 'DAILY',
  PROD: 'PRE',
};

export const canDeployField = (status: DeployStatus | undefined, environment: DeployEnvironment | undefined) =>
  environment !== undefined && status === sourceStatus[environment];

export function submitApiLimits(
  current: CountryApiLimitState | undefined,
  draft: Record<string, FieldLimitState>,
  fieldKeys: string[],
  dirtyKeys: ReadonlySet<string>,
  operateTime: string,
  operator: string,
): CountryApiLimitState {
  const fields = { ...current?.fields };
  for (const key of fieldKeys) {
    const previous = current?.fields[key];
    if (!current?.submitted || !previous?.status || dirtyKeys.has(key)) {
      fields[key] = { ...draft[key], status: 'DRAFT', operateTime, operator };
    }
  }
  return { submitted: true, fields };
}

export function deployApiLimitFields(
  current: CountryApiLimitState,
  environment: DeployEnvironment,
  selectedKeys: ReadonlySet<string>,
  operateTime: string,
  operator: string,
): CountryApiLimitState {
  const fields = { ...current.fields };
  for (const key of selectedKeys) {
    const previous = fields[key];
    if (previous && canDeployField(previous.status, environment)) {
      fields[key] = { ...previous, status: environment, operateTime, operator };
    }
  }
  return { ...current, fields };
}
