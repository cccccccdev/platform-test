import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Select, Drawer, Form, Input, Switch, Modal, message, Typography, Divider, Collapse, Tabs, Radio } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, SaveOutlined, CloudUploadOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, WarningOutlined, CopyOutlined, SearchOutlined } from '@ant-design/icons';
import { useScenarioStore, useActionStore } from '../../store';
import type { ScenarioVersion, L3NodeConfig } from '../../store';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, useReactFlow, Handle, Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import L2StepWizardDrawer from './components/L2StepWizardDrawer';
import { L3_COMPONENT_MAP, L3_STEP_CONFIGS } from './components/l3-steps';
import { FieldConverterDrawer, ConditionRouterDrawer, StateWriterDrawer, MqDispatcherDrawer } from './components/l3-steps';
import type { StepStatus } from './components/L2StepWizardDrawer';

const { Text, Title } = Typography;

// SPI 选择弹窗
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

// L3 Components 面板组件（可收起展开的组件库）
function L3ComponentsPanel({
  l3Composites,
  onAddL3,
}: {
  l3Composites: { code: string; name: string; type: string }[];
  onAddL3: (l3Code: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 过滤组件
  const filteredComposites = l3Composites.filter(l3 =>
    l3.name.toLowerCase().includes(searchText.toLowerCase()) ||
    l3.code.toLowerCase().includes(searchText.toLowerCase())
  );

  // 分组
  const platformComposites = filteredComposites.filter(l3 => l3.type === 'Platform');
  const customComposites = filteredComposites.filter(l3 => l3.type === 'Custom');

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, l3Code: string) => {
    e.dataTransfer.setData('application/reactflow', l3Code);
    e.dataTransfer.effectAllowed = 'move';
  };

  if (!isExpanded) {
    // 收起状态：显示竖向 Tab
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
        <span>L3 Components</span>
        <span style={{ fontSize: 14 }}>→</span>
      </div>
    );
  }

  // 展开状态
  return (
    <div style={{
      width: 280,
      height: '100%',
      background: '#fff',
      borderRight: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>L3 Components</span>
        <Button type="text" size="small" onClick={() => setIsExpanded(false)}>← 收起</Button>
      </div>

      {/* 搜索框 */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="搜索 L3 组件..."
          prefix={<span style={{ color: '#999', fontSize: 12 }}>🔍</span>}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </div>

      {/* 拖拽提示 */}
      <div style={{ padding: '4px 12px', background: '#e6f7ff', fontSize: 10, color: '#1890ff', textAlign: 'center' }}>
        拖拽组件到画布中添加
      </div>

      {/* 组件列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {/* Platform 组 */}
        {platformComposites.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 500 }}>Platform</div>
            {platformComposites.map(l3 => (
              <div
                key={l3.code}
                draggable
                onDragStart={(e) => handleDragStart(e, l3.code)}
                onClick={() => onAddL3(l3.code)}
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
                <div style={{ fontWeight: 500 }}>{l3.name}</div>
                <div style={{ color: '#888', fontSize: 10 }}>{l3.code}</div>
              </div>
            ))}
          </div>
        )}

        {/* Custom 组 */}
        {customComposites.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 500 }}>Custom</div>
            {customComposites.map(l3 => (
              <div
                key={l3.code}
                draggable
                onDragStart={(e) => handleDragStart(e, l3.code)}
                onClick={() => onAddL3(l3.code)}
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
                  e.currentTarget.style.borderColor = '#52c41a';
                  e.currentTarget.style.background = '#fafff0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e8e8e8';
                  e.currentTarget.style.background = '#fff';
                }}
              >
                <div style={{ fontWeight: 500 }}>{l3.name}</div>
                <div style={{ color: '#888', fontSize: 10 }}>{l3.code}</div>
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

// 画布中的L3节点组件
function L3FlowNode({ data }: { id: string; data: any }) {
  const isConfigured = data.isConfigured;
  const l3Name = data.l3Name;
  const l2Combination = data.l2Combination || [];
  const l2Atomics = data.l2Atomics || [];
  const l3Config = data.l3Config;

  const isL2Configured = (l2Code: string) => {
    if (isConfigured) return true;
    return !!l3Config?.l2Dependencies?.[l2Code];
  };

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
    >
      <Handle type="target" position={Position.Top} style={{ background: '#1890ff' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: isConfigured ? '#52c41a' : '#999' }}>{isConfigured ? '●' : '○'}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{l3Name}</span>
        {isConfigured && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />}
        {isHovered && (
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
      <div style={{ paddingLeft: 16 }}>
        {l2Combination.map((l2Code: string) => {
          const l2Info = l2Atomics.find((l2: any) => l2.code === l2Code);
          const configured = isL2Configured(l2Code);
          return (
            <div key={l2Code} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '1px 0', fontSize: 10, color: configured ? '#52c41a' : '#999' }}>
              <span>{configured ? '✓' : '□'}</span>
              <span style={{ fontWeight: configured ? 500 : 400 }}>{l2Code}</span>
              {l2Info && <span style={{ color: '#888' }}>{l2Info.name}</span>}
            </div>
          );
        })}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#1890ff' }} />

      {/* 右键菜单 */}
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

const nodeTypes = { l3Node: L3FlowNode };

// Context面板组件
function ContextPanel({
  onSpiSelect,
  onSpiDelete,
  endpoints,
  credentials,
  globalVariables,
  generatedFields,
  countries,
  parties,
  lines,
  spiData,
}: {
  onSpiSelect: () => void;
  onSpiDelete: () => void;
  endpoints: any[];
  credentials: any[];
  globalVariables: any[];
  generatedFields: any[];
  countries: any[];
  parties: any[];
  lines: any[];
  spiData?: { businessType: string; ability: string; action: string };
}) {
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);

  // SPI 样例数据（平台内置）
  const spiSampleData = spiData ? {
    title: `${spiData.businessType} × ${spiData.ability} × ${spiData.action}`,
    request: {
      fields: [
        { name: 'amount', type: 'Number', required: true, example: 10000, description: '交易金额（最小单位，如分）' },
        { name: 'currency', type: 'String', required: true, example: 'NGN', description: 'ISO 4217 货币代码' },
        { name: 'reference', type: 'String', required: true, example: 'TXN_20240115_ABC123', description: '商户侧唯一交易参考号' },
        { name: 'accountNumber', type: 'String', required: true, example: '1234567890', description: '目标账户号码' },
        { name: 'bankCode', type: 'String', required: true, example: '044', description: '银行代码（Nigeria 3位数字）' },
        { name: 'email', type: 'String', required: false, example: 'user@example.com', description: '用户邮箱（选填）' },
        { name: 'phoneNumber', type: 'String', required: false, example: '+2348012345678', description: '用户手机号（选填）' },
        { name: 'narration', type: 'String', required: false, example: 'Payment for order #12345', description: '交易备注（选填）' },
      ],
      example: {
        amount: 10000,
        currency: 'NGN',
        reference: 'TXN_20240115_ABC123',
        accountNumber: '1234567890',
        bankCode: '044',
        email: 'user@example.com',
        narration: 'Payment for order #12345',
      }
    },
    response: {
      SUCCESS: {
        fields: [
          { name: 'status', type: 'String', example: 'SUCCESS', description: '交易状态' },
          { name: 'reference', type: 'String', example: 'TXN_20240115_ABC123', description: '交易参考号' },
          { name: 'providerReference', type: 'String', example: 'PSK_987654321', description: '渠道侧参考号' },
          { name: 'amount', type: 'Number', example: 10000, description: '交易金额' },
          { name: 'currency', type: 'String', example: 'NGN', description: '货币代码' },
          { name: 'message', type: 'String', example: 'Transaction successful', description: '响应描述' },
        ],
        example: {
          status: 'SUCCESS',
          reference: 'TXN_20240115_ABC123',
          providerReference: 'PSK_987654321',
          amount: 10000,
          currency: 'NGN',
          message: 'Transaction successful',
        }
      },
      FAIL: {
        fields: [
          { name: 'status', type: 'String', example: 'FAIL', description: '交易状态' },
          { name: 'reference', type: 'String', example: 'TXN_20240115_ABC123', description: '交易参考号' },
          { name: 'errorCode', type: 'String', example: 'INSUFFICIENT_FUNDS', description: '错误码' },
          { name: 'errorMessage', type: 'String', example: 'Account has insufficient funds', description: '错误描述' },
        ],
        example: {
          status: 'FAIL',
          reference: 'TXN_20240115_ABC123',
          errorCode: 'INSUFFICIENT_FUNDS',
          errorMessage: 'Account has insufficient funds',
        }
      },
      PENDING: {
        fields: [
          { name: 'status', type: 'String', example: 'PENDING', description: '交易状态' },
          { name: 'reference', type: 'String', example: 'TXN_20240115_ABC123', description: '交易参考号' },
          { name: 'providerReference', type: 'String', example: 'PSK_111222333', description: '渠道侧参考号' },
          { name: 'message', type: 'String', example: 'Transaction is being processed', description: '响应描述' },
        ],
        example: {
          status: 'PENDING',
          reference: 'TXN_20240115_ABC123',
          providerReference: 'PSK_111222333',
          message: 'Transaction is being processed',
        }
      },
    }
  } : null;

  // 模拟 SPI 字段数据
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

  // 空状态显示
  const renderEmptyState = (message: string, hint: string) => (
    <div style={{ padding: '8px', background: '#fafafa', borderRadius: 6, fontSize: 11 }}>
      <div style={{ color: '#999', marginBottom: 4 }}>{message}</div>
      <div style={{ color: '#bbb', fontSize: 10 }}>{hint}</div>
    </div>
  );

  return (
    <div style={{ width: 240, borderRight: '1px solid #f0f0f0', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 14 }}>
        Context
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <Collapse defaultActiveKey={['spi', 'endpoint', 'generatedFields', 'globalVar']} ghost>
          {/* SPI 模块 - 唯一保留 + 按钮的模块 */}
          <Collapse.Panel
            key="spi"
            header={<Space><span>🔵</span><span>SPI</span></Space>}
            extra={<Button type="text" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); onSpiSelect(); }} />}
          >
            {!spiData ? (
              <Text type="secondary" style={{ fontSize: 11 }}>暂无内容，点击 + 添加</Text>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Tag color="blue">{spiData.businessType} × {spiData.ability} × {spiData.action}</Tag>
                  <Space size={4}>
                    <Button type="text" size="small" onClick={() => setIsSampleModalOpen(true)}>样例</Button>
                    <Button type="text" size="small" icon={<DeleteOutlined />} onClick={onSpiDelete} danger />
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
            )}
          </Collapse.Panel>

          {/* Generated Fields 模块 - 只读回显 */}
          <Collapse.Panel
            key="generatedFields"
            header={<Space><span>🟢</span><span>Generated Fields</span></Space>}
          >
            {generatedFields.length === 0 ? (
              renderEmptyState('暂无 Generated Fields', '请在 L3-11 Scene Initializer 的 L2-B 中配置')
            ) : (
              <table style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={{ padding: '2px 4px', textAlign: 'left' }}>字段名</th>
                    <th style={{ padding: '2px 4px', textAlign: 'left' }}>生成类型</th>
                    <th style={{ padding: '2px 4px', textAlign: 'left' }}>格式参数</th>
                    <th style={{ padding: '2px 4px', textAlign: 'center', width: 30 }}>引用</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedFields.map((g: any, idx: number) => {
                    // 获取格式参数的展示文本
                    const getFormatText = (genType: string, config: any) => {
                      switch (genType) {
                        case 'timestamp':
                          return config?.timestampFormat || 'Unix秒';
                        case 'uuid': {
                          const caseText = config?.lowercase ? '小写' : '大写';
                          const hyphenText = config?.noHyphen ? '无连字符' : '有连字符';
                          return `${caseText} ${hyphenText}`;
                        }
                        case 'date':
                          return config?.dateFormat || 'YYYYMMDD';
                        case 'hash':
                          return config?.algorithm || 'SHA256';
                        case 'sequence':
                          return `${config?.prefix || ''}${config?.length || 10}位`;
                        case 'envVariable':
                          return config?.variableName || '环境变量';
                        default:
                          return '-';
                      }
                    };

                    return (
                      <tr key={idx}>
                        <td style={{ padding: '2px 4px' }}>
                          <Tag color="green" style={{ fontSize: 10 }}>{g.name}</Tag>
                        </td>
                        <td style={{ padding: '2px 4px', color: '#666' }}>
                          {g.generationType === 'timestamp' ? 'Timestamp' :
                           g.generationType === 'uuid' ? 'UUID' :
                           g.generationType === 'date' ? 'Date' :
                           g.generationType === 'hash' ? 'Hash' :
                           g.generationType === 'sequence' ? 'Sequence' :
                           g.generationType === 'envVariable' ? 'Env Variable' :
                           g.generationType || '-'}
                        </td>
                        <td style={{ padding: '2px 4px', color: '#888', fontSize: 10 }}>
                          {getFormatText(g.generationType, g)}
                        </td>
                        <td style={{ padding: '2px 4px', textAlign: 'center', color: '#1890ff' }}>
                          {g.refCount || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Collapse.Panel>

          {/* Global Variable 模块 - 只读回显 */}
          <Collapse.Panel
            key="globalVar"
            header={<Space><span>📝</span><span>Global Variable</span></Space>}
          >
            {globalVariables.length === 0 ? (
              renderEmptyState('暂无 Global Variable', '请在 L3-11 Scene Initializer 的 L2-A 中配置')
            ) : (
              globalVariables.map((g: any, idx: number) => (
                <div key={idx} style={{ padding: '2px 0', fontSize: 11 }}>
                  <Tag color="yellow">{g.name}</Tag>
                  <span style={{ color: '#666' }}>= {g.value}</span>
                </div>
              ))
            )}
          </Collapse.Panel>

          {/* Endpoint 模块 - 只读回显 */}
          <Collapse.Panel
            key="endpoint"
            header={<Space><span>🌐</span><span>Endpoint</span></Space>}
          >
            {endpoints.length === 0 ? (
              renderEmptyState('暂无 Endpoint', '请在 HTTP Request 节点的 L2-02 中配置接口')
            ) : (
              endpoints.map(ep => (
                <div key={ep.id} style={{ padding: '4px 0', fontSize: 11 }}>
                  <div style={{ fontWeight: 500 }}>{ep.name}</div>
                  <div style={{ color: '#888' }}>{ep.method} {ep.url}</div>
                </div>
              ))
            )}
          </Collapse.Panel>

          {/* Credential 模块 - 只读回显 */}
          <Collapse.Panel
            key="credential"
            header={<Space><span>🔐</span><span>Credential</span></Space>}
          >
            {credentials.length === 0 ? (
              renderEmptyState('暂无 Credential', '请在 Auth/Signature 节点中配置密钥字段')
            ) : (
              credentials.map((c: any, idx: number) => (
                <div key={idx} style={{ padding: '2px 0', fontSize: 11 }}>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  <div style={{ color: '#888' }}>{c.type} ••••••••</div>
                </div>
              ))
            )}
          </Collapse.Panel>

          {/* Country 模块 - 只读回显 */}
          <Collapse.Panel
            key="country"
            header={<Space><span>🌍</span><span>Country</span></Space>}
          >
            {countries.length === 0 ? (
              renderEmptyState('暂无 Country', '请在 Generate Data 节点中配置国家信息')
            ) : (
              countries.map((c: any, idx: number) => (
                <div key={idx} style={{ padding: '2px 0', fontSize: 11 }}>
                  <Tag color="green">{c.code}</Tag> {c.name}
                </div>
              ))
            )}
          </Collapse.Panel>

          {/* Party 模块 - 只读回显 */}
          <Collapse.Panel
            key="party"
            header={<Space><span>🏢</span><span>Party</span></Space>}
          >
            {parties.length === 0 ? (
              renderEmptyState('暂无 Party', '请在 Internal Call 节点中配置主体信息')
            ) : (
              parties.map((p: any, idx: number) => (
                <div key={idx} style={{ padding: '2px 0', fontSize: 11 }}>
                  <Tag color="purple">{p.code}</Tag> {p.name}
                </div>
              ))
            )}
          </Collapse.Panel>

          {/* Line 模块 - 只读回显 */}
          <Collapse.Panel
            key="line"
            header={<Space><span>📊</span><span>Line</span></Space>}
          >
            {lines.length === 0 ? (
              renderEmptyState('暂无 Line', '请在 Requery 节点中配置线路策略')
            ) : (
              lines.map((l: any, idx: number) => (
                <div key={idx} style={{ padding: '2px 0', fontSize: 11 }}>
                  <Tag color="orange">{l.name}</Tag>
                </div>
              ))
            )}
          </Collapse.Panel>
        </Collapse>
      </div>

      {/* SPI 报文样例弹窗 */}
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
                        {
                          key: 'PENDING',
                          label: <Tag color="orange">PENDING</Tag>,
                          children: (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <Button size="small" icon={<CopyOutlined />} onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(spiSampleData.response.PENDING.example, null, 2));
                                }}>复制</Button>
                              </div>
                              <pre style={{ background: '#fff7e6', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
{JSON.stringify(spiSampleData.response.PENDING.example, null, 2)}
                              </pre>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'fields',
                label: '字段说明',
                children: (
                  <div>
                    <Text strong style={{ fontSize: 12 }}>Request 字段</Text>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8, marginBottom: 16 }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>字段名</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>类型</th>
                          <th style={{ padding: '4px 8px', textAlign: 'center' }}>必填</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>格式/枚举</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spiSampleData.request.fields.map((f, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px 8px' }}><Text code>{f.name}</Text></td>
                            <td style={{ padding: '4px 8px' }}>{f.type}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{f.required ? '✓' : '选填'}</td>
                            <td style={{ padding: '4px 8px' }}><Text type="secondary">{String(f.example)}</Text></td>
                            <td style={{ padding: '4px 8px' }}>{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <Text strong style={{ fontSize: 12 }}>Response 字段（SUCCESS）</Text>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>字段名</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>类型</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>示例值</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spiSampleData.response.SUCCESS.fields.map((f, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px 8px' }}><Text code>{f.name}</Text></td>
                            <td style={{ padding: '4px 8px' }}>{f.type}</td>
                            <td style={{ padding: '4px 8px' }}><Text type="secondary">{String(f.example)}</Text></td>
                            <td style={{ padding: '4px 8px' }}>{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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


// 步进向导抽屉包装器
function StepWizardDrawerWrapper({
  visible,
  l3Code,
  onClose,
  onSave,
  initialConfig,
}: {
  visible: boolean;
  l3Code: string;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig: any;
}) {
  const [form] = Form.useForm();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStatuses] = useState<StepStatus[]>([]);

  const config = L3_STEP_CONFIGS[l3Code];
  const L3StepComponent = L3_COMPONENT_MAP[l3Code];

  const steps = config?.steps || [];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handleStepEnableChange = (index: number, enabled: boolean) => {
    // Handle enable/disable of optional steps
    console.log('Step enable change:', index, enabled);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleDone = () => {
    const values = form.getFieldsValue();
    onSave({ ...initialConfig, ...values });
    onClose();
  };

  if (!config || !L3StepComponent) {
    return null;
  }

  return (
    <L2StepWizardDrawer
      visible={visible}
      l3Name={config.l3Name}
      steps={steps}
      currentStepIndex={currentStepIndex}
      stepStatuses={stepStatuses}
      drawerWidth={steps[currentStepIndex]?.width || 480}
      onClose={onClose}
      onStepChange={handleStepChange}
      onStepEnableChange={handleStepEnableChange}
      onBack={handleBack}
      onNext={handleNext}
      onDone={handleDone}
      isLastStep={isLastStep}
      onBreadcrumbClick={(index) => {
        if (index === 0) {
          // Return to parent if nested
        }
      }}
    >
      <L3StepComponent
        currentStepIndex={currentStepIndex}
        form={form}
      />
    </L2StepWizardDrawer>
  );
}

// @ts-expect-error: kept for backwards compatibility, L3-01 now uses StepWizardDrawerWrapper
// L2-02 RequestBuilder 配置抽屉 (Apifox 风格)
function RequestBuilderDrawer({
  visible,
  l3Name,
  config,
  globalVariables,
  generatedFields,
  sceneId,
  onClose,
  onSave,
}: {
  visible: boolean;
  l3Name: string;
  config: any;
  globalVariables: any[];
  generatedFields: any[];
  sceneId: string;
  onClose: () => void;
  onSave: (config: any) => void;
}) {
  const [activeTab, setActiveTab] = useState('params');
  const [previewMode, setPreviewMode] = useState<'structure' | 'example'>('structure');
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const [jsonSampleInput, setJsonSampleInput] = useState('');

  // Debug Session Import State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [importedSession, setImportedSession] = useState<{
    id: string;
    name: string;
    timestamp: string;
    method: string;
    url: string;
    headers: { key: string; value: string }[];
    body: string;
    responseBody: string;
  } | null>(null);

  // Load history sessions from localStorage
  const loadHistorySessions = () => {
    const storageKey = 'apiDebug_history_' + (sceneId || 'default');
    console.log('[Debug] loadHistorySessions called, sceneId:', sceneId, 'storageKey:', storageKey);
    try {
      const saved = localStorage.getItem(storageKey);
      console.log('[Debug] localStorage saved data:', saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[Debug] parsed length:', parsed.length);
        // Only return if we have actual sessions stored
        if (parsed.length > 0) return parsed;
      }
    } catch (e) { console.log('[Debug] localStorage parse error:', e); }

    // Mock data for testing "从 Debug 记录导入" feature
    console.log('[Debug] Returning mock sessions');
    const mockSessions = [
      {
        id: 'mock_1',
        name: 'charge 成功场景',
        method: 'POST',
        url: 'https://api.paystack.co/charge',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer sk_live_xxxx' },
        ],
        body: JSON.stringify({
          amount: 10000,
          currency: 'NGN',
          reference: 'REF123456',
          merchantId: 'MERCHANT001',
          email: 'user@example.com',
        }),
        responseBody: JSON.stringify({
          status: true,
          message: 'Charge attempted',
          data: {
            status: 'success',
            reference: 'PS_123456',
            id: 'ch_abcdef123456',
            amount: 10000,
            currency: 'NGN',
          },
        }),
        status: 200,
        statusText: 'OK',
        duration: 324,
        timestamp: '2026-04-17 14:30',
        isSaved: false,
      },
      {
        id: 'mock_2',
        name: 'verify 查单',
        method: 'GET',
        url: 'https://api.paystack.co/verify/REF123456',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer sk_live_xxxx' },
        ],
        body: '',
        responseBody: JSON.stringify({
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            reference: 'PS_123456',
            amount: 10000,
            currency: 'NGN',
          },
        }),
        status: 200,
        statusText: 'OK',
        duration: 156,
        timestamp: '2026-04-17 14:10',
        isSaved: false,
      },
      {
        id: 'mock_3',
        name: 'refund 退款',
        method: 'POST',
        url: 'https://api.paystack.co/refund',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer sk_live_xxxx' },
        ],
        body: JSON.stringify({
          transaction: 'ch_abcdef123456',
          amount: 5000,
          currency: 'NGN',
        }),
        responseBody: JSON.stringify({
          status: true,
          message: 'Refund processed',
          data: {
            status: 'processed',
            id: 'rf_xyz789',
            amount: 5000,
          },
        }),
        status: 200,
        statusText: 'OK',
        duration: 512,
        timestamp: '2026-04-17 13:45',
        isSaved: false,
      },
    ];

    return mockSessions;
  };

  // Filter only 2xx sessions for import
  const getImportableSessions = () => {
    const sessions = loadHistorySessions();
    return sessions.filter((s: any) => s.status >= 200 && s.status < 300);
  };

  // Import session and fill config
  const handleImportSession = (session: any) => {
    // Parse URL - just use session.url directly
    const method = session.method || 'POST';

    // Parse body to extract fields
    let bodyFields: any[] = [];
    let responseFields: any[] = [];
    try {
      if (session.body) {
        const parsedBody = JSON.parse(session.body);
        bodyFields = extractFieldsFromObject(parsedBody);
      }
    } catch {}
    try {
      if (session.responseBody) {
        const parsedResponse = JSON.parse(session.responseBody);
        responseFields = extractFieldsFromObject(parsedResponse);
      }
    } catch {}

    // Check which fields can auto-match with globalVar or generatedFields
    const globalVarNames = globalVariables.map((v: any) => v.name);
    const generatedFieldNames = generatedFields.map((f: any) => f.name);
    const autoMatchFields = [...globalVarNames, ...generatedFieldNames];

    // Build new config
    const newConfig = {
      ...config,
      apiName: session.name || '未命名接口',
      method: method,
      url: session.url || '',
      bodyFormat: 'JSON',
      params: [] as any[],
      pathParams: [] as any[],
      bodyFields: bodyFields.map((f: any) => ({
        name: f.name,
        type: f.type,
        source: autoMatchFields.includes(f.name) ? (globalVarNames.includes(f.name) ? `globalVar.${f.name}` : `generatedFields.${f.name}`) : '',
        required: false,
        description: '',
      })),
      headers: session.headers.map((h: any) => ({
        name: h.key,
        value: h.value,
        source: '',
        description: '',
      })),
      auth: { type: 'None', config: {} },
      signature: { enabled: false, algorithm: 'HMAC-SHA256', fields: [], secretSource: '', writeTo: 'header', headerName: '' },
      responses: [{
        code: '200',
        name: '成功',
        format: 'JSON',
        fields: responseFields.map((f: any) => ({
          name: f.name,
          type: f.type,
          target: `channelResponse.${f.name}`,
          description: '',
        })),
      }],
    };

    // Update config
    setLocalConfig((prev: LocalConfigType) => ({ ...prev, ...newConfig }));
    setImportedSession({
      id: session.id,
      name: session.name || '未命名',
      timestamp: session.timestamp,
      method: session.method,
      url: session.url,
      headers: session.headers,
      body: session.body,
      responseBody: session.responseBody || '',
    });
    setIsSessionModalOpen(false);

    // Count unmapped fields
    const unmappedBodyFields = newConfig.bodyFields.filter((f: any) => !f.source).length;
    const unmappedResponseFields = newConfig.responses[0]?.fields.filter((f: any) => !f.target).length || 0;

    if (unmappedBodyFields > 0 || unmappedResponseFields > 0) {
      message.info(`已从 Debug Session「${session.name}」导入配置，以下内容需要你补全：${unmappedBodyFields > 0 ? `· Body Tab：${unmappedBodyFields} 个字段来源映射待配置` : ''}${unmappedBodyFields > 0 && unmappedResponseFields > 0 ? '；' : ''}${unmappedResponseFields > 0 ? `· 返回响应 Tab：${unmappedResponseFields} 个字段写入目标待配置` : ''}`);
    } else {
      message.success(`已从 Debug Session「${session.name}」导入配置`);
    }
  };

  // Extract fields from object for field mapping
  const extractFieldsFromObject = (obj: any, prefix = ''): { name: string; type: string }[] => {
    const fields: { name: string; type: string }[] = [];
    if (typeof obj !== 'object' || obj === null) return fields;
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const fieldName = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        fields.push(...extractFieldsFromObject(value, fieldName));
      } else if (Array.isArray(value)) {
        fields.push({ name: fieldName, type: 'Array' });
      } else {
        const type = typeof value === 'number' ? 'Number' : typeof value === 'boolean' ? 'Boolean' : 'String';
        fields.push({ name: fieldName, type });
      }
    }
    return fields;
  };

  type LocalConfigType = {
    apiName: string;
    method: string;
    url: string;
    bodyFormat: string;
    params: { name: string; type: string; source: string; description: string }[];
    pathParams: { name: string; type: string; source: string }[];
    bodyFields: { name: string; type: string; source: string; required: boolean; description: string; exampleValue?: string }[];
    headers: { name: string; value: string; source: string; description: string }[];
    auth: { type: string; config: any };
    signature: { enabled: boolean; algorithm: string; fields: string[]; secretSource: string; writeTo: string; headerName: string };
    responses: { code: string; name: string; format: string; fields: { name: string; type: string; target: string; description: string }[] }[];
  };
  const [localConfig, setLocalConfig] = useState<LocalConfigType>({
    apiName: '',
    method: 'POST',
    url: '',
    bodyFormat: 'JSON',
    params: [],
    pathParams: [],
    bodyFields: [],
    headers: [],
    auth: { type: 'None', config: {} },
    signature: { enabled: false, algorithm: 'HMAC-SHA256', fields: [], secretSource: '', writeTo: 'header', headerName: '' },
    responses: [],
    ...config,
  });

  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      setLocalConfig((prev: LocalConfigType) => ({ ...prev, ...config }));
    }
  }, [config]);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const updateConfig = (updates: Partial<LocalConfigType>) => {
    setLocalConfig((prev: LocalConfigType) => ({ ...prev, ...updates }));
  };

  // 从 JSON 样本生成 bodyFields
  const generateFieldsFromJson = () => {
    if (!jsonSampleInput.trim()) return;
    try {
      const parsed = JSON.parse(jsonSampleInput);
      const newBodyFields: typeof localConfig.bodyFields = [];
      const traverse = (obj: any, prefix = '') => {
        if (typeof obj !== 'object' || obj === null) {
          const fieldName = prefix || 'root';
          const type = typeof obj === 'number' ? 'Number' : typeof obj === 'boolean' ? 'Boolean' : 'String';
          newBodyFields.push({
            name: fieldName,
            type,
            source: `{${fieldName}}`,
            required: false,
            description: '',
            exampleValue: String(obj),
          });
        } else {
          Object.keys(obj).forEach(key => {
            traverse(obj[key], prefix ? `${prefix}.${key}` : key);
          });
        }
      };
      traverse(parsed);
      updateConfig({ bodyFields: newBodyFields });
      setJsonSampleInput('');
      message.success(`已生成 ${newBodyFields.length} 个字段`);
    } catch (e) {
      message.error('JSON 格式错误，请检查格式');
    }
  };

  // 从 URL 中自动解析 Path 参数
  const pathParamNames = localConfig.url.match(/:(\w+)/g)?.map(p => p.slice(1)) || [];

  const contextNamespaces = [
    { category: 'spi.request', fields: ['amount', 'currency', 'reference', 'accountNumber', 'bankCode', 'email'] },
    { category: 'spi.response', fields: ['status', 'reference', 'message'] },
    { category: 'channelResponse', fields: ['data', 'status', 'message', 'ref', 'id'] },
    { category: 'orderVar', fields: ['orderId', 'orderStatus', 'rrn', 'amount', 'currency'] },
    { category: 'globalVar', fields: globalVariables.map((v: any) => v.name) },
    { category: 'generatedFields', fields: generatedFields.map((f: any) => f.name) },
    { category: 'credential', fields: ['apiKey', 'secretKey', 'password', 'token'] },
  ];

  const renderFieldSelector = (value: string, onChange: (val: string) => void) => (
    <Select
      value={value}
      onChange={onChange}
      placeholder="选择字段"
      style={{ width: 180 }}
      allowClear
    >
      {contextNamespaces.map(ns => (
        <Select.OptGroup key={ns.category} label={`🔵 ${ns.category}`}>
          {ns.fields.map(f => (
            <Select.Option key={`${ns.category}.${f}`} value={`${ns.category}.${f}`}>
              {f}
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </Select>
  );

  const tabs = [
    { key: 'params', label: 'Params' },
    { key: 'body', label: 'Body' },
    { key: 'headers', label: 'Headers' },
    { key: 'auth', label: 'Auth' },
    { key: 'signature', label: '签名配置' },
    { key: 'response', label: '返回响应' },
  ];

  const renderParamsTab = () => (
    <div>
      <Divider style={{ marginTop: 0 }}>Query 参数</Divider>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>参数名</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>类型</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>来源映射</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>说明</th>
            <th style={{ padding: '8px 4px', width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {localConfig.params.map((p, idx) => (
            <tr key={idx}>
              <td style={{ padding: '4px' }}><Input size="small" value={p.name} onChange={e => {
                const newParams = [...localConfig.params];
                newParams[idx].name = e.target.value;
                updateConfig({ params: newParams });
              }} /></td>
              <td style={{ padding: '4px' }}>
                <Select size="small" value={p.type} onChange={val => {
                  const newParams = [...localConfig.params];
                  newParams[idx].type = val;
                  updateConfig({ params: newParams });
                }} style={{ width: 80 }}>
                  <Select.Option value="String">String</Select.Option>
                  <Select.Option value="Number">Number</Select.Option>
                  <Select.Option value="Boolean">Boolean</Select.Option>
                </Select>
              </td>
              <td style={{ padding: '4px' }}>{renderFieldSelector(p.source, val => {
                const newParams = [...localConfig.params];
                newParams[idx].source = val;
                updateConfig({ params: newParams });
              })}</td>
              <td style={{ padding: '4px' }}><Input size="small" value={p.description} onChange={e => {
                const newParams = [...localConfig.params];
                newParams[idx].description = e.target.value;
                updateConfig({ params: newParams });
              }} /></td>
              <td style={{ padding: '4px' }}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                  updateConfig({ params: localConfig.params.filter((_, i) => i !== idx) });
                }} />
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} style={{ padding: '4px' }}>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
                updateConfig({ params: [...localConfig.params, { name: '', type: 'String', source: '', description: '' }] });
              }}>+ 添加 Query 参数</Button>
            </td>
          </tr>
        </tbody>
      </table>

      {pathParamNames.length > 0 && (
        <>
          <Divider>Path 参数（自动解析）</Divider>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>参数名</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>类型</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>来源映射</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>说明</th>
              </tr>
            </thead>
            <tbody>
              {pathParamNames.map((pName) => {
                const existing = localConfig.pathParams.find(p => p.name === pName);
                return (
                  <tr key={pName}>
                    <td style={{ padding: '4px' }}><Tag color="orange">{pName}</Tag></td>
                    <td style={{ padding: '4px' }}>
                      <Select size="small" value={existing?.type || 'String'} onChange={val => {
                        const newPathParams = [...localConfig.pathParams];
                        const existIdx = newPathParams.findIndex(p => p.name === pName);
                        if (existIdx >= 0) {
                          newPathParams[existIdx].type = val;
                        } else {
                          newPathParams.push({ name: pName, type: val, source: '' });
                        }
                        updateConfig({ pathParams: newPathParams });
                      }} style={{ width: 80 }}>
                        <Select.Option value="String">String</Select.Option>
                        <Select.Option value="Number">Number</Select.Option>
                      </Select>
                    </td>
                    <td style={{ padding: '4px' }}>{renderFieldSelector(existing?.source || '', val => {
                      const newPathParams = [...localConfig.pathParams];
                      const existIdx = newPathParams.findIndex(p => p.name === pName);
                      if (existIdx >= 0) {
                        newPathParams[existIdx].source = val;
                      } else {
                        newPathParams.push({ name: pName, type: 'String', source: val });
                      }
                      updateConfig({ pathParams: newPathParams });
                    })}</td>
                    <td style={{ padding: '4px' }}><Input size="small" placeholder="可选说明" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );

  const renderBodyTab = () => (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: '#666' }}>格式: {localConfig.bodyFormat}</span>
      </Space>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>字段名</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>类型</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>来源映射</th>
            <th style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', width: 60 }}>必填</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>说明</th>
            <th style={{ padding: '8px 4px', width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {localConfig.bodyFields.map((f, idx) => (
            <tr key={idx}>
              <td style={{ padding: '4px' }}><Input size="small" value={f.name} onChange={e => {
                const newFields = [...localConfig.bodyFields];
                newFields[idx].name = e.target.value;
                updateConfig({ bodyFields: newFields });
              }} /></td>
              <td style={{ padding: '4px' }}>
                <Select size="small" value={f.type} onChange={val => {
                  const newFields = [...localConfig.bodyFields];
                  newFields[idx].type = val;
                  updateConfig({ bodyFields: newFields });
                }} style={{ width: 80 }}>
                  <Select.Option value="String">String</Select.Option>
                  <Select.Option value="Number">Number</Select.Option>
                  <Select.Option value="Boolean">Boolean</Select.Option>
                  <Select.Option value="Object">Object</Select.Option>
                  <Select.Option value="Array">Array</Select.Option>
                </Select>
              </td>
              <td style={{ padding: '4px' }}>{renderFieldSelector(f.source, val => {
                const newFields = [...localConfig.bodyFields];
                newFields[idx].source = val;
                updateConfig({ bodyFields: newFields });
              })}</td>
              <td style={{ padding: '4px', textAlign: 'center' }}>
                <Switch size="small" checked={f.required} onChange={val => {
                  const newFields = [...localConfig.bodyFields];
                  newFields[idx].required = val;
                  updateConfig({ bodyFields: newFields });
                }} />
              </td>
              <td style={{ padding: '4px' }}><Input size="small" value={f.description} onChange={e => {
                const newFields = [...localConfig.bodyFields];
                newFields[idx].description = e.target.value;
                updateConfig({ bodyFields: newFields });
              }} /></td>
              <td style={{ padding: '4px' }}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                  updateConfig({ bodyFields: localConfig.bodyFields.filter((_, i) => i !== idx) });
                }} />
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} style={{ padding: '4px' }}>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
                updateConfig({ bodyFields: [...localConfig.bodyFields, { name: '', type: 'String', source: '', required: false, description: '' }] });
              }}>+ 添加字段</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderHeadersTab = () => (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Header 名</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>值</th>
            <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>说明</th>
            <th style={{ padding: '8px 4px', width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {localConfig.headers.map((h, idx) => (
            <tr key={idx}>
              <td style={{ padding: '4px' }}><Input size="small" value={h.name} onChange={e => {
                const newHeaders = [...localConfig.headers];
                newHeaders[idx].name = e.target.value;
                updateConfig({ headers: newHeaders });
              }} /></td>
              <td style={{ padding: '4px' }}>
                {h.source ? renderFieldSelector(h.source, val => {
                  const newHeaders = [...localConfig.headers];
                  newHeaders[idx].source = val;
                  updateConfig({ headers: newHeaders });
                }) : <Input size="small" value={h.value} onChange={e => {
                  const newHeaders = [...localConfig.headers];
                  newHeaders[idx].value = e.target.value;
                  updateConfig({ headers: newHeaders });
                }} placeholder="固定值" style={{ width: 120 }} />}
              </td>
              <td style={{ padding: '4px' }}><Input size="small" value={h.description} onChange={e => {
                const newHeaders = [...localConfig.headers];
                newHeaders[idx].description = e.target.value;
                updateConfig({ headers: newHeaders });
              }} /></td>
              <td style={{ padding: '4px' }}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                  updateConfig({ headers: localConfig.headers.filter((_, i) => i !== idx) });
                }} />
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ padding: '4px' }}>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
                updateConfig({ headers: [...localConfig.headers, { name: '', value: '', source: '', description: '' }] });
              }}>+ 添加 Header</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderAuthTab = () => (
    <div>
      <Form.Item label="认证类型">
        <Select value={localConfig.auth.type} onChange={val => {
          updateConfig({ auth: { ...localConfig.auth, type: val, config: {} } });
        }}>
          <Select.Option value="None">None</Select.Option>
          <Select.Option value="Bearer Token">Bearer Token</Select.Option>
          <Select.Option value="API Key">API Key</Select.Option>
          <Select.Option value="Basic Auth">Basic Auth</Select.Option>
          <Select.Option value="OAuth2">OAuth2</Select.Option>
        </Select>
      </Form.Item>

      {localConfig.auth.type === 'Bearer Token' && (
        <Form.Item label="Token 来源">
          {renderFieldSelector(localConfig.auth.config?.tokenSource || '', val => {
            updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, tokenSource: val } } });
          })}
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            选取后自动同步到 Context Credential 模块
          </Text>
        </Form.Item>
      )}

      {localConfig.auth.type === 'API Key' && (
        <>
          <Form.Item label="字段名">
            <Input value={localConfig.auth.config?.keyName || ''} onChange={e => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, keyName: e.target.value } } });
            }} />
          </Form.Item>
          <Form.Item label="位置">
            <Select value={localConfig.auth.config?.location || 'header'} onChange={val => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, location: val } } });
            }}>
              <Select.Option value="header">Header</Select.Option>
              <Select.Option value="query">Query</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="值来源">
            {renderFieldSelector(localConfig.auth.config?.valueSource || '', val => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, valueSource: val } } });
            })}
          </Form.Item>
        </>
      )}

      {localConfig.auth.type === 'Basic Auth' && (
        <>
          <Form.Item label="Username 来源">
            {renderFieldSelector(localConfig.auth.config?.usernameSource || '', val => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, usernameSource: val } } });
            })}
          </Form.Item>
          <Form.Item label="Password 来源">
            {renderFieldSelector(localConfig.auth.config?.passwordSource || '', val => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, passwordSource: val } } });
            })}
          </Form.Item>
        </>
      )}

      {localConfig.auth.type === 'OAuth2' && (
        <>
          <Form.Item label="Token URL">
            <Input value={localConfig.auth.config?.tokenUrl || ''} onChange={e => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, tokenUrl: e.target.value } } });
            }} />
          </Form.Item>
          <Form.Item label="Client ID 来源">
            {renderFieldSelector(localConfig.auth.config?.clientIdSource || '', val => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, clientIdSource: val } } });
            })}
          </Form.Item>
          <Form.Item label="Client Secret 来源">
            {renderFieldSelector(localConfig.auth.config?.clientSecretSource || '', val => {
              updateConfig({ auth: { ...localConfig.auth, config: { ...localConfig.auth.config, clientSecretSource: val } } });
            })}
          </Form.Item>
        </>
      )}
    </div>
  );

  const renderSignatureTab = () => (
    <div>
      <Form.Item label="启用签名">
        <Switch checked={localConfig.signature.enabled} onChange={val => {
          updateConfig({ signature: { ...localConfig.signature, enabled: val } });
        }} />
      </Form.Item>

      {localConfig.signature.enabled && (
        <>
          <Form.Item label="签名算法">
            <Select value={localConfig.signature.algorithm} onChange={val => {
              updateConfig({ signature: { ...localConfig.signature, algorithm: val } });
            }}>
              <Select.Option value="HMAC-SHA256">HMAC-SHA256</Select.Option>
              <Select.Option value="HMAC-MD5">HMAC-MD5</Select.Option>
              <Select.Option value="RSA-SHA256">RSA-SHA256</Select.Option>
            </Select>
          </Form.Item>

          <Divider>签名串拼接规则（拖拽排序）</Divider>
          {localConfig.signature.fields.map((field, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Tag>{idx + 1}</Tag>
              {renderFieldSelector(field, val => {
                const newFields = [...localConfig.signature.fields];
                newFields[idx] = val;
                updateConfig({ signature: { ...localConfig.signature, fields: newFields } });
              })}
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                updateConfig({ signature: { ...localConfig.signature, fields: localConfig.signature.fields.filter((_, i) => i !== idx) } });
              }} />
            </div>
          ))}
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
            updateConfig({ signature: { ...localConfig.signature, fields: [...localConfig.signature.fields, ''] } });
          }}>+ 添加签名字段</Button>

          <Form.Item label="签名密钥来源" style={{ marginTop: 16 }}>
            {renderFieldSelector(localConfig.signature.secretSource, val => {
              updateConfig({ signature: { ...localConfig.signature, secretSource: val } });
            })}
          </Form.Item>

          <Form.Item label="签名值写入位置">
            <Radio.Group value={localConfig.signature.writeTo} onChange={e => {
              updateConfig({ signature: { ...localConfig.signature, writeTo: e.target.value } });
            }}>
              <Radio value="body">Body 字段</Radio>
              <Radio value="header">Request Header</Radio>
            </Radio.Group>
          </Form.Item>

          {localConfig.signature.writeTo === 'header' && (
            <Form.Item label="Header 名称">
              <Input value={localConfig.signature.headerName} onChange={e => {
                updateConfig({ signature: { ...localConfig.signature, headerName: e.target.value } });
              }} placeholder="如: X-Paystack-Signature" />
            </Form.Item>
          )}
        </>
      )}
    </div>
  );

  const renderResponseTab = () => (
    <div>
      <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
        updateConfig({
          responses: [...localConfig.responses, { code: '200', name: '成功', format: 'JSON', fields: [] }]
        });
      }}>+ 添加响应码</Button>

      {localConfig.responses.map((r, idx) => (
        <Card key={idx} size="small" style={{ marginTop: 12 }} title={
          <Space>
            <Input size="small" value={r.code} onChange={e => {
              const newResponses = [...localConfig.responses];
              newResponses[idx].code = e.target.value;
              updateConfig({ responses: newResponses });
            }} style={{ width: 60 }} />
            <Input size="small" value={r.name} onChange={e => {
              const newResponses = [...localConfig.responses];
              newResponses[idx].name = e.target.value;
              updateConfig({ responses: newResponses });
            }} style={{ width: 100 }} />
            <Select size="small" value={r.format} onChange={val => {
              const newResponses = [...localConfig.responses];
              newResponses[idx].format = val;
              updateConfig({ responses: newResponses });
            }} style={{ width: 80 }}>
              <Select.Option value="JSON">JSON</Select.Option>
              <Select.Option value="XML">XML</Select.Option>
            </Select>
          </Space>
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>字段名</th>
                <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>类型</th>
                <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>写入目标</th>
                <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>说明</th>
                <th style={{ padding: '4px', width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {r.fields.map((f, fIdx) => (
                <tr key={fIdx}>
                  <td style={{ padding: '2px' }}><Input size="small" value={f.name} onChange={e => {
                    const newResponses = [...localConfig.responses];
                    newResponses[idx].fields[fIdx].name = e.target.value;
                    updateConfig({ responses: newResponses });
                  }} /></td>
                  <td style={{ padding: '2px' }}>
                    <Select size="small" value={f.type} onChange={val => {
                      const newResponses = [...localConfig.responses];
                      newResponses[idx].fields[fIdx].type = val;
                      updateConfig({ responses: newResponses });
                    }} style={{ width: 70 }}>
                      <Select.Option value="String">String</Select.Option>
                      <Select.Option value="Number">Number</Select.Option>
                      <Select.Option value="Boolean">Boolean</Select.Option>
                      <Select.Option value="Object">Object</Select.Option>
                    </Select>
                  </td>
                  <td style={{ padding: '2px' }}>
                    <Select value={f.target} onChange={val => {
                      const newResponses = [...localConfig.responses];
                      newResponses[idx].fields[fIdx].target = val;
                      updateConfig({ responses: newResponses });
                    }} style={{ width: 160 }} allowClear placeholder="channelResponse">
                      <Select.OptGroup label="🔵 channelResponse">
                        {['status', 'message', 'reference', 'data'].map(f => (
                          <Select.Option key={`channelResponse.${f}`} value={`channelResponse.${f}`}>{f}</Select.Option>
                        ))}
                      </Select.OptGroup>
                      <Select.OptGroup label="🟣 spi.response">
                        {['status', 'message', 'data'].map(f => (
                          <Select.Option key={`spi.response.${f}`} value={`spi.response.${f}`}>{f}</Select.Option>
                        ))}
                      </Select.OptGroup>
                    </Select>
                  </td>
                  <td style={{ padding: '2px' }}><Input size="small" value={f.description} onChange={e => {
                    const newResponses = [...localConfig.responses];
                    newResponses[idx].fields[fIdx].description = e.target.value;
                    updateConfig({ responses: newResponses });
                  }} /></td>
                  <td style={{ padding: '2px' }}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => {
                      const newResponses = [...localConfig.responses];
                      newResponses[idx].fields = newResponses[idx].fields.filter((_, i) => i !== fIdx);
                      updateConfig({ responses: newResponses });
                    }} />
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{ padding: '2px' }}>
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => {
                    const newResponses = [...localConfig.responses];
                    newResponses[idx].fields.push({ name: '', type: 'String', target: '', description: '' });
                    updateConfig({ responses: newResponses });
                  }}>+ 添加响应字段</Button>
                </td>
              </tr>
            </tbody>
          </table>
          <Button type="link" size="small" danger onClick={() => {
            updateConfig({ responses: localConfig.responses.filter((_, i) => i !== idx) });
          }}>删除此响应码</Button>
        </Card>
      ))}
    </div>
  );

  // 生成预览文本（用于复制）
  const generatePreviewText = () => {
    const lines: string[] = [];
    lines.push(`${localConfig.method} ${localConfig.url}`);

    // Headers
    lines.push('\n--- Headers ---');
    const headersObj: Record<string, string> = {};
    localConfig.headers.forEach(h => {
      if (h.name && h.value) {
        headersObj[h.name] = previewMode === 'structure' ? `{${h.source || h.value}}` : resolveExampleValue(h.source || h.value);
      }
    });
    lines.push(JSON.stringify(headersObj, null, 2));

    // Auth
    if (localConfig.auth.type === 'Bearer') {
      lines.push(`Authorization: Bearer {${localConfig.auth.config.tokenSource || 'credential.token'}}`);
    } else if (localConfig.auth.type === 'Basic') {
      lines.push(`Authorization: Basic {${localConfig.auth.config.usernameSource || 'credential.username'}}:{${localConfig.auth.config.passwordSource || 'credential.password'}}`);
    }

    // Body
    lines.push('\n--- Body ---');
    const bodyObj: Record<string, any> = {};
    localConfig.bodyFields.forEach(f => {
      if (f.name) {
        if (previewMode === 'structure') {
          bodyObj[f.name] = `{${f.source || f.name}}`;
        } else {
          bodyObj[f.name] = resolveExampleValue(f.source || '', f.exampleValue);
        }
      }
    });
    lines.push(JSON.stringify(bodyObj, null, 2));

    return lines.join('\n');
  };

  // 解析示例值（用于预览）
  const resolveExampleValue = (source: string, exampleValue?: string): string => {
    if (!source) return '';

    // credential 永久 mask
    if (source.startsWith('credential.')) {
      return '••••••••';
    }

    // globalVar 直接取值
    if (source.startsWith('globalVar.')) {
      const varName = source.replace('globalVar.', '');
      const gv = globalVariables.find((v: any) => v.name === varName);
      return gv?.value || `{${source}}`;
    }

    // 示例值优先
    if (exampleValue) {
      return exampleValue;
    }

    return `{${source}}`;
  };

  // 渲染结构预览
  const renderStructurePreview = () => {
    return (
      <div style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: 12 }}>
        {/* Request Line */}
        <div style={{ marginBottom: 8 }}>
          <Tag color="blue">{localConfig.method}</Tag>
          <Text style={{ marginLeft: 8 }}>{localConfig.url}</Text>
        </div>

        {/* Headers */}
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 11 }}>Headers:</Text>
          <div style={{ background: '#fff', padding: 8, borderRadius: 4, marginTop: 4 }}>
            {localConfig.headers.filter(h => h.name).map((h, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <Text type="secondary">{h.name}:</Text>
                <Text code style={{ marginLeft: 8 }}>{`{${h.source || h.value}}`}</Text>
              </div>
            ))}
            {localConfig.auth.type === 'Bearer' && (
              <div>
                <Text type="secondary">Authorization:</Text>
                <Text code style={{ marginLeft: 8 }}>Bearer {`{${localConfig.auth.config.tokenSource || 'credential.token'}}`}</Text>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text strong style={{ fontSize: 11 }}>Body ({localConfig.bodyFormat}):</Text>
            <Button size="small" type="link" onClick={() => {
              // 清空现有字段，进入编辑模式
              updateConfig({ bodyFields: [] });
              setJsonSampleInput(JSON.stringify(
                localConfig.bodyFields.filter(f => f.name).reduce((acc, f) => {
                  acc[f.name] = f.exampleValue || '';
                  return acc;
                }, {} as Record<string, any>),
                null, 2
              ));
            }}>编辑 JSON</Button>
          </div>
          {localConfig.bodyFields.length === 0 ? (
            <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4, border: '1px dashed #ccc' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>粘贴 JSON 样例，自动生成字段：</Text>
              <Input.TextArea
                rows={4}
                placeholder={'{\n  "amount": 10000,\n  "currency": "NGN"\n}'}
                value={jsonSampleInput}
                onChange={(e) => setJsonSampleInput(e.target.value)}
                style={{ marginTop: 8, fontFamily: 'Monaco, Consolas, monospace', fontSize: 12 }}
              />
              <Button
                type="primary"
                size="small"
                onClick={generateFieldsFromJson}
                disabled={!jsonSampleInput.trim()}
                style={{ marginTop: 8 }}
              >
                生成字段
              </Button>
            </div>
          ) : (
            <pre style={{ background: '#fff', padding: 8, borderRadius: 4, marginTop: 4, overflow: 'auto', maxHeight: 300 }}>
{JSON.stringify(localConfig.bodyFields.filter(f => f.name).reduce((acc, f) => {
  acc[f.name] = `{${f.source || f.name}}`;
  return acc;
}, {} as Record<string, any>), null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  // 渲染示例值预览
  const renderExamplePreview = () => {
    // 需要填写示例值的字段：非 globalVar、非 credential、有 source
    const fieldsNeedExample = localConfig.bodyFields.filter(f =>
      f.name && f.source && !f.source.startsWith('globalVar.') && !f.source.startsWith('credential.')
    );

    // 更新 bodyFields 中的 exampleValue
    const updateBodyFieldExample = (idx: number, exampleValue: string) => {
      const newBodyFields = [...localConfig.bodyFields];
      newBodyFields[idx] = { ...newBodyFields[idx], exampleValue };
      updateConfig({ bodyFields: newBodyFields });
    };

    return (
      <div style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: 12 }}>
        {/* 示例值输入区 */}
        {fieldsNeedExample.length > 0 && (
          <div style={{ marginBottom: 12, padding: 8, background: '#fff7e6', borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>请填写以下示例值：</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {fieldsNeedExample.map((f, globalIdx) => {
                const actualIdx = localConfig.bodyFields.indexOf(f);
                return (
                  <div key={globalIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11 }}>{f.name}:</Text>
                    <Input
                      size="small"
                      placeholder={f.source}
                      value={f.exampleValue || ''}
                      onChange={(e) => updateBodyFieldExample(actualIdx, e.target.value)}
                      style={{ width: 120 }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Request Line */}
        <div style={{ marginBottom: 8 }}>
          <Tag color="blue">{localConfig.method}</Tag>
          <Text style={{ marginLeft: 8 }}>{localConfig.url}</Text>
        </div>

        {/* Headers */}
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 11 }}>Headers:</Text>
          <div style={{ background: '#fff', padding: 8, borderRadius: 4, marginTop: 4 }}>
            {localConfig.headers.filter(h => h.name).map((h, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <Text type="secondary">{h.name}:</Text>
                <Text style={{ marginLeft: 8 }}>{resolveExampleValue(h.source || h.value)}</Text>
              </div>
            ))}
            {localConfig.auth.type === 'Bearer' && (
              <div>
                <Text type="secondary">Authorization:</Text>
                <Text style={{ marginLeft: 8 }}>Bearer {resolveExampleValue(localConfig.auth.config.tokenSource || 'credential.token')}</Text>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div>
          <Text strong style={{ fontSize: 11 }}>Body ({localConfig.bodyFormat}):</Text>
          <pre style={{ background: '#fff', padding: 8, borderRadius: 4, marginTop: 4, overflow: 'auto', maxHeight: 300 }}>
{JSON.stringify(localConfig.bodyFields.filter(f => f.name).reduce((acc, f) => {
  acc[f.name] = resolveExampleValue(f.source || '', f.exampleValue);
  return acc;
}, {} as Record<string, any>), null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Drawer
      title={<Space><span>RequestBuilder 配置</span><Tag color="blue">{l3Name}</Tag></Space>}
      placement="right"
      width={720}
      open={visible}
      onClose={onClose}
    >
      {/* 顶部基础信息 */}
      <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <Form.Item label="接口名称" style={{ marginBottom: 12 }}>
          <Input value={localConfig.apiName} onChange={e => updateConfig({ apiName: e.target.value })} placeholder="如: paystack_charge" />
        </Form.Item>
        <Space size={16}>
          <Form.Item label="请求方法" style={{ marginBottom: 0 }}>
            <Select value={localConfig.method} onChange={val => updateConfig({ method: val })} style={{ width: 100 }}>
              <Select.Option value="GET">GET</Select.Option>
              <Select.Option value="POST">POST</Select.Option>
              <Select.Option value="PUT">PUT</Select.Option>
              <Select.Option value="PATCH">PATCH</Select.Option>
              <Select.Option value="DELETE">DELETE</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="请求地址" style={{ marginBottom: 0, flex: 1 }}>
            <Input value={localConfig.url} onChange={e => updateConfig({ url: e.target.value })} placeholder="https://api.paystack.co/charge" />
          </Form.Item>
        </Space>
        <Form.Item label="报文格式" style={{ marginTop: 12, marginBottom: 0 }}>
          <Select value={localConfig.bodyFormat} onChange={val => updateConfig({ bodyFormat: val })} style={{ width: 120 }}>
            <Select.Option value="JSON">JSON</Select.Option>
            <Select.Option value="XML">XML</Select.Option>
            <Select.Option value="Form-encoded">Form-encoded</Select.Option>
          </Select>
        </Form.Item>
      </div>

      {/* Debug Session Import Card */}
      {importedSession ? (
        /* 已导入状态卡片 */
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderLeft: '4px solid #52c41a', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size="middle">
              <span style={{ fontSize: 14 }}>📌</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>已从 Debug 导入：{importedSession.name}</span>
              <span style={{ fontSize: 12, color: '#999' }}>{importedSession.timestamp}</span>
            </Space>
            <Space size="middle">
              <Button type="link" size="small" onClick={() => setIsSessionModalOpen(true)} style={{ fontSize: 12, padding: 0, height: 'auto' }}>↺ 重新选择</Button>
            </Space>
          </div>
        </div>
      ) : (
        /* 未导入引导卡片 */
        <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderLeft: '4px solid #1890ff', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size="middle">
              <span style={{ fontSize: 14 }}>💡</span>
              <span style={{ fontSize: 13, color: '#333' }}>已在 API Debug 调通过此接口？可直接导入配置，节省重复配置时间</span>
            </Space>
            <Button type="primary" size="small" onClick={() => setIsSessionModalOpen(true)} style={{ fontSize: 12 }}>
              从 Debug 记录导入 ↗
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabs}
      />

      {/* Tab Content */}
      <div style={{ minHeight: 300 }}>
        {activeTab === 'params' && renderParamsTab()}
        {activeTab === 'body' && renderBodyTab()}
        {activeTab === 'headers' && renderHeadersTab()}
        {activeTab === 'auth' && renderAuthTab()}
        {activeTab === 'signature' && renderSignatureTab()}
        {activeTab === 'response' && renderResponseTab()}
      </div>

      {/* 请求报文预览 */}
      <Divider style={{ marginTop: 16 }}>请求报文预览</Divider>
      <div style={{ background: '#fafafa', borderRadius: 8, overflow: 'hidden' }}>
        {/* 预览工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <Space size={12}>
            <Radio.Group value={previewMode} onChange={(e) => setPreviewMode(e.target.value)} size="small">
              <Radio.Button value="structure">结构预览</Radio.Button>
              <Radio.Button value="example">示例值预览</Radio.Button>
            </Radio.Group>
          </Space>
          <Space size={8}>
            <Button size="small" onClick={() => {
              const clearedBodyFields = localConfig.bodyFields.map(f => ({ ...f, exampleValue: undefined }));
              updateConfig({ bodyFields: clearedBodyFields });
            }}>重置示例值</Button>
            <Button size="small" icon={<CopyOutlined />} onClick={() => {
              const previewText = generatePreviewText();
              navigator.clipboard.writeText(previewText);
            }}>复制</Button>
          </Space>
        </div>

        {/* 预览内容 */}
        {previewCollapsed ? (
          <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setPreviewCollapsed(false)}>
            <span style={{ transform: 'rotate(-90deg)' }}>▼</span>
            <Text type="secondary" style={{ fontSize: 12 }}>点击展开查看完整报文</Text>
          </div>
        ) : (
          <div>
            <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5' }} onClick={() => setPreviewCollapsed(true)}>
              <span>▲</span>
              <Text type="secondary" style={{ fontSize: 12 }}>收起</Text>
            </div>
            <div style={{ padding: 12 }}>
              {previewMode === 'structure' ? renderStructurePreview() : renderExamplePreview()}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 0', marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={handleSave}>Save</Button>
      </div>

      {/* Session Selector Modal */}
      <Modal
        title={<Space><span>选择 Debug Session</span></Space>}
        open={isSessionModalOpen}
        onCancel={() => setIsSessionModalOpen(false)}
        width={720}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>当前场景：{sceneId}</Text>
        </div>

        {/* Search */}
        <Input
          placeholder="搜索 Session 名称或 URL"
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          style={{ marginBottom: 16 }}
          allowClear
        />

        {/* Session List */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {getImportableSessions().length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
              <Text type="secondary">暂无可导入的 Session（仅展示 2xx 成功记录）</Text>
            </div>
          ) : (
            getImportableSessions().map((session: any) => {
              const urlMatch = session.url.match(/https?:\/\/[^/]+\/(.*)/);
              const path = urlMatch ? '/' + urlMatch[1] : session.url;
              const isSuccess = session.status >= 200 && session.status < 300;
              let requestFieldCount = 0;
              let responseFieldCount = 0;
              try {
                if (session.body) {
                  const parsed = JSON.parse(session.body);
                  requestFieldCount = Object.keys(parsed).length;
                }
              } catch {}
              try {
                if (session.responseBody) {
                  const parsed = JSON.parse(session.responseBody);
                  responseFieldCount = Object.keys(parsed).length;
                }
              } catch {}

              return (
                <div
                  key={session.id}
                  onClick={() => handleImportSession(session)}
                  style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.background = '#f6fffe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: isSuccess ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
                      {session.status} {session.statusText}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{session.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Tag style={{ fontSize: 10, padding: '0 2px', margin: 0, background: session.method === 'GET' ? '#52c41a' : session.method === 'POST' ? '#fa8c16' : '#1890ff', border: 'none', color: '#fff' }}>
                      {session.method}
                    </Tag>
                    <Text style={{ fontSize: 12, color: '#666', fontFamily: 'Monaco, Consolas, monospace' }} ellipsis>
                      {path}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Request 字段：{requestFieldCount > 0 ? session.body ? Object.keys(JSON.parse(session.body)).join(' / ') : '无' : '无'}
                    </Text>
                    {responseFieldCount > 0 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Response 字段：{Object.keys(JSON.parse(session.responseBody)).join(' / ')}
                      </Text>
                    )}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{session.timestamp}</Text>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: 16, padding: '8px 12px', background: '#fffbe6', borderRadius: 4 }}>
          <Text style={{ fontSize: 11, color: '#ad6800' }}>⚠ 仅展示请求成功（2xx）的 Session</Text>
        </div>
      </Modal>
    </Drawer>
  );
}

// Endpoint配置抽屉
function EndpointDrawer({
  visible,
  endpoint,
  onClose,
  onSave,
}: {
  visible: boolean;
  endpoint?: any;
  onClose: () => void;
  onSave: (ep: any) => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (endpoint) {
      form.setFieldsValue(endpoint);
    } else {
      form.resetFields();
    }
  }, [endpoint, form]);

  const handleSave = () => {
    form.validateFields().then(values => {
      onSave({ ...values, id: endpoint?.id || `ep_${Date.now()}` });
      onClose();
    });
  };

  return (
    <Drawer
      title="Endpoint 配置"
      placement="right"
      width={480}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Endpoint Name" name="name" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如: paystack_charge" />
        </Form.Item>
        <Form.Item label="URL" name="url" rules={[{ required: true, message: '请输入URL' }]}>
          <Input placeholder="https://api.paystack.co/charge" />
        </Form.Item>
        <Form.Item label="报文格式" name="format" rules={[{ required: true, message: '请选择格式' }]}>
          <Select>
            <Select.Option value="JSON">JSON</Select.Option>
            <Select.Option value="XML">XML</Select.Option>
            <Select.Option value="FORM">Form-encoded</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} placeholder="说明该 Endpoint 用途" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

// 状态机影响警告 Modal
function StateMachineImpactModal({
  visible,
  nodeName,
  affectedPaths,
  orphanNodes,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  nodeName: string;
  affectedPaths: string[];
  orphanNodes: string[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={visible}
      title={<Space><WarningOutlined style={{ color: '#faad14' }} /><span>State Machine Impact Warning</span></Space>}
      onCancel={onClose}
      onOk={onConfirm}
      okText="Confirm Delete"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
    >
      <div style={{ marginTop: 16 }}>
        <p>删除「{nodeName}」节点将影响以下状态迁移路径：</p>
        <ul style={{ color: '#ff4d4f' }}>
          {affectedPaths.map((path, idx) => (
            <li key={idx}>{path}</li>
          ))}
        </ul>
        {orphanNodes.length > 0 && (
          <>
            <p style={{ marginTop: 16 }}>以下节点将成为孤立节点（无入边连线）：</p>
            <ul style={{ color: '#fa8c16' }}>
              {orphanNodes.map((name, idx) => (
                <li key={idx}>{name}</li>
              ))}
            </ul>
          </>
        )}
        {orphanNodes.length > 0 && (
          <p style={{ marginTop: 16, color: '#666' }}>
            孤立节点在 Submit 校验中将被标记为错误。
          </p>
        )}
      </div>
    </Modal>
  );
}

// 普通删除确认 Modal
function DeleteConfirmModal({
  visible,
  nodeName,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  nodeName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={visible}
      title="确认删除节点"
      onCancel={onClose}
      onOk={onConfirm}
      okText="Confirm Delete"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
    >
      <p>确认删除「{nodeName}」节点？</p>
      <p style={{ color: '#666', fontSize: 12 }}>该节点的所有配置将被清除。</p>
    </Modal>
  );
}

export default function SceneEditPage() {
  const { channelCode, sceneId } = useParams<{ channelCode: string; sceneId: string }>();
  const navigate = useNavigate();
  const { scenarios, scenarioVersions, addScenarioVersion } = useScenarioStore();
  const { l2Atomics, l3Composites, l4Templates } = useActionStore();
  const reactFlowInstance = useReactFlow();

  const scenario = scenarios.find((s) => s.scenarioId === sceneId);
  const versions = scenarioVersions[sceneId!] || [];
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;

  const [l3Configs, setL3Configs] = useState<Record<string, L3NodeConfig>>({});
  const [currentL4TemplateId, setCurrentL4TemplateId] = useState<string | null>(scenario?.l4TemplateId || null);
  const currentL4 = l4Templates.find(t => t.templateId === currentL4TemplateId);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedL3Code, setSelectedL3Code] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isL4ModalOpen, setIsL4ModalOpen] = useState(false);
  const [isEndpointDrawerOpen, setIsEndpointDrawerOpen] = useState(false);
  const [editingEndpoint] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [isSpiModalOpen, setIsSpiModalOpen] = useState(false);
  const [selectedSpi, setSelectedSpi] = useState<{ businessType: string; ability: string; action: string } | null>(null);

  // Context面板状态 - L3-11 L2-A/L2-B配置后同步回显
  const [globalVariables, setGlobalVariables] = useState<any[]>([]);
  const [generatedFields, setGeneratedFields] = useState<any[]>([]);

  // JSON 配置抽屉状态
  const [isJsonDrawerExpanded, setIsJsonDrawerExpanded] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'modified' | 'error'>('synced');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // 从当前配置生成 JSON
  const generateJsonFromConfig = useCallback(() => {
    const config = {
      sceneId: scenario?.scenarioId,
      sceneName: scenario?.name,
      l4TemplateId: currentL4TemplateId,
      l4TemplateName: currentL4?.name,
      spi: selectedSpi,
      endpoints: endpoints,
      nodes: nodes.map(n => ({
        id: n.id,
        l3Code: n.data.l3Code,
        l3Name: n.data.l3Name,
        position: n.position,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      l3Configs: l3Configs,
    };
    return JSON.stringify(config, null, 2);
  }, [scenario, currentL4TemplateId, currentL4, selectedSpi, endpoints, nodes, edges, l3Configs]);

  // 解析 JSON 到配置
  const parseJsonToConfig = useCallback((json: string) => {
    try {
      const config = JSON.parse(json);
      setJsonError(null);
      return config;
    } catch (e) {
      setJsonError((e as Error).message);
      return null;
    }
  }, []);

  // JSON 变化处理
  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    const parsed = parseJsonToConfig(value);
    if (parsed) {
      setSyncStatus('modified');
      setJsonError(null);
    } else {
      setSyncStatus('error');
    }
  };

  // 格式化 JSON
  const handleFormatJson = () => {
    const parsed = parseJsonToConfig(jsonContent);
    if (parsed) {
      setJsonContent(JSON.stringify(parsed, null, 2));
      setSyncStatus('modified');
      setJsonError(null);
    }
  };

  // 重置 JSON
  const handleResetJson = () => {
    const newJson = generateJsonFromConfig();
    setJsonContent(newJson);
    setSyncStatus('synced');
    setJsonError(null);
  };

  // 复制 JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonContent);
    message.success('JSON 已复制到剪贴板');
  };

  // 从 AI 粘贴 (占位)
  const handlePasteFromAI = () => {
    message.info('AI 粘贴功能开发中...');
  };

  // 同步 JSON 到页面配置
  const handleSyncToPage = () => {
    const config = parseJsonToConfig(jsonContent);
    if (!config) return;

    if (config.l4TemplateId) {
      setCurrentL4TemplateId(config.l4TemplateId);
    }
    if (config.spi) {
      setSelectedSpi(config.spi);
    }
    if (config.endpoints) {
      setEndpoints(config.endpoints);
    }
    if (config.l3Configs) {
      setL3Configs(config.l3Configs);
    }
    if (config.nodes) {
      const newNodes: Node[] = config.nodes.map((n: any) => {
        const l3 = l3Composites.find(l => l.code === n.l3Code);
        return {
          id: n.id,
          type: 'l3Node' as const,
          position: n.position,
          data: {
            l3Code: n.l3Code,
            l3Name: n.l3Name || l3?.name || n.l3Code,
            isConfigured: !!config.l3Configs?.[n.l3Code],
            l2Combination: l3?.l2Combination || [],
            l2Atomics: l2Atomics,
            l3Config: config.l3Configs?.[n.l3Code],
            onDelete: () => handleDeleteNode(n.id),
            onConfig: () => { setSelectedL3Code(n.l3Code); setIsDrawerOpen(true); },
          },
        };
      });
      setNodes(newNodes);
    }
    if (config.edges) {
      const newEdges: Edge[] = config.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: true,
      }));
      setEdges(newEdges);
    }

    setSyncStatus('synced');
    setIsJsonDrawerExpanded(false);
    message.success('配置已从 JSON 同步到页面');
  };

  // 删除相关状态
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [impactModalVisible, setImpactModalVisible] = useState(false);
  const [deletingNode, setDeletingNode] = useState<{ id: string; name: string } | null>(null);
  const [affectedPaths, setAffectedPaths] = useState<string[]>([]);
  const [orphanNodes, setOrphanNodes] = useState<string[]>([]);

  // 影响状态机的节点类型
  const stateMachineNodeTypes = ['L3-06', 'L3-05', 'L3-08']; // StateTransition, GenerateData, Requery

  // 删除节点
  const handleDeleteNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const l3Code = node.data.l3Code as string;
    const l3Name = node.data.l3Name as string;

    // 检查是否影响状态机
    if (stateMachineNodeTypes.includes(l3Code)) {
      // 影响状态机，显示警告
      const nodeEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
      const affected: string[] = [];
      const orphans: string[] = [];

      // 简化：检查是否会断开路径
      if (nodeEdges.some(e => e.source === nodeId)) {
        affected.push(`INIT → PENDING（此路径将不再被覆盖）`);
      }

      // 检查孤立节点
      nodes.forEach(n => {
        if (n.id !== nodeId) {
          const hasIncoming = edges.some(e => e.target === n.id);
          const willHaveIncoming = edges.some(e => e.target === n.id && e.source !== nodeId);
          if (hasIncoming && !willHaveIncoming) {
            orphans.push(n.data.l3Name as string);
          }
        }
      });

      setDeletingNode({ id: nodeId, name: l3Name });
      setAffectedPaths(affected);
      setOrphanNodes(orphans);
      setImpactModalVisible(true);
    } else {
      // 不影响状态机，普通确认
      setDeletingNode({ id: nodeId, name: l3Name });
      setDeleteModalVisible(true);
    }
  };

  // 确认删除
  const confirmDelete = () => {
    if (!deletingNode) return;

    // 删除节点
    setNodes(nds => nds.filter(n => n.id !== deletingNode.id));
    // 删除相关边
    setEdges(eds => eds.filter(e => e.source !== deletingNode.id && e.target !== deletingNode.id));
    // 清除配置
    setL3Configs(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key].l3Code === deletingNode.id) {
          delete updated[key];
        }
      });
      return updated;
    });

    setDeleteModalVisible(false);
    setImpactModalVisible(false);
    setDeletingNode(null);
    message.success('节点已删除');
  };

  // 拖拽处理 - 允许放置
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 拖拽放置 - 添加节点到画布
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const l3Code = event.dataTransfer.getData('application/reactflow');
    if (!l3Code) return;

    const l3 = l3Composites.find(l => l.code === l3Code);
    if (!l3) return;

    // 计算放置位置
    const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
    const position = reactFlowBounds
      ? {
          x: event.clientX - reactFlowBounds.left - 90,
          y: event.clientY - reactFlowBounds.top - 40,
        }
      : { x: nodes.length * 200, y: 0 };

    const newNode: Node = {
      id: `${l3Code}_${Date.now()}`,
      type: 'l3Node',
      position,
      data: {
        l3Code,
        l3Name: l3.name,
        isConfigured: false,
        l2Combination: l3.l2Combination || [],
        l2Atomics: l2Atomics,
        l3Config: undefined,
        onDelete: () => handleDeleteNode(`${l3Code}_${Date.now()}`),
        onConfig: () => { setSelectedL3Code(l3Code); setIsDrawerOpen(true); },
      },
    };

    setNodes(nds => [...nds, newNode]);
  }, [l3Composites, l2Atomics, nodes.length, setNodes]);

  useEffect(() => {
    if (latestVersion) {
      setL3Configs(latestVersion.l3Configs);
      if (latestVersion.l4TemplateId) {
        setCurrentL4TemplateId(latestVersion.l4TemplateId);
      }
      // Sync endpoints from L3-01 L2-02 config
      const l301Config = latestVersion.l3Configs['L3-01'];
      const l202Config = l301Config?.l2Dependencies?.['L2-02'] as any;
      if (l202Config?.apiName) {
        setEndpoints([{
          id: `ep_L3-01_1`,
          name: l202Config.apiName || '未命名接口',
          method: l202Config.method || 'POST',
          url: l202Config.url || '',
          format: l202Config.bodyFormat || 'JSON',
        }]);
      }
    }
  }, [latestVersion]);

  // 初始化 JSON 内容
  useEffect(() => {
    if (isJsonDrawerExpanded && !jsonContent) {
      setJsonContent(generateJsonFromConfig());
    }
  }, [isJsonDrawerExpanded, jsonContent, generateJsonFromConfig]);

  // 当配置变化时更新 JSON（仅在抽屉展开时）
  useEffect(() => {
    if (isJsonDrawerExpanded) {
      setJsonContent(generateJsonFromConfig());
      setSyncStatus('synced');
    }
  }, [l3Configs, nodes, edges, endpoints, selectedSpi, currentL4TemplateId, isJsonDrawerExpanded, generateJsonFromConfig]);

  const handleSelectL4Template = (templateId: string) => {
    const template = l4Templates.find(t => t.templateId === templateId);
    if (!template) return;

    setCurrentL4TemplateId(templateId);
    setIsL4ModalOpen(false);
    setL3Configs({});

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const l3NodeCounts: Record<string, number> = {};

    template.nodes.forEach((node, idx) => {
      l3NodeCounts[node.l3Code] = (l3NodeCounts[node.l3Code] || 0) + 1;
      const uniqueId = `${node.l3Code}_${l3NodeCounts[node.l3Code]}`;
      const l3 = l3Composites.find(l => l.code === node.l3Code);

      newNodes.push({
        id: uniqueId,
        type: 'l3Node',
        position: { x: 400, y: idx * 200 },
        data: {
          l3Code: node.l3Code,
          l3Name: l3?.name || node.l3Code,
          isConfigured: false,
          nodeId: uniqueId,
          l2Combination: l3?.l2Combination || [],
          l2Atomics: l2Atomics,
          l3Config: undefined,
          onDelete: () => handleDeleteNode(uniqueId),
          onConfig: () => { setSelectedL3Code(node.l3Code); setIsDrawerOpen(true); },
        },
      });

      if (idx > 0) {
        const prevNode = template.nodes[idx - 1];
        l3NodeCounts[prevNode.l3Code] = l3NodeCounts[prevNode.l3Code] || 0;
        const prevUniqueId = `${prevNode.l3Code}_${l3NodeCounts[prevNode.l3Code]}`;
        newEdges.push({
          id: `e-${prevUniqueId}-${uniqueId}`,
          source: prevUniqueId,
          target: uniqueId,
          animated: true,
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 100);
  };

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const l3Code = node.data.l3Code as string;
    setSelectedL3Code(l3Code);
    setIsDrawerOpen(true);
  }, []);

  const handleSaveL3Config = (config: any) => {
    if (!selectedL3Code) return;
    setL3Configs(prev => ({
      ...prev,
      [selectedL3Code]: {
        ...prev[selectedL3Code],
        ...config,
        status: 'configured',
      },
    }));

    // L3-11 Scene Initializer: 同步 L2-A/L2-B 配置到 Context
    if (selectedL3Code === 'L3-11') {
      const l2A = config.l2Dependencies?.['L2-A']?.variables || [];
      const l2B = config.l2Dependencies?.['L2-B']?.fields || [];

      // L2-A: 常量 → globalVariables
      setGlobalVariables(l2A.map((v: any) => ({
        name: v.name,
        type: v.type,
        value: v.value,
      })));

      // L2-B: 派生字段 → generatedFields
      setGeneratedFields(l2B.map((f: any) => ({
        name: f.name,
        type: f.type,
        generationType: f.generationType,
      })));
    }

    setNodes(nds => nds.map(n => {
      if (n.data.l3Code === selectedL3Code) {
        return { ...n, data: { ...n.data, isConfigured: true } };
      }
      return n;
    }));
  };

  const handleSaveEndpoint = (ep: any) => {
    setEndpoints(prev => {
      const idx = prev.findIndex(e => e.id === ep.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = ep;
        return updated;
      }
      return [...prev, ep];
    });
  };

  const handleDraft = () => {
    if (!scenario) return;
    const newVersion: ScenarioVersion = {
      versionNo: versions.length + 1,
      l4TemplateId: currentL4TemplateId!,
      l3Configs,
      status: 'Temporary',
    };
    addScenarioVersion(sceneId!, newVersion);
    message.success('草稿已保存');
  };

  const handleSubmit = () => {
    if (!scenario) return;
    Modal.confirm({
      title: '提交确认',
      content: '是否确认发布？',
      okText: '发布',
      cancelText: '取消',
      onOk: () => {
        const newVersion: ScenarioVersion = {
          versionNo: versions.length + 1,
          l4TemplateId: currentL4TemplateId!,
          l3Configs,
          status: 'Published',
        };
        addScenarioVersion(sceneId!, newVersion);
        message.success('已发布');
        navigate(`/channel-integration/${channelCode}/scenes`);
      },
      onCancel: () => {
        const newVersion: ScenarioVersion = {
          versionNo: versions.length + 1,
          l4TemplateId: currentL4TemplateId!,
          l3Configs,
          status: 'Temporary',
        };
        addScenarioVersion(sceneId!, newVersion);
        message.success('已保存为临时版本');
        navigate(`/channel-integration/${channelCode}/scenes`);
      },
    });
  };

  const handleCancel = () => {
    Modal.confirm({
      title: '退出确认',
      content: '确定退出编辑吗？未保存的更改将丢失。',
      okText: '退出',
      cancelText: '继续编辑',
      okButtonProps: { danger: true },
      onOk: () => {
        navigate(`/channel-integration/${channelCode}/scenes`);
      },
    });
  };

  if (!scenario) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到场景: {sceneId}</p>
          <Button onClick={() => navigate(`/channel-integration/${channelCode}/scenes`)}>返回</Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/channel-integration/${channelCode}/scenes`)} size="small" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{scenario.name}</span>
            <Tag color="blue">{scenario.scenarioId}</Tag>
          </Space>
          <Space size="middle">
            <Tag color="green">{currentL4?.name || '未选择模版'}</Tag>
          </Space>
        </div>
      </Card>

      {/* Main Content: 四区布局 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左侧 Context 面板 (240px) */}
        <ContextPanel
          onSpiSelect={() => setIsSpiModalOpen(true)}
          onSpiDelete={() => setSelectedSpi(null)}
          endpoints={endpoints}
          credentials={[]}
          globalVariables={globalVariables}
          generatedFields={generatedFields}
          countries={[]}
          parties={[]}
          lines={[]}
          spiData={selectedSpi || undefined}
        />

        {/* 中间 L3 Components 面板 */}
        <L3ComponentsPanel
          l3Composites={l3Composites.map(l3 => ({ code: l3.code, name: l3.name, type: l3.type }))}
          onAddL3={(l3Code) => {
            // 添加L3到画布
            const l3 = l3Composites.find(l => l.code === l3Code);
            if (!l3) return;
            const nodeId = `${l3Code}_${Date.now()}`;
            const newNode: Node = {
              id: nodeId,
              type: 'l3Node',
              position: { x: 400, y: nodes.length * 200 },
              data: {
                l3Code,
                l3Name: l3.name,
                isConfigured: false,
                l2Combination: l3.l2Combination || [],
                l2Atomics: l2Atomics,
                l3Config: undefined,
                onDelete: () => handleDeleteNode(nodeId),
                onConfig: () => { setSelectedL3Code(l3Code); setIsDrawerOpen(true); },
              },
            };
            setNodes(nds => [...nds, newNode]);
          }}
        />

        {/* 右侧画布区 */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* 画布工具栏 */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
            <Button icon={<PlusOutlined />} onClick={() => setIsL4ModalOpen(true)}>选择L4模版</Button>
            <Button icon={<SaveOutlined />}>Save to My Templates</Button>
            <Button type="primary" icon={<CloudUploadOutlined />}>Apply to Public Templates</Button>
          </div>

          {/* 画布 */}
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              fitView
              style={{ height: '100%' }}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          ) : (
            <div
              onDragOver={onDragOver}
              onDrop={onDrop}
              style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <Title level={4} style={{ color: '#666', marginBottom: 8 }}>拖拽 L3 组件到此处</Title>
              <Text type="secondary">或点击按钮选择 L4 模版</Text>
              <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 24 }} onClick={() => setIsL4ModalOpen(true)}>
                选择 L4 模版
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* JSON Configuration 抽屉 */}
      <Card
        size="small"
        style={{
          borderTop: '1px solid #f0f0f0',
          borderRadius: 0,
          margin: 0,
        }}
        styles={{ body: { padding: 0 } }}
      >
        {/* 抽屉头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: '#fafafa',
            borderBottom: '1px solid #f0f0f0',
            cursor: 'pointer',
          }}
          onClick={() => setIsJsonDrawerExpanded(!isJsonDrawerExpanded)}
        >
          <Space>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Configuration JSON</span>
            <Tag
              color={syncStatus === 'synced' ? 'green' : syncStatus === 'modified' ? 'orange' : 'red'}
              style={{ fontSize: 10 }}
            >
              {syncStatus === 'synced' ? '● Synced' : syncStatus === 'modified' ? '● Modified' : '● Error'}
            </Tag>
            {jsonError && <Tag color="red" style={{ fontSize: 10 }}>Parse Error</Tag>}
          </Space>
          <Button type="text" size="small">
            {isJsonDrawerExpanded ? '▼' : '▲'}
          </Button>
        </div>

        {/* 抽屉内容 */}
        {isJsonDrawerExpanded && (
          <div style={{ height: 300, display: 'flex', flexDirection: 'column' }}>
            {/* 工具栏 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <Space>
                <Button size="small" onClick={handleCopyJson}>Copy</Button>
                <Button size="small" onClick={handleFormatJson}>Format</Button>
                <Button size="small" onClick={handleResetJson}>Reset</Button>
                <Divider type="vertical" />
                <Button size="small" onClick={handlePasteFromAI}>Paste from AI</Button>
              </Space>
              <Button type="primary" size="small" onClick={handleSyncToPage} disabled={!!jsonError}>
                Sync to Page
              </Button>
            </div>

            {/* JSON 编辑器 */}
            <textarea
              value={jsonContent}
              onChange={(e) => handleJsonChange(e.target.value)}
              style={{
                flex: 1,
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: 12,
                padding: '12px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: jsonError ? '#fff5f5' : '#fafafa',
                color: jsonError ? '#ff4d4f' : '#333',
                lineHeight: 1.5,
              }}
              placeholder="JSON configuration will appear here..."
            />
          </div>
        )}
      </Card>

      {/* 底部操作栏 */}
      <Card size="small" styles={{ body: { padding: '12px 24px' } }} style={{ borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={handleCancel}>Cancel</Button>
          <Space>
            <Button onClick={handleDraft}>Draft</Button>
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSubmit}>Submit</Button>
          </Space>
        </div>
      </Card>

      {/* L4 模版选择弹窗 */}
      <Modal title="选择 L4 模版" open={isL4ModalOpen} onCancel={() => setIsL4ModalOpen(false)} footer={null} width={600}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {l4Templates.map(t => (
            <Card
              key={t.templateId}
              hoverable
              onClick={() => handleSelectL4Template(t.templateId)}
              style={{ borderColor: currentL4TemplateId === t.templateId ? '#1890ff' : '#d9d9d9', background: currentL4TemplateId === t.templateId ? '#e6f7ff' : '#fff' }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{t.description}</div>
              <Tag color="blue">{t.templateId}</Tag>
              <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>状态: {t.states.join(' → ')}</div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* L3-01 HTTP Request - 8步进向导 */}
      {selectedL3Code === 'L3-01' && L3_STEP_CONFIGS['L3-01'] && (
        <StepWizardDrawerWrapper
          visible={isDrawerOpen}
          l3Code="L3-01"
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveL3Config}
          initialConfig={l3Configs[selectedL3Code]}
        />
      )}

      {/* L3-03 Field Mapping - 单抽屉 */}
      {selectedL3Code === 'L3-03' && (
        <FieldConverterDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveL3Config}
          initialValues={l3Configs[selectedL3Code]}
        />
      )}

      {/* L3-04 Condition Branch - 单抽屉 */}
      {selectedL3Code === 'L3-04' && (
        <ConditionRouterDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveL3Config}
          initialValues={l3Configs[selectedL3Code]}
        />
      )}

      {/* L3-06 State Transition - 单抽屉 */}
      {selectedL3Code === 'L3-06' && (
        <StateWriterDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveL3Config}
          initialValues={l3Configs[selectedL3Code]}
        />
      )}

      {/* L3-07 Notify Downstream - 单抽屉 */}
      {selectedL3Code === 'L3-07' && (
        <MqDispatcherDrawer
          visible={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveL3Config}
          initialValues={l3Configs[selectedL3Code]}
        />
      )}

      {/* 步进向导 L3 节点 (L3-02, L3-05, L3-08, L3-09, L3-11) */}
      {selectedL3Code && ['L3-02', 'L3-05', 'L3-08', 'L3-09', 'L3-11'].includes(selectedL3Code) && L3_STEP_CONFIGS[selectedL3Code] && (
        <StepWizardDrawerWrapper
          visible={isDrawerOpen}
          l3Code={selectedL3Code}
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveL3Config}
          initialConfig={l3Configs[selectedL3Code]}
        />
      )}

      {/* Endpoint 配置抽屉 */}
      <EndpointDrawer
        visible={isEndpointDrawerOpen}
        endpoint={editingEndpoint}
        onClose={() => setIsEndpointDrawerOpen(false)}
        onSave={handleSaveEndpoint}
      />

      {/* SPI 选择弹窗 */}
      <SpiSelectModal
        visible={isSpiModalOpen}
        onClose={() => setIsSpiModalOpen(false)}
        onConfirm={(spi) => {
          setSelectedSpi(spi);
          message.success(`已选择 SPI: ${spi.businessType} × ${spi.ability} × ${spi.action}`);
        }}
      />

      {/* 普通删除确认 */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        nodeName={deletingNode?.name || ''}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={confirmDelete}
      />

      {/* 状态机影响警告 */}
      <StateMachineImpactModal
        visible={impactModalVisible}
        nodeName={deletingNode?.name || ''}
        affectedPaths={affectedPaths}
        orphanNodes={orphanNodes}
        onClose={() => setImpactModalVisible(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
