// Channel types
export interface Channel {
  code: string;
  country: string[];
  party: string[];
  status: 'Active' | 'Inactive';
  operator: string;
  operationTime: string;
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
  fieldValues: Record<string, string>;
  bt: string;
  ability: string;
  action: string;
}

export type MatchingType = 'single' | 'order_no' | 'type_field' | 'custom';
export type UriConfigStatus = 'DRAFT' | 'DAILY' | 'PRE' | 'PROD';

export interface MatchingDeploymentRecord {
  cloud: string;
  env: string;
  version: string;
  operator: string;
  operationTime: string;
}

export interface InboundRequestField {
  id: string;
  source: 'query' | 'header' | 'body';
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Object';
  moc: 'yes' | 'no';
  description: string;
}

export interface LegacyInboundComponent {
  id: string;
  code: string;
  name: string;
  config: Record<string, string | boolean>;
}

export interface CapabilityDecisionVersion {
  id: string;
  version: string;
  name: string;
  sourceType: 'legacy' | 'v2';
  configStatus: UriConfigStatus;
  fields: string[];
  requestFields: InboundRequestField[];
  matchType: MatchingType;
  matchFieldSource?: 'query' | 'header' | 'body';
  singleNoField: string;
  referenceField?: 'requestReference' | 'responseReference';
  matchFields: string[];
  rules: MatchRule[];
  customScript?: string;
  fallbackBehavior?: 'reject' | 'alert_and_reject' | 'manual_review';
  decryptEnabled?: boolean;
  badges?: Array<{ cloud: string; env: string }>;
  deploymentRecords?: MatchingDeploymentRecord[];
  hasUnsubmittedDraft?: boolean;
  draftBaseline?: string;
  legacyComponents?: LegacyInboundComponent[];
  updatedTime?: string;
  operator?: string;
}

export interface InboundEndpoint {
  id: string;
  name: string;
  url: string;
  businessType: string;
  businessTypes: string[];
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  uriType: 'new' | 'legacy';
  description: string;
  fields: string[];
  matchType: MatchingType;
  matchFieldSource?: 'query' | 'header' | 'body';
  singleNoField: string;
  referenceField?: 'requestReference' | 'responseReference';
  matchFields: string[];
  rules: MatchRule[];
  customScript?: string;
  fallbackBehavior?: 'reject' | 'alert_and_reject' | 'manual_review';
  decryptEnabled?: boolean;
  version: string;
  configStatus: UriConfigStatus;
  badges?: Array<{ cloud: string; env: string }>;
  referenceCount?: number;
  updatedTime?: string;
  operator?: string;
  versions: CapabilityDecisionVersion[];
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

// Flow configuration types

export type ExecutionType = 'single' | 'loop';
export type FlowType = 'outbound' | 'inbound';
export type EndType = 'event' | 'state' | 'wait_upstream' | 'wait_external';
export type TriggerType = 'UPSTREAM_TRIGGERED' | 'EXTERNAL_INBOUND_TRIGGERED' | 'CALLBACK_TRIGGERED' | 'ASYNC_TRIGGERED' | 'REQUERY_TRIGGERED';

export interface EventCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logic?: string;
  result?: string;
}

export interface FlowEvent {
  id: string;
  eventName: string;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: string;
    logic: string;
  }>;
}

export interface OutputEvent {
  eventName: string;
  conditions?: EventCondition[];
}

export interface FlowCanvasNode {
  id: string;
  componentCode: string;
  x: number;
  y: number;
  status: 'not_started' | 'editing' | 'complete' | 'error' | 'need_review' | 'readonly';
}

export interface FlowCanvasEdge {
  id: string;
  source: string;
  target: string;
}

// Flow status: DRAFT | SUBMITTED
export type FlowStatus = 'DRAFT' | 'SUBMITTED';

// Snapshot of submitted flow content (used when a SUBMITTED flow has unsubmitted draft)
export interface SubmittedFlowContent {
  name: string;
  triggerType?: TriggerType;
  triggerEvents?: string[];
  contextActions?: string[];
  inboundUriId?: string;
  flowType?: FlowType;
  endType?: EndType;
  executionType?: ExecutionType;
  outputEvents?: OutputEvent[];
  events?: FlowEvent[];
  stateConditions?: EventCondition[];
  canvasNodes?: FlowCanvasNode[];
  canvasEdges?: FlowCanvasEdge[];
}

export interface FlowConfig {
  id: string;
  name: string;
  executionType: ExecutionType;
  flowType: FlowType;
  endType: EndType;
  stepIndex?: number;
  triggerType?: TriggerType;
  triggerEvents?: string[];
  contextActions?: string[];
  inboundUriId?: string;
  outputEvents?: OutputEvent[];
  events?: FlowEvent[];
  stateConditions?: EventCondition[];
  isConfigured?: boolean;
  canvasNodes?: FlowCanvasNode[];
  canvasEdges?: FlowCanvasEdge[];
  status: FlowStatus;
  submittedContent?: SubmittedFlowContent;
}

export interface StateFlowData {
  stateName: string;
  flows: FlowConfig[];
  availableEvents?: string[];
}

// Cloud and environment types for publish status
export type CloudType = 'MFB' | 'BD' | 'PK' | 'ALIYUN' | 'ALIYUN_FRANKFURT' | 'ONELOOP';
export type EnvType = 'DAILY' | 'PRE' | 'PROD';

// Deploy record: tracks which version is deployed to a specific cloud+app+environment
export interface DeployRecord {
  cloud: CloudType;
  app: string;
  env: EnvType;
  version: string;
  operator: string;
  operationTime: string;
}

// Group status: DRAFT | DAILY | PRE | PROD
export type GroupStatus = 'DRAFT' | 'DAILY' | 'PRE' | 'PROD';

// Flow Group Version (sub-record) under a BT + Ability
export interface FlowGroupVersion {
  id: string;
  groupId: number;
  version: string;
  status: GroupStatus;
  badges: Array<{ cloud: CloudType; env: EnvType }>;
  remark?: string;
  operator: string;
  operationTime: string;
  flows: FlowConfig[];
  deployRecords: DeployRecord[];
}

// Config Ability main record (BT + Ability)
export interface ConfigAbility {
  bt: string;
  ability: string;
  actions: string[];
  stateMachine: string;
  versions: FlowGroupVersion[];
}
