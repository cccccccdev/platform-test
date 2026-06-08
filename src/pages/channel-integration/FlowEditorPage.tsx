import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Typography, Divider, Space, message, Collapse, Tag, Modal, Tabs, Select, Drawer, Radio, Switch } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CloudUploadOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, addEdge, MarkerType } from '@xyflow/react';
import type { Node, Edge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const { Text, Title } = Typography;

// 组件库 - 根据 action 和 flowType 预置不同组件
const COMPONENT_LIBRARY = [
  // Forward flow components
  { code: 'generateReference', name: 'Generate Reference', type: 'Component' },
  { code: 'network', name: 'Network', type: 'Component' },
  { code: 'condition', name: 'Condition', type: 'Component' },
  // Backward flow components
  { code: 'inboundRequest', name: 'InboundRequest', type: 'Component' },
  { code: 'inboundResponse', name: 'InboundResponse', type: 'Component' },
  { code: 'sendCompleteMQ', name: 'SendCompleteMQ', type: 'Component' },
  { code: 'sendRequeryMQ', name: 'SendRequeryMQ', type: 'Component' },
  { code: 'messageNotification', name: 'MessageNotification', type: 'Component' },
  { code: 'requestBusinessAccessLayer', name: 'RequestBusinessAccessLayer', type: 'Component' },
  { code: 'queryOrder', name: 'QueryOrder', type: 'Component' },
];

// 根据 flowType 获取预置组件
const getPresetComponents = (flowType: string): string[] => {
  if (flowType === 'outbound') {
    return ['generateReference', 'network', 'condition'];
  }
  if (flowType === 'inbound') {
    return ['inboundRequest', 'inboundResponse', 'sendCompleteMQ'];
  }
  return [];
};

// 组件面板
function ComponentLibraryPanel({
  components,
  onAddComponent,
}: {
  components: { code: string; name: string; type: string }[];
  onAddComponent: (code: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchText, setSearchText] = useState('');

  const filteredComposites = components.filter(c =>
    c.name.toLowerCase().includes(searchText.toLowerCase()) ||
    c.code.toLowerCase().includes(searchText.toLowerCase())
  );

  const componentComposites = filteredComposites.filter(c => c.type === 'Component');

  const handleDragStart = (e: React.DragEvent, code: string) => {
    e.dataTransfer.setData('application/reactflow', code);
    e.dataTransfer.effectAllowed = 'move';
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          width: 32,
          height: '100%',
          background: '#fafafa',
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: 12,
          fontWeight: 500,
          color: '#666',
          gap: 4,
        }}
      >
        <span>Component Library</span>
        <span style={{ fontSize: 14 }}>→</span>
      </div>
    );
  }

  return (
    <div style={{
      width: 280,
      height: '100%',
      background: '#fff',
      borderRight: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Component Library</span>
        <Button type="text" size="small" onClick={() => setIsExpanded(false)}>← 收起</Button>
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="搜索组件..."
          prefix={<span style={{ color: '#999', fontSize: 12 }}>🔍</span>}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </div>

      <div style={{ padding: '4px 12px', background: '#e6f7ff', fontSize: 10, color: '#1890ff', textAlign: 'center' }}>
        拖拽组件到画布中添加
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {componentComposites.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 500 }}>Component</div>
            {componentComposites.map(c => (
              <div
                key={c.code}
                draggable
                onDragStart={(e) => handleDragStart(e, c.code)}
                onClick={() => onAddComponent(c.code)}
                style={{
                  padding: '8px 12px',
                  marginBottom: 6,
                  border: '1px solid #e8e8e8',
                  borderRadius: 6,
                  cursor: 'grab',
                  fontSize: 12,
                  transition: 'all 0.2s',
                  background: '#fff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1890ff';
                  e.currentTarget.style.background = '#e6f7ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e8e8e8';
                  e.currentTarget.style.background = '#fff';
                }}
              >
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                <div style={{ color: '#888', fontSize: 10 }}>{c.code}</div>
              </div>
            ))}
          </div>
        )}

        {filteredComposites.length === 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>无匹配组件</Text>
        )}
      </div>
    </div>
  );
}

// 画布中的节点组件
function FlowNodeComponent({ data }: { id: string; data: any }) {
  const isConfigured = data.isConfigured;
  const nodeName = data.name;
  const [isHovered, setIsHovered] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  return (
    <div
      style={{
        border: `3px solid ${isConfigured ? '#52c41a' : '#d9d9d9'}`,
        borderLeft: `4px solid ${isConfigured ? '#52c41a' : '#fa8c16'}`,
        borderRadius: 12,
        background: isConfigured ? '#fafff0' : '#fafafa',
        padding: 12,
        minWidth: 180,
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      onClick={() => { console.log('Node clicked, code:', data.code, 'onConfig:', data.onConfig); data.onConfig?.(); }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#1890ff' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: isConfigured ? '#52c41a' : '#999' }}>{isConfigured ? '●' : '○'}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{nodeName}</span>
        {isConfigured && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />}
        {data.isDraggable !== false && isHovered && (
          <div
            onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
            style={{
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#1890ff' }} />

      {showContextMenu && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
            onClick={() => setShowContextMenu(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenuPos.y,
              left: contextMenuPos.x,
              zIndex: 1000,
              background: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: 4,
              minWidth: 160,
            }}
          >
            <div
              style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => { data.onConfig?.(); setShowContextMenu(false); }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <EditOutlined /> 配置此节点
            </div>
            <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
            <div
              style={{ padding: '8px 12px', cursor: 'pointer', color: '#ff4d4f', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => { data.onDelete?.(); setShowContextMenu(false); }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <DeleteOutlined /> 删除节点
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const nodeTypes = { flowNode: FlowNodeComponent };

// Context面板组件
function ContextPanel({
  spiData,
  endpoints,
  credentials,
  globalVariables,
  generatedFields,
  onFieldSelect,
  isMappingActive,
  onAddGeneratedField,
  onAddGlobalVar,
}: {
  spiData?: { businessType: string; ability: string; action: string };
  endpoints: any[];
  credentials: any[];
  globalVariables: any[];
  generatedFields: any[];
  onFieldSelect?: (fieldPath: string) => void;
  isMappingActive?: boolean;
  onAddGeneratedField?: () => void;
  onAddGlobalVar?: () => void;
}) {
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);

  const spiSampleData = spiData ? {
    title: `${spiData.businessType} × ${spiData.ability} × ${spiData.action}`,
    request: {
      fields: [
        { name: 'amount', type: 'Number', required: true, example: 10000, description: '交易金额（最小单位，如分）' },
        { name: 'currency', type: 'String', required: true, example: 'NGN', description: 'ISO 4217 货币代码' },
        { name: 'reference', type: 'String', required: true, example: 'TXN_20240115_ABC123', description: '商户侧唯一交易参考号' },
        { name: 'accountNumber', type: 'String', required: true, example: '1234567890', description: '目标账户号码' },
        { name: 'bankCode', type: 'String', required: true, example: '044', description: '银行代码' },
      ],
      example: { amount: 10000, currency: 'NGN', reference: 'TXN_20240115_ABC123', accountNumber: '1234567890', bankCode: '044' }
    },
    response: {
      SUCCESS: {
        fields: [
          { name: 'status', type: 'String', example: 'SUCCESS', description: '交易状态' },
          { name: 'reference', type: 'String', example: 'TXN_20240115_ABC123', description: '交易参考号' },
          { name: 'providerReference', type: 'String', example: 'PSK_987654321', description: '渠道侧参考号' },
        ],
        example: { status: 'SUCCESS', reference: 'TXN_20240115_ABC123', providerReference: 'PSK_987654321' }
      },
      FAIL: {
        fields: [
          { name: 'status', type: 'String', example: 'FAIL', description: '交易状态' },
          { name: 'errorCode', type: 'String', example: 'INSUFFICIENT_FUNDS', description: '错误码' },
          { name: 'errorMessage', type: 'String', example: 'Account has insufficient funds', description: '错误描述' },
        ],
        example: { status: 'FAIL', errorCode: 'INSUFFICIENT_FUNDS', errorMessage: 'Account has insufficient funds' }
      },
    }
  } : null;

  const spiFields = spiData ? {
    request: {
      amount: '10000',
      currency: 'NGN',
      reference: 'TXN_20240115_ABC123',
      accountNumber: '1234567890',
      bankCode: '044',
      bank: {
        code: '{{spi.request.bankCode}}',
        account_number: '{{spi.request.accountNumber}}'
      }
    },
    response: {
      status: true,
      message: 'Charge attempted',
      data: {
        reference: 'ch_123456',
        status: 'pending',
        amount: 10000,
        currency: 'NGN'
      }
    }
  } : null;

  const renderEmptyState = (msg: string, hint: string) => (
    <div style={{ padding: '8px', background: '#fafafa', borderRadius: 6, fontSize: 11 }}>
      <div style={{ color: '#999', marginBottom: 4 }}>{msg}</div>
      <div style={{ color: '#bbb', fontSize: 10 }}>{hint}</div>
    </div>
  );

  // Helper function to render hierarchical JSON fields
  const getFieldType = (value: any): string => {
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) return 'array';
      return 'object';
    }
    return typeof value;
  };

  const renderJsonFields = (obj: any, prefix: string, baseColor: string, depth: number = 0, isRequired: boolean = false): React.ReactNode[] => {
    if (!obj || typeof obj !== 'object') return [];
    const lines: React.ReactNode[] = [];
    const indent = depth * 16;

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const isObject = value && typeof value === 'object' && !Array.isArray(value);
      const isArray = Array.isArray(value);
      const fieldType = getFieldType(value);

      lines.push(
        <div
          key={fieldPath}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 4px',
            paddingLeft: indent + 4,
            color: baseColor,
            cursor: isMappingActive ? 'pointer' : 'default',
            fontWeight: isMappingActive ? 500 : 400,
            background: isMappingActive ? (depth === 0 ? '#e6f7ff' : 'transparent') : 'transparent',
            borderRadius: 4,
            fontSize: 11,
          }}
          onClick={() => isMappingActive && onFieldSelect?.(`endpoint.${fieldPath}`)}
        >
          {depth > 0 && <span style={{ color: '#ddd', marginRight: 2 }}>├─</span>}
          <span style={{ fontWeight: 500, minWidth: 80 }}>{key}</span>
          <Tag style={{ fontSize: 9, margin: 0 }}>{fieldType}</Tag>
          {isRequired && <Tag color="red" style={{ fontSize: 9, margin: 0 }}>必填</Tag>}
        </div>
      );

      if (isObject) {
        lines.push(...renderJsonFields(value, fieldPath, baseColor, depth + 1, isRequired));
      } else if (isArray && value.length > 0 && typeof value[0] === 'object') {
        lines.push(...renderJsonFields(value[0], `${fieldPath}[0]`, baseColor, depth + 1, false));
      }
    });

    return lines;
  };

  // Parse JSON sample to extract fields with hierarchy
  const parseJsonToFields = (jsonStr: string): any => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  // Mapping active indicator
  const mappingActiveBanner = isMappingActive ? (
    <div style={{
      background: '#e6f7ff',
      border: '1px solid #91d5ff',
      borderRadius: 4,
      padding: '8px 12px',
      marginBottom: 12,
      fontSize: 12,
      color: '#1890ff',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span>📌</span>
      <span>映射激活模式：点击下方字段完成映射</span>
    </div>
  ) : null;

  const collapseItems = [
    {
      key: 'spi',
      label: <Space><span>🔵</span><span>SPI</span></Space>,
      children: !spiData ? (
          <Text type="secondary" style={{ fontSize: 11 }}>暂无内容，点击 + 添加</Text>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Tag color="blue">{spiData.businessType} × {spiData.ability} × {spiData.action}</Tag>
              <Space size={4}>
                <Button type="text" size="small" onClick={() => setIsSampleModalOpen(true)}>样例</Button>
                <Button type="text" size="small" icon={<DeleteOutlined />} danger />
              </Space>
            </div>
            {spiFields && (
              <div style={{ fontSize: 10 }}>
                <div style={{ fontWeight: 500, marginBottom: 4, color: '#1890ff' }}>🔵 spi.request</div>
                {renderJsonFields(spiFields.request, 'spi.request', '#1890ff')}
                <div style={{ fontWeight: 500, margin: '8px 0 4px', color: '#722ed1' }}>🟣 spi.response</div>
                {renderJsonFields(spiFields.response, 'spi.response', '#722ed1')}
              </div>
            )}
          </div>
        ),
    },
    {
      key: 'generatedFields',
      label: (
        <Space>
          <span>🟢</span>
          <span>Generated Fields</span>
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); onAddGeneratedField?.(); }} style={{ padding: '0 4px', height: 20 }} />
        </Space>
      ),
      children: generatedFields.length === 0 ? (
        renderEmptyState('暂无 Generated Fields', '点击上方 + 添加')
      ) : (
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '2px 4px', textAlign: 'left' }}>字段名</th>
              <th style={{ padding: '2px 4px', textAlign: 'left' }}>生成类型</th>
            </tr>
          </thead>
          <tbody>
            {generatedFields.map((g: any, idx: number) => (
              <tr
                key={idx}
                style={{
                  cursor: isMappingActive ? 'pointer' : 'default',
                  background: isMappingActive ? '#f6ffed' : 'transparent',
                }}
                onClick={() => isMappingActive && onFieldSelect?.(`generatedFields.${g.name}`)}
              >
                <td style={{ padding: '2px 4px' }}>
                  <Tag color="green" style={{ fontSize: 10 }}>{g.name}</Tag>
                </td>
                <td style={{ padding: '2px 4px', color: '#666' }}>
                  {g.generationType || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      key: 'globalVar',
      label: (
        <Space>
          <span>📝</span>
          <span>Global Variable</span>
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); onAddGlobalVar?.(); }} style={{ padding: '0 4px', height: 20 }} />
        </Space>
      ),
      children: globalVariables.length === 0 ? (
        renderEmptyState('暂无 Global Variable', '点击上方 + 添加')
      ) : (
        globalVariables.map((g: any, idx: number) => (
          <div
            key={idx}
            style={{
              padding: '2px 0',
              fontSize: 11,
              cursor: isMappingActive ? 'pointer' : 'default',
              background: isMappingActive ? '#fffbe6' : 'transparent',
              borderRadius: 4,
            }}
            onClick={() => isMappingActive && onFieldSelect?.(`globalVariables.${g.name}`)}
          >
            <Tag color="yellow">{g.name}</Tag>
            <span style={{ color: '#666' }}>= {g.value}</span>
          </div>
        ))
      ),
    },
    {
      key: 'endpoint',
      label: <Space><span>🌐</span><span>Endpoint</span></Space>,
      children: endpoints.length === 0 ? (
        renderEmptyState('暂无 Endpoint', '请在 Network 组件中配置')
      ) : (
        endpoints.map(ep => {
          const requestObj = parseJsonToFields(ep.requestSample);
          const responseObj = parseJsonToFields(ep.responseSample);
          return (
            <div key={ep.id} style={{ padding: '4px 0', fontSize: 11, marginBottom: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{ep.name}</div>
              <div style={{ color: '#888', marginBottom: 4 }}>{ep.method} {ep.url}</div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 500, marginBottom: 2, color: '#1890ff', fontSize: 10 }}>Request</div>
                {requestObj && renderJsonFields(requestObj, `endpoint.${ep.id}.request`, '#1890ff')}
              </div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 2, color: '#722ed1', fontSize: 10 }}>Response</div>
                {responseObj && renderJsonFields(responseObj, `endpoint.${ep.id}.response`, '#722ed1')}
              </div>
            </div>
          );
        })
      ),
    },
    {
      key: 'credential',
      label: <Space><span>🔐</span><span>Credential</span></Space>,
      children: credentials.length === 0 ? (
        renderEmptyState('暂无 Credential', '请在配置中添加')
      ) : (
        credentials.map((c: any, idx: number) => (
          <div key={idx} style={{ padding: '2px 0', fontSize: 11 }}>
            <div style={{ fontWeight: 500 }}>{c.name}</div>
            <div style={{ color: '#888' }}>{c.type} ••••••••</div>
          </div>
        ))
      ),
    },
  ];

  return (
    <div style={{ width: 320, borderRight: '1px solid #f0f0f0', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14 }}>
        Context
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {mappingActiveBanner}
        <Collapse defaultActiveKey={['spi', 'endpoint', 'generatedFields', 'globalVar']} ghost items={collapseItems} />
      </div>

      <Modal
        title={<Space><span>SPI 报文样例</span><Tag color="blue">{spiSampleData?.title}</Tag></Space>}
        open={isSampleModalOpen}
        onCancel={() => setIsSampleModalOpen(false)}
        footer={null}
        width={720}
      >
        {spiSampleData && (
          <Tabs
            defaultActiveKey="request"
            items={[
              {
                key: 'request',
                label: 'Request 样例',
                children: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Button size="small" icon={<CopyOutlined />} onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(spiSampleData.request.example, null, 2));
                      }}>复制</Button>
                    </div>
                    <pre style={{ background: '#fafafa', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 400, overflow: 'auto' }}>
{JSON.stringify(spiSampleData.request.example, null, 2)}
                    </pre>
                    <Divider style={{ margin: '16px 0' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>字段说明：</Text>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>字段名</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>类型</th>
                          <th style={{ padding: '4px 8px', textAlign: 'center' }}>必填</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>示例值</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spiSampleData.request.fields.map((f, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px 8px' }}><Text code>{f.name}</Text></td>
                            <td style={{ padding: '4px 8px' }}>{f.type}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{f.required ? '✓' : '选填'}</td>
                            <td style={{ padding: '4px 8px' }}><Text type="secondary">{f.example}</Text></td>
                            <td style={{ padding: '4px 8px' }}>{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ),
              },
              {
                key: 'response',
                label: 'Response 样例',
                children: (
                  <div>
                    <Tabs
                      defaultActiveKey="SUCCESS"
                      items={[
                        {
                          key: 'SUCCESS',
                          label: <Tag color="green">SUCCESS</Tag>,
                          children: (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <Button size="small" icon={<CopyOutlined />} onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(spiSampleData.response.SUCCESS.example, null, 2));
                                }}>复制</Button>
                              </div>
                              <pre style={{ background: '#f6ffed', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
{JSON.stringify(spiSampleData.response.SUCCESS.example, null, 2)}
                              </pre>
                            </div>
                          ),
                        },
                        {
                          key: 'FAIL',
                          label: <Tag color="red">FAIL</Tag>,
                          children: (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <Button size="small" icon={<CopyOutlined />} onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(spiSampleData.response.FAIL.example, null, 2));
                                }}>复制</Button>
                              </div>
                              <pre style={{ background: '#fff2f0', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
{JSON.stringify(spiSampleData.response.FAIL.example, null, 2)}
                              </pre>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}

// Network 组件配置抽屉
function NetworkConfigDrawer({
  visible,
  code,
  name,
  endpoints: _externalEndpoints,
  generatedFields,
  isMappingActive,
  onMappingActiveChange,
  onMappingContextChange,
  activeMappingContext,
  selectedContextField,
  onFieldSelect,
  onClose,
  onSave,
}: {
  visible: boolean;
  code: string;
  name: string;
  endpoints: any[];
  generatedFields: any[];
  isMappingActive?: boolean;
  onMappingActiveChange?: (active: boolean) => void;
  onMappingContextChange?: (context: { section: string; rowIndex: number } | null) => void;
  activeMappingContext?: { section: string; rowIndex: number } | null;
  // Selected field from Context panel - passed from parent when user selects a field
  selectedContextField?: string | null;
  // Callback for when user selects a field from Context panel
  onFieldSelect?: (fieldPath: string) => void;
  onClose: () => void;
  onSave: (config: any) => void;
}) {
  const [activeTab, setActiveTab] = useState('endpointBasicInfo');
  const [localMappingContext, setLocalMappingContext] = useState<{ section: string; rowIndex: number } | null>(null);
  // Use prop if provided, otherwise use local state
  const effectiveMappingContext = activeMappingContext !== undefined ? activeMappingContext : localMappingContext;
  const setEffectiveMappingContext = activeMappingContext !== undefined ? (onMappingContextChange ?? setLocalMappingContext) : setLocalMappingContext;
  // Ref to store the pending context for field selection
  const pendingContextRef = useRef<{ section: string; rowIndex: number } | null>(null);

  // localConfig stores the endpoint configuration (single endpoint per network)
  const [localConfig, setLocalConfig] = useState<any>({
    // Endpoint basic info - path is the endpoint name
    path: '',
    method: 'POST',
    protocol: 'HTTPS',
    // Security
    authId: null as string | null, // Reference to auth from Authentication page
    signature: { enabled: false, algorithm: '', fields: [], secretSource: '', writeTo: 'header', headerName: '' },
    encrypt: '',
    decrypt: '',
    verify: '',
    // Request fields with inline mapping
    requestFields: [],
    // Response fields with inline mapping
    responseFields: [],
    // Response Code
    responseCodeFields: [],
    responseMessageFields: [],
  });

  // Sync mapping active state to parent via callback
  useEffect(() => {
    if (effectiveMappingContext) {
      pendingContextRef.current = effectiveMappingContext;
      onMappingActiveChange?.(true);
    }
  }, [effectiveMappingContext, onMappingActiveChange]);

  // When isMappingActive becomes false, check if we have a pending context that needs clearing
  useEffect(() => {
    if (!isMappingActive && pendingContextRef.current) {
      pendingContextRef.current = null;
    }
  }, [isMappingActive]);

  // Watch selectedContextField prop - when parent sets this, update local config
  useEffect(() => {
    if (selectedContextField && pendingContextRef.current) {
      const context = pendingContextRef.current;
      const { section, rowIndex } = context;
      setLocalConfig((prev: any) => {
        const currentData = prev[section] || [];
        const newData = [...currentData];
        newData[rowIndex] = { ...newData[rowIndex], spiField: selectedContextField };
        return { ...prev, [section]: newData };
      });
      pendingContextRef.current = null;
      onFieldSelect?.(selectedContextField);
    }
  }, [selectedContextField, onFieldSelect]);

  const updateConfig = useCallback((updates: any) => {
    setLocalConfig((prev: any) => ({ ...prev, ...updates }));
  }, []);

  // Add request field with inline mapping
  const handleAddRequestField = () => {
    const newField = { id: Date.now(), fieldName: '', spiField: '', mappingMode: 'direct' };
    setLocalConfig((prev: any) => ({
      ...prev,
      requestFields: [...prev.requestFields, newField],
    }));
  };

  // Add response field with inline mapping
  const handleAddResponseField = () => {
    const newField = { id: Date.now(), fieldName: '', spiField: '', mappingMode: 'direct' };
    setLocalConfig((prev: any) => ({
      ...prev,
      responseFields: [...prev.responseFields, newField],
    }));
  };

  // Activate mapping mode for a specific field
  const handleActivateMapping = (section: string, rowIndex: number) => {
    const context = { section, rowIndex };
    pendingContextRef.current = context;
    setEffectiveMappingContext(context);
    onMappingActiveChange?.(true);
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  // Endpoint Basic Info Tab - single endpoint per network, path is the name
  const renderEndpointBasicInfoTab = () => (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>Endpoint 基本信息</Text>

      {/* Basic Info - Path is the endpoint name */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Path (Endpoint Name)</Text>
          <Input
            size="small"
            placeholder="/v3/charge"
            value={localConfig.path}
            onChange={e => updateConfig({ path: e.target.value })}
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Method</Text>
          <Select
            size="small"
            style={{ width: '100%' }}
            value={localConfig.method}
            onChange={(val: any) => updateConfig({ method: val })}
          >
            <Select.Option value="GET">GET</Select.Option>
            <Select.Option value="POST">POST</Select.Option>
            <Select.Option value="PUT">PUT</Select.Option>
            <Select.Option value="DELETE">DELETE</Select.Option>
          </Select>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Protocol</Text>
          <Select
            size="small"
            style={{ width: '100%' }}
            value={localConfig.protocol}
            onChange={(val: any) => updateConfig({ protocol: val })}
          >
            <Select.Option value="HTTP">HTTP</Select.Option>
            <Select.Option value="HTTPS">HTTPS</Select.Option>
          </Select>
        </div>
      </div>
    </div>
  );

  // Security Tab - Auth from Authentication page, plus Signature, Encrypt, Decrypt, Verify
  const renderSecurityTab = () => (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>Security 配置</Text>

      {/* Auth - Reference to Authentication page configured Auth */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>认证 (Auth)</Text>
        <Select
          size="small"
          style={{ width: 300 }}
          placeholder="选择 Auth 配置"
          value={localConfig.authId}
          onChange={(val: any) => updateConfig({ authId: val })}
          allowClear
        >
          {/* Mock auth options - in real app would come from Authentication page */}
          <Select.Option value="auth_paystack_bearer">Paystack Bearer Token</Select.Option>
          <Select.Option value="auth_paystack_apikey">Paystack API Key</Select.Option>
          <Select.Option value="auth_stripe">Stripe API Key</Select.Option>
        </Select>
        <div style={{ marginTop: 4, fontSize: 10, color: '#999' }}>
          从 Authentication 页面配置的 Auth 中选择
        </div>
      </div>

      {/* Signature - 加签 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>加签 (Signature)</Text>
        <Space>
          <Switch
            size="small"
            checked={localConfig.signature?.enabled}
            onChange={(val: any) => updateConfig({ signature: { ...localConfig.signature, enabled: val } })}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>Enabled</Text>
        </Space>
        {localConfig.signature?.enabled && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Select
              size="small"
              placeholder="Algorithm"
              style={{ width: 150 }}
              value={localConfig.signature?.algorithm}
              onChange={(val: any) => updateConfig({ signature: { ...localConfig.signature, algorithm: val } })}
            >
              <Select.Option value="HMAC-SHA256">HMAC-SHA256</Select.Option>
              <Select.Option value="HMAC-SHA512">HMAC-SHA512</Select.Option>
              <Select.Option value="RSA-SHA256">RSA-SHA256</Select.Option>
            </Select>
            <Input
              size="small"
              placeholder="Fields (comma separated)"
              value={localConfig.signature?.fields?.join(', ') || ''}
              onChange={(e: any) => updateConfig({ signature: { ...localConfig.signature, fields: e.target.value.split(',') } })}
            />
            <Input
              size="small"
              placeholder="Secret source"
              value={localConfig.signature?.secretSource || ''}
              onChange={(e: any) => updateConfig({ signature: { ...localConfig.signature, secretSource: e.target.value } })}
            />
          </div>
        )}
      </div>

      {/* Encrypt / Decrypt */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>加密 (Encrypt)</Text>
          <Select
            size="small"
            style={{ width: '100%' }}
            placeholder="Select"
            value={localConfig.encrypt}
            onChange={(val: any) => updateConfig({ encrypt: val })}
            allowClear
          >
            <Select.Option value="AES-256-GCM">AES-256-GCM</Select.Option>
            <Select.Option value="DES">DES</Select.Option>
          </Select>
        </div>
        <div>
          <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>解密 (Decrypt)</Text>
          <Select
            size="small"
            style={{ width: '100%' }}
            placeholder="Select"
            value={localConfig.decrypt}
            onChange={(val: any) => updateConfig({ decrypt: val })}
            allowClear
          >
            <Select.Option value="AES-256-GCM">AES-256-GCM</Select.Option>
            <Select.Option value="DES">DES</Select.Option>
          </Select>
        </div>
      </div>

      {/* Verify - 验签 */}
      <div>
        <Text strong style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>验签 (Verify)</Text>
        <Select
          size="small"
          style={{ width: '100%' }}
          placeholder="Select"
          value={localConfig.verify}
          onChange={(val: any) => updateConfig({ verify: val })}
          allowClear
        >
          <Select.Option value="RSA-SHA256">RSA-SHA256</Select.Option>
        </Select>
      </div>
    </div>
  );

  // Request Fields Tab - with inline SPI mapping
  const renderRequestTab = () => (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 12 }}>Request 字段映射</Text>
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={handleAddRequestField}>+ 添加字段</Button>
      </div>

      {localConfig.requestFields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#999', background: '#fafafa', borderRadius: 4 }}>
          暂无 Request 字段，点击上方添加
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '35%' }}>字段名称</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '40%' }}>SPI 字段</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {localConfig.requestFields.map((item: any, idx: number) => (
              <tr key={item.id || idx}>
                <td style={{ padding: '2px' }}>
                  <Input
                    size="small"
                    placeholder="字段名"
                    value={item.fieldName}
                    onChange={e => {
                      const newData = [...localConfig.requestFields];
                      newData[idx] = { ...newData[idx], fieldName: e.target.value };
                      updateConfig({ requestFields: newData });
                    }}
                  />
                </td>
                <td style={{ padding: '2px' }}>
                  <div
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      background: item.spiField ? '#fafafa' : '#fff',
                      color: item.spiField ? '#333' : '#bfbfbf',
                    }}
                    onClick={() => handleActivateMapping('requestFields', idx)}
                  >
                    {item.spiField || '点击选择SPI字段'}
                  </div>
                </td>
                <td>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                    updateConfig({ requestFields: localConfig.requestFields.filter((_: any, i: number) => i !== idx) });
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Response Fields Tab - with inline SPI mapping
  const renderResponseTab = () => (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 12 }}>Response 字段映射</Text>
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={handleAddResponseField}>+ 添加字段</Button>
      </div>

      {localConfig.responseFields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#999', background: '#fafafa', borderRadius: 4 }}>
          暂无 Response 字段，点击上方添加
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '35%' }}>字段名称</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '40%' }}>SPI 字段</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {localConfig.responseFields.map((item: any, idx: number) => (
              <tr key={item.id || idx}>
                <td style={{ padding: '2px' }}>
                  <Input
                    size="small"
                    placeholder="字段名"
                    value={item.fieldName}
                    onChange={e => {
                      const newData = [...localConfig.responseFields];
                      newData[idx] = { ...newData[idx], fieldName: e.target.value };
                      updateConfig({ responseFields: newData });
                    }}
                  />
                </td>
                <td style={{ padding: '2px' }}>
                  <div
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      background: item.spiField ? '#fafafa' : '#fff',
                      color: item.spiField ? '#333' : '#bfbfbf',
                    }}
                    onClick={() => handleActivateMapping('responseFields', idx)}
                  >
                    {item.spiField || '点击选择SPI字段'}
                  </div>
                </td>
                <td>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                    updateConfig({ responseFields: localConfig.responseFields.filter((_: any, i: number) => i !== idx) });
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Response Code Tab
  const renderResponseCodeTab = () => (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      <Divider style={{ marginTop: 0 }}>Response Code 构成规则</Divider>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
        选择 Response 中的字段，通过 # 拼接组合成 Response Code
      </Text>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12 }}>Code 字段</Text>
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
            updateConfig({ responseCodeFields: [...localConfig.responseCodeFields, { field: '', alias: '' }] });
          }}>+ 添加字段</Button>
        </div>
        {localConfig.responseCodeFields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#999', background: '#fafafa', borderRadius: 4 }}>
            暂未配置 Code 字段
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>字段</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>别名</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {localConfig.responseCodeFields.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ padding: '4px' }}>
                    <Select size="small" style={{ width: '100%' }} placeholder="选择字段" value={item.field} onChange={val => {
                      const newFields = [...localConfig.responseCodeFields];
                      newFields[idx] = { ...newFields[idx], field: val };
                      updateConfig({ responseCodeFields: newFields });
                    }}>
                      <Select.OptGroup label="🔵 channelResponse">
                        <Select.Option value="channelResponse.status">status</Select.Option>
                        <Select.Option value="channelResponse.code">code</Select.Option>
                        <Select.Option value="channelResponse.message">message</Select.Option>
                      </Select.OptGroup>
                      <Select.OptGroup label="🟢 generatedFields">
                        {generatedFields.map((f: any) => (
                          <Select.Option key={f.name} value={`generatedFields.${f.name}`}>{f.name}</Select.Option>
                        ))}
                      </Select.OptGroup>
                    </Select>
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input size="small" placeholder="别名" value={item.alias} onChange={e => {
                      const newFields = [...localConfig.responseCodeFields];
                      newFields[idx] = { ...newFields[idx], alias: e.target.value };
                      updateConfig({ responseCodeFields: newFields });
                    }} />
                  </td>
                  <td>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                      updateConfig({ responseCodeFields: localConfig.responseCodeFields.filter((_: any, i: number) => i !== idx) });
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {localConfig.responseCodeFields.length > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
            预览: {localConfig.responseCodeFields.map((f: any) => f.alias || f.field).join(' # ')}
          </div>
        )}
      </div>

      <Divider>Response Message 构成规则</Divider>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
        选择 Response 中的字段，拼接组合成 Response Message
      </Text>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12 }}>Message 字段</Text>
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
            updateConfig({ responseMessageFields: [...localConfig.responseMessageFields, { field: '', separator: ' ' }] });
          }}>+ 添加字段</Button>
        </div>
        {localConfig.responseMessageFields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#999', background: '#fafafa', borderRadius: 4 }}>
            暂未配置 Message 字段
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>字段</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>分隔符</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {localConfig.responseMessageFields.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ padding: '4px' }}>
                    <Select size="small" style={{ width: '100%' }} placeholder="选择字段" value={item.field} onChange={val => {
                      const newFields = [...localConfig.responseMessageFields];
                      newFields[idx] = { ...newFields[idx], field: val };
                      updateConfig({ responseMessageFields: newFields });
                    }}>
                      <Select.OptGroup label="🔵 channelResponse">
                        <Select.Option value="channelResponse.status">status</Select.Option>
                        <Select.Option value="channelResponse.message">message</Select.Option>
                        <Select.Option value="channelResponse.description">description</Select.Option>
                      </Select.OptGroup>
                    </Select>
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input size="small" placeholder="分隔符" value={item.separator} onChange={e => {
                      const newFields = [...localConfig.responseMessageFields];
                      newFields[idx] = { ...newFields[idx], separator: e.target.value };
                      updateConfig({ responseMessageFields: newFields });
                    }} style={{ width: 80 }} />
                  </td>
                  <td>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                      updateConfig({ responseMessageFields: localConfig.responseMessageFields.filter((_: any, i: number) => i !== idx) });
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {localConfig.responseMessageFields.length > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
            预览: {localConfig.responseMessageFields.map((f: any) => f.field.split('.').pop()).join(' + ')}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Drawer
      title={<Space><span>配置 {name}</span><Tag color="blue">{code}</Tag></Space>}
      placement="right"
      width={650}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'endpointBasicInfo', label: 'Endpoint Basic Info' },
          { key: 'request', label: 'Request' },
          { key: 'response', label: 'Response' },
          { key: 'security', label: 'Security' },
          { key: 'code', label: 'Response Code' },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        {activeTab === 'endpointBasicInfo' && renderEndpointBasicInfoTab()}
        {activeTab === 'request' && renderRequestTab()}
        {activeTab === 'response' && renderResponseTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'code' && renderResponseCodeTab()}
      </div>
    </Drawer>
  );
}

// Edge Condition Drawer - for configuring condition on edge from Condition node
function EdgeConditionDrawer({
  visible,
  edge,
  nodes,
  onClose,
  onSave,
}: {
  visible: boolean;
  edge: Edge | null;
  nodes: Node[];
  onClose: () => void;
  onSave: (edgeId: string, condition: { conditions: any[]; defaultAction: string }) => void;
}) {
  const [conditions, setConditions] = useState<any[]>([
    { id: '1', field: '', operator: '==', value: '', logic: 'AND' }
  ]);
  const [defaultAction, setDefaultAction] = useState<string>('skip');

  useEffect(() => {
    if (visible) {
      if (edge?.data?.condition) {
        const savedCondition = edge.data.condition as { conditions?: any[]; defaultAction?: string };
        setConditions(savedCondition.conditions || [{ id: '1', field: '', operator: '==', value: '', logic: 'AND' }]);
        setDefaultAction(savedCondition.defaultAction || 'skip');
      } else {
        setConditions([{ id: '1', field: '', operator: '==', value: '', logic: 'AND' }]);
        setDefaultAction('skip');
      }
    }
  }, [visible, edge]);

  const targetNode = nodes.find(n => n.id === edge?.target);

  const operatorOptions = [
    { value: '==', label: '==' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: 'contains', label: 'contains' },
    { value: 'startsWith', label: 'startsWith' },
    { value: 'isEmpty', label: 'isEmpty' },
    { value: 'isNotEmpty', label: 'isNotEmpty' },
  ];

  const fieldSourceOptions = [
    { label: 'channelResponse.status', value: 'channelResponse.status' },
    { label: 'channelResponse.message', value: 'channelResponse.message' },
    { label: 'channelResponse.code', value: 'channelResponse.code' },
    { label: 'channelResponse.data', value: 'channelResponse.data' },
    { label: 'spi.request.amount', value: 'spi.request.amount' },
    { label: 'spi.request.currency', value: 'spi.request.currency' },
    { label: 'spi.request.reference', value: 'spi.request.reference' },
  ];

  const updateCondition = (idx: number, updates: any) => {
    const newConditions = [...conditions];
    newConditions[idx] = { ...newConditions[idx], ...updates };
    setConditions(newConditions);
  };

  const addCondition = () => {
    setConditions([...conditions, { id: String(Date.now()), field: '', operator: '==', value: '', logic: 'AND' }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (edge) {
      onSave(edge.id, { conditions: conditions.filter(c => c.field), defaultAction });
    }
    onClose();
  };

  return (
    <Drawer
      title={<Space>
        <span>配置分支条件</span>
        <Tag color="orange">Condition → {String(targetNode?.data?.name || 'Unknown')}</Tag>
      </Space>}
      placement="right"
      width={500}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          当满足以下条件时，走此分支
        </Text>

        {conditions.map((cond, idx) => (
          <div key={cond.id} style={{ marginBottom: 12, padding: 12, background: '#fafafa', borderRadius: 6, border: '1px solid #e8e8e8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text strong style={{ fontSize: 11 }}>条件 {idx + 1}</Text>
              {idx > 0 && (
                <Select
                  size="small"
                  value={cond.logic}
                  onChange={(val) => updateCondition(idx, { logic: val })}
                  style={{ width: 70 }}
                >
                  <Select.Option value="AND">且</Select.Option>
                  <Select.Option value="OR">或</Select.Option>
                </Select>
              )}
              {conditions.length > 1 && (
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeCondition(idx)} />
              )}
            </div>
            <Space direction="horizontal" size={8}>
              <Select
                placeholder="字段"
                value={cond.field}
                onChange={(val) => updateCondition(idx, { field: val })}
                style={{ width: 160 }}
                allowClear
              >
                {fieldSourceOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
              <Select
                value={cond.operator}
                onChange={(val) => updateCondition(idx, { operator: val })}
                style={{ width: 80 }}
              >
                {operatorOptions.map(op => (
                  <Select.Option key={op.value} value={op.value}>{op.label}</Select.Option>
                ))}
              </Select>
              {!['isEmpty', 'isNotEmpty'].includes(cond.operator) && (
                <Input
                  placeholder="值"
                  value={cond.value}
                  onChange={(e) => updateCondition(idx, { value: e.target.value })}
                  style={{ width: 100 }}
                />
              )}
            </Space>
          </div>
        ))}

        <Button type="link" size="small" icon={<PlusOutlined />} onClick={addCondition}>
          + 添加条件
        </Button>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <div>
        <Text strong style={{ fontSize: 12 }}>默认处理（不满足任何条件时）</Text>
        <Radio.Group
          value={defaultAction}
          onChange={(e) => setDefaultAction(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
        >
          <Radio value="skip">
            <span>跳过此分支，继续下一个</span>
          </Radio>
          <Radio value="fallback">
            <span>使用默认分支</span>
          </Radio>
          <Radio value="abort">
            <span>中止流程并报错</span>
          </Radio>
        </Radio.Group>
      </div>
    </Drawer>
  );
}

// Generated Field Drawer
function GeneratedFieldDrawer({
  visible,
  field,
  onClose,
  onSave,
}: {
  visible: boolean;
  field: { name: string; generationType: string; format?: string; timezone?: string } | null;
  onClose: () => void;
  onSave: (field: any) => void;
}) {
  const [fieldName, setFieldName] = useState(field?.name || '');
  const [generationType, setGenerationType] = useState(field?.generationType || 'timestamp');
  const [timezone, setTimezone] = useState(field?.timezone || 'Asia/Shanghai');
  const [format, setFormat] = useState(field?.format || 'yyyy-MM-dd HH:mm:ss');

  useEffect(() => {
    if (visible) {
      setFieldName(field?.name || '');
      setGenerationType(field?.generationType || 'timestamp');
      setTimezone(field?.timezone || 'Asia/Shanghai');
      setFormat(field?.format || 'yyyy-MM-dd HH:mm:ss');
    }
  }, [visible, field]);

  const generationTypeOptions = [
    { value: 'timestamp', label: 'Generate timestamp' },
    { value: 'currentTimeMillis', label: 'Generate current time millis' },
    { value: 'digitalRandom', label: 'Generate digital random number' },
    { value: 'characterRandom', label: 'Generate character random number' },
    { value: 'callbackUrl', label: 'Generate callback url' },
  ];

  const timeFormatOptions = [
    { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss' },
    { value: "yyyy-MM-dd'T'HH:mm:ss", label: "yyyy-MM-dd'T'HH:mm:ss" },
    { value: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", label: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" },
    { value: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", label: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX" },
    { value: "yyyy-MM-dd'T'HH:mm:ssXXX", label: "yyyy-MM-dd'T'HH:mm:ssXXX" },
    { value: 'yyyyMMdd', label: 'yyyyMMdd' },
    { value: 'yyyyMMddHHmmss', label: 'yyyyMMddHHmmss' },
  ];

  const timezoneOptions = [
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
    { value: 'UTC', label: 'UTC (UTC+0)' },
    { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
    { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  ];

  const handleSave = () => {
    onSave({
      name: fieldName,
      generationType,
      ...(generationType === 'timestamp' && { timezone, format }),
    });
    onClose();
  };

  return (
    <Drawer
      title={<Space><span>配置生成字段</span><Tag color="green">{fieldName || 'New Field'}</Tag></Space>}
      placement="right"
      width={450}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>字段名称</Text>
        <Input
          placeholder="请输入字段名称"
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>生成类型</Text>
        <Select
          style={{ width: '100%' }}
          value={generationType}
          onChange={(val) => {
            setGenerationType(val);
            if (val !== 'timestamp') {
              setFormat('');
              setTimezone('');
            } else {
              setTimezone('Asia/Shanghai');
              setFormat('yyyy-MM-dd HH:mm:ss');
            }
          }}
        >
          {generationTypeOptions.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      </div>

      {generationType === 'timestamp' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>时区</Text>
            <Select
              style={{ width: '100%' }}
              value={timezone}
              onChange={setTimezone}
            >
              {timezoneOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>时间戳格式</Text>
            <Select
              style={{ width: '100%' }}
              value={format}
              onChange={setFormat}
            >
              {timeFormatOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </div>
        </>
      )}
    </Drawer>
  );
}

// Global Variable Drawer
function GlobalVarDrawer({
  visible,
  variable,
  onClose,
  onSave,
}: {
  visible: boolean;
  variable: { name: string; value: string } | null;
  onClose: () => void;
  onSave: (variable: any) => void;
}) {
  const [varName, setVarName] = useState(variable?.name || '');
  const [varValue, setVarValue] = useState(variable?.value || '');

  useEffect(() => {
    if (visible) {
      setVarName(variable?.name || '');
      setVarValue(variable?.value || '');
    }
  }, [visible, variable]);

  const handleSave = () => {
    onSave({ name: varName, value: varValue });
    onClose();
  };

  return (
    <Drawer
      title={<Space><span>配置全局变量</span><Tag color="gold">{varName || 'New Variable'}</Tag></Space>}
      placement="right"
      width={400}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>变量名称</Text>
        <Input
          placeholder="请输入变量名称"
          value={varName}
          onChange={(e) => setVarName(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>固定值</Text>
        <Input
          placeholder="请输入固定值"
          value={varValue}
          onChange={(e) => setVarValue(e.target.value)}
        />
      </div>
    </Drawer>
  );
}

// SPI选择弹窗
function SpiSelectModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (spi: { businessType: string; ability: string; action: string }) => void;
}) {
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [ability, setAbility] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  const businessTypes = ['DEPOSIT', 'WITHDRAWAL', 'REFUND', 'TRANSFER', 'QUERY'];
  const abilitiesByBusinessType: Record<string, string[]> = {
    DEPOSIT: ['wallet', 'card', 'account'],
    WITHDRAWAL: ['card', 'account'],
    REFUND: ['wallet', 'card'],
    TRANSFER: ['wallet', 'card', 'account'],
    QUERY: ['wallet', 'card', 'account'],
  };
  const actionsByAbility: Record<string, string[]> = {
    wallet: ['pay', 'refund', 'transfer', 'query'],
    card: ['pay', 'withdraw', 'refund', 'query'],
    account: ['pay', 'withdraw', 'transfer', 'query'],
  };

  const handleConfirm = () => {
    if (businessType && ability && action) {
      onConfirm({ businessType, ability, action });
      setBusinessType(null);
      setAbility(null);
      setAction(null);
      onClose();
    }
  };

  const handleClose = () => {
    setBusinessType(null);
    setAbility(null);
    setAction(null);
    onClose();
  };

  return (
    <Modal
      title="Select SPI"
      open={visible}
      onCancel={handleClose}
      onOk={handleConfirm}
      okText="Confirm"
      cancelText="Cancel"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Business Type</Text>
          <Select
            placeholder="选择 Business Type"
            style={{ width: '100%' }}
            value={businessType}
            onChange={(val) => { setBusinessType(val); setAbility(null); setAction(null); }}
          >
            {businessTypes.map(bt => (
              <Select.Option key={bt} value={bt}>{bt}</Select.Option>
            ))}
          </Select>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Ability</Text>
          <Select
            placeholder={businessType ? "选择 Ability" : "请先选择 Business Type"}
            style={{ width: '100%' }}
            value={ability}
            onChange={(val) => { setAbility(val); setAction(null); }}
            disabled={!businessType}
          >
            {(businessType ? abilitiesByBusinessType[businessType] : []).map(ab => (
              <Select.Option key={ab} value={ab}>{ab}</Select.Option>
            ))}
          </Select>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Action</Text>
          <Select
            placeholder={ability ? "选择 Action" : "请先选择 Ability"}
            style={{ width: '100%' }}
            value={action}
            onChange={setAction}
            disabled={!ability}
          >
            {(ability ? actionsByAbility[ability] : []).map(ac => (
              <Select.Option key={ac} value={ac}>{ac}</Select.Option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  );
}

export default function FlowEditorPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const [spiData, setSpiData] = useState<{ businessType: string; ability: string; action: string } | undefined>({
    businessType: 'DEPOSIT',
    ability: 'card',
    action: 'pay',
  });
  const [showSpiModal, setShowSpiModal] = useState(false);

  // Network drawer state
  const [showNetworkDrawer, setShowNetworkDrawer] = useState(false);

  // Edge condition config modal state
  const [showEdgeConditionDrawer, setShowEdgeConditionDrawer] = useState(false);
  const [selectedEdgeForCondition, setSelectedEdgeForCondition] = useState<Edge | null>(null);

  // Generated field drawer state
  const [showGeneratedFieldDrawer, setShowGeneratedFieldDrawer] = useState(false);
  const [editingGeneratedField, setEditingGeneratedField] = useState<any | null>(null);

  // Global variable drawer state
  const [showGlobalVarDrawer, setShowGlobalVarDrawer] = useState(false);
  const [editingGlobalVar, setEditingGlobalVar] = useState<any | null>(null);

  // Mapping active state - controls whether Context panel fields are clickable for mapping
  const [isMappingActive, setIsMappingActive] = useState(false);

  // Selected context field - passed to drawer when user selects from Context panel
  const [selectedContextField, setSelectedContextField] = useState<string | null>(null);

  // Active mapping context - which field in NetworkConfigDrawer is being mapped
  const [activeMappingContext, setActiveMappingContext] = useState<{ section: string; rowIndex: number } | null>(null);

  // Callback from NetworkConfigDrawer when user clicks SPI field
  const handleMappingContextSet = useCallback((context: { section: string; rowIndex: number } | null) => {
    setActiveMappingContext(context);
    if (context) {
      setIsMappingActive(true);
      setSelectedContextField(null); // Reset selected field
    }
  }, []);

  // Unsaved changes warning modal
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Handle field selection from Context panel when mapping is active
  const handleContextFieldSelect = useCallback((fieldPath: string) => {
    if (activeMappingContext) {
      console.log('Field selected for mapping:', fieldPath, activeMappingContext);
      // Set the selected field - drawer will pick it up via prop
      setSelectedContextField(fieldPath);
      setIsMappingActive(false);
    }
  }, [activeMappingContext]);

  // Handle connection between nodes
  const onConnect = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const newEdge: Edge = {
      id: `edge_${Date.now()}`,
      source: connection.source || '',
      target: connection.target || '',
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#333', strokeWidth: 2 },
      data: {},
    };

    // If connecting from condition node, open condition config drawer
    // but still add the edge first so it appears on canvas
    if (sourceNode?.data?.code === 'condition') {
      setEdges((eds) => addEdge(newEdge, eds));
      setSelectedEdgeForCondition(newEdge);
      setShowEdgeConditionDrawer(true);
    } else {
      setEdges((eds) => addEdge(newEdge, eds));
      message.success('Connection created');
    }
  }, [nodes, setEdges]);

  // Handle edge click to edit condition
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (sourceNode?.data?.code === 'condition') {
      setSelectedEdgeForCondition(edge);
      setShowEdgeConditionDrawer(true);
    }
  }, [nodes]);

  const flowType = searchParams.get('flowType');

  const mockEndpoints = [
    {
      id: 'ep1',
      name: 'Paystack Charge',
      method: 'POST',
      protocol: 'HTTPS',
      path: '/v3/charge',
      url: 'https://api.paystack.co/v3/charge',
      security: {
        auth: {
          type: 'Bearer Token',
          config: { tokenSource: '{{credential.token}}' }
        },
        signature: {
          enabled: true,
          algorithm: 'HMAC-SHA256',
          fields: ['{{spi.request.timestamp}}', '{{spi.request.nonce}}'],
          secretSource: '{{credential.secretKey}}',
          writeTo: 'header',
          headerName: 'X-Paystack-Signature'
        },
        encrypt: 'AES-256-GCM',
        decrypt: 'AES-256-GCM',
        verify: 'RSA-SHA256'
      },
      requestSample: `{
  "reference": "{{spi.request.reference}}",
  "amount": "{{spi.request.amount}}",
  "currency": "{{spi.request.currency}}",
  "email": "{{spi.request.email}}",
  "bank": {
    "code": "{{spi.request.bankCode}}",
    "account_number": "{{spi.request.accountNumber}}"
  }
}`,
      responseSample: `{
  "status": true,
  "message": "Charge attempted",
  "data": {
    "reference": "ch_123456",
    "status": "pending",
    "amount": 10000,
    "currency": "NGN"
  }
}`,
    },
    {
      id: 'ep2',
      name: 'Paystack Verify',
      method: 'GET',
      protocol: 'HTTPS',
      path: '/v3/verify/:reference',
      url: 'https://api.paystack.co/v3/verify/:reference',
      security: {
        auth: {
          type: 'API Key',
          config: { keyName: 'X-API-Key', location: 'header', valueSource: '{{credential.apiKey}}' }
        },
        signature: {
          enabled: true,
          algorithm: 'HMAC-SHA256',
          fields: ['{{spi.request.reference}}'],
          secretSource: '{{credential.secretKey}}',
          writeTo: 'header',
          headerName: 'X-Paystack-Signature'
        },
        encrypt: 'AES-256-GCM',
        decrypt: 'AES-256-GCM',
        verify: 'RSA-SHA256'
      },
      requestSample: `{
  "reference": "{{spi.request.reference}}"
}`,
      responseSample: `{
  "status": true,
  "message": "Verification successful",
  "data": {
    "reference": "ch_123456",
    "status": "success",
    "amount": 10000,
    "currency": "NGN"
  }
}`,
    },
  ];
  const mockCredentials = [
    { id: 'cred1', name: 'Paystack API Key', type: 'API Key' },
  ];
  const [mockGlobalVars, setMockGlobalVars] = useState<any[]>([
    { name: 'channelCode', value: 'PAYSTACK' },
  ]);
  const [mockGeneratedFields, setMockGeneratedFields] = useState<any[]>([
    { name: 'rrn', generationType: 'sequence' },
  ]);

  const handleAddComponent = useCallback((code: string) => {
    const info = COMPONENT_LIBRARY.find(c => c.code === code);
    if (!info) return;

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'flowNode',
      position: { x: 250 + Math.random() * 100, y: nodes.length * 120 + 50 },
      data: {
        name: info.name,
        code: code,
        isConfigured: false,
        onConfig: () => {
          if (code === 'network') {
            setShowNetworkDrawer(true);
          }
          // Condition node config is done via edge click
        },
        onDelete: () => setNodes(nds => nds.filter(n => n.id !== newNode.id)),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes]);

  // 根据 action 和 flowType 获取预置组件并初始化画布
  const getInitialNodes = useCallback((): Node[] => {
    const presetCodes = getPresetComponents(flowType || 'outbound');
    return presetCodes.map((code, idx) => {
      const info = COMPONENT_LIBRARY.find(c => c.code === code);
      return {
        id: `node_${idx}`,
        type: 'flowNode',
        position: { x: 250, y: idx * 120 + 50 },
        data: {
          name: info?.name || code,
          code: code,
          isConfigured: true,
          onConfig: () => {
            if (code === 'network') {
              setShowNetworkDrawer(true);
            }
            // Condition node config is done via edge click
          },
          onDelete: () => {},
          isDraggable: false,
        },
      };
    });
  }, [flowType]);

  // 初始化预置节点
  useEffect(() => {
    const initialNodes = getInitialNodes();
    if (initialNodes.length > 0 && nodes.length === 0) {
      setNodes(initialNodes);
    }
  }, [getInitialNodes, nodes.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const code = e.dataTransfer.getData('application/reactflow');
    if (code) {
      handleAddComponent(code);
    }
  }, [handleAddComponent]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSave = () => {
    message.success('Flow saved successfully', 2);
  };

  const handleSubmit = () => {
    message.success('Submitted successfully', 2);
  };

  const performNavigation = () => {
    navigate(-1);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        height: 56,
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
      }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setShowUnsavedModal(true)}>
          Back
        </Button>
        <Divider type="vertical" style={{ height: 24 }} />
        <Title level={5} style={{ margin: 0 }}>
          {params.ability} - Step {params.stepIndex} - {flowType}
        </Title>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSave}>Save as draft</Button>
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSubmit}>Submit</Button>
        </Space>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Context 上下文面板 */}
        <ContextPanel
          spiData={spiData}
          endpoints={mockEndpoints}
          credentials={mockCredentials}
          globalVariables={mockGlobalVars}
          generatedFields={mockGeneratedFields}
          isMappingActive={isMappingActive}
          onFieldSelect={handleContextFieldSelect}
          onAddGeneratedField={() => {
            setEditingGeneratedField(null);
            setShowGeneratedFieldDrawer(true);
          }}
          onAddGlobalVar={() => {
            setEditingGlobalVar(null);
            setShowGlobalVarDrawer(true);
          }}
        />

        {/* 组件面板 */}
        <ComponentLibraryPanel components={COMPONENT_LIBRARY} onAddComponent={handleAddComponent} />

        {/* 画布区域 */}
        <div
          style={{ flex: 1, background: '#fafafa', minHeight: 0, display: 'flex', flexDirection: 'column' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onNodeClick={(_event, node) => { console.log('ReactFlow node clicked, node data:', node.data); (node.data as any).onConfig?.(); }}
            onNodesChange={(changes) => setNodes((nds) => {
              const updatedNodes = [...nds];
              changes.forEach(change => {
                if (change.type === 'position' && change.position) {
                  const idx = updatedNodes.findIndex(n => n.id === change.id);
                  if (idx !== -1) {
                    updatedNodes[idx] = { ...updatedNodes[idx], position: change.position };
                  }
                }
              });
              return updatedNodes;
            })}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#333', strokeWidth: 2 },
            }}
            style={{ flex: 1, minHeight: 0 }}
          >
            <Background color="#e8e8e8" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {/* SPI 选择弹窗 */}
      <SpiSelectModal
        visible={showSpiModal}
        onClose={() => setShowSpiModal(false)}
        onConfirm={(spi) => setSpiData(spi)}
      />

      {/* Network 配置抽屉 */}
      {/* @ts-ignore */}
      <NetworkConfigDrawer
        visible={showNetworkDrawer}
        code="network"
        name="Network"
        endpoints={mockEndpoints}
        generatedFields={mockGeneratedFields}
        isMappingActive={isMappingActive}
        onMappingActiveChange={setIsMappingActive}
        activeMappingContext={activeMappingContext}
        onMappingContextChange={handleMappingContextSet}
        selectedContextField={selectedContextField}
        onFieldSelect={(_field) => {
          // When drawer selects a field, clear the selection
          setSelectedContextField(null);
        }}
        onClose={() => setShowNetworkDrawer(false)}
        onSave={(config) => {
          console.log('Network config saved:', config);
          // 更新节点状态
          setNodes(nds => nds.map(n => {
            if (n.data.code === 'network') {
              return { ...n, data: { ...n.data, isConfigured: true } };
            }
            return n;
          }));
          setShowNetworkDrawer(false);
        }}
      />

      {/* Edge Condition Modal */}
      <EdgeConditionDrawer
        visible={showEdgeConditionDrawer}
        edge={selectedEdgeForCondition}
        nodes={nodes}
        onClose={() => {
          setShowEdgeConditionDrawer(false);
          setSelectedEdgeForCondition(null);
        }}
        onSave={(edgeId, condition) => {
          setEdges((eds) => eds.map(e => {
            if (e.id === edgeId) {
              return { ...e, data: { ...e.data, condition } };
            }
            return e;
          }));
          setShowEdgeConditionDrawer(false);
          setSelectedEdgeForCondition(null);
          message.success('Branch condition saved');
        }}
      />

      {/* Generated Field Drawer */}
      <GeneratedFieldDrawer
        visible={showGeneratedFieldDrawer}
        field={editingGeneratedField}
        onClose={() => {
          setShowGeneratedFieldDrawer(false);
          setEditingGeneratedField(null);
        }}
        onSave={(field) => {
          if (editingGeneratedField) {
            setMockGeneratedFields(gfs => gfs.map((g: any) => g.name === editingGeneratedField.name ? field : g));
          } else {
            setMockGeneratedFields(gfs => [...gfs, field]);
          }
          setShowGeneratedFieldDrawer(false);
          setEditingGeneratedField(null);
          message.success('Field saved');
        }}
      />

      {/* Global Variable Drawer */}
      <GlobalVarDrawer
        visible={showGlobalVarDrawer}
        variable={editingGlobalVar}
        onClose={() => {
          setShowGlobalVarDrawer(false);
          setEditingGlobalVar(null);
        }}
        onSave={(variable) => {
          if (editingGlobalVar) {
            setMockGlobalVars(gvs => gvs.map((g: any) => g.name === editingGlobalVar.name ? variable : g));
          } else {
            setMockGlobalVars(gvs => [...gvs, variable]);
          }
          setShowGlobalVarDrawer(false);
          setEditingGlobalVar(null);
          message.success('Variable saved');
        }}
      />

      {/* Unsaved Changes Warning Modal */}
      <Modal
        title="Unsaved Changes"
        open={showUnsavedModal}
        onCancel={() => setShowUnsavedModal(false)}
        footer={[
          <Button key="cancel" onClick={() => performNavigation()}>
            Cancel
          </Button>,
          <Button key="saveDraft" onClick={() => { handleSave(); performNavigation(); }}>
            Save as draft
          </Button>,
          <Button key="submit" type="primary" onClick={() => { handleSubmit(); performNavigation(); }}>
            Submit
          </Button>,
        ]}
      >
        <p>You have unsaved changes. Please save, submit, or discard your changes before leaving.</p>
      </Modal>
    </div>
  );
}