// Channel 类型定义
export interface Channel {
  code: string;
  country: string[];
  party: string;
  status: 'Active' | 'Inactive';
}

export interface BusinessType {
  bt: string;
  mode: 'Config Integration' | 'Code Integration';
}

export interface Ability {
  bt: string;
  ability: string;
  publishStatus: 'draft' | 'pending' | 'published';
  badges: Array<{ cloud: string; env: string }>;
}

export interface MatchRule {
  id: string;
  field1: string;
  field2: string;
  bt: string;
  ability: string;
  action: string;
}

export interface InboundEndpoint {
  name: string;
  url: string;
  fields: string[];
  matchType: 'A' | 'B';
  singleNoField: string;
  matchFields: string[];
  rules: MatchRule[];
}

export interface StepConfig {
  name: string;
  triggerMode: 'upstream' | 'external';
  finalStateMode: ('requery' | 'callback' | 'sync')[];
  produceEvents: string[];
  triggerEvents: string[];
  triggerEventSources?: number[];
}

export interface FieldMapping {
  endpointField: string;
  mode: 'direct' | 'condition' | 'fixed';
  contextField?: string;
  fieldType: string;
  operation: string;
  conditions?: Array<{
    field: string;
    op: string;
    value: string;
    result: string;
  }>;
  defaultValue?: string;
  fixedValue?: string;
  multiplier?: number;
}