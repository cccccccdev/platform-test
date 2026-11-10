/**
 * Context 取值候选树的单一来源。
 *
 * 定义从 `http` 组件抽取，`uploadToS3` 的使用场景（对象键变量映射）复用同一份结构，
 * 保证同一 Channel 在不同组件里看到的候选范围一致。
 *
 * TODO: `http` 目前仍在文件内维护自己的内联副本（生成数据分支已改为引用本模块的
 * `generatedSourceOptions`）；其余分支尚未切换。切换后本文件即成为唯一来源。
 */

export interface SourceOption {
  label: string;
  value: string;
  type?: string;
  children?: SourceOption[];
}

export interface SourceOptionGroup {
  label: string;
  options: SourceOption[];
}

export type SourceMappingOption = SourceOption | SourceOptionGroup;

export const generatedSourceOptions: SourceOption[] = [
  { label: 'DATE', value: 'generated.date', children: [
    { label: 'Generate timestamp', value: 'generated.timestamp', type: 'String' },
    { label: 'Generate current time millis', value: 'generated.current-time-millis', type: 'Long' },
    { label: 'Generate current timestamp(second)', value: 'generated.current-timestamp-second', type: 'Long' },
  ] },
  { label: 'RANDOM', value: 'generated.random', children: [
    { label: 'Generate digital random number', value: 'generated.digital-random-number', type: 'Long' },
    { label: 'Generate character random number', value: 'generated.character-random-number', type: 'String' },
    { label: 'Generate reference number', value: 'generated.reference-number', type: 'String' },
  ] },
  { label: 'CALLBACK', value: 'generated.callback', children: [
    { label: 'Generate callback url', value: 'generated.callback-url', type: 'String' },
  ] },
];

export const requestFieldTypes: Record<string, string> = { amount: 'BigDecimal', timestamp: 'Long' };
export const responseFieldTypes: Record<string, string> = { amount: 'BigDecimal' };

export const spiRequestFieldsFor = (channelCode: string): string[] => channelCode === 'EVEXIN'
  ? ['content', 'mobileNumber', 'requestReference', 'responseReference']
  : ['amount', 'currency', 'reference', 'customerId', 'accountNumber', 'bankCode', 'timestamp'];

export const spiResponseFieldsFor = (channelCode: string): string[] => channelCode === 'EVEXIN'
  ? ['channelResponseCode', 'responseMessage', 'responseReference', 'status']
  : ['responseCode', 'responseMessage', 'status', 'channelReference', 'amount', 'currency', 'customerId'];

export const subOrderResponseFields = [
  { path: 'feature.featureField', type: 'String' },
  { path: 'feature.featureValue', type: 'String' },
  { path: 'identity.responseReference', type: 'String' },
  { path: 'extraResponse.sendTime', type: 'String' },
  { path: 'extraResponse.sender', type: 'String' },
  { path: 'extraResponse.deliveryTime', type: 'String' },
  { path: 'result.status', type: 'String' },
  { path: 'result.responseCode', type: 'String' },
  { path: 'result.responseMsg', type: 'String' },
  { path: 'result.channelResponseCode', type: 'String' },
  { path: 'result.channelResponseMsg', type: 'String' },
];

export const buildSubOrderListOption = (): SourceOption => ({
  label: 'subOrderList',
  value: '_order.subOrderList',
  type: 'Array',
  children: [{
    label: '_items',
    value: '_order.subOrderList._items',
    type: 'Object',
    children: [
      { label: 'feature', value: '_order.subOrderList._items.feature', type: 'Object', children: [
        { label: 'featureField', value: '_order.subOrderList._items.feature.featureField', type: 'String' },
        { label: 'featureValue', value: '_order.subOrderList._items.feature.featureValue', type: 'String' },
      ] },
      { label: 'identity', value: '_order.subOrderList._items.identity', type: 'Object', children: [
        { label: 'requestReference', value: '_order.subOrderList._items.identity.requestReference', type: 'String' },
        { label: 'responseReference', value: '_order.subOrderList._items.identity.responseReference', type: 'String' },
      ] },
      { label: 'extraRequest', value: '_order.subOrderList._items.extraRequest', type: 'Object', children: [
        { label: 'content', value: '_order.subOrderList._items.extraRequest.content', type: 'String' },
      ] },
      { label: 'result', value: '_order.subOrderList._items.result', type: 'Object', children: [
        { label: 'status', value: '_order.subOrderList._items.result.status', type: 'String' },
        { label: 'responseCode', value: '_order.subOrderList._items.result.responseCode', type: 'String' },
        { label: 'responseMsg', value: '_order.subOrderList._items.result.responseMsg', type: 'String' },
        { label: 'channelResponseCode', value: '_order.subOrderList._items.result.channelResponseCode', type: 'String' },
        { label: 'channelResponseMsg', value: '_order.subOrderList._items.result.channelResponseMsg', type: 'String' },
      ] },
      { label: 'extraResponse', value: '_order.subOrderList._items.extraResponse', type: 'Object', children: [
        { label: 'sendTime', value: '_order.subOrderList._items.extraResponse.sendTime', type: 'String' },
        { label: 'sender', value: '_order.subOrderList._items.extraResponse.sender', type: 'String' },
        { label: 'deliveryTime', value: '_order.subOrderList._items.extraResponse.deliveryTime', type: 'String' },
      ] },
    ],
  }],
});

export const buildOrderContextOption = (subOrderModeEnabled: boolean): SourceOption => ({
  label: '_order',
  value: '_order',
  type: 'Object',
  children: [
    { label: 'route', value: '_order.route', type: 'Object', children: ['channel', 'serviceChannel', 'country', 'tenant', 'party', 'institution'].map((name) => ({ label: name, value: `_order.route.${name}`, type: 'String' })) },
    { label: 'capability', value: '_order.capability', type: 'Object', children: ['businessType', 'action', 'ability', 'service'].map((name) => ({ label: name, value: `_order.capability.${name}`, type: 'String' })) },
    { label: 'identity', value: '_order.identity', type: 'Object', children: ['routeOrderId', 'origRouteOrderId', 'requestReference', 'responseReference', 'channelOrderId', 'sessionId'].map((name) => ({ label: name, value: `_order.identity.${name}`, type: name.toLowerCase().includes('orderid') ? 'Long' : 'String' })) },
    { label: 'extraRequest', value: '_order.extraRequest', type: 'Object', children: ['mobileNumberList', 'content', 'sender'].map((name) => ({ label: name, value: `_order.extraRequest.${name}`, type: name === 'mobileNumberList' ? 'Array' : 'String' })) },
    ...(subOrderModeEnabled ? [buildSubOrderListOption()] : []),
    { label: 'result', value: '_order.result', type: 'Object', children: ['status', 'responseCode', 'responseMsg', 'channelResponseCode', 'channelResponseMsg'].map((name) => ({ label: name, value: `_order.result.${name}`, type: 'String' })) },
    { label: 'extraResponse', value: '_order.extraResponse', type: 'Object', children: ['sendTime', 'sender', 'deliveryTime'].map((name) => ({ label: name, value: `_order.extraResponse.${name}`, type: 'String' })) },
  ],
});

/** 按作用域分组的请求侧候选，`http` 的 Params / Headers / Body 与 uploadToS3 的对象键共用。 */
export const buildRequestContextOptions = ({
  spiRequest,
  globals,
  orders,
  credentials,
  channelMerchantInfoAvailable = false,
}: {
  spiRequest: string[];
  globals: Array<{ name: string }>;
  orders: Array<{ name: string }>;
  credentials: Array<{ key: string }>;
  channelMerchantInfoAvailable?: boolean;
}): SourceOptionGroup[] => [
  { label: 'SPI Request', options: spiRequest.map((name) => ({ label: name, value: `spi.request.${name}`, type: requestFieldTypes[name] ?? 'String' })) },
  { label: 'Global Variables', options: globals.map((item) => ({ label: item.name, value: `global.${item.name}`, type: 'String' })) },
  { label: 'Order Variables', options: orders.map((item) => ({ label: item.name, value: `order.${item.name}`, type: 'String' })) },
  { label: 'Credentials', options: credentials.map((item) => ({ label: item.key, value: `credential.${item.key}`, type: 'String' })) },
  ...(channelMerchantInfoAvailable
    ? [{ label: 'Channel Merchant Info', options: [{ label: 'channelMerchantId', value: 'channelMerchantInfo.channelMerchantId', type: 'String' }] }]
    : []),
];

export const buildRequestValueOptions = ({
  orderContextOption,
  requestContextOptions,
}: {
  orderContextOption: SourceOption;
  requestContextOptions: SourceOptionGroup[];
}): SourceMappingOption[] => [
  { label: 'Context Fields', options: [orderContextOption] },
  ...requestContextOptions,
  { label: 'Generated Data', options: generatedSourceOptions },
];

/** FlatFieldMappingEditor 会把分组转成带 value 的层级节点，这里做同样转换以便复用查找逻辑。 */
export const toCascaderOptions = (options: SourceMappingOption[]): SourceOption[] =>
  options.map((option) => 'options' in option
    ? { label: option.label, value: option.label, children: option.options }
    : option);

/** 由叶子取值反查完整级联路径，用于回显已保存配置。 */
export const findCascadePath = (options: SourceOption[], target: string): string[] | undefined => {
  for (const option of options) {
    if (option.children?.length) {
      const nested = findCascadePath(option.children, target);
      if (nested) return [option.value, ...nested];
    } else if (option.value === target) {
      return [option.value];
    }
  }
  return undefined;
};
