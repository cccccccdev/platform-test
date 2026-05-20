import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Typography, Divider, Space, message, Collapse, Tag, Modal, Tabs, Select, Drawer, Radio } from 'antd';
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
  if (flowType === 'forward') {
    return ['generateReference', 'network', 'condition'];
  }
  if (flowType === 'backward') {
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
  onSpiSelect,
  spiData,
  endpoints,
  credentials,
  globalVariables,
  generatedFields,
  onFieldSelect,
  isMappingActive,
}: {
  onSpiSelect: () => void;
  spiData?: { businessType: string; ability: string; action: string };
  endpoints: any[];
  credentials: any[];
  globalVariables: any[];
  generatedFields: any[];
  onFieldSelect?: (fieldPath: string) => void;
  isMappingActive?: boolean;
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
    request: [
      { name: 'amount', type: 'Number', required: true },
      { name: 'currency', type: 'String', required: true },
      { name: 'reference', type: 'String', required: true },
      { name: 'accountNumber', type: 'String', required: true },
      { name: 'bankCode', type: 'String', required: true },
    ],
    response: [
      { name: 'status', type: 'String' },
      { name: 'reference', type: 'String' },
      { name: 'message', type: 'String' },
    ]
  } : null;

  const renderEmptyState = (msg: string, hint: string) => (
    <div style={{ padding: '8px', background: '#fafafa', borderRadius: 6, fontSize: 11 }}>
      <div style={{ color: '#999', marginBottom: 4 }}>{msg}</div>
      <div style={{ color: '#bbb', fontSize: 10 }}>{hint}</div>
    </div>
  );

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
      extra: <Button type="text" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); onSpiSelect(); }} />,
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
                {spiFields.request.map((field: any) => (
                  <div
                    key={field.name}
                    style={{
                      display: 'flex',
                      gap: 4,
                      padding: '2px 4px',
                      color: isMappingActive ? '#1890ff' : '#666',
                      cursor: isMappingActive ? 'pointer' : 'default',
                      fontWeight: isMappingActive ? 500 : 400,
                      background: isMappingActive ? '#e6f7ff' : 'transparent',
                      borderRadius: 4,
                    }}
                    onClick={() => isMappingActive && onFieldSelect?.(`spi.request.${field.name}`)}
                  >
                    <span>{field.name}</span>
                    <span style={{ color: '#999' }}>{field.type}</span>
                    {field.required && <Tag style={{ fontSize: 9, padding: '0 2px' }}>必填</Tag>}
                  </div>
                ))}
                <div style={{ fontWeight: 500, margin: '8px 0 4px', color: '#722ed1' }}>🟣 spi.response</div>
                {spiFields.response.map((field: any) => (
                  <div
                    key={field.name}
                    style={{
                      display: 'flex',
                      gap: 4,
                      padding: '2px 4px',
                      color: isMappingActive ? '#722ed1' : '#666',
                      cursor: isMappingActive ? 'pointer' : 'default',
                      fontWeight: isMappingActive ? 500 : 400,
                      background: isMappingActive ? '#f9f0ff' : 'transparent',
                      borderRadius: 4,
                    }}
                    onClick={() => isMappingActive && onFieldSelect?.(`spi.response.${field.name}`)}
                  >
                    <span>{field.name}</span>
                    <span style={{ color: '#999' }}>{field.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
    },
    {
      key: 'generatedFields',
      label: <Space><span>🟢</span><span>Generated Fields</span></Space>,
      children: generatedFields.length === 0 ? (
        renderEmptyState('暂无 Generated Fields', '请在 Generate Reference 中配置')
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
      label: <Space><span>📝</span><span>Global Variable</span></Space>,
      children: globalVariables.length === 0 ? (
        renderEmptyState('暂无 Global Variable', '请在配置中添加')
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
        endpoints.map(ep => (
          <div key={ep.id} style={{ padding: '4px 0', fontSize: 11 }}>
            <div style={{ fontWeight: 500 }}>{ep.name}</div>
            <div style={{ color: '#888' }}>{ep.method} {ep.url}</div>
          </div>
        ))
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
    <div style={{ width: 240, borderRight: '1px solid #f0f0f0', background: '#fff', display: 'flex', flexDirection: 'column' }}>
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
  endpoints,
  generatedFields,
  isMappingActive,
  onMappingActiveChange,
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
  onClose: () => void;
  onSave: (config: any) => void;
}) {
  const [activeTab, setActiveTab] = useState('basic');
  const [activeMappingContext, setActiveMappingContext] = useState<{ section: string; rowIndex: number } | null>(null);
  void isMappingActive; // passed to ContextPanel via parent
  void onMappingActiveChange; // used to signal parent when mapping mode is entered
  const [localConfig, setLocalConfig] = useState<any>({
    endpointId: '',
    // Basic Info
    protocol: 'HTTPS',
    path: '',
    method: 'POST',
    requestSample: '',
    responseSample: '',
    // Request Mapping
    requestMappingMode: 'default', // default | custom
    pathVariables: [],
    queryParams: [],
    requestHeaders: [],
    requestBody: [],
    // Response Mapping
    responseMappingMode: 'default',
    responseHeaders: [],
    responseBody: [],
    // Response Code
    responseCodeFields: [],
    responseMessageFields: [],
  });

  // Sync mapping active state to parent via callback
  useEffect(() => {
    if (activeMappingContext) {
      onMappingActiveChange?.(true);
    }
  }, [activeMappingContext, onMappingActiveChange]);

  const selectedEndpoint = endpoints.find(ep => ep.id === localConfig.endpointId);

  const updateConfig = (updates: any) => {
    setLocalConfig((prev: any) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  // Helper: Parse JSON sample to extract field paths
  const parseJsonToFields = (jsonStr: string, prefix = ''): { label: string; value: string }[] => {
    if (!jsonStr) return [];
    try {
      const obj = JSON.parse(jsonStr);
      const fields: { label: string; value: string }[] = [];

      const traverse = (o: any, path: string) => {
        if (o && typeof o === 'object') {
          Object.keys(o).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof o[key] === 'object' && o[key] !== null && !Array.isArray(o[key])) {
              traverse(o[key], currentPath);
            } else {
              fields.push({ label: currentPath, value: currentPath });
            }
          });
        }
      };

      traverse(obj, prefix);
      return fields;
    } catch {
      return [];
    }
  };

  // Get request body fields from requestSample
  const requestBodyFields = parseJsonToFields(localConfig.requestSample);

  // Get response body fields from responseSample
  const responseBodyFields = parseJsonToFields(localConfig.responseSample);

  // Request mapping section with Select dropdowns
  const renderRequestMappingSection = (
    title: string,
    data: any[],
    dataKey: string,
    endpointFieldOptions: { label: string; value: string }[]
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 12 }}>{title}</Text>
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
          const newData = [...data, { id: Date.now(), endpointField: '', spiField: '', mappingMode: 'direct' }];
          updateConfig({ [dataKey]: newData });
        }}>+ 添加</Button>
      </div>
      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#999', background: '#fafafa', borderRadius: 4 }}>
          暂无配置
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '45%' }}>Endpoint 字段</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '35%' }}>SPI 字段</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '15%' }}>模式</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any, idx: number) => (
              <tr key={item.id || idx}>
                <td style={{ padding: '2px' }}>
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="选择字段"
                    value={item.endpointField}
                    onChange={val => {
                      const newData = [...data];
                      newData[idx] = { ...newData[idx], endpointField: val };
                      updateConfig({ [dataKey]: newData });
                    }}
                    showSearch
                    optionFilterProp="label"
                  >
                    {endpointFieldOptions.map(f => (
                      <Select.Option key={f.value} value={f.value} label={f.label}>{f.label}</Select.Option>
                    ))}
                  </Select>
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
                    onClick={() => {
                      setActiveMappingContext({ section: dataKey, rowIndex: idx });
                      onMappingActiveChange?.(true);
                    }}
                  >
                    {item.spiField || '点击选择SPI字段'}
                  </div>
                </td>
                <td style={{ padding: '2px' }}>
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={item.mappingMode || 'direct'}
                    onChange={val => {
                      const newData = [...data];
                      newData[idx] = { ...newData[idx], mappingMode: val };
                      updateConfig({ [dataKey]: newData });
                    }}
                  >
                    <Select.Option value="direct">直接赋值</Select.Option>
                    <Select.Option value="fixed">固定值</Select.Option>
                  </Select>
                </td>
                <td>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                    updateConfig({ [dataKey]: data.filter((_: any, i: number) => i !== idx) });
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Response mapping section with Select dropdowns
  const renderResponseMappingSection = (
    title: string,
    data: any[],
    dataKey: string,
    endpointFieldOptions: { label: string; value: string }[]
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 12 }}>{title}</Text>
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
          const newData = [...data, { id: Date.now(), endpointField: '', spiField: '', mappingMode: 'direct' }];
          updateConfig({ [dataKey]: newData });
        }}>+ 添加</Button>
      </div>
      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#999', background: '#fafafa', borderRadius: 4 }}>
          暂无配置
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '45%' }}>Response 字段</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '35%' }}>SPI 字段</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '15%' }}>模式</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any, idx: number) => (
              <tr key={item.id || idx}>
                <td style={{ padding: '2px' }}>
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="选择字段"
                    value={item.endpointField}
                    onChange={val => {
                      const newData = [...data];
                      newData[idx] = { ...newData[idx], endpointField: val };
                      updateConfig({ [dataKey]: newData });
                    }}
                    showSearch
                    optionFilterProp="label"
                  >
                    {endpointFieldOptions.map(f => (
                      <Select.Option key={f.value} value={f.value} label={f.label}>{f.label}</Select.Option>
                    ))}
                  </Select>
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
                    onClick={() => {
                      setActiveMappingContext({ section: dataKey, rowIndex: idx });
                      onMappingActiveChange?.(true);
                    }}
                  >
                    {item.spiField || '点击选择SPI字段'}
                  </div>
                </td>
                <td style={{ padding: '2px' }}>
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={item.mappingMode || 'direct'}
                    onChange={val => {
                      const newData = [...data];
                      newData[idx] = { ...newData[idx], mappingMode: val };
                      updateConfig({ [dataKey]: newData });
                    }}
                  >
                    <Select.Option value="direct">直接赋值</Select.Option>
                    <Select.Option value="fixed">固定值</Select.Option>
                  </Select>
                </td>
                <td>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                    updateConfig({ [dataKey]: data.filter((_: any, i: number) => i !== idx) });
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Basic Info Tab
  const renderBasicInfoTab = () => (
    <div>
      <Divider style={{ marginTop: 0 }}>Endpoint 选择</Divider>
      <Select
        placeholder="请选择 Endpoint"
        style={{ width: '100%' }}
        value={localConfig.endpointId}
        onChange={val => {
          const ep = endpoints.find(e => e.id === val);
          updateConfig({
            endpointId: val,
            protocol: ep?.protocol || 'HTTPS',
            path: ep?.path || '',
            method: ep?.method || 'POST',
            requestSample: ep?.requestSample || '',
            responseSample: ep?.responseSample || '',
          });
        }}
      >
        {endpoints.map(ep => (
          <Select.Option key={ep.id} value={ep.id}>{ep.name}</Select.Option>
        ))}
      </Select>

      {selectedEndpoint && (
        <>
          <Divider>Basic Information Details</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>Protocol</Text>
              <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4, fontWeight: 500 }}>
                {localConfig.protocol}
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>Method</Text>
              <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4, fontWeight: 500 }}>
                {localConfig.method}
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>Path</Text>
              <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4, fontWeight: 500, wordBreak: 'break-all' }}>
                {localConfig.path}
              </div>
            </div>
          </div>

          <Divider>Request 报文示例</Divider>
          <div style={{ background: '#fafafa', padding: 12, borderRadius: 4, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto' }}>
            {localConfig.requestSample || '暂无请求报文示例'}
          </div>

          <Divider>Response 报文示例</Divider>
          <div style={{ background: '#fafafa', padding: 12, borderRadius: 4, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto' }}>
            {localConfig.responseSample || '暂无响应报文示例'}
          </div>
        </>
      )}
    </div>
  );

  // Request Mapping Tab
  const renderRequestMappingTab = () => (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      <Divider style={{ marginTop: 0 }}>Component Instance 映射模式</Divider>
      <Radio.Group
        value={localConfig.requestMappingMode}
        onChange={e => updateConfig({ requestMappingMode: e.target.value })}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="default">Default</Radio.Button>
        <Radio.Button value="custom">Custom</Radio.Button>
      </Radio.Group>

      {localConfig.requestMappingMode === 'default' ? (
        <>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
            Default 模式：展示所有 Endpoint 字段，选择 SPI 字段完成映射
          </Text>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Request Body 映射</Text>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '45%' }}>Endpoint 字段</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '45%' }}>SPI 字段</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {requestBodyFields.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#999' }}>请先在 Basic Info 选择 Endpoint</td></tr>
                ) : (
                  requestBodyFields.map((f: any) => (
                    <tr key={f.value}>
                      <td style={{ padding: '4px', background: '#f9f9f9' }}>
                        <Text style={{ fontSize: 11 }}>{f.label}</Text>
                      </td>
                      <td style={{ padding: '2px' }}>
                        <Select size="small" style={{ width: '100%' }} placeholder="选择SPI字段" allowClear>
                          <Select.OptGroup label="🔵 spi.request">
                            <Select.Option value="spi.request.amount">spi.request.amount</Select.Option>
                            <Select.Option value="spi.request.currency">spi.request.currency</Select.Option>
                            <Select.Option value="spi.request.reference">spi.request.reference</Select.Option>
                            <Select.Option value="spi.request.accountNumber">spi.request.accountNumber</Select.Option>
                            <Select.Option value="spi.request.bankCode">spi.request.bankCode</Select.Option>
                            <Select.Option value="spi.request.email">spi.request.email</Select.Option>
                          </Select.OptGroup>
                          <Select.OptGroup label="🟢 generatedFields">
                            {generatedFields.map((gf: any) => (
                              <Select.Option key={gf.name} value={`generatedFields.${gf.name}`}>{gf.name}</Select.Option>
                            ))}
                          </Select.OptGroup>
                        </Select>
                      </td>
                      <td></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
            Custom 模式：通过脚本构建复杂映射逻辑
          </Text>
          {renderRequestMappingSection('Path Variables', localConfig.pathVariables, 'pathVariables', requestBodyFields)}
          {renderRequestMappingSection('Query Parameters', localConfig.queryParams, 'queryParams', requestBodyFields)}
          {renderRequestMappingSection('Request Headers', localConfig.requestHeaders, 'requestHeaders', [
            { label: 'Authorization', value: 'Authorization' },
            { label: 'Content-Type', value: 'Content-Type' },
            { label: 'X-Api-Key', value: 'X-Api-Key' },
          ])}
          {renderRequestMappingSection('Request Body', localConfig.requestBody, 'requestBody', requestBodyFields)}
        </>
      )}
    </div>
  );

  // Response Mapping Tab
  const renderResponseMappingTab = () => (
    <div style={{ maxHeight: 500, overflow: 'auto' }}>
      <Divider style={{ marginTop: 0 }}>Component Instance 映射模式</Divider>
      <Radio.Group
        value={localConfig.responseMappingMode}
        onChange={e => updateConfig({ responseMappingMode: e.target.value })}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="default">Default</Radio.Button>
        <Radio.Button value="custom">Custom</Radio.Button>
      </Radio.Group>

      {localConfig.responseMappingMode === 'default' ? (
        <>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
            Default 模式：展示所有 Response 字段，选择 SPI 字段完成映射
          </Text>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Response Body 映射</Text>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '45%' }}>Response 字段</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', width: '45%' }}>SPI 字段</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {responseBodyFields.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#999' }}>请先在 Basic Info 选择 Endpoint</td></tr>
                ) : (
                  responseBodyFields.map((f: any) => (
                    <tr key={f.value}>
                      <td style={{ padding: '4px', background: '#f9f9f9' }}>
                        <Text style={{ fontSize: 11 }}>{f.label}</Text>
                      </td>
                      <td style={{ padding: '2px' }}>
                        <Select size="small" style={{ width: '100%' }} placeholder="选择SPI字段" allowClear>
                          <Select.OptGroup label="🔵 channelResponse">
                            <Select.Option value="channelResponse.status">channelResponse.status</Select.Option>
                            <Select.Option value="channelResponse.message">channelResponse.message</Select.Option>
                            <Select.Option value="channelResponse.reference">channelResponse.reference</Select.Option>
                            <Select.Option value="channelResponse.data">channelResponse.data</Select.Option>
                            <Select.Option value="channelResponse.code">channelResponse.code</Select.Option>
                          </Select.OptGroup>
                          <Select.OptGroup label="🟢 generatedFields">
                            {generatedFields.map((gf: any) => (
                              <Select.Option key={gf.name} value={`generatedFields.${gf.name}`}>{gf.name}</Select.Option>
                            ))}
                          </Select.OptGroup>
                        </Select>
                      </td>
                      <td></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
            Custom 模式：通过脚本构建复杂映射逻辑
          </Text>
          {renderResponseMappingSection('Response Headers', localConfig.responseHeaders, 'responseHeaders', [
            { label: 'Content-Type', value: 'Content-Type' },
            { label: 'X-Request-Id', value: 'X-Request-Id' },
          ])}
          {renderResponseMappingSection('Response Body', localConfig.responseBody, 'responseBody', responseBodyFields)}
        </>
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
          { key: 'basic', label: 'Basic Info' },
          { key: 'request', label: 'Request Mapping' },
          { key: 'response', label: 'Response Mapping' },
          { key: 'code', label: 'Response Code' },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        {activeTab === 'basic' && renderBasicInfoTab()}
        {activeTab === 'request' && renderRequestMappingTab()}
        {activeTab === 'response' && renderResponseMappingTab()}
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

  // Mapping active state - controls whether Context panel fields are clickable for mapping
  const [isMappingActive, setIsMappingActive] = useState(false);

  // Handle field selection from Context panel when mapping is active
  const handleContextFieldSelect = useCallback((fieldPath: string) => {
    // activeMappingContext is passed from NetworkConfigDrawer via onMappingContextChange
    console.log('Field selected in mapping mode:', fieldPath);
  }, []);

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
  const mockGlobalVars = [
    { name: 'channelCode', value: 'PAYSTACK' },
  ];
  const mockGeneratedFields = [
    { name: 'rrn', generationType: 'sequence' },
  ];

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
    const presetCodes = getPresetComponents(flowType || 'forward');
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
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <Divider type="vertical" style={{ height: 24 }} />
        <Title level={5} style={{ margin: 0 }}>
          {params.ability} - Step {params.stepIndex} - {flowType}
        </Title>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
          <Button onClick={() => { console.log('Test click, showNetworkDrawer:', showNetworkDrawer); setShowNetworkDrawer(true); }}>测试Network</Button>
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSubmit}>提交</Button>
        </Space>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Context 上下文面板 */}
        <ContextPanel
          onSpiSelect={() => setShowSpiModal(true)}
          spiData={spiData}
          endpoints={mockEndpoints}
          credentials={mockCredentials}
          globalVariables={mockGlobalVars}
          generatedFields={mockGeneratedFields}
          isMappingActive={isMappingActive}
          onFieldSelect={handleContextFieldSelect}
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
    </div>
  );
}