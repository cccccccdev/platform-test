import { useState } from 'react';
import { Card, Table, Input, Select, Space, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useActionStore } from '../../store';
import { NAMESPACE_COLORS } from '../../domain/context/types';

const { Text } = Typography;

const CATEGORY_OPTIONS = [
  '生命周期',
  '请求构造',
  '安全处理',
  '网络执行',
  '数据生成',
  '数据转换',
  '状态通知',
  '业务逻辑',
];

export default function L2DictionaryPage() {
  const { l2Atomics } = useActionStore();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const filteredL2s = l2Atomics.filter(l2 => {
    const matchesSearch = l2.name.toLowerCase().includes(searchText.toLowerCase()) ||
      l2.code.toLowerCase().includes(searchText.toLowerCase()) ||
      l2.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = !selectedCategory || l2.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getNamespaceColor = (field: string) => {
    if (field.startsWith('context.spi')) return NAMESPACE_COLORS['spi.request'];
    if (field.startsWith('context.orderVar')) return NAMESPACE_COLORS['orderVar'];
    if (field.startsWith('context.generateData')) return NAMESPACE_COLORS['generateData'];
    if (field.startsWith('context.channelResponse')) return NAMESPACE_COLORS['channelResponse'];
    if (field.startsWith('context.globalVar')) return NAMESPACE_COLORS['globalVar'];
    if (field.startsWith('context.credential')) return '#fa8c16';
    return '#999';
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 80,
      render: (code: string) => (
        <Tag color="blue">{code}</Tag>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: '定位描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Input',
      dataIndex: 'input',
      key: 'input',
      width: 200,
      render: (input: string[]) => (
        <Space wrap size={2}>
          {input.map((field) => (
            <Tag key={field} color={getNamespaceColor(field)} style={{ fontSize: 10 }}>
              {field}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Output',
      dataIndex: 'output',
      key: 'output',
      width: 200,
      render: (output: string[]) => (
        <Space wrap size={2}>
          {output.map((field) => (
            <Tag key={field} color={getNamespaceColor(field)} style={{ fontSize: 10 }}>
              {field}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>L2 Dictionary</h2>
        <Space>
          <Input
            placeholder="搜索编号/名称/描述"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 150 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>
          <Text type="secondary">
            共 {filteredL2s.length} 个L2原子能力
          </Text>
        </Space>
      </div>

      {/* L2 Table */}
      <Card>
        <Table
          dataSource={filteredL2s}
          columns={columns}
          rowKey="code"
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 0' }}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>编号：</Text>
                  <Tag color="blue">{record.code}</Tag>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>定位描述：</Text>
                  <Text>{record.description}</Text>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>输入字段：</Text>
                  <Space wrap size={4}>
                    {record.input.map((field: string) => (
                      <Tag key={field} color={getNamespaceColor(field)}>
                        {field}
                      </Tag>
                    ))}
                  </Space>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>输出字段：</Text>
                  <Space wrap size={4}>
                    {record.output.map((field: string) => (
                      <Tag key={field} color={getNamespaceColor(field)}>
                        {field}
                      </Tag>
                    ))}
                  </Space>
                </div>
                {record.remarks && (
                  <div>
                    <Text strong>备注：</Text>
                    <Text type="secondary">{record.remarks}</Text>
                  </div>
                )}
              </div>
            ),
          }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Legend */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>命名空间颜色说明：</Text>
        <Space style={{ marginLeft: 16 }}>
          <Tag color={NAMESPACE_COLORS['spi.request']}>spi.request</Tag>
          <Tag color={NAMESPACE_COLORS['orderVar']}>orderVar</Tag>
          <Tag color={NAMESPACE_COLORS['generateData']}>generateData</Tag>
          <Tag color={NAMESPACE_COLORS['channelResponse']}>channelResponse</Tag>
          <Tag color={NAMESPACE_COLORS['globalVar']}>globalVar</Tag>
        </Space>
      </Card>
    </div>
  );
}
