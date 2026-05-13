import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Typography, Divider, Space, message, Collapse, Tag, Modal, Tabs, Select, InputNumber, Drawer, Radio, Card } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CloudUploadOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const { Text, Title } = Typography;

// 组件库 - 根据 action 和 flowType 预置不同组件
const COMPONENT_LIBRARY = [
  { code: 'generateReference', name: 'Generate Reference', type: 'Component' },
  { code: 'network', name: 'Network', type: 'Component' },
  { code: 'condition', name: 'Condition', type: 'Component' },
];

// 根据 action 和 flowType 获取预置组件
const getPresetComponents = (_action: string, flowType: string): string[] => {
  if (flowType === 'main') {
    return ['generateReference', 'network', 'condition'];
  }
  if (flowType === 'requery') {
    return ['network', 'condition'];
  }
  if (flowType === 'callback') {
    return ['condition'];
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
        {(isHovered || true) && (
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
}: {
  onSpiSelect: () => void;
  spiData?: { businessType: string; ability: string; action: string };
  endpoints: any[];
  credentials: any[];
  globalVariables: any[];
  generatedFields: any[];
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
                  <div key={field.name} style={{ display: 'flex', gap: 4, padding: '2px 0', color: '#666' }}>
                    <span>{field.name}</span>
                    <span style={{ color: '#999' }}>{field.type}</span>
                    {field.required && <Tag style={{ fontSize: 9, padding: '0 2px' }}>必填</Tag>}
                  </div>
                ))}
                <div style={{ fontWeight: 500, margin: '8px 0 4px', color: '#722ed1' }}>🟣 spi.response</div>
                {spiFields.response.map((field: any) => (
                  <div key={field.name} style={{ display: 'flex', gap: 4, padding: '2px 0', color: '#666' }}>
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
              <tr key={idx}>
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
          <div key={idx} style={{ padding: '2px 0', fontSize: 11 }}>
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
  globalVariables,
  generatedFields,
  onClose,
  onSave,
}: {
  visible: boolean;
  code: string;
  name: string;
  endpoints: any[];
  globalVariables: any[];
  generatedFields: any[];
  onClose: () => void;
  onSave: (config: any) => void;
}) {
  const [activeTab, setActiveTab] = useState('request');
  const [localConfig, setLocalConfig] = useState<any>({
    endpointId: '',
    method: 'POST',
    timeout: 5000,
    requestMappings: [],
    responseMappings: [],
    returnCodes: [],
  });

  // 字段来源选项
  const fieldSourceOptions = [
    <Select.OptGroup label="🔵 spi.request" key="sr">
      <Select.Option value="spi.request.amount">amount</Select.Option>
      <Select.Option value="spi.request.currency">currency</Select.Option>
      <Select.Option value="spi.request.reference">reference</Select.Option>
      <Select.Option value="spi.request.accountNumber">accountNumber</Select.Option>
      <Select.Option value="spi.request.bankCode">bankCode</Select.Option>
    </Select.OptGroup>,
    <Select.OptGroup label="🟢 generatedFields" key="gf">
      {generatedFields.map((f: any) => (
        <Select.Option key={f.name} value={`generatedFields.${f.name}`}>{f.name}</Select.Option>
      ))}
    </Select.OptGroup>,
    <Select.OptGroup label="🟡 globalVar" key="gv">
      {globalVariables.map((v: any) => (
        <Select.Option key={v.name} value={`globalVar.${v.name}`}>{v.name}</Select.Option>
      ))}
    </Select.OptGroup>,
  ];

  const selectedEndpoint = endpoints.find(ep => ep.id === localConfig.endpointId);

  const updateConfig = (updates: any) => {
    setLocalConfig((prev: any) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  // Request Mapping Tab
  const renderRequestTab = () => (
    <div>
      <Divider style={{ marginTop: 0 }}>请求字段映射</Divider>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>请求字段</th>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>类型</th>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>来源映射</th>
            <th style={{ padding: '4px 8px', width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {localConfig.requestMappings.map((mapping: any, idx: number) => (
            <tr key={idx}>
              <td style={{ padding: '4px' }}>
                <Input size="small" value={mapping.field} onChange={e => {
                  const newMappings = [...localConfig.requestMappings];
                  newMappings[idx].field = e.target.value;
                  updateConfig({ requestMappings: newMappings });
                }} placeholder="字段名" />
              </td>
              <td style={{ padding: '4px' }}>
                <Select size="small" value={mapping.type || 'String'} onChange={val => {
                  const newMappings = [...localConfig.requestMappings];
                  newMappings[idx].type = val;
                  updateConfig({ requestMappings: newMappings });
                }} style={{ width: 80 }}>
                  <Select.Option value="String">String</Select.Option>
                  <Select.Option value="Number">Number</Select.Option>
                  <Select.Option value="Boolean">Boolean</Select.Option>
                </Select>
              </td>
              <td style={{ padding: '4px' }}>
                <Select
                  size="small"
                  value={mapping.source}
                  onChange={val => {
                    const newMappings = [...localConfig.requestMappings];
                    newMappings[idx].source = val;
                    updateConfig({ requestMappings: newMappings });
                  }}
                  style={{ width: 160 }}
                  allowClear
                  placeholder="选择来源"
                >
                  {fieldSourceOptions}
                </Select>
              </td>
              <td style={{ padding: '4px' }}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                  updateConfig({ requestMappings: localConfig.requestMappings.filter((_: any, i: number) => i !== idx) });
                }} />
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ padding: '4px' }}>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
                updateConfig({ requestMappings: [...localConfig.requestMappings, { field: '', type: 'String', source: '' }] });
              }}>+ 添加字段</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // Response Mapping Tab
  const renderResponseTab = () => (
    <div>
      <Divider style={{ marginTop: 0 }}>响应字段映射</Divider>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>SPI字段</th>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>赋值模式</th>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>来源/条件配置</th>
            <th style={{ padding: '4px 8px', width: 40 }}></th>
          </tr>
        </thead>
<tbody>
          {localConfig.responseMappings.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 8, textAlign: 'center', color: '#999' }}>暂无映射字段</td></tr>
          ) : (
            localConfig.responseMappings.map((mapping: any, idx: number) => (
              <tr key={idx}>
                <td style={{ padding: '4px' }}>
                  <Input size="small" value={mapping.spiField} onChange={e => {
                    const newMappings = [...localConfig.responseMappings];
                    newMappings[idx].spiField = e.target.value;
                    updateConfig({ responseMappings: newMappings });
                  }} placeholder="SPI字段名" />
                </td>
                <td style={{ padding: '4px' }}>
                  <Select size="small" value={mapping.mappingMode || 'direct'} style={{ width: 80 }} onChange={val => {
                    const newMappings = [...localConfig.responseMappings];
                    newMappings[idx].mappingMode = val;
                    updateConfig({ responseMappings: newMappings });
                  }}>
                    <Select.Option value="fixed">固定值</Select.Option>
                    <Select.Option value="direct">直接赋值</Select.Option>
                  </Select>
                </td>
                <td style={{ padding: '4px' }}>
                  {mapping.mappingMode === 'fixed' ? (
                    <Input size="small" value={mapping.source} placeholder="固定值" style={{ width: 120 }} />
                  ) : (
                    <Select size="small" value={mapping.source} onChange={val => {
                      const newMappings = [...localConfig.responseMappings];
                      newMappings[idx].source = val;
                      updateConfig({ responseMappings: newMappings });
                    }} style={{ width: 160 }} allowClear placeholder="选择来源">
                      <Select.OptGroup label="🔵 channelResponse" key="cr">
                        <Select.Option value="channelResponse.status">status</Select.Option>
                        <Select.Option value="channelResponse.reference">reference</Select.Option>
                        <Select.Option value="channelResponse.message">message</Select.Option>
                        <Select.Option value="channelResponse.data">data</Select.Option>
                      </Select.OptGroup>
                      <Select.OptGroup label="🟢 generatedFields" key="gf">
                        {generatedFields.map((f: any) => (
                          <Select.Option key={f.name} value={`generatedFields.${f.name}`}>{f.name}</Select.Option>
                        ))}
                      </Select.OptGroup>
                    </Select>
                  )}
                </td>
                <td style={{ padding: '4px' }}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                    updateConfig({ responseMappings: localConfig.responseMappings.filter((_: any, i: number) => i !== idx) });
                  }} />
                </td>
              </tr>
            ))
          )}
          <tr>
            <td colSpan={4} style={{ padding: '4px' }}>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
                updateConfig({ responseMappings: [...localConfig.responseMappings, { spiField: '', mappingMode: 'direct', source: '' }] });
              }}>+ 添加字段</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

// Return Code Tab
  const renderReturnCodeTab = () => (
    <div>
      <Divider style={{ marginTop: 0 }}>返回码映射</Divider>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>渠道返回码</th>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>SPI状态</th>
            <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>说明</th>
            <th style={{ padding: '4px 8px', width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {localConfig.returnCodes.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 8, textAlign: 'center', color: '#999' }}>暂无返回码</td></tr>
          ) : (
            localConfig.returnCodes.map((rc: any, idx: number) => (
              <tr key={idx}>
                <td style={{ padding: '4px' }}>
                  <Input size="small" value={rc.code} onChange={e => {
                    const newRCs = [...localConfig.returnCodes];
                    newRCs[idx].code = e.target.value;
                    updateConfig({ returnCodes: newRCs });
                  }} placeholder="返回码" style={{ width: 100 }} />
                </td>
                <td style={{ padding: '4px' }}>
                  <Select size="small" value={rc.status} onChange={val => {
                    const newRCs = [...localConfig.returnCodes];
                    newRCs[idx].status = val;
                    updateConfig({ returnCodes: newRCs });
                  }} style={{ width: 100 }}>
                    <Select.Option value="SUCCESS">SUCCESS</Select.Option>
                    <Select.Option value="FAIL">FAIL</Select.Option>
                    <Select.Option value="PENDING">PENDING</Select.Option>
                  </Select>
                </td>
                <td style={{ padding: '4px' }}>
                  <Input size="small" value={rc.message} onChange={e => {
                    const newRCs = [...localConfig.returnCodes];
                    newRCs[idx].message = e.target.value;
                    updateConfig({ returnCodes: newRCs });
                  }} placeholder="说明" style={{ width: 120 }} />
                </td>
                <td style={{ padding: '4px' }}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                    updateConfig({ returnCodes: localConfig.returnCodes.filter((_: any, i: number) => i !== idx) });
                  }} />
                </td>
              </tr>
            ))
          )}
          <tr>
            <td colSpan={4} style={{ padding: '4px' }}>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
                updateConfig({ returnCodes: [...localConfig.returnCodes, { code: '', status: 'SUCCESS', message: '' }] });
              }}>+ 添加返回码</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <Drawer
      title={<Space><span>配置 {name}</span><Tag color="blue">{code}</Tag></Space>}
      placement="right"
      width={600}
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
        <Text strong style={{ fontSize: 12 }}>Endpoint 配置</Text>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Select
            placeholder="选择 Endpoint"
            style={{ width: 200 }}
            value={localConfig.endpointId}
            onChange={val => updateConfig({ endpointId: val })}
          >
            {endpoints.map(ep => (
              <Select.Option key={ep.id} value={ep.id}>{ep.name}</Select.Option>
            ))}
          </Select>
          <Select
            style={{ width: 100 }}
            value={localConfig.method}
            onChange={val => updateConfig({ method: val })}
          >
            <Select.Option value="GET">GET</Select.Option>
            <Select.Option value="POST">POST</Select.Option>
            <Select.Option value="PUT">PUT</Select.Option>
            <Select.Option value="PATCH">PATCH</Select.Option>
          </Select>
          <InputNumber
            size="small"
            min={100}
            max={30000}
            value={localConfig.timeout}
            onChange={val => updateConfig({ timeout: val })}
            addonAfter="ms"
            style={{ width: 120 }}
          />
        </div>
        {selectedEndpoint && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            URL: {selectedEndpoint.url}
          </Text>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'request', label: '请求映射' },
          { key: 'response', label: '响应映射' },
          { key: 'returnCode', label: '返回码' },
        ]}
      />
      {activeTab === 'request' && renderRequestTab()}
      {activeTab === 'response' && renderResponseTab()}
      {activeTab === 'returnCode' && renderReturnCodeTab()}
    </Drawer>
  );
}

// Condition 组件配置抽屉
function ConditionConfigDrawer({
  visible,
  code,
  name,
  onClose,
  onSave,
}: {
  visible: boolean;
  code: string;
  name: string;
  onClose: () => void;
  onSave: (config: any) => void;
}) {
  const [conditionType, setConditionType] = useState<'if' | 'switch'>('if');
  const [conditions, setConditions] = useState<any[]>([
    { field: '', operator: '==', value: '', logic: 'AND' }
  ]);
  const [defaultAction, setDefaultAction] = useState<{ type: string; value: string }>({ type: 'skip', value: '' });

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
    <Select.OptGroup label="🔵 channelResponse" key="cr">
      <Select.Option value="channelResponse.status">status</Select.Option>
      <Select.Option value="channelResponse.message">message</Select.Option>
      <Select.Option value="channelResponse.data">data</Select.Option>
    </Select.OptGroup>,
    <Select.OptGroup label="🔵 spi.request" key="sr">
      <Select.Option value="spi.request.amount">amount</Select.Option>
      <Select.Option value="spi.request.currency">currency</Select.Option>
    </Select.OptGroup>,
  ];

  const updateCondition = (idx: number, updates: any) => {
    const newConditions = [...conditions];
    newConditions[idx] = { ...newConditions[idx], ...updates };
    setConditions(newConditions);
  };

  const handleSave = () => {
    onSave({ conditionType, conditions, defaultAction });
    onClose();
  };

  return (
    <Drawer
      title={<Space><span>配置 {name}</span><Tag color="blue">{code}</Tag></Space>}
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
        <Text strong style={{ fontSize: 12 }}>条件类型</Text>
        <Radio.Group
          value={conditionType}
          onChange={e => setConditionType(e.target.value)}
          style={{ marginTop: 8, display: 'flex', gap: 16 }}
        >
          <Radio value="if">
            <span>IF 条件</span>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>单条件判断</Text>
          </Radio>
          <Radio value="switch">
            <span>Switch 分支</span>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>多条件分支</Text>
          </Radio>
        </Radio.Group>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <div>
        <Text strong style={{ fontSize: 12 }}>条件配置</Text>
        <div style={{ marginTop: 12 }}>
          {conditions.map((cond, idx) => (
            <Card key={idx} size="small" style={{ marginBottom: 12, background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong style={{ fontSize: 11 }}>条件 {idx + 1}</Text>
                {idx > 0 && (
                  <Select
                    size="small"
                    value={cond.logic}
                    onChange={val => updateCondition(idx, { logic: val })}
                    style={{ width: 70 }}
                  >
                    <Select.Option value="AND">且</Select.Option>
                    <Select.Option value="OR">或</Select.Option>
                  </Select>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Select
                  size="small"
                  placeholder="字段"
                  value={cond.field}
                  onChange={val => updateCondition(idx, { field: val })}
                  style={{ width: 140 }}
                  allowClear
                >
                  {fieldSourceOptions}
                </Select>
                <Select
                  size="small"
                  value={cond.operator}
                  onChange={val => updateCondition(idx, { operator: val })}
                  style={{ width: 80 }}
                >
                  {operatorOptions.map(op => (
                    <Select.Option key={op.value} value={op.value}>{op.label}</Select.Option>
                  ))}
                </Select>
                {!['isEmpty', 'isNotEmpty'].includes(cond.operator) && (
                  <Input
                    size="small"
                    placeholder="比较值"
                    value={cond.value}
                    onChange={e => updateCondition(idx, { value: e.target.value })}
                    style={{ width: 100 }}
                  />
                )}
              </div>
            </Card>
          ))}

          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setConditions([...conditions, { field: '', operator: '==', value: '', logic: 'AND' }])}
          >
            + 添加条件
          </Button>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <div>
          <Text strong style={{ fontSize: 12 }}>默认处理（不满足任何条件时）</Text>
          <Radio.Group
            value={defaultAction.type}
            onChange={e => setDefaultAction({ ...defaultAction, type: e.target.value })}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
          >
            <Radio value="skip">
              <span>不写入此字段</span>
            </Radio>
            <Radio value="assign">
              <Space>
                <span>赋值 →</span>
                <Input size="small" placeholder="值" value={defaultAction.value} onChange={e => setDefaultAction({ ...defaultAction, value: e.target.value })} style={{ width: 100 }} disabled={defaultAction.type !== 'assign'} />
              </Space>
            </Radio>
            <Radio value="abort">
              <span>中止流程并报错</span>
            </Radio>
          </Radio.Group>
        </div>
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
  const [edges] = useState<Edge[]>([]);

  const [spiData, setSpiData] = useState<{ businessType: string; ability: string; action: string } | undefined>({
    businessType: 'DEPOSIT',
    ability: 'card',
    action: 'pay',
  });
  const [showSpiModal, setShowSpiModal] = useState(false);

  // Network drawer state
  const [showNetworkDrawer, setShowNetworkDrawer] = useState(false);

  // Condition drawer state
  const [showConditionDrawer, setShowConditionDrawer] = useState(false);

  const flowType = searchParams.get('flowType');

  const mockEndpoints = [
    { id: 'ep1', name: 'Paystack Charge', method: 'POST', url: 'https://api.paystack.co/charge' },
    { id: 'ep2', name: 'Paystack Verify', method: 'GET', url: 'https://api.paystack.co/verify/:reference' },
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
          } else if (code === 'condition') {
            setShowConditionDrawer(true);
          }
        },
        onDelete: () => setNodes(nds => nds.filter(n => n.id !== newNode.id)),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes]);

  // 根据 action 和 flowType 获取预置组件并初始化画布
  const getInitialNodes = useCallback((): Node[] => {
    const action = params.ability || '';
    const presetCodes = getPresetComponents(action, flowType || 'main');
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
            } else if (code === 'condition') {
              setShowConditionDrawer(true);
            }
          },
          onDelete: () => {},
        },
      };
    });
  }, [params.ability, flowType]);

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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Context 上下文面板 */}
        <ContextPanel
          onSpiSelect={() => setShowSpiModal(true)}
          spiData={spiData}
          endpoints={mockEndpoints}
          credentials={mockCredentials}
          globalVariables={mockGlobalVars}
          generatedFields={mockGeneratedFields}
        />

        {/* 组件面板 */}
        <ComponentLibraryPanel components={COMPONENT_LIBRARY} onAddComponent={handleAddComponent} />

        {/* 画布区域 */}
        <div
          style={{ flex: 1, background: '#fafafa' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
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
            style={{ height: '100%' }}
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
        globalVariables={mockGlobalVars}
        generatedFields={mockGeneratedFields}
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

      {/* Condition 配置抽屉 */}
      <ConditionConfigDrawer
        visible={showConditionDrawer}
        code="condition"
        name="Condition"
        onClose={() => setShowConditionDrawer(false)}
        onSave={(config) => {
          console.log('Condition config saved:', config);
          // 更新节点状态
          setNodes(nds => nds.map(n => {
            if (n.data.code === 'condition') {
              return { ...n, data: { ...n.data, isConfigured: true } };
            }
            return n;
          }));
          setShowConditionDrawer(false);
        }}
      />
    </div>
  );
}