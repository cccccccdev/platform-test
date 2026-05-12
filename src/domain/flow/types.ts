// Flow Graph Types - 四层架构核心类型

export type FlowNodeType =
  | 'HttpRequest'
  | 'ConditionBranch'
  | 'StateTransition'
  | 'Requery'
  | 'FieldMapping'
  | 'InternalCall'
  | 'Notify'
  | 'CallbackParse'
  | 'GenerateData'
  | 'MqSend'
  | 'OrderCreate'
  | 'OrderUpdate'
  // L2 Atomic nodes
  | 'L2.HTTP_BUILD'
  | 'L2.HTTP_SEND'
  | 'L2.MAP_FIELD'
  | 'L2.STATE_SET'
  | 'L2.MQ_PUBLISH'
  | 'L2.GEN_RRN'
  | 'L2.REQUERY_POLL'
  | 'L2.CALLBACK_PARSE'
  // L3 Composite nodes
  | 'L3.PAY_REQUEST'
  | 'L3.REFUND_FLOW'
  | 'L3.QUERY_FLOW'
  | 'L3.WITHDRAW_FLOW'
  | 'L3.TRANSFER_FLOW'
  | 'L3.CAPTURE_FLOW'
  | 'L3.BALANCE_QUERY'
  | 'L3.USER_AUTH'
  | 'L3.NOTIFY_FLOW'
  | 'L3.RECONCILE_FLOW'
  | 'L3.CONTRACT_FLOW'
  | 'L3.UPLOAD_FLOW'
  | 'L3.CLOSE_FLOW'
  | 'L3.CREDIT_GRANT'
  // L4 Template nodes
  | 'L4-T01'
  | 'L4-T02'
  | 'L4-T05';

export interface FlowNodeBase {
  nodeId: string;
  nodeType: FlowNodeType;
  debugPoint?: { pre?: boolean; post?: boolean };
  ui?: { x: number; y: number };
}

export interface HttpRequestConfig {
  endpointId?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timeout?: number;
  retryCount?: number;
  inputMappings?: FieldMapping[];
  outputMappings?: FieldMapping[];
  responseCodes?: ResponseCodeMapping[];
}

export interface ConditionBranchConfig {
  outputs: ConditionBranchOutput[];
}

export interface ConditionBranchOutput {
  outputKey: string;
  label: string;
  ruleCombine: 'AND' | 'OR';
  rules: ConditionRule[];
}

export interface ConditionRule {
  field: string;
  operator: '==' | '!=' | '>' | '<' | 'contains' | 'startsWith';
  value: string;
}

export interface StateTransitionConfig {
  targetState: string;
  errorState?: string;
}

export interface RequeryConfig {
  strategy?: string;
  maxAttempts?: number;
  interval?: number;
}

export interface FieldMapping {
  id: string;
  fromField: string;
  toField: string;
  transform?: string;
}

export interface ResponseCodeMapping {
  code: string;
  status: string;
  message?: string;
}

export type FlowNode = FlowNodeBase &
  (
    | { nodeType: 'HttpRequest'; config: HttpRequestConfig }
    | { nodeType: 'ConditionBranch'; config: ConditionBranchConfig }
    | { nodeType: 'StateTransition'; config: StateTransitionConfig }
    | { nodeType: 'Requery'; config: RequeryConfig }
    | { nodeType: 'FieldMapping'; config: { mappings: FieldMapping[] } }
    | { nodeType: 'InternalCall'; config: { serviceName: string; method: string } }
    | { nodeType: 'Notify'; config: { topic: string } }
    | { nodeType: 'CallbackParse'; config: Record<string, never> }
    | { nodeType: 'GenerateData'; config: { type: string; field: string } }
    | { nodeType: 'MqSend'; config: { topic: string; message: string } }
    | { nodeType: 'OrderCreate'; config: Record<string, never> }
    | { nodeType: 'OrderUpdate'; config: { status: string } }
  );

export type FlowEdgeType = 'NEXT' | 'BRANCH';

export interface FlowEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: FlowEdgeType;
  branchOutputKey?: string;
}

export interface FlowGraph {
  flowId: string;
  name: string;
  l4TemplateId?: string;
  businessType?: string;
  ability?: string;
  action?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export type FlowEnv = 'Draft' | 'Daily' | 'Pre' | 'Prod';

export interface FlowVersion {
  env: FlowEnv;
  versionNo: number;
  flowGraph: FlowGraph;
  deployedAt?: string;
}

export interface FlowEntity {
  flowId: string;
  name: string;
  channelId?: string;
  l4TemplateId?: string;
  businessType?: string;
  ability?: string;
  action?: string;
  versions: Partial<Record<FlowEnv, FlowVersion>>;
}
