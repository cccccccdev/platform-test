import type { FlowCanvasEdge, FlowCanvasNode, FlowConfig, TriggerType } from './types';

export const TRIGGER_TYPE_DESCRIPTIONS: Record<TriggerType, string> = {
  UPSTREAM_TRIGGERED: 'Triggered when an internal upstream system sends a business request to the gateway.',
  EXTERNAL_INBOUND_TRIGGERED: 'Triggered when an external system initiates a new inbound business request.',
  CALLBACK_TRIGGERED: 'Triggered when an external channel returns a result or notification for an earlier outbound request.',
  ASYNC_TRIGGERED: 'Triggered asynchronously by an asyncExecuteFlow component in an earlier flow.',
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
    case 'REQUERY_TRIGGERED': return usedBy(['UPSTREAM_TRIGGERED']);
    case 'ASYNC_TRIGGERED': return usedBy(['UPSTREAM_TRIGGERED', 'EXTERNAL_INBOUND_TRIGGERED']);
  }
}

export function getTemplates(triggerType: TriggerType, action?: string): string[] {
  switch (triggerType) {
    case 'UPSTREAM_TRIGGERED': return action && ['TRANSACTION', 'VERIFY', 'QUERY'].includes(action) ? [action] : [];
    case 'EXTERNAL_INBOUND_TRIGGERED':
      if (action === 'INBOUND_TRANSACTION') return ['MESSAGE_NOTIFICATION', 'INBOUND_QUERY', 'INBOUND_RE_QUERY', 'INBOUND_TRANSACTION_WITH_ACK'];
      if (action === 'INBOUND_QUERY') return ['INBOUND_QUERY'];
      return [];
    case 'CALLBACK_TRIGGERED': return action ? ['CALLBACK', 'CALLBACK_REQUERY', 'CALLBACK_BATCH_ORDER'] : [];
    case 'ASYNC_TRIGGERED': return action ? ['ACK_INBOUND_TRANSACTION'] : [];
    case 'REQUERY_TRIGGERED': return action ? ['REQUERY'] : [];
  }
}

const templateComponents: Record<string, string[]> = {
  TRANSACTION: ['initOutboundOrder', 'generateRequestReference', 'httpCall', 'updateOutboundOrder', 'sendCompleteMQ'],
  VERIFY: ['prepareExtendOrder', 'httpCall', 'updateOutboundOrder', 'sendCompleteMQ'],
  QUERY: ['generateRequestReference', 'httpCall'],
  REQUERY: ['httpCall', 'updateOutboundOrder', 'sendCompleteMQ'],
  ACK_INBOUND_TRANSACTION: ['httpCall', 'updateInboundOrder', 'sendCompleteMQ'],
  CALLBACK: ['inboundRequest', 'updateOutboundOrder', 'sendCompleteMQ', 'inboundResponse'],
  CALLBACK_REQUERY: ['inboundRequest', 'queryOutboundOrder', 'sendReQueryMQ', 'inboundResponse'],
  CALLBACK_BATCH_ORDER: ['inboundRequest', 'updateOutboundBatchOrder', 'sendCompleteMQ', 'inboundResponse'],
  MESSAGE_NOTIFICATION: ['inboundRequest', 'initInboundOrder', 'requestBusinessAccessLayer', 'responseCodeInner2Outer', 'inboundResponse'],
  INBOUND_QUERY: ['inboundRequest', 'requestBusinessAccessLayer', 'responseCodeInner2Outer', 'inboundResponse'],
  INBOUND_RE_QUERY: ['inboundRequest', 'queryInboundOrder', 'responseCodeInner2Outer', 'inboundResponse'],
  INBOUND_TRANSACTION_WITH_ACK: ['inboundRequest', 'initInboundOrder', 'requestBusinessAccessLayer', 'responseCodeInner2Outer', 'inboundResponse', 'asyncExecuteFlow'],
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
