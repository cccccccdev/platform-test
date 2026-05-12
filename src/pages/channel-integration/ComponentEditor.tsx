import { useState, useEffect } from 'react';
import { Button, Collapse, Tag, Input, Modal, Form, Radio, Empty, Tree } from 'antd';
import { PlusOutlined, EyeOutlined, HolderOutlined, CloseOutlined, ApiOutlined } from '@ant-design/icons';
import { mockSpiFields, mockFlowTemplates, outboundComponents, inboundComponents } from '../../mock/data';

interface ComponentEditorProps {
  action: string;
  flowType: 'main' | 'requery' | 'callback';
  stepName: string;
  onDone: () => void;
}

// Context 面板
function ContextPanel({
  action,
  onHighlight,
  highlightedField,
}: {
  action: string;
  onHighlight: (field: string) => void;
  highlightedField: string | null;
}) {
  const [generatedFields, setGeneratedFields] = useState<Array<{ name: string; rule: string; count: number }>>([]);
  const [globalVars, setGlobalVars] = useState<Array<{ key: string; value: string; count: number }>>([]);
  const [endpoint] = useState<string | null>(null);
  const [showSpiModal, setShowSpiModal] = useState(false);

  // 生成字段弹窗
  const [isGenFieldModalOpen, setIsGenFieldModalOpen] = useState(false);
  const [genFieldForm] = Form.useForm();

  // 全局变量弹窗
  const [isGlobalVarModalOpen, setIsGlobalVarModalOpen] = useState(false);
  const [globalVarForm] = Form.useForm();

  const spiFields = mockSpiFields[action] || { request: [], response: [] };

  // 高亮样式
  const getHighlightStyle = (fieldPath: string) => {
    if (highlightedField === fieldPath) {
      return { outline: '2px solid #1677ff', transform: 'scale(1.05)', transition: '0.2s' };
    }
    return {};
  };

  return (
    <div style={{ width: 240, borderRight: '1px solid #f0f0f0', overflowY: 'auto', padding: 12 }}>
      <Collapse
        accordion={false}
        defaultActiveKey={['spi', 'generated', 'global', 'endpoint', 'credential']}
        items={[
          // SPI 模块
          {
            key: 'spi',
            label: (
              <span>SPI 模块</span>
            ),
            extra: (
              <EyeOutlined onClick={(e) => { e.stopPropagation(); setShowSpiModal(true); }} />
            ),
            children: (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Tag color="blue" style={{ fontSize: 11 }}>request</Tag>
                  {spiFields.request.map((f) => (
                    <Tag
                      key={f}
                      color="blue"
                      style={{ margin: '2px', cursor: 'pointer', ...getHighlightStyle(`spi.request.${f}`) }}
                      onClick={() => onHighlight(`spi.request.${f}`)}
                    >
                      {f}
                    </Tag>
                  ))}
                </div>
                <div>
                  <Tag color="blue" style={{ fontSize: 11 }}>response</Tag>
                  {spiFields.response.map((f) => (
                    <Tag
                      key={f}
                      color="blue"
                      style={{ margin: '2px', cursor: 'pointer', ...getHighlightStyle(`spi.response.${f}`) }}
                      onClick={() => onHighlight(`spi.response.${f}`)}
                    >
                      {f}
                    </Tag>
                  ))}
                </div>
              </div>
            ),
          },

          // Generated Fields 模块
          {
            key: 'generated',
            label: 'Generated Fields',
            extra: <PlusOutlined onClick={(e) => { e.stopPropagation(); setIsGenFieldModalOpen(true); }} />,
            children: (
              <div>
                {generatedFields.map((f) => (
                  <Tag
                    key={f.name}
                    color="green"
                    closable
                    onClose={() => setGeneratedFields((prev) => prev.filter((x) => x.name !== f.name))}
                    style={{ margin: '2px', ...getHighlightStyle(`generatedFields.${f.name}`) }}
                    onClick={() => onHighlight(`generatedFields.${f.name}`)}
                  >
                    {f.name} [{f.count}]
                  </Tag>
                ))}
                {generatedFields.length === 0 && <span style={{ color: '#999', fontSize: 12 }}>暂无字段</span>}
              </div>
            ),
          },

          // Global Variable 模块
          {
            key: 'global',
            label: 'Global Variable',
            extra: <PlusOutlined onClick={(e) => { e.stopPropagation(); setIsGlobalVarModalOpen(true); }} />,
            children: (
              <div>
                {globalVars.map((v) => (
                  <Tag
                    key={v.key}
                    color="purple"
                    closable
                    onClose={() => setGlobalVars((prev) => prev.filter((x) => x.key !== v.key))}
                    style={{ margin: '2px', ...getHighlightStyle(`globalVar.${v.key}`) }}
                    onClick={() => onHighlight(`globalVar.${v.key}`)}
                  >
                    {v.key} [{v.count}]
                  </Tag>
                ))}
                {globalVars.length === 0 && <span style={{ color: '#999', fontSize: 12 }}>暂无变量</span>}
              </div>
            ),
          },

          // Endpoint 模块
          {
            key: 'endpoint',
            label: 'Endpoint',
            children: (
              <div>
                {endpoint ? (
                  <Tag color="default">{endpoint}</Tag>
                ) : (
                  <span style={{ color: '#999', fontSize: 12 }}>由 network 组件选择后自动同步</span>
                )}
              </div>
            ),
          },

          // Credential 模块
          {
            key: 'credential',
            label: 'Credential',
            children: (
              <div>
                <Tag color="orange" style={{ margin: '2px' }}>apiKey: ••••••••</Tag>
                <Tag color="orange" style={{ margin: '2px' }}>secretKey: ••••••••</Tag>
              </div>
            ),
          },
        ]}
      />

      {/* SPI 完整结构弹窗 */}
      <Modal
        title="SPI 字段结构"
        open={showSpiModal}
        onCancel={() => setShowSpiModal(false)}
        footer={null}
        width={500}
      >
        <Tree
          treeData={[
            {
              title: 'request',
              key: 'request',
              children: spiFields.request.map((f) => ({ title: f, key: `request.${f}` })),
            },
            {
              title: 'response',
              key: 'response',
              children: spiFields.response.map((f) => ({ title: f, key: `response.${f}` })),
            },
          ]}
        />
      </Modal>

      {/* 生成字段弹窗 */}
      <Modal
        title="添加 Generated Field"
        open={isGenFieldModalOpen}
        onCancel={() => setIsGenFieldModalOpen(false)}
        onOk={() => {
          genFieldForm.validateFields().then((values) => {
            setGeneratedFields((prev) => [...prev, { name: values.name, rule: values.rule, count: 0 }]);
            setIsGenFieldModalOpen(false);
            genFieldForm.resetFields();
          });
        }}
      >
        <Form form={genFieldForm} layout="vertical">
          <Form.Item name="name" label="Field Name" rules={[{ required: true }]}>
            <Input placeholder="如: orderNo" />
          </Form.Item>
          <Form.Item name="rule" label="生成规则" initialValue="random">
            <Radio.Group>
              <Radio value="random">随机数</Radio>
              <Radio value="timestamp">时间戳</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* 全局变量弹窗 */}
      <Modal
        title="添加 Global Variable"
        open={isGlobalVarModalOpen}
        onCancel={() => setIsGlobalVarModalOpen(false)}
        onOk={() => {
          globalVarForm.validateFields().then((values) => {
            setGlobalVars((prev) => [...prev, { key: values.key, value: values.value, count: 0 }]);
            setIsGlobalVarModalOpen(false);
            globalVarForm.resetFields();
          });
        }}
      >
        <Form form={globalVarForm} layout="vertical">
          <Form.Item name="key" label="Key" rules={[{ required: true }]}>
            <Input placeholder="如: channelCode" />
          </Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true }]}>
            <Input placeholder="如: GTB_NG" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// 组件库面板
function ComponentLibrary() {
  const handleDragStart = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData('componentName', name);
  };

  return (
    <div style={{ width: 280, borderRight: '1px solid #f0f0f0', overflowY: 'auto', padding: 12 }}>
      <Collapse
        accordion={false}
        defaultActiveKey={['outbound', 'inbound']}
        items={[
          {
            key: 'outbound',
            label: 'Outbound 组件',
            children: (
              <div>
                {outboundComponents.map((comp) => (
                  <div
                    key={comp.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, comp.name)}
                    style={{
                      cursor: 'grab',
                      padding: '8px 12px',
                      margin: '4px 0',
                      border: '1px solid #e8e8e8',
                      borderRadius: 4,
                      background: '#fafafa',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ApiOutlined />
                    <span>{comp.name}</span>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'inbound',
            label: 'Inbound 组件',
            children: (
              <div>
                {inboundComponents.map((comp) => (
                  <div
                    key={comp.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, comp.name)}
                    style={{
                      cursor: 'grab',
                      padding: '8px 12px',
                      margin: '4px 0',
                      border: '1px solid #e8e8e8',
                      borderRadius: 4,
                      background: '#fafafa',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ApiOutlined />
                    <span>{comp.name}</span>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// Canvas 画板区域
function CanvasArea({
  action,
  flowType,
  components,
  onComponentClick,
  onComponentDelete,
  onAddComponent,
}: {
  action: string;
  flowType: 'main' | 'requery' | 'callback';
  components: string[];
  onComponentClick: (name: string) => void;
  onComponentDelete: (name: string) => void;
  onAddComponent: (name: string) => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('componentName');
    if (name) {
      onAddComponent(name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // INBOUND_QUERY 互斥选择
  const [inboundQueryMode, setInboundQueryMode] = useState('requestBusinessAccessLayer');

  return (
    <div
      style={{ flex: 1, padding: 16, overflowY: 'auto', background: '#fafafa', minHeight: 400 }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {components.length === 0 ? (
        <Empty description="从左侧组件库拖拽组件到此处" />
      ) : (
        <div>
          {/* INBOUND_QUERY 互斥选择 */}
          {action === 'INBOUND_QUERY' && flowType === 'main' && (
            <Radio.Group
              value={inboundQueryMode}
              onChange={(e) => setInboundQueryMode(e.target.value)}
              style={{ marginBottom: 16 }}
            >
              <Radio value="requestBusinessAccessLayer">requestBusinessAccessLayer（内部请求）</Radio>
              <Radio value="queryOrder">queryOrder（网关直返）</Radio>
            </Radio.Group>
          )}

          {components.map((name, index) => (
            <div
              key={`${name}-${index}`}
              onClick={() => onComponentClick(name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 48,
                background: 'white',
                border: '1px solid #e8e8e8',
                borderRadius: 6,
                marginBottom: 8,
                padding: '0 12px',
                cursor: 'pointer',
              }}
            >
              <HolderOutlined style={{ color: '#999', cursor: 'grab' }} />
              <span style={{ fontWeight: 500 }}>{name}</span>
              {name === 'initOrder' && flowType === 'main' && action === 'INBOUND_TRANSACTION' && (
                <Tag color="warning" style={{ fontSize: 10 }}>可删除</Tag>
              )}
              {name === 'network' && <Tag color="blue" style={{ fontSize: 10 }}>点击配置</Tag>}
              <CloseOutlined
                style={{ marginLeft: 'auto', color: '#999', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onComponentDelete(name);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComponentEditor({ action, flowType, stepName, onDone }: ComponentEditorProps) {
  const [components, setComponents] = useState<string[]>([]);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  // 初始化组件列表
  useEffect(() => {
    const flowKey = flowType === 'main' ? 'main' : flowType;
    const template = mockFlowTemplates[action]?.[flowKey] || [];
    setComponents([...template]);
  }, [action, flowType]);

  // 添加组件
  const handleAddComponent = (name: string) => {
    setComponents((prev) => [...prev, name]);
  };

  // 删除组件
  const handleDeleteComponent = (name: string) => {
    setComponents((prev) => {
      const idx = prev.lastIndexOf(name);
      if (idx !== -1) {
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }
      return prev;
    });
  };

  // 点击组件
  const handleComponentClick = () => {
    // NetworkDrawer 暂时通过 network 组件上的 Tag 点击触发
  };

  return (
    <div>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Component Editor - {stepName} / {flowType}</span>
        <Button size="small" onClick={onDone}>Done</Button>
      </div>
      <div style={{ display: 'flex', height: 'calc(100vh - 280px)' }}>
        <ContextPanel
          action={action}
          onHighlight={setHighlightedField}
          highlightedField={highlightedField}
        />
        <ComponentLibrary />
        <CanvasArea
          action={action}
          flowType={flowType}
          components={components}
          onComponentClick={handleComponentClick}
          onComponentDelete={handleDeleteComponent}
          onAddComponent={handleAddComponent}
        />
      </div>
    </div>
  );
}