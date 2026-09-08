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
  const configRequestBase = CONFIG_SPI.request.slice(0, -2);
  const configResponseBase = CONFIG_SPI.response.slice(0, -3);
  const definition: SpiDefinition = tab === 'config'
    ? {
        ...CONFIG_SPI,
        subOrderMode: subOrderEnabled ? 'Enabled' : 'Disabled',
        request: [
          ...configRequestBase,
          ...(isBulkSms ? BULK_REQUEST_FIELDS : CONFIG_SPI.request.slice(-2)),
          ...(subOrderEnabled ? SUB_ORDER_REQUEST_FIELDS : []),
        ],
        response: [
          ...configResponseBase,
          ...(!isBulkSms ? CONFIG_SPI.response.slice(-3) : []),
          ...(subOrderEnabled ? SUB_ORDER_RESPONSE_FIELDS : []),
        ],
      }
    : {
        ...CODE_SPI,
        subOrderMode: subOrderEnabled ? 'Enabled' : 'Disabled',
        request: [...CODE_SPI.request, ...(subOrderEnabled ? SUB_ORDER_REQUEST_FIELDS : [])],
        response: [...CODE_SPI.response, ...(subOrderEnabled ? SUB_ORDER_RESPONSE_FIELDS : [])],
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
            <Input value="" disabled />
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
