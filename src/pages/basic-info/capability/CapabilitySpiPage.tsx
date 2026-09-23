import { useState } from 'react';
import { Alert, Breadcrumb, Button, Input, Modal, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExclamationCircleOutlined, LeftOutlined } from '@ant-design/icons';
import './CapabilitySpiPage.css';
import { isSubOrderModeEnabled } from './subOrderModeStore';
import { getDemoReturnUrl } from '../demoNavigation';
import SpiSchemaTree from './SpiSchemaTree';
import { fieldsToTree, validateSpiTree, withoutBusinessFields, type SpiFieldNode } from './spiSchemaModel';

const { Title } = Typography;

type SpiTab = 'config' | 'code';

interface SpiField {
  name: string;
  type: string;
  description?: string;
  depth?: number;
  required?: boolean;
  extension?: boolean;
}

interface SpiDefinition {
  method: string;
  url: string;
  timeout: string;
  subOrderMode: string;
  description?: string;
  request: SpiField[];
  response: SpiField[];
}

const CONFIG_SPI: SpiDefinition = {
  method: 'POST',
  url: '/api/insight',
  timeout: '10000',
  subOrderMode: 'Disabled',
  request: [
    { name: 'route', type: 'Object', description: '路由配置信息' },
    { name: 'channel', type: 'String', description: '渠道', depth: 1 },
    { name: 'serviceChannel', type: 'String', description: '逻辑渠道', depth: 1 },
    { name: 'country', type: 'String', description: '国家/地区代码', depth: 1 },
    { name: 'tenant', type: 'String', description: '租户', depth: 1 },
    { name: 'party', type: 'String', description: '主体', depth: 1 },
    { name: 'institution', type: 'String', description: '机构', depth: 1 },
    { name: 'transType', type: 'String', description: '交易1.0的交易类型', depth: 1 },
    { name: 'sourceProduct', type: 'String', description: '交易2.0的交易类型', depth: 1 },
    { name: 'account', type: 'String', description: '账号', depth: 1 },
    { name: 'capability', type: 'Object', description: '业务能力配置' },
    { name: 'businessType', type: 'String', description: '业务类型', depth: 1 },
    { name: 'action', type: 'String', description: '动作', depth: 1 },
    { name: 'ability', type: 'String', description: '能力', depth: 1 },
    { name: 'service', type: 'String', depth: 1 },
    { name: 'identity', type: 'Object', description: '请求身份标识信息' },
    { name: 'routeOrderId', type: 'Long', description: '业务接入订单id', depth: 1 },
    { name: 'origRouteOrderId', type: 'Long', description: '原单业务接入订单id', depth: 1 },
    { name: 'requestReference', type: 'String', description: '关联请求单号', depth: 1 },
    { name: 'sessionId', type: 'String', description: '会话ID', depth: 1 },
    { name: 'extraRequest', type: 'Object' },
    { name: 'mobileNumber', type: 'String', description: '手机号码', depth: 1, required: true, extension: true },
    { name: 'content', type: 'String', description: '消息内容', depth: 1, required: true, extension: true },
  ],
  response: [
    { name: 'route', type: 'Object', description: '路由配置信息' },
    { name: 'channel', type: 'String', description: '渠道', depth: 1 },
    { name: 'serviceChannel', type: 'String', description: '逻辑渠道', depth: 1 },
    { name: 'country', type: 'String', description: '国家/地区代码', depth: 1 },
    { name: 'tenant', type: 'String', description: '租户', depth: 1 },
    { name: 'party', type: 'String', description: '主体', depth: 1 },
    { name: 'institution', type: 'String', description: '机构', depth: 1 },
    { name: 'capability', type: 'Object', description: '业务能力配置' },
    { name: 'businessType', type: 'String', description: '业务类型', depth: 1 },
    { name: 'action', type: 'String', description: '动作', depth: 1 },
    { name: 'ability', type: 'String', description: '能力', depth: 1 },
    { name: 'identity', type: 'Object', description: '请求身份标识信息' },
    { name: 'routeOrderId', type: 'Long', description: '业务接入订单id', depth: 1 },
    { name: 'origRouteOrderId', type: 'Long', description: '原单业务接入订单id', depth: 1 },
    { name: 'requestReference', type: 'String', description: '关联请求单号', depth: 1 },
    { name: 'responseReference', type: 'String', description: '关联响应单号', depth: 1 },
    { name: 'channelOrderId', type: 'Long', description: '网关单号', depth: 1 },
    { name: 'sessionId', type: 'String', description: '会话ID', depth: 1 },
    { name: 'result', type: 'Object', description: '响应结果' },
    { name: 'status', type: 'String', description: '交易状态', depth: 1 },
    { name: 'responseCode', type: 'String', description: 'palmpay响应码', depth: 1 },
    { name: 'responseMsg', type: 'String', description: 'palmpay响应信息', depth: 1 },
    { name: 'channelResponseCode', type: 'String', description: '渠道响应码', depth: 1 },
    { name: 'channelResponseMsg', type: 'String', description: '渠道响应信息', depth: 1 },
    { name: 'extraResponse', type: 'Object' },
    { name: 'sender', type: 'String', description: '发送人', depth: 1, required: true, extension: true },
    { name: 'sendTime', type: 'String', description: '发送时间', depth: 1, required: true, extension: true },
    { name: 'deliveryTime', type: 'String', description: '送达时间', depth: 1, required: true, extension: true },
  ],
};

const BULK_REQUEST_FIELDS: SpiField[] = [
  { name: 'mobileNumberList', type: 'Array', description: '手机号码列表', depth: 1, required: true, extension: true },
  { name: '_items', type: 'String', depth: 2, required: true, extension: true },
  { name: 'content', type: 'String', description: '消息内容', depth: 1, required: true, extension: true },
  { name: 'sender', type: 'String', depth: 1, required: true, extension: true },
];

const SUB_ORDER_REQUEST_FIELDS: SpiField[] = [
  { name: 'subOrderList', type: 'Array', description: '子单信息' },
  { name: '_items', type: 'Object', depth: 1 },
  { name: 'feature', type: 'Object', depth: 2 },
  { name: 'featureField', type: 'String', description: '关键字段', depth: 3 },
  { name: 'featureValue', type: 'String', description: '关键字段', depth: 3 },
  { name: 'identity', type: 'Object', description: '请求身份标识信息', depth: 2 },
  { name: 'requestReference', type: 'String', description: '关联请求单号', depth: 3 },
  { name: 'extraRequest', type: 'Object', depth: 2 },
  { name: 'content', type: 'String', depth: 3, required: true, extension: true },
];

const SUB_ORDER_RESPONSE_FIELDS: SpiField[] = [
  { name: 'subOrderList', type: 'Array', description: '子单信息' },
  { name: '_items', type: 'Object', depth: 1 },
  { name: 'feature', type: 'Object', depth: 2 },
  { name: 'featureField', type: 'String', description: '关键字段', depth: 3 },
  { name: 'featureValue', type: 'String', description: '关键字段', depth: 3 },
  { name: 'identity', type: 'Object', description: '请求身份标识信息', depth: 2 },
  { name: 'responseReference', type: 'String', description: '关联响应单号', depth: 3 },
  { name: 'extraResponse', type: 'Object', depth: 2 },
  { name: 'sendTime', type: 'String', description: '发送时间', depth: 3, required: true, extension: true },
  { name: 'sender', type: 'String', depth: 3, required: true, extension: true },
  { name: 'deliveryTime', type: 'String', depth: 3, required: true, extension: true },
  { name: 'result', type: 'Object', description: '响应结果', depth: 2 },
  { name: 'status', type: 'String', description: '交易状态', depth: 3 },
  { name: 'responseCode', type: 'String', description: 'palmpay响应码', depth: 3 },
  { name: 'responseMsg', type: 'String', description: 'palmpay响应信息', depth: 3 },
  { name: 'channelResponseCode', type: 'String', description: '渠道响应码', depth: 3 },
  { name: 'channelResponseMsg', type: 'String', description: '渠道响应信息', depth: 3 },
];

interface DemoSpiProfile {
  request: SpiField[];
  response: SpiField[];
}

const demoField = (name: string, type: string, description: string, required = false): SpiField => ({
  name,
  type,
  description,
  depth: 1,
  required,
  extension: true,
});

const DEMO_SPI_PROFILES: Record<string, DemoSpiProfile> = {
  VIBER: {
    request: [
      demoField('recipientList', 'Array', '接收方 Viber 账号列表', true),
      demoField('messageContent', 'String', '消息内容', true),
      demoField('senderName', 'String', '发送方名称'),
      demoField('clientMessageId', 'String', '业务方消息标识', true),
    ],
    response: [
      demoField('messageId', 'String', '渠道消息标识'),
      demoField('deliveryStatus', 'String', '消息投递状态'),
      demoField('acceptedCount', 'Integer', '已接受的接收方数量'),
    ],
  },
  WHATSAPP: {
    request: [
      demoField('whatsappAccount', 'String', 'WhatsApp 接收账号', true),
      demoField('templateCode', 'String', '消息模板编码'),
      demoField('messageContent', 'String', '消息内容', true),
      demoField('clientMessageId', 'String', '业务方消息标识', true),
    ],
    response: [
      demoField('messageId', 'String', '渠道消息标识'),
      demoField('deliveryStatus', 'String', '消息投递状态'),
      demoField('deliveryTime', 'String', '投递时间'),
    ],
  },
  INSURANCE: {
    request: [
      demoField('policyId', 'String', '保单标识', true),
      demoField('subjectId', 'String', '被保主体标识'),
      demoField('customerReference', 'String', '客户参考号'),
      demoField('requestedStatus', 'String', '目标保单状态'),
    ],
    response: [
      demoField('policyNumber', 'String', '保单号'),
      demoField('policyStatus', 'String', '保单状态'),
      demoField('kycStatus', 'String', '被保主体 KYC 状态'),
      demoField('effectiveTime', 'String', '保单生效时间'),
    ],
  },
  GIFTCARD: {
    request: [
      demoField('productCode', 'String', '礼品卡产品编码', true),
      demoField('cardAmount', 'Long', '礼品卡金额'),
      demoField('currency', 'String', '币种'),
      demoField('recipientEmail', 'String', '接收方邮箱'),
    ],
    response: [
      demoField('giftCardOrderId', 'String', '礼品卡订单号'),
      demoField('giftCardCode', 'String', '礼品卡兑换码'),
      demoField('orderStatus', 'String', '订单状态'),
      demoField('expiryTime', 'String', '失效时间'),
    ],
  },
  STABLECOIN: {
    request: [
      demoField('assetCode', 'String', '稳定币资产编码', true),
      demoField('fiatCurrency', 'String', '法币币种', true),
      demoField('amount', 'Decimal', '交易金额', true),
      demoField('network', 'String', '区块链网络'),
      demoField('walletAddress', 'String', '钱包地址'),
    ],
    response: [
      demoField('quoteId', 'String', '报价标识'),
      demoField('exchangeRate', 'Decimal', '兑换汇率'),
      demoField('transactionHash', 'String', '链上交易哈希'),
      demoField('settledAmount', 'Decimal', '实际结算金额'),
    ],
  },
  FUNDS_IN: {
    request: [
      demoField('sourceAccount', 'String', '付款方账户'),
      demoField('destinationAccount', 'String', '收款方账户', true),
      demoField('amount', 'Long', '入账金额', true),
      demoField('currency', 'String', '币种', true),
      demoField('paymentReference', 'String', '外部来账参考号', true),
    ],
    response: [
      demoField('notificationId', 'String', '入账通知标识'),
      demoField('postingStatus', 'String', '入账状态'),
      demoField('postedTime', 'String', '入账时间'),
      demoField('ledgerReference', 'String', '账务参考号'),
    ],
  },
  PRODUCT_MANAGEMENT: {
    request: [
      demoField('customerId', 'String', '客户标识', true),
      demoField('productCode', 'String', '产品编码', true),
      demoField('effectiveDate', 'String', '生效日期'),
      demoField('productAttributes', 'Object', '产品扩展属性'),
    ],
    response: [
      demoField('subscriptionId', 'String', '客户产品订阅标识'),
      demoField('productStatus', 'String', '产品状态'),
      demoField('effectiveTime', 'String', '实际生效时间'),
    ],
  },
  USSD_DIAL: {
    request: [
      demoField('sessionId', 'String', 'USSD 会话标识', true),
      demoField('msisdn', 'String', '用户手机号', true),
      demoField('serviceCode', 'String', 'USSD 服务码', true),
      demoField('userInput', 'String', '用户当前输入'),
    ],
    response: [
      demoField('sessionState', 'String', '会话状态'),
      demoField('displayMessage', 'String', '展示给用户的文案'),
      demoField('endSession', 'Boolean', '是否结束会话'),
    ],
  },
  DISPUTE_IN: {
    request: [
      demoField('disputeId', 'String', '争议案件标识', true),
      demoField('originalTransactionId', 'String', '原交易标识', true),
      demoField('reasonCode', 'String', '争议原因码'),
      demoField('disputeAmount', 'Long', '争议金额'),
      demoField('evidenceReference', 'String', '证据材料参考号'),
    ],
    response: [
      demoField('caseId', 'String', '平台案件号'),
      demoField('caseStatus', 'String', '案件处理状态'),
      demoField('refundReference', 'String', '指定退款参考号'),
      demoField('updatedTime', 'String', '状态更新时间'),
    ],
  },
  WALLET_ACCOUNT: {
    request: [
      demoField('customerId', 'String', '客户标识', true),
      demoField('walletId', 'String', '钱包账户标识', true),
      demoField('bindingToken', 'String', '绑定授权令牌'),
      demoField('debitAmount', 'Long', '自动扣款金额'),
      demoField('currency', 'String', '币种'),
    ],
    response: [
      demoField('bindingId', 'String', '钱包绑定标识'),
      demoField('mandateStatus', 'String', '自动扣款授权状态'),
      demoField('transactionReference', 'String', '扣款交易参考号'),
    ],
  },
};

const DEFAULT_DEMO_PROFILE: DemoSpiProfile = {
  request: [
    demoField('businessReference', 'String', '业务参考号', true),
    demoField('payload', 'Object', '业务请求数据', true),
  ],
  response: [
    demoField('businessReference', 'String', '业务参考号'),
    demoField('businessStatus', 'String', '业务处理状态'),
  ],
};

// Explicit Action SPI catalogs can differ even within one Business Type. The
// Business Type examples below remain a Demo fallback until more catalogs are provided.
const CONTEXT_DEMO_SPI_PROFILES: Record<string, DemoSpiProfile> = {
  'SMS/SINGLE_MESSAGE/TRANSACTION': {
    request: CONFIG_SPI.request.slice(-2),
    response: CONFIG_SPI.response.slice(-3),
  },
  'SMS/BULK_MESSAGE/TRANSACTION': {
    request: BULK_REQUEST_FIELDS,
    response: CONFIG_SPI.response.slice(-3),
  },
};

const getDemoProfile = (businessType: string, ability: string, action: string) =>
  CONTEXT_DEMO_SPI_PROFILES[`${businessType}/${ability}/${action}`]
  || DEMO_SPI_PROFILES[businessType]
  || DEFAULT_DEMO_PROFILE;

const buildDemoUrl = (businessType: string, ability: string, action: string) =>
  `/api/${businessType.toLowerCase().replaceAll('_', '-')}/${ability.toLowerCase().replaceAll('_', '-')}/${action.toLowerCase().replaceAll('_', '-')}`;

interface SavedSpiConfig {
  method: string;
  url: string;
  timeout: string;
  description: string;
  request: SpiFieldNode[];
  response: SpiFieldNode[];
}


const SPI_DEMO_STORAGE_KEY = 'basic-info-config-spi-demo-v1';
const readSavedSpiConfigs = (): Record<string, SavedSpiConfig> => {
  try { return JSON.parse(localStorage.getItem(SPI_DEMO_STORAGE_KEY) || '{}') as Record<string, SavedSpiConfig>; }
  catch { return {}; }
};

interface CapabilitySpiPageProps {
  embedded?: boolean;
  businessType?: string;
  ability?: string;
  action?: string;
  spiType?: SpiTab;
}

export default function CapabilitySpiPage({ embedded = false, ...context }: CapabilitySpiPageProps = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SpiTab>('config');
  const [savedConfigs, setSavedConfigs] = useState<Record<string, SavedSpiConfig>>(readSavedSpiConfigs);
  const [draft, setDraft] = useState<SavedSpiConfig | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [timeoutError, setTimeoutError] = useState(false);
  const businessType = context.businessType || searchParams.get('bt') || 'SMS';
  const ability = context.ability || searchParams.get('ability') || 'SINGLE_MESSAGE';
  const action = context.action || searchParams.get('action') || 'TRANSACTION';
  const demoReturnUrl = getDemoReturnUrl(searchParams, businessType);
  const backUrl = demoReturnUrl || `/basic-info/capability?bt=${encodeURIComponent(businessType)}&ability=${encodeURIComponent(ability)}`;
  const activeTab = embedded && context.spiType ? context.spiType : tab;
  const subOrderEnabled = isSubOrderModeEnabled(businessType, ability);
  const demoProfile = getDemoProfile(businessType, ability, action);
  const configRequestBase = CONFIG_SPI.request.slice(0, -2);
  const configResponseBase = CONFIG_SPI.response.slice(0, -3);
  const definition: SpiDefinition = {
    ...CONFIG_SPI,
    url: buildDemoUrl(businessType, ability, action),
    subOrderMode: subOrderEnabled ? 'Enabled' : 'Disabled',
    request: [...configRequestBase, ...demoProfile.request, ...(subOrderEnabled ? SUB_ORDER_REQUEST_FIELDS : [])],
    response: [...configResponseBase, ...demoProfile.response, ...(subOrderEnabled ? SUB_ORDER_RESPONSE_FIELDS : [])],
  };
  // Config and Code are independent contracts for the same BT + Ability + Action.
  const spiKey = JSON.stringify([businessType, ability, action, activeTab]);
  const editing = draft !== null && draftKey === spiKey;
  const requestCatalog = activeTab === 'config' ? fieldsToTree(definition.request) : [];
  const responseCatalog = activeTab === 'config' ? fieldsToTree(definition.response) : [];
  const saved = savedConfigs[spiKey];
  const initial: SavedSpiConfig = {
    method: activeTab === 'config' ? definition.method : '',
    url: activeTab === 'config' ? definition.url : '',
    timeout: '', description: '',
    request: activeTab === 'config' ? withoutBusinessFields(requestCatalog) : [],
    response: activeTab === 'config' ? withoutBusinessFields(responseCatalog) : [],
  };
  const visibleConfig: SavedSpiConfig = {
    ...initial, ...saved, ...(editing ? draft : {}),
    ...(activeTab === 'config' ? { method: definition.method, url: definition.url } : {}),
  };
  const timeoutValue = visibleConfig.timeout.trim();
  const timeoutValid = /^\d+$/.test(timeoutValue) && Number(timeoutValue) > 0 && Number.isSafeInteger(Number(timeoutValue));
  const methodValid = Boolean(visibleConfig.method.trim());
  const urlValid = Boolean(visibleConfig.url.trim());
  const schemaError = validateSpiTree(visibleConfig.request) || validateSpiTree(visibleConfig.response);
  const submit = () => {
    if (!editing || !draft) return;
    if (!methodValid || !urlValid || !timeoutValid || schemaError) {
      setTimeoutError(true);
      return;
    }
    const next = { ...savedConfigs, [spiKey]: { ...draft, method: visibleConfig.method.trim(), url: visibleConfig.url.trim(), timeout: timeoutValue } };
    setSavedConfigs(next);
    localStorage.setItem(SPI_DEMO_STORAGE_KEY, JSON.stringify(next));
    setDraft(null);
    setDraftKey(null);
    setTimeoutError(false);
  };
  const cancel = () => { setDraft(null); setDraftKey(null); setTimeoutError(false); };
  const confirmCancel = () => Modal.confirm({
    title: 'Are you sure you want to cancel? All entered content will be lost.',
    icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    okText: 'Confirm',
    okButtonProps: { danger: true, ghost: true },
    cancelText: 'Cancel',
    onOk: cancel,
  });
  const updateDraft = (changes: Partial<SavedSpiConfig>) => setDraft((current) => current && draftKey === spiKey ? { ...current, ...changes } : current);

  return (
    <div className={`capability-spi-page ${embedded ? 'capability-spi-embedded' : ''}`}>
      {!embedded && (
        <header className="capability-spi-heading">
          <Breadcrumb items={[
            { title: 'Basic Info', href: '/basic-info/country' },
            { title: demoReturnUrl ? 'Demo' : 'Capability', href: demoReturnUrl || `/basic-info/capability?bt=${encodeURIComponent(businessType)}` },
            { title: businessType },
            { title: ability },
            { title: action },
            { title: 'Config' },
          ]} />
          <button
            type="button"
            className="capability-spi-back"
            onClick={() => navigate(backUrl)}
          >
            <LeftOutlined />
            <Title level={4}>Config</Title>
          </button>
        </header>
      )}

      {!embedded && (
        <div className="capability-spi-tabs" role="tablist" aria-label="SPI type">
          <button type="button" role="tab" aria-selected={tab === 'config'} className={tab === 'config' ? 'active' : ''} onClick={() => { cancel(); setTab('config'); }}>Config SPI</button>
          <button type="button" role="tab" aria-selected={tab === 'code'} className={tab === 'code' ? 'active' : ''} onClick={() => { cancel(); setTab('code'); }}>Code SPI</button>
        </div>
      )}

      <main className={`capability-spi-panel ${editing ? 'editing' : ''}`}>
        <section className={`interface-overview ${editing ? 'is-editing' : ''}`} aria-label="SPI interface details">
          <div className="interface-overview-top">
            <div className="bt-ability-settings-context interface-overview-context">
              <span>Business Type: <strong>{businessType}</strong></span>
              <span>Ability: <strong>{ability}</strong></span>
              <span>Action: <strong>{action}</strong></span>
              <span>Sub-order Mode: <strong>{definition.subOrderMode}</strong></span>
            </div>
            {!editing && <div className="interface-overview-actions"><Button type="primary" onClick={() => { setDraft({ ...visibleConfig }); setDraftKey(spiKey); setTimeoutError(false); }}>Config</Button></div>}
          </div>
          <div className="interface-overview-endpoint">
            {editing && activeTab === 'code' ? <>
              <label className="interface-overview-field interface-overview-method-field"><span className="required-label">Method</span><Input value={visibleConfig.method} placeholder="Enter method" onChange={(event) => updateDraft({ method: event.target.value })} /></label>
              <label className="interface-overview-field interface-overview-url-field"><span className="required-label">URL</span><Input value={visibleConfig.url} placeholder="Enter URL path" onChange={(event) => updateDraft({ url: event.target.value })} /></label>
            </> : <><span className="interface-overview-method">{visibleConfig.method || 'Not configured'}</span><code>{visibleConfig.url || 'Not configured'}</code></>}
            {!editing && <span className="interface-overview-timeout">Timeout: <strong>{visibleConfig.timeout ? `${visibleConfig.timeout} ms` : 'Not configured'}</strong></span>}
          </div>
          {editing ? <div className="interface-overview-editor-fields">
            <label className="interface-overview-field interface-overview-timeout-field"><span className="required-label">Timeout</span><span className="capability-spi-timeout-control"><Input value={visibleConfig.timeout} status={timeoutError || (timeoutValue !== '' && !timeoutValid) ? 'error' : undefined} inputMode="numeric" addonAfter="ms" placeholder="Enter timeout" aria-required="true" onChange={(event) => { updateDraft({ timeout: event.target.value }); setTimeoutError(false); }} />{(timeoutError || (timeoutValue !== '' && !timeoutValid)) && <span className="capability-spi-timeout-error" role="alert">{timeoutValue ? 'Enter a positive whole number of milliseconds.' : 'Timeout is required before Submit.'}</span>}</span></label>
            <label className="interface-overview-field interface-overview-description-field"><span>Description</span><Input value={visibleConfig.description} placeholder="Optional description" onChange={(event) => updateDraft({ description: event.target.value })} /></label>
          </div>
            : visibleConfig.description && <p className="interface-overview-description">{visibleConfig.description}</p>}
        </section>

        {subOrderEnabled && (
          <Alert
            className="capability-spi-sub-order-alert"
            type="info"
            showIcon
            message={(
              <span>
                {activeTab === 'config'
                  ? <>Sub-Order Mode is enabled. To store business information in the sub-order, add fields in the sub-order&apos;s <code>extra</code> block. <code>featureValue</code> is the sub-order feature identifier.</>
                  : <>Sub-Order Mode is enabled. Code SPI starts empty; define its request and response fields according to the contract needed by this Action.</>}
              </span>
            )}
          />
        )}

        <SpiSchemaTree key={`${spiKey}-request`} title="Request Params" fields={visibleConfig.request} catalog={requestCatalog} customRoot={activeTab === 'code'} editing={editing} onChange={(request) => updateDraft({ request })} />
        <SpiSchemaTree key={`${spiKey}-response`} title="Response Params" fields={visibleConfig.response} catalog={responseCatalog} customRoot={activeTab === 'code'} editing={editing} onChange={(response) => updateDraft({ response })} />
      </main>
      {editing && <footer className="capability-spi-edit-footer">{schemaError && <span className="capability-spi-submit-error" role="alert">{schemaError}</span>}<Button onClick={confirmCancel}>Cancel</Button><Button type="primary" disabled={!methodValid || !urlValid || !timeoutValid || Boolean(schemaError)} onClick={submit}>Submit</Button></footer>}
    </div>
  );
}
