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
  effectTag: EffectTag;
  description: string;
  depth?: number;
}

const field = (
  key: string,
  name: string,
  type: string,
  effectTag: EffectTag,
  description: string,
  depth = 0,
): ServiceApiField => ({ key, name, type, effectTag, description, depth });

export const serviceApiRequestFields: ServiceApiField[] = [
  field('req-route', 'route', 'Object', 'EFFECT_ON_BIDIRECTIONAL', '路由配置信息'),
  field('req-channel', 'channel', 'String', 'EFFECT_ON_DOWNSTREAM', '渠道', 1),
  field('req-service-channel', 'serviceChannel', 'String', 'EFFECT_ON_BIDIRECTIONAL', '逻辑渠道', 1),
  field('req-country', 'country', 'String', 'EFFECT_ON_BIDIRECTIONAL', '国家/地区代码', 1),
  field('req-tenant', 'tenant', 'String', 'EFFECT_ON_BIDIRECTIONAL', '租户', 1),
  field('req-party', 'party', 'String', 'EFFECT_ON_BIDIRECTIONAL', '主体', 1),
  field('req-institution', 'institution', 'String', 'EFFECT_ON_BIDIRECTIONAL', '机构', 1),
  field('req-trans-type', 'transType', 'String', 'EFFECT_ON_BIDIRECTIONAL', '交易 1.0 的交易类型', 1),
  field('req-source-product', 'sourceProduct', 'String', 'EFFECT_ON_BIDIRECTIONAL', '交易 2.0 的交易类型', 1),
  field('req-capability', 'capability', 'Object', 'EFFECT_ON_DOWNSTREAM', '服务能力上下文'),
  field('req-business-type', 'businessType', 'String', 'EFFECT_ON_DOWNSTREAM', '业务类型', 1),
  field('req-service', 'service', 'String', 'EFFECT_ON_DOWNSTREAM', '服务', 1),
  field('req-action', 'action', 'String', 'EFFECT_ON_DOWNSTREAM', '动作', 1),
  field('req-identity', 'identity', 'Object', 'EFFECT_ON_BIDIRECTIONAL', '请求身份标识信息'),
  field('req-session-id', 'sessionId', 'String', 'EFFECT_ON_BIDIRECTIONAL', '会话标识', 1),
  field('req-reference', 'requestReference', 'String', 'EFFECT_ON_BIDIRECTIONAL', '请求参考号', 1),
  field('req-content', 'content', 'String', 'EFFECT_ON_DOWNSTREAM', '业务请求内容'),
];

export const serviceApiResponseFields: ServiceApiField[] = [
  field('res-route', 'route', 'Object', 'EFFECT_ON_BIDIRECTIONAL', '路由配置信息'),
  field('res-channel', 'channel', 'String', 'EFFECT_ON_UPSTREAM', '渠道', 1),
  field('res-country', 'country', 'String', 'EFFECT_ON_BIDIRECTIONAL', '国家/地区代码', 1),
  field('res-tenant', 'tenant', 'String', 'EFFECT_ON_BIDIRECTIONAL', '租户', 1),
  field('res-party', 'party', 'String', 'EFFECT_ON_BIDIRECTIONAL', '主体', 1),
  field('res-capability', 'capability', 'Object', 'EFFECT_ON_UPSTREAM', '服务能力上下文'),
  field('res-business-type', 'businessType', 'String', 'EFFECT_ON_UPSTREAM', '业务类型', 1),
  field('res-service', 'service', 'String', 'EFFECT_ON_UPSTREAM', '服务', 1),
  field('res-action', 'action', 'String', 'EFFECT_ON_UPSTREAM', '动作', 1),
  field('res-identity', 'identity', 'Object', 'EFFECT_ON_BIDIRECTIONAL', '响应身份标识信息'),
  field('res-route-order-id', 'routeOrderId', 'String', 'EFFECT_ON_BIDIRECTIONAL', '金融网络订单号', 1),
  field('res-response-reference', 'responseReference', 'String', 'EFFECT_ON_UPSTREAM', '响应参考号', 1),
  field('res-result', 'result', 'Object', 'EFFECT_ON_UPSTREAM', '响应结果'),
  field('res-status', 'status', 'String', 'EFFECT_ON_UPSTREAM', '交易状态', 1),
  field('res-code', 'responseCode', 'String', 'EFFECT_ON_UPSTREAM', '响应码', 1),
  field('res-message', 'responseMessage', 'String', 'EFFECT_ON_UPSTREAM', '响应信息', 1),
];
