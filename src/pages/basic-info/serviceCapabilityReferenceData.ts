export interface CapabilityAbilityReference {
  name: string;
  actions: string[];
  operateTime: string;
  operator: string;
}

const ability = (
  name: string,
  actions: string[],
  operateTime = '2026-09-10 16:20:00',
  operator = '我爱北京天安门',
): CapabilityAbilityReference => ({ name, actions, operateTime, operator });

export const capabilityAbilitiesByBusinessType: Record<string, CapabilityAbilityReference[]> = {
  VIBER: [
    ability('BULK_MESSAGE', ['TRANSACTION'], '2026-08-21 02:53:05', '顾丰荣 gufengrong'),
    ability('SINGLE_MESSAGE', ['RE_QUERY', 'TRANSACTION'], '2026-08-21 05:59:38', '顾丰荣 gufengrong'),
  ],
  INSURANCE: [
    ability('GET_POLICY_INFO', ['QUERY'], '2026-08-17 08:35:56', '王斌 Bin'),
    ability('GET_POLICY_SUBJECT_KYC', ['INBOUND_QUERY'], '2026-08-26 15:48:12', '叶子豪 Abe'),
    ability('UPDATE_POLICY_LIFECYCLE_STATUS', ['INBOUND_QUERY'], '2026-08-26 15:44:00', '叶子豪 Abe'),
  ],
  GIFTCARD: [
    ability('GET_PRODUCTS', ['QUERY'], '2026-07-15 10:37:54', '潘一泓'),
    ability('PRODUCTS_UPDATE_NOTIFY', ['INBOUND_TRANSACTION'], '2026-07-22 03:04:04', '潘一泓'),
    ability('RECHARGE', ['RE_QUERY', 'TRANSACTION'], '2026-07-16 02:29:31', '潘一泓'),
  ],
  STABLECOIN: [
    ability('QUERY_PAYOUT_LIST', ['QUERY']),
    ability('FUND_ALLOCATION', ['RE_QUERY', 'TRANSACTION']),
    ability('TRANSFER', ['RE_QUERY', 'TRANSACTION', 'VERIFY']),
    ability('STABLECOIN_QUERY_RATE', ['QUERY']),
    ability('QUERY_FEE', ['QUERY']),
    ability('PAY_OUT', ['RE_QUERY', 'TRANSACTION']),
    ability('OFF_RAMP', ['RE_QUERY', 'TRANSACTION']),
  ],
  FUNDS_IN: [
    ability('PAYMENT', ['INBOUND_TRANSACTION', 'RE_QUERY', 'TRANSACTION']),
    ability('STABLECOIN_NOTIFY', ['INBOUND_TRANSACTION']),
    ability('BIZ_TYPE_NOTIFY', ['INBOUND_TRANSACTION']),
  ],
  PRODUCT_MANAGEMENT: [
    ability('UPDATE_PRODUCT', ['TRANSACTION']),
    ability('OPEN_PRODUCT', ['TRANSACTION']),
    ability('CLOSE_PRODUCT', ['TRANSACTION']),
  ],
  USSD_DIAL: [
    ability('START_SESSION', ['INBOUND_QUERY']),
    ability('QUERY', ['QUERY']),
    ability('CONTINUE_SESSION', ['INBOUND_QUERY']),
    ability('END_SESSION', ['INBOUND_QUERY']),
  ],
  DISPUTE_IN: [
    ability('NOTIFICATION', ['QUERY']),
    ability('INFO_MODIFY', ['INBOUND_QUERY']),
    ability('DESIGNATE_REFUND', ['RE_QUERY', 'TRANSACTION']),
    ability('CREATE', ['INBOUND_QUERY']),
  ],
  WALLET_ACCOUNT: [
    ability('CREATE_BIND', ['RE_QUERY', 'TRANSACTION']),
    ability('AUTO_DEBIT', ['RE_QUERY', 'TRANSACTION']),
  ],
  WHATSAPP: [ability('SINGLE_MESSAGE', ['RE_QUERY', 'TRANSACTION'])],
};

export function getServiceCapabilityConnections(
  businessType: string,
  serviceName: string,
  explicitConnections: string[] = [],
) {
  const sameNameConnections = (capabilityAbilitiesByBusinessType[businessType] || [])
    .filter((item) => item.name === serviceName)
    .map((item) => item.name);
  return Array.from(new Set([...explicitConnections, ...sameNameConnections]));
}

export interface FieldMappingRow {
  key: string;
  spi: string;
  spiType: 'Object' | 'String' | 'Boolean' | 'Number';
  api?: string;
  apiType?: string;
  level?: number;
}

export const requestFieldMappings: FieldMappingRow[] = [
  { key: 'req-route', spi: 'route', spiType: 'Object' },
  { key: 'req-route-channel', spi: 'route.channel', spiType: 'String', api: 'route.channel', apiType: 'String', level: 1 },
  { key: 'req-route-service-channel', spi: 'route.serviceChannel', spiType: 'String', api: 'route.serviceChannel', apiType: 'String', level: 1 },
  { key: 'req-route-tenant', spi: 'route.tenant', spiType: 'String', api: 'route.tenant', apiType: 'String', level: 1 },
  { key: 'req-route-party', spi: 'route.party', spiType: 'String', api: 'route.party', apiType: 'String', level: 1 },
  { key: 'req-route-country', spi: 'route.country', spiType: 'String', api: 'route.country', apiType: 'String', level: 1 },
  { key: 'req-route-institution', spi: 'route.institution', spiType: 'String', api: 'route.institution', apiType: 'String', level: 1 },
  { key: 'req-capability', spi: 'capability', spiType: 'Object' },
  { key: 'req-capability-bt', spi: 'capability.businessType', spiType: 'String', api: 'capability.businessType', apiType: 'String', level: 1 },
  { key: 'req-capability-service', spi: 'capability.service', spiType: 'String', api: 'service', apiType: 'String', level: 1 },
  { key: 'req-capability-ability', spi: 'capability.ability', spiType: 'String', api: 'capability.ability', apiType: 'String', level: 1 },
  { key: 'req-capability-action', spi: 'capability.action', spiType: 'String', api: 'action', apiType: 'String', level: 1 },
  { key: 'req-capability-version', spi: 'capability.version', spiType: 'String', api: 'version', apiType: 'String', level: 1 },
  { key: 'req-identity', spi: 'identity', spiType: 'Object' },
  { key: 'req-identity-session', spi: 'identity.sessionId', spiType: 'String', api: 'identity.sessionId', apiType: 'String', level: 1 },
  { key: 'req-identity-reference', spi: 'identity.requestReference', spiType: 'String', api: 'requestId', apiType: 'String', level: 1 },
  { key: 'req-payload', spi: 'request', spiType: 'Object' },
  { key: 'req-payload-content', spi: 'request.content', spiType: 'String', api: 'content', apiType: 'String', level: 1 },
];

export const responseFieldMappings: FieldMappingRow[] = [
  { key: 'res-route', spi: 'route', spiType: 'Object' },
  { key: 'res-route-channel', spi: 'route.channel', spiType: 'String', api: 'route.channel', apiType: 'String', level: 1 },
  { key: 'res-route-tenant', spi: 'route.tenant', spiType: 'String', api: 'route.tenant', apiType: 'String', level: 1 },
  { key: 'res-route-party', spi: 'route.party', spiType: 'String', api: 'route.party', apiType: 'String', level: 1 },
  { key: 'res-capability', spi: 'capability', spiType: 'Object' },
  { key: 'res-capability-bt', spi: 'capability.businessType', spiType: 'String', api: 'capability.businessType', apiType: 'String', level: 1 },
  { key: 'res-capability-ability', spi: 'capability.ability', spiType: 'String', api: 'capability.ability', apiType: 'String', level: 1 },
  { key: 'res-capability-action', spi: 'capability.action', spiType: 'String', api: 'capability.action', apiType: 'String', level: 1 },
  { key: 'res-identity', spi: 'identity', spiType: 'Object' },
  { key: 'res-identity-session', spi: 'identity.sessionId', spiType: 'String', api: 'identity.sessionId', apiType: 'String', level: 1 },
  { key: 'res-identity-route-order', spi: 'identity.routeOrderId', spiType: 'String', api: 'routeOrderId', apiType: 'String', level: 1 },
  { key: 'res-identity-channel-order', spi: 'identity.channelOrderId', spiType: 'String', api: 'channelOrderId', apiType: 'String', level: 1 },
  { key: 'res-identity-request-ref', spi: 'identity.requestReference', spiType: 'String', api: 'requestReference', apiType: 'String', level: 1 },
  { key: 'res-identity-response-ref', spi: 'identity.responseReference', spiType: 'String', api: 'responseReference', apiType: 'String', level: 1 },
  { key: 'res-result', spi: 'result', spiType: 'Object' },
  { key: 'res-result-code', spi: 'result.responseCode', spiType: 'String', api: 'responseCode', apiType: 'String', level: 1 },
  { key: 'res-result-message', spi: 'result.responseMessage', spiType: 'String', api: 'responseMessage', apiType: 'String', level: 1 },
];
