import type { TriggerType } from './types';

export type ComponentScope = TriggerType | 'EXTERNAL_TRIGGERED' | 'MATCHCAPABILITY';

export type ComponentDefinition = {
  id: number;
  name: string;
  alias: string;
  description: string;
  usageCount: number;
  needConfig: boolean;
  scopes: ComponentScope[];
  status: 0 | 1;
};

const ALL_SCOPES = ['UPSTREAM_TRIGGERED', 'EXTERNAL_TRIGGERED', 'CALLBACK_TRIGGERED', 'ASYNC_TRIGGERED', 'REQUERY_TRIGGERED', 'MATCHCAPABILITY'] satisfies ComponentScope[];

export const COMPONENT_CATALOG: ComponentDefinition[] = ([
  { id: 94, name: 'inboundPreprocess', alias: 'Prepare inbound request for routing', description: 'Prepare inbound request for routing', usageCount: 1, needConfig: true, scopes: ['MATCHCAPABILITY'], status: 1 },
  { id: 95, name: 'matchCapabilityByOrder', alias: 'Match capability by order', description: 'Match capability by order', usageCount: 1, needConfig: true, scopes: ['MATCHCAPABILITY'], status: 1 },
  { id: 96, name: 'specifyCapability', alias: 'Specify capability', description: 'Specify capability', usageCount: 99, needConfig: true, scopes: ['MATCHCAPABILITY'], status: 1 },
  { id: 97, name: 'condition', alias: 'Branch by conditions', description: 'Branch by conditions', usageCount: 99, needConfig: true, scopes: ALL_SCOPES, status: 1 },
  { id: 98, name: 'inboundRequest', alias: 'Process inbound request', description: 'Process inbound request', usageCount: 1, needConfig: true, scopes: ['EXTERNAL_TRIGGERED', 'CALLBACK_TRIGGERED'], status: 1 },
  { id: 99, name: 'inboundResponse', alias: 'Build inbound response', description: 'Build inbound response', usageCount: 1, needConfig: true, scopes: ['EXTERNAL_TRIGGERED', 'CALLBACK_TRIGGERED'], status: 1 },
  { id: 100, name: 'requestBusinessAccessLayer', alias: 'Request business access layer', description: 'Request business access layer', usageCount: 1, needConfig: true, scopes: ['EXTERNAL_TRIGGERED', 'ASYNC_TRIGGERED'], status: 1 },
  { id: 101, name: 'requestItemCenter', alias: 'Request item center', description: 'Request item center', usageCount: 1, needConfig: false, scopes: ['EXTERNAL_TRIGGERED'], status: 1 },
  { id: 102, name: 'asyncTriggerFlow', alias: 'Trigger another flow asynchronously', description: 'Trigger another flow asynchronously', usageCount: 1, needConfig: false, scopes: ['UPSTREAM_TRIGGERED', 'EXTERNAL_TRIGGERED', 'CALLBACK_TRIGGERED', 'ASYNC_TRIGGERED', 'REQUERY_TRIGGERED'], status: 1 },
  { id: 103, name: 'initInboundOrder', alias: 'Initialize inbound order', description: 'Initialize inbound order', usageCount: 1, needConfig: true, scopes: ['EXTERNAL_TRIGGERED'], status: 1 },
  { id: 104, name: 'updateInboundOrder', alias: 'Update inbound order', description: 'Update inbound order', usageCount: 1, needConfig: false, scopes: ['EXTERNAL_TRIGGERED', 'ASYNC_TRIGGERED'], status: 1 },
  { id: 105, name: 'queryInboundOrder', alias: 'Query inbound order', description: 'Query inbound order', usageCount: 1, needConfig: false, scopes: ['EXTERNAL_TRIGGERED'], status: 1 },
  { id: 106, name: 'updateOutboundOrderCallback', alias: 'Update outbound callback result', description: 'Update outbound callback result', usageCount: 1, needConfig: false, scopes: ['CALLBACK_TRIGGERED'], status: 1 },
  { id: 107, name: 'initOutboundFirstOrder', alias: 'Initialize first outbound order', description: 'Initialize first outbound order', usageCount: 1, needConfig: false, scopes: ['UPSTREAM_TRIGGERED'], status: 1 },
  { id: 108, name: 'updateOutboundOrder', alias: 'Update outbound order', description: 'Update outbound order', usageCount: 1, needConfig: false, scopes: ['UPSTREAM_TRIGGERED', 'ASYNC_TRIGGERED', 'REQUERY_TRIGGERED'], status: 1 },
  { id: 109, name: 'queryOutboundOrder', alias: 'Query outbound order', description: 'Query outbound order', usageCount: 1, needConfig: false, scopes: ['CALLBACK_TRIGGERED'], status: 1 },
  { id: 110, name: 'initOutboundNotFirstOrder', alias: 'Initialize subsequent outbound order', description: 'Initialize subsequent outbound order', usageCount: 1, needConfig: false, scopes: ['UPSTREAM_TRIGGERED'], status: 1 },
  { id: 111, name: 'http', alias: 'Send HTTP request', description: 'Send HTTP request', usageCount: 1, needConfig: true, scopes: ['UPSTREAM_TRIGGERED', 'EXTERNAL_TRIGGERED', 'CALLBACK_TRIGGERED', 'ASYNC_TRIGGERED', 'REQUERY_TRIGGERED'], status: 1 },
  { id: 112, name: 'sendCompleteMQ', alias: 'Send completion message', description: 'Send completion message', usageCount: 1, needConfig: false, scopes: ['UPSTREAM_TRIGGERED', 'EXTERNAL_TRIGGERED', 'CALLBACK_TRIGGERED', 'ASYNC_TRIGGERED', 'REQUERY_TRIGGERED'], status: 1 },
  { id: 113, name: 'sendReQueryMQ', alias: 'Send requery message', description: 'Send requery message', usageCount: 1, needConfig: false, scopes: ['CALLBACK_TRIGGERED'], status: 1 },
  { id: 114, name: 'asyncExecuteFlow', alias: 'async execute flow', description: 'async execute flow', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 115, name: 'callbackRequest', alias: 'callback request', description: 'callback request', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 116, name: 'callbackResponse', alias: 'callback response', description: 'callback response', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 117, name: 'matchCapability', alias: 'match capability', description: 'match capability', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 118, name: 'response', alias: 'response', description: 'response', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 119, name: 'request', alias: 'request', description: 'request', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 120, name: 'responseCodeInner2Outer', alias: 'response code inner 2 outer', description: 'response code inner 2 outer', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 121, name: 'loadCredential', alias: 'load credential', description: 'load credential', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 122, name: 'eventListener', alias: 'event listener', description: 'event listener', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 123, name: 'loadGlobalVariable', alias: 'load global variable', description: 'load global variable', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 124, name: 'institutionInner2Outer', alias: 'institution inner to outer', description: 'institution inner to outer', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 125, name: 'institutionOuter2Inner', alias: 'institution outer to inner', description: 'institution outer to inner', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 126, name: 'loadLine', alias: 'load line', description: 'load line', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 127, name: 'network', alias: 'network', description: 'network', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 128, name: 'messageNotification', alias: 'message notification', description: 'message notification', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 129, name: 'initOrder', alias: 'init order', description: 'init order', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 130, name: 'updateOrder', alias: 'update order', description: 'update order', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 131, name: 'queryOrder', alias: 'query order', description: 'query order', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 132, name: 'updateOutboundBatchOrder', alias: 'update outbound order batch', description: 'update outbound order batch', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 133, name: 'generateRrn', alias: 'generate rrn', description: 'generate rrn', usageCount: 1, needConfig: true, scopes: ALL_SCOPES, status: 0 },
  { id: 134, name: 'parseServletRequest', alias: 'parse servlet request', description: 'parse servlet request', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
  { id: 135, name: 'writeServletResponse', alias: 'write servlet response', description: 'write servlet response', usageCount: 1, needConfig: false, scopes: ALL_SCOPES, status: 0 },
] satisfies ComponentDefinition[]).sort((left, right) => right.status - left.status || left.id - right.id);

export const componentScopeForTrigger = (triggerType?: TriggerType): ComponentScope | undefined =>
  triggerType === 'EXTERNAL_INBOUND_TRIGGERED' ? 'EXTERNAL_TRIGGERED' : triggerType;

export const componentsForScope = (scope?: ComponentScope) => scope
  ? COMPONENT_CATALOG.filter((component) => component.scopes.includes(scope))
  : [];

export const componentByName = (name: string) => COMPONENT_CATALOG.find((component) => component.name === name);
