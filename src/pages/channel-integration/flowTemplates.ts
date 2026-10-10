import type { FlowCanvasEdge, FlowCanvasNode, FlowConfig, TriggerType } from './types';

export const TRIGGER_TYPE_DESCRIPTIONS: Record<TriggerType, string> = {
  UPSTREAM_TRIGGERED: 'Triggered when an internal upstream system sends a business request to the gateway.',
  EXTERNAL_INBOUND_TRIGGERED: 'Triggered when an external system initiates a new inbound business request.',
  CALLBACK_TRIGGERED: 'Triggered when an external channel returns a result or notification for an earlier outbound request.',
  ASYNC_TRIGGERED: 'Triggered asynchronously by an asyncTriggerFlow component in an earlier flow.',
  REQUERY_TRIGGERED: 'Triggered by the platform requery strategy after an order enters the configured sub-state.',
};

export const ACTION_HELP: Record<TriggerType, string> = {
  UPSTREAM_TRIGGERED: 'Only TRANSACTION, VERIFY, and QUERY Actions configured for this Ability in Config Integration are available.',
  EXTERNAL_INBOUND_TRIGGERED: 'If an inbound Action is missing, add it to this Ability in Config Integration. INBOUND_REQUERY availability is pending confirmation.',
  CALLBACK_TRIGGERED: 'Only Actions already used by an UPSTREAM_TRIGGERED Flow in this Flow Group are available.',
  ASYNC_TRIGGERED: 'Only Actions already used by an UPSTREAM_TRIGGERED or EXTERNAL_INBOUND_TRIGGERED Flow in this Flow Group are available.',
  REQUERY_TRIGGERED: 'Only Actions already used by an UPSTREAM_TRIGGERED Flow in this Flow Group are available.',
};

const unique = (values: string[]) => [...new Set(values)];

export function getActionsForTrigger(triggerType: TriggerType, availableActions: string[], flows: FlowConfig[]) {
  const usedBy = (types: TriggerType[]) => unique(flows
    .filter((flow) => flow.triggerType && types.includes(flow.triggerType))
    .flatMap((flow) => [...(flow.triggerEvents ?? []), ...(flow.contextActions ?? [])]));
  switch (triggerType) {
    case 'UPSTREAM_TRIGGERED': return availableActions.filter((action) => ['TRANSACTION', 'VERIFY', 'QUERY'].includes(action));
    case 'EXTERNAL_INBOUND_TRIGGERED': return availableActions.filter((action) => ['INBOUND_TRANSACTION', 'INBOUND_QUERY'].includes(action));
    case 'CALLBACK_TRIGGERED':
    case 'REQUERY_TRIGGERED': return usedBy(['UPSTREAM_TRIGGERED']).filter((action) => ['TRANSACTION', 'VERIFY'].includes(action));
    case 'ASYNC_TRIGGERED': return usedBy(['UPSTREAM_TRIGGERED', 'EXTERNAL_INBOUND_TRIGGERED']).filter((action) => ['TRANSACTION', 'VERIFY', 'INBOUND_TRANSACTION'].includes(action));
  }
}

export function getTemplates(triggerType: TriggerType, action?: string): string[] {
  if (!action) return [];
  const key = `${triggerType === 'EXTERNAL_INBOUND_TRIGGERED' ? 'EXTERNAL_TRIGGERED' : triggerType}-${action}`;
  return TEMPLATE_OPTIONS[key] ?? [];
}

const TEMPLATE_OPTIONS: Record<string, string[]> = {
  'UPSTREAM_TRIGGERED-TRANSACTION': ['UPSTREAM_TRIGGERED_TRANSACTION'],
  'UPSTREAM_TRIGGERED-VERIFY': ['UPSTREAM_TRIGGERED_VERIFY'],
  'UPSTREAM_TRIGGERED-QUERY': ['UPSTREAM_TRIGGERED_QUERY'],
  'REQUERY_TRIGGERED-TRANSACTION': ['REQUERY_TRIGGERED_OUTBOUND_ORDER'],
  'REQUERY_TRIGGERED-VERIFY': ['REQUERY_TRIGGERED_OUTBOUND_ORDER'],
  'CALLBACK_TRIGGERED-TRANSACTION': ['CALLBACK_TRIGGERED_OUTBOUND_ORDER', 'CALLBACK_TRIGGERED_REQUERY_OUTBOUND_ORDER'],
  'CALLBACK_TRIGGERED-VERIFY': ['CALLBACK_TRIGGERED_OUTBOUND_ORDER', 'CALLBACK_TRIGGERED_REQUERY_OUTBOUND_ORDER'],
  'EXTERNAL_TRIGGERED-INBOUND_TRANSACTION': ['EXTERNAL_TRIGGERED_INBOUND_TRANSACTION'],
  'EXTERNAL_TRIGGERED-INBOUND_QUERY': ['EXTERNAL_TRIGGERED_INBOUND_QUERY'],
  'ASYNC_TRIGGERED-TRANSACTION': ['ASYNC_TRIGGERED'],
  'ASYNC_TRIGGERED-VERIFY': ['ASYNC_TRIGGERED'],
  'ASYNC_TRIGGERED-INBOUND_TRANSACTION': ['ASYNC_TRIGGERED'],
};

const templateComponents: Record<string, string[]> = {
  UPSTREAM_TRIGGERED_TRANSACTION: ['initOutboundFirstOrder', 'http', 'updateOutboundOrder'],
  UPSTREAM_TRIGGERED_VERIFY: ['initOutboundNotFirstOrder', 'http', 'updateOutboundOrder'],
  UPSTREAM_TRIGGERED_QUERY: ['http'],
  REQUERY_TRIGGERED_OUTBOUND_ORDER: ['http', 'updateOutboundOrder'],
  CALLBACK_TRIGGERED_OUTBOUND_ORDER: ['inboundRequest', 'updateOutboundOrderCallback', 'inboundResponse'],
  CALLBACK_TRIGGERED_REQUERY_OUTBOUND_ORDER: ['inboundRequest', 'queryOutboundOrder', 'sendReQueryMQ', 'inboundResponse'],
  EXTERNAL_TRIGGERED_INBOUND_TRANSACTION: ['inboundRequest', 'initInboundOrder', 'requestBusinessAccessLayer', 'updateInboundOrder', 'inboundResponse'],
  EXTERNAL_TRIGGERED_INBOUND_QUERY: ['inboundRequest', 'requestBusinessAccessLayer', 'inboundResponse'],
  ASYNC_TRIGGERED: ['http'],
};

export function buildTemplateCanvas(template: string): { canvasNodes: FlowCanvasNode[]; canvasEdges: FlowCanvasEdge[] } {
  const canvasNodes = (templateComponents[template] ?? []).map((componentCode, index) => ({
    id: `template_${index + 1}`, componentCode, x: 320, y: 60 + index * 120, status: 'not_started' as const,
  }));
  const canvasEdges = canvasNodes.slice(1).map((node, index) => ({
    id: `template_edge_${index + 1}`, source: canvasNodes[index].id, target: node.id,
  }));
  return { canvasNodes, canvasEdges };
}
