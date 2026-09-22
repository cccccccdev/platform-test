export const EFFECT_TAG_OPTIONS = [
  'EFFECT_ON_UPSTREAM',
  'EFFECT_ON_DOWNSTREAM',
  'EFFECT_ON_BIDIRECTIONAL',
] as const;

export type EffectTag = typeof EFFECT_TAG_OPTIONS[number];

export interface ServiceApiField {
  key: string;
  name: string;
  type: string;
  effectTag?: EffectTag;
  description: string;
  depth?: number;
}

const field = (
  key: string,
  name: string,
  type: string,
  effectTag: EffectTag | undefined,
  description: string,
  depth = 0,
): ServiceApiField => ({ key, name, type, effectTag, description, depth });

export const serviceApiRequestFields: ServiceApiField[] = [
  field('req-route', 'route', 'Object', undefined, '路由配置信息'),
  field('req-channel', 'channel', 'String', 'EFFECT_ON_DOWNSTREAM', '渠道', 1),
  field('req-service-channel', 'serviceChannel', 'String', 'EFFECT_ON_BIDIRECTIONAL', '逻辑渠道', 1),
  field('req-country', 'country', 'String', 'EFFECT_ON_BIDIRECTIONAL', '国家/地区代码', 1),
  field('req-tenant', 'tenant', 'String', 'EFFECT_ON_BIDIRECTIONAL', '租户', 1),
  field('req-party', 'party', 'String', 'EFFECT_ON_BIDIRECTIONAL', '主体', 1),
  field('req-institution', 'institution', 'String', 'EFFECT_ON_BIDIRECTIONAL', '机构', 1),
  field('req-trans-type', 'transType', 'String', 'EFFECT_ON_BIDIRECTIONAL', '交易 1.0 的交易类型', 1),
  field('req-source-product', 'sourceProduct', 'String', 'EFFECT_ON_BIDIRECTIONAL', '交易 2.0 的交易类型', 1),
  field('req-account', 'account', 'String', 'EFFECT_ON_DOWNSTREAM', '账号信息', 1),
  field('req-capability', 'capability', 'Object', undefined, '业务能力配置'),
  field('req-business-type', 'businessType', 'String', 'EFFECT_ON_BIDIRECTIONAL', '业务类型', 1),
  field('req-service', 'service', 'String', 'EFFECT_ON_BIDIRECTIONAL', '服务', 1),
  field('req-ability', 'ability', 'String', 'EFFECT_ON_DOWNSTREAM', '能力', 1),
  field('req-action', 'action', 'String', 'EFFECT_ON_BIDIRECTIONAL', '动作', 1),
  field('req-identity', 'identity', 'Object', undefined, '请求身份标识信息'),
  field('req-route-order-id', 'routeOrderId', 'Long', 'EFFECT_ON_DOWNSTREAM', '业务接入订单id', 1),
  field('req-orig-route-order-id', 'origRouteOrderId', 'Long', 'EFFECT_ON_DOWNSTREAM', '原单业务接入订单id', 1),
  field('req-upstream-request-id', 'upstreamRequestId', 'String', 'EFFECT_ON_UPSTREAM', 'subPayId', 1),
  field('req-origin-upstream-request-id', 'originUpstreamRequestId', 'String', 'EFFECT_ON_UPSTREAM', '原单subPayId', 1),
  field('req-reference', 'requestReference', 'String', 'EFFECT_ON_BIDIRECTIONAL', '关联请求单号', 1),
  field('req-session-id', 'sessionId', 'String', 'EFFECT_ON_BIDIRECTIONAL', '会话ID', 1),
  field('req-extra-request', 'extraRequest', 'Object', undefined, ''),
];

export const serviceApiResponseFields: ServiceApiField[] = [
  field('res-route', 'route', 'Object', undefined, '路由配置信息'),
  field('res-channel', 'channel', 'String', 'EFFECT_ON_DOWNSTREAM', '渠道', 1),
  field('res-service-channel', 'serviceChannel', 'String', 'EFFECT_ON_UPSTREAM', '逻辑渠道', 1),
  field('res-country', 'country', 'String', 'EFFECT_ON_UPSTREAM', '国家/地区代码', 1),
  field('res-tenant', 'tenant', 'String', 'EFFECT_ON_UPSTREAM', '租户', 1),
  field('res-party', 'party', 'String', 'EFFECT_ON_UPSTREAM', '主体', 1),
  field('res-institution', 'institution', 'String', 'EFFECT_ON_UPSTREAM', '机构', 1),
  field('res-capability', 'capability', 'Object', undefined, '业务能力配置'),
  field('res-business-type', 'businessType', 'String', 'EFFECT_ON_UPSTREAM', '业务类型', 1),
  field('res-service', 'service', 'String', 'EFFECT_ON_UPSTREAM', '服务', 1),
  field('res-action', 'action', 'String', 'EFFECT_ON_UPSTREAM', '动作', 1),
  field('res-ability', 'ability', 'String', 'EFFECT_ON_DOWNSTREAM', '能力', 1),
  field('res-identity', 'identity', 'Object', undefined, '请求身份标识信息'),
  field('res-route-order-id', 'routeOrderId', 'Long', 'EFFECT_ON_UPSTREAM', '业务接入订单id', 1),
  field('res-orig-route-order-id', 'origRouteOrderId', 'Long', 'EFFECT_ON_UPSTREAM', '原单业务接入订单id', 1),
  field('res-upstream-request-id', 'upstreamRequestId', 'String', 'EFFECT_ON_UPSTREAM', 'subPayId', 1),
  field('res-origin-upstream-request-id', 'originUpstreamRequestId', 'String', 'EFFECT_ON_UPSTREAM', '原单subPayId', 1),
  field('res-request-reference', 'requestReference', 'String', 'EFFECT_ON_UPSTREAM', '关联请求单号', 1),
  field('res-response-reference', 'responseReference', 'String', 'EFFECT_ON_BIDIRECTIONAL', '关联响应单号', 1),
  field('res-channel-order-id', 'channelOrderId', 'Long', 'EFFECT_ON_DOWNSTREAM', '网关单号', 1),
  field('res-session-id', 'sessionId', 'String', 'EFFECT_ON_UPSTREAM', '会话ID', 1),
  field('res-result', 'result', 'Object', undefined, '响应结果'),
  field('res-status', 'status', 'String', 'EFFECT_ON_BIDIRECTIONAL', '交易状态', 1),
  field('res-code', 'responseCode', 'String', 'EFFECT_ON_BIDIRECTIONAL', 'palmpay响应码', 1),
  field('res-message', 'responseMsg', 'String', 'EFFECT_ON_BIDIRECTIONAL', 'palmpay响应信息', 1),
  field('res-channel-response-code', 'channelResponseCode', 'String', 'EFFECT_ON_BIDIRECTIONAL', '渠道响应码', 1),
  field('res-channel-response-msg', 'channelResponseMsg', 'String', 'EFFECT_ON_BIDIRECTIONAL', '渠道响应信息', 1),
  field('res-extra-response', 'extraResponse', 'Object', undefined, ''),
];
