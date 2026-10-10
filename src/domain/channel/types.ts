// Channel Types

export interface Channel {
  channelId: string;
  name: string;
  status: 'active' | 'inactive';
  businessTypes: BusinessType[];
}

export interface BusinessType {
  type: string;
  integrationType: 'CONFIG' | 'CODE';
  capabilities: Capability[];
}

export interface Capability {
  ability: string;
  actions: string[];
}

export interface Endpoint {
  endpointId: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  protocol?: string;
  mockEnabled?: boolean;
  mockRules?: MockRule[];
}

export interface MockRule {
  ruleId: string;
  name: string;
  conditions: MockCondition[];
  response: MockResponse;
  priority?: number;
}

export interface MockCondition {
  field: string;
  operator: '==' | '!=' | 'contains';
  value: string;
}

export interface MockResponse {
  statusCode: number;
  body: string;
  delay?: number;
}

export interface Credential {
  credentialId: string;
  version: string;
  fields: CredentialField[];
  values?: Record<string, string>;
}

export interface CredentialField {
  fieldName: string;
  fieldType: 'string' | 'password' | 'file';
}

export interface Security {
  authType: 'Basic' | 'Bearer' | 'OAuth2' | 'Custom';
  config: Record<string, any>;
}

export interface GlobalVariable {
  varId: string;
  varName: string;
  varValue: string;
  version: string;
}

export interface RequeryStrategy {
  strategyId: string;
  businessType: string;
  ability: string;
  action: string;
  responseCodes: string[];
  pendingDuration?: number;
  frequency?: number;
}

export interface Institution {
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  channelInstitutionCode?: string;
}

export interface Party {
  partyId: string;
  partyName: string;
  partyCode: string;
  credentials?: Credential[];
  lines?: Line[];
}

export interface Line {
  lineId: string;
  lineName: string;
  url: string;
  weight?: number;
  enabled?: boolean;
  proxy?: string;
  skipSSL?: boolean;
}
