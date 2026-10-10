import { useEffect } from 'react';
import { Card, Form, Input, Select, Button, Space, Tag, Descriptions, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FlowNode } from '../../domain/flow/types';
import { useActionStore } from '../../store';

const { Text } = Typography;

interface NodeConfigPanelProps {
  node: FlowNode;
  onChange: (config: any) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onChange, onClose }: NodeConfigPanelProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    const config = (node as any).config || {};
    form.setFieldsValue(config);
  }, [node, form]);

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    onChange(allValues);
  };

  const nodeType = node.nodeType as string;

  const getConfigFields = () => {
    switch (nodeType) {
      case 'HttpRequest':
        return <HttpRequestConfig />;
      case 'ConditionBranch':
        return <ConditionBranchConfig node={node} onChange={onChange} />;
      case 'StateTransition':
        return <StateTransitionConfig />;
      case 'FieldMapping':
        return <FieldMappingConfig node={node} onChange={onChange} />;
      case 'Requery':
        return <RequeryConfig />;
      case 'GenerateData':
        return <GenerateDataConfig />;
      case 'MqSend':
        return <MqSendConfig />;
      // L2 Atomic nodes
      case 'L2.HTTP_BUILD':
        return <L2Config l2Code="L2.HTTP_BUILD" />;
      case 'L2.HTTP_SEND':
        return <L2Config l2Code="L2.HTTP_SEND" />;
      case 'L2.MAP_FIELD':
        return <L2Config l2Code="L2.MAP_FIELD" />;
      case 'L2.STATE_SET':
        return <L2Config l2Code="L2.STATE_SET" />;
      case 'L2.MQ_PUBLISH':
        return <L2Config l2Code="L2.MQ_PUBLISH" />;
      case 'L2.GEN_RRN':
        return <L2Config l2Code="L2.GEN_RRN" />;
      case 'L2.REQUERY_POLL':
        return <L2Config l2Code="L2.REQUERY_POLL" />;
      case 'L2.CALLBACK_PARSE':
        return <L2Config l2Code="L2.CALLBACK_PARSE" />;
      // L3 Composite nodes
      case 'L3.PAY_REQUEST':
        return <L3Config l3Code="L3.PAY_REQUEST" />;
      case 'L3.REFUND_FLOW':
        return <L3Config l3Code="L3.REFUND_FLOW" />;
      case 'L3.QUERY_FLOW':
        return <L3Config l3Code="L3.QUERY_FLOW" />;
      case 'L3.WITHDRAW_FLOW':
        return <L3Config l3Code="L3.WITHDRAW_FLOW" />;
      case 'L3.TRANSFER_FLOW':
        return <L3Config l3Code="L3.TRANSFER_FLOW" />;
      case 'L3.CAPTURE_FLOW':
        return <L3Config l3Code="L3.CAPTURE_FLOW" />;
      case 'L3.BALANCE_QUERY':
        return <L3Config l3Code="L3.BALANCE_QUERY" />;
      case 'L3.USER_AUTH':
        return <L3Config l3Code="L3.USER_AUTH" />;
      case 'L3.NOTIFY_FLOW':
        return <L3Config l3Code="L3.NOTIFY_FLOW" />;
      case 'L3.RECONCILE_FLOW':
        return <L3Config l3Code="L3.RECONCILE_FLOW" />;
      case 'L3.CONTRACT_FLOW':
        return <L3Config l3Code="L3.CONTRACT_FLOW" />;
      case 'L3.UPLOAD_FLOW':
        return <L3Config l3Code="L3.UPLOAD_FLOW" />;
      case 'L3.CLOSE_FLOW':
        return <L3Config l3Code="L3.CLOSE_FLOW" />;
      case 'L3.CREDIT_GRANT':
        return <L3Config l3Code="L3.CREDIT_GRANT" />;
      default:
        return <div>该节点类型暂无配置项</div>;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        size="small"
        title={
          <Space>
            <Tag color="blue">{node.nodeType}</Tag>
            <span>{node.nodeId}</span>
          </Space>
        }
        extra={<Button size="small" onClick={onClose}>关闭</Button>}
        style={{ flex: 1, overflow: 'auto' }}
      >
        <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
          {getConfigFields()}
        </Form>
      </Card>
    </div>
  );
}

// L2 Atomic Configuration Display
function L2Config({ l2Code }: { l2Code: string }) {
  const { l2Atomics } = useActionStore();
  const l2 = l2Atomics.find((l) => l.code === l2Code);

  if (!l2) {
    return <Text type="secondary">未找到L2组件: {l2Code}</Text>;
  }

  return (
    <div>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="名称">{l2.name}</Descriptions.Item>
        <Descriptions.Item label="功能">{l2.function}</Descriptions.Item>
        <Descriptions.Item label="类别">
          <Tag color="blue">{l2.category}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>输入参数:</Text>
        <div style={{ marginTop: 4 }}>
          {l2.input.length > 0 ? (
            l2.input.map((param, idx) => (
              <Tag key={idx} style={{ marginBottom: 2 }}>{param}</Tag>
            ))
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>无</Text>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>输出:</Text>
        <div style={{ marginTop: 4 }}>
          <Tag color="green">{l2.output}</Tag>
        </div>
      </div>

      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 8 }}>
        L2原子节点不可拆分，配置其所属的L3组件来使用
      </Text>
    </div>
  );
}

// L3 Composite Configuration Display
function L3Config({ l3Code }: { l3Code: string }) {
  const { l3Composites } = useActionStore();
  const l3 = l3Composites.find((l) => l.code === l3Code);

  if (!l3) {
    return <Text type="secondary">未找到L3组件: {l3Code}</Text>;
  }

  return (
    <div>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="名称">{l3.name}</Descriptions.Item>
        <Descriptions.Item label="功能">{l3.function}</Descriptions.Item>
        <Descriptions.Item label="描述">{l3.description}</Descriptions.Item>
      </Descriptions>

      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>状态机:</Text>
        <div style={{ marginTop: 4 }}>
          <Space wrap>
            <Tag color="blue">初始: {l3.initialState}</Tag>
            {l3.states.map((state) => (
              <Tag key={state} color={state === l3.initialState ? 'green' : 'default'}>
                {state}
              </Tag>
            ))}
          </Space>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>状态转换:</Text>
        <div style={{ marginTop: 4 }}>
          {l3.transitions.map((t, idx) => (
            <div key={idx} style={{ fontSize: 11, marginBottom: 2 }}>
              <Tag>{t.from}</Tag> → <Tag>{t.to}</Tag>
              <Text type="secondary" style={{ marginLeft: 4 }}>({t.condition})</Text>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>L4状态映射:</Text>
        <div style={{ marginTop: 4 }}>
          {l3.l4StateMapping.map((m, idx) => (
            <Tag key={idx} color="purple" style={{ marginBottom: 2 }}>
              {m.l3State} → {m.l4State}
            </Tag>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>输入参数:</Text>
        <div style={{ marginTop: 4 }}>
          {l3Composites.find(l => l.code === l3Code)?.function.includes('Pay') ? (
            <Space wrap>
              <Tag>orderNo</Tag>
              <Tag>amount</Tag>
              <Tag>currency</Tag>
              <Tag>channel</Tag>
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>依赖L2节点配置</Text>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>输出:</Text>
        <div style={{ marginTop: 4 }}>
          <Space wrap>
            <Tag color="green">l3State</Tag>
            <Tag color="green">l4State</Tag>
            <Tag color="green">result</Tag>
          </Space>
        </div>
      </div>
    </div>
  );
}

function HttpRequestConfig() {
  return (
    <>
      <Form.Item name="endpointId" label="接口">
        <Select placeholder="选择接口">
          <Select.Option value="EP001">EP001 - MoMo Pay API</Select.Option>
          <Select.Option value="EP002">EP002 - WeChat Pay API</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="method" label="HTTP方法">
        <Select placeholder="选择方法">
          <Select.Option value="POST">POST</Select.Option>
          <Select.Option value="GET">GET</Select.Option>
          <Select.Option value="PUT">PUT</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="timeout" label="超时时间(ms)">
        <Input type="number" placeholder="30000" />
      </Form.Item>
      <Form.Item name="retryCount" label="重试次数">
        <Input type="number" placeholder="0" />
      </Form.Item>
    </>
  );
}

function ConditionBranchConfig({ node, onChange }: { node: FlowNode; onChange: (c: any) => void }) {
  const config = (node as any).config || { outputs: [] };
  const outputs = config.outputs || [];

  const addOutput = () => {
    const newOutputs = [
      ...outputs,
      { outputKey: `branch_${outputs.length + 1}`, label: `分支${outputs.length + 1}`, rules: [], ruleCombine: 'AND' },
    ];
    onChange({ outputs: newOutputs });
  };

  const removeOutput = (idx: number) => {
    const newOutputs = outputs.filter((_: any, i: number) => i !== idx);
    onChange({ outputs: newOutputs });
  };

  const updateOutput = (idx: number, updates: any) => {
    const newOutputs = outputs.map((o: any, i: number) => (i === idx ? { ...o, ...updates } : o));
    onChange({ outputs: newOutputs });
  };

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addOutput}>
          添加分支
        </Button>
      </div>
      {outputs.map((output: any, idx: number) => (
        <Card key={idx} size="small" style={{ marginBottom: 8 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Input
              value={output.outputKey}
              onChange={(e) => updateOutput(idx, { outputKey: e.target.value })}
              placeholder="分支Key"
              style={{ width: 100 }}
            />
            <Input
              value={output.label}
              onChange={(e) => updateOutput(idx, { label: e.target.value })}
              placeholder="分支名称"
              style={{ width: 100 }}
            />
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeOutput(idx)} />
          </Space>
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 10, color: '#666' }}>条件规则:</p>
            <Input.TextArea
              rows={2}
              placeholder='例: orderVar.status == "PENDING"'
              onChange={(e) => updateOutput(idx, { ruleExpression: e.target.value })}
            />
          </div>
        </Card>
      ))}
    </>
  );
}

function StateTransitionConfig() {
  return (
    <>
      <Form.Item name="targetState" label="目标状态">
        <Select placeholder="选择状态">
          <Select.Option value="SUCCESS">SUCCESS - 成功</Select.Option>
          <Select.Option value="FAIL">FAIL - 失败</Select.Option>
          <Select.Option value="PENDING">PENDING - 处理中</Select.Option>
          <Select.Option value="CLOSED">CLOSED - 已关闭</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="errorState" label="错误状态">
        <Input placeholder="可选" />
      </Form.Item>
    </>
  );
}

function FieldMappingConfig({ node, onChange }: { node: FlowNode; onChange: (c: any) => void }) {
  const config = (node as any).config || { mappings: [] };
  const mappings = config.mappings || [];

  const addMapping = () => {
    const newMappings = [...mappings, { id: `m_${Date.now()}`, fromField: '', toField: '', transform: '' }];
    onChange({ mappings: newMappings });
  };

  const removeMapping = (idx: number) => {
    const newMappings = mappings.filter((_: any, i: number) => i !== idx);
    onChange({ mappings: newMappings });
  };

  const updateMapping = (idx: number, updates: any) => {
    const newMappings = mappings.map((m: any, i: number) => (i === idx ? { ...m, ...updates } : m));
    onChange({ mappings: newMappings });
  };

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addMapping}>
          添加映射
        </Button>
      </div>
      {mappings.map((mapping: any, idx: number) => (
        <Card key={mapping.id} size="small" style={{ marginBottom: 4 }}>
          <Space>
            <Input
              value={mapping.fromField}
              onChange={(e) => updateMapping(idx, { fromField: e.target.value })}
              placeholder="源字段"
              style={{ width: 120 }}
            />
            <span>→</span>
            <Input
              value={mapping.toField}
              onChange={(e) => updateMapping(idx, { toField: e.target.value })}
              placeholder="目标字段"
              style={{ width: 120 }}
            />
            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeMapping(idx)} />
          </Space>
          {mapping.transform && (
            <div style={{ marginTop: 4, fontSize: 10, color: '#666' }}>
              转换: {mapping.transform}
            </div>
          )}
        </Card>
      ))}
    </>
  );
}

function RequeryConfig() {
  return (
    <>
      <Form.Item name="strategy" label="重查策略">
        <Select placeholder="选择策略">
          <Select.Option value="FIXED">固定间隔</Select.Option>
          <Select.Option value="EXPONENTIAL">指数退避</Select.Option>
          <Select.Option value="LINEAR">线性递增</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="maxAttempts" label="最大重查次数">
        <Input type="number" placeholder="5" />
      </Form.Item>
      <Form.Item name="interval" label="重查间隔(ms)">
        <Input type="number" placeholder="3000" />
      </Form.Item>
    </>
  );
}

function GenerateDataConfig() {
  return (
    <>
      <Form.Item name="generateType" label="生成类型">
        <Select placeholder="选择类型">
          <Select.Option value="RRN">流水号(RRN)</Select.Option>
          <Select.Option value="UUID">UUID</Select.Option>
          <Select.Option value="TIMESTAMP">时间戳</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name="field" label="写入字段">
        <Input placeholder="generateData.xxx" />
      </Form.Item>
    </>
  );
}

function MqSendConfig() {
  return (
    <>
      <Form.Item name="topic" label="Topic">
        <Input placeholder="order.completed" />
      </Form.Item>
      <Form.Item name="message" label="消息内容">
        <Input.TextArea rows={3} placeholder="JSON格式消息" />
      </Form.Item>
    </>
  );
}
