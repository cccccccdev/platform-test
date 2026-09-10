import { useState } from 'react';
import { Alert, Breadcrumb, Button, Input, Select, Tag, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import './CapabilitySpiPage.css';
import { isSubOrderModeEnabled } from './subOrderModeStore';

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

const CODE_SPI: SpiDefinition = {
  method: 'POST',
  url: '/sms/sendTextMsg',
  timeout: '15000',
  subOrderMode: '—',
  request: [
    { name: 'route', type: 'Object' },
    { name: 'countryCode', type: 'String', depth: 1 },
    { name: 'channel', type: 'String', depth: 1 },
    { name: 'serviceChannel', type: 'String', depth: 1 },
    { name: 'tenant', type: 'String', depth: 1 },
    { name: 'party', type: 'String', depth: 1 },
    { name: 'institution', type: 'String', depth: 1 },
    { name: 'capability', type: 'Object' },
    { name: 'businessType', type: 'String', depth: 1 },
    { name: 'service', type: 'String', depth: 1 },
    { name: 'action', type: 'String', depth: 1 },
    { name: 'ability', type: 'String', depth: 1 },
    { name: 'ppGroupId', type: 'String' },
    { name: 'tenant', type: 'String' },
    { name: 'content', type: 'String' },
    { name: 'from', type: 'String' },
    { name: 'toList', type: 'String', description: '数组，短信发送目标列表' },
    { name: 'channelConfigRequest', type: 'Object' },
    { name: 'sender', type: 'String', depth: 1 },
    { name: 'account', type: 'String', depth: 1 },
    { name: 'routeOrderId', type: 'Long', depth: 1 },
  ],
  response: [
    { name: 'bulkId', type: 'String' },
    { name: 'routeOrderId', type: 'String' },
    { name: 'tenant', type: 'String' },
    { name: 'toListSendResult', type: 'String', description: '数组，短信发送结果' },
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

const buildDemoUrl = (businessType: string, ability: string, action: string) =>
  `/api/${businessType.toLowerCase().replaceAll('_', '-')}/${ability.toLowerCase().replaceAll('_', '-')}/${action.toLowerCase().replaceAll('_', '-')}`;

function FieldTable({ fields, editable }: { fields: SpiField[]; editable: boolean }) {
  return (
    <div className="capability-spi-field-table" role="table">
      <div className="capability-spi-field-header" role="row">
        <span role="columnheader">SPI</span>
        <span role="columnheader">Field Type</span>
        <span role="columnheader">Description</span>
      </div>
      {fields.map((field, index) => {
        const showControls = editable || field.extension;
        return (
          <div className="capability-spi-field-row" role="row" key={`${field.name}-${index}`}>
            <div className="capability-spi-field-name" role="cell" style={{ paddingLeft: 10 + (field.depth || 0) * 22 }}>
              {showControls ? <Input value={field.name} disabled aria-label={`${field.name} field name`} /> : field.name}
              {field.required && <span className="capability-spi-required" aria-label="required">*</span>}
            </div>
            <div role="cell">
              {showControls ? (
                <Select value={field.type} disabled aria-label={`${field.name} field type`} options={[{ value: field.type, label: field.type }]} />
              ) : field.type}
            </div>
            <div role="cell">
              <Input value={field.description || ''} disabled aria-label={`${field.name} description`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CapabilitySpiPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SpiTab>('config');
  const businessType = searchParams.get('bt') || 'SMS';
  const ability = searchParams.get('ability') || 'SINGLE_MESSAGE';
  const action = searchParams.get('action') || 'TRANSACTION';
  const subOrderEnabled = isSubOrderModeEnabled(businessType, ability);
  const isBulkSms = businessType === 'SMS' && ability === 'BULK_MESSAGE' && action === 'TRANSACTION';
  const demoProfile = DEMO_SPI_PROFILES[businessType] || DEFAULT_DEMO_PROFILE;
  const configRequestBase = CONFIG_SPI.request.slice(0, -2);
  const configResponseBase = CONFIG_SPI.response.slice(0, -3);
  const definition: SpiDefinition = tab === 'config'
    ? {
        ...CONFIG_SPI,
        url: buildDemoUrl(businessType, ability, action),
        description: `Demo Sample: ${businessType} / ${ability} / ${action}`,
        subOrderMode: subOrderEnabled ? 'Enabled' : 'Disabled',
        request: [
          ...configRequestBase,
          ...(isBulkSms ? BULK_REQUEST_FIELDS : demoProfile.request),
          ...(subOrderEnabled ? SUB_ORDER_REQUEST_FIELDS : []),
        ],
        response: [
          ...configResponseBase,
          ...(!isBulkSms ? demoProfile.response : []),
          ...(subOrderEnabled ? SUB_ORDER_RESPONSE_FIELDS : []),
        ],
      }
    : {
        ...CODE_SPI,
        url: buildDemoUrl(businessType, ability, action).replace('/api/', '/code/'),
        description: `Demo Sample: ${businessType} / ${ability} / ${action}`,
        subOrderMode: subOrderEnabled ? 'Enabled' : 'Disabled',
        request: [...CODE_SPI.request, ...demoProfile.request, ...(subOrderEnabled ? SUB_ORDER_REQUEST_FIELDS : [])],
        response: [...CODE_SPI.response, ...demoProfile.response, ...(subOrderEnabled ? SUB_ORDER_RESPONSE_FIELDS : [])],
      };

  return (
    <div className="capability-spi-page">
      <header className="capability-spi-heading">
        <Breadcrumb items={[{ title: 'Basic Info' }, { title: 'Capability' }, { title: 'SPI' }]} />
        <Title level={4}>SPI</Title>
      </header>

      <div className="capability-spi-tabs" role="tablist" aria-label="SPI type">
        <button type="button" role="tab" aria-selected={tab === 'config'} className={tab === 'config' ? 'active' : ''} onClick={() => setTab('config')}>Config SPI</button>
        <button type="button" role="tab" aria-selected={tab === 'code'} className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>Code SPI</button>
      </div>

      <main className="capability-spi-panel">
        <div className="capability-spi-toolbar">
          <div className="capability-spi-context">
            <span><strong>Business Type:</strong>{businessType}</span>
            <span><strong>Ability:</strong>{ability}</span>
            <span><strong>Action:</strong>{action}</span>
            <span><strong>Sub-Order Mode:</strong><Tag color="blue">{definition.subOrderMode}</Tag></span>
          </div>
          <Button type="primary">Config</Button>
        </div>

        {subOrderEnabled && (
          <Alert
            className="capability-spi-sub-order-alert"
            type="info"
            showIcon
            message={(
              <span>
                Sub-Order Mode is enabled. To store any business information in the sub-order, please add new fields in the sub-order&apos;s <code>extra</code> block. <code>featureValue</code> is the sub-order feature identifier — please map fields such as phone number, email address, or WhatsApp account to it.
              </span>
            )}
          />
        )}

        <div className="capability-spi-meta">
          <div className={`capability-spi-meta-item ${tab === 'code' ? 'capability-spi-input-item' : ''}`}>
            <span className="required-label">Method:</span>
            {tab === 'code' ? <Input value={definition.method} disabled /> : <strong>{definition.method}</strong>}
          </div>
          <div className={`capability-spi-meta-item ${tab === 'code' ? 'capability-spi-input-item' : ''}`}>
            <span className="required-label">URL:</span>
            {tab === 'code' ? <Input value={definition.url} disabled /> : <strong>{definition.url}</strong>}
          </div>
          <div className="capability-spi-meta-item capability-spi-input-item">
            <span className="required-label">Timeout:</span>
            <Input value={definition.timeout} disabled addonAfter="ms" />
          </div>
          <div className="capability-spi-meta-item capability-spi-input-item">
            <span>Description:</span>
            <Input value={definition.description || ''} disabled />
          </div>
        </div>

        <section className="capability-spi-section">
          <h2>Request Params</h2>
          <FieldTable fields={definition.request} editable={tab === 'code'} />
        </section>

        <section className="capability-spi-section">
          <h2>Response Params</h2>
          <FieldTable fields={definition.response} editable={tab === 'code'} />
        </section>
      </main>
    </div>
  );
}
