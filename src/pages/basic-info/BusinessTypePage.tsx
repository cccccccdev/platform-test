import { useState } from 'react';
import { Card, Tree, Button, Space, Modal, Form, Input, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface BusinessTypeNode {
  key: string;
  name: string;
  code: string;
  children?: BusinessTypeNode[];
}

const MOCK_TREE_DATA: BusinessTypeNode[] = [
  {
    key: 'online',
    name: '线上支付',
    code: 'ONLINE',
    children: [
      { key: 'online-quick', name: '快捷支付', code: 'ONLINE.QUICK' },
      { key: 'online-wap', name: 'Wap支付', code: 'ONLINE.WAP' },
      { key: 'online-app', name: 'App支付', code: 'ONLINE.APP' },
      { key: 'online-web', name: 'Web支付', code: 'ONLINE.WEB' },
    ],
  },
  {
    key: 'offline',
    name: '线下支付',
    code: 'OFFLINE',
    children: [
      { key: 'offline-pos', name: 'POS支付', code: 'OFFLINE.POS' },
      { key: 'offline-cash', name: '现金支付', code: 'OFFLINE.CASH' },
      { key: 'offline-scan', name: '扫码支付', code: 'OFFLINE.SCAN' },
    ],
  },
  {
    key: 'refund',
    name: '退款',
    code: 'REFUND',
    children: [
      { key: 'refund-full', name: '全额退款', code: 'REFUND.FULL' },
      { key: 'refund-partial', name: '部分退款', code: 'REFUND.PARTIAL' },
    ],
  },
  {
    key: 'transfer',
    name: '转账',
    code: 'TRANSFER',
    children: [
      { key: 'transfer-internal', name: '内部转账', code: 'TRANSFER.INTERNAL' },
      { key: 'transfer-external', name: '跨行转账', code: 'TRANSFER.EXTERNAL' },
    ],
  },
];

export default function BusinessTypePage() {
  const [treeData, setTreeData] = useState(MOCK_TREE_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<BusinessTypeNode | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingNode(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (node: BusinessTypeNode) => {
    setEditingNode(node);
    form.setFieldsValue({
      name: node.name,
      code: node.code,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (key: string) => {
    const deleteNode = (nodes: BusinessTypeNode[]): BusinessTypeNode[] => {
      return nodes.filter((n) => {
        if (n.key === key) return false;
        if (n.children) {
          n.children = deleteNode(n.children);
        }
        return true;
      });
    };
    setTreeData(deleteNode([...treeData]));
    message.success('删除成功');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingNode) {
        const updateNode = (nodes: BusinessTypeNode[]): BusinessTypeNode[] => {
          return nodes.map((n) => {
            if (n.key === editingNode.key) {
              return { ...n, name: values.name, code: values.code };
            }
            if (n.children) {
              n.children = updateNode(n.children);
            }
            return n;
          });
        };
        setTreeData(updateNode([...treeData]));
        message.success('更新成功');
      } else {
        const newNode: BusinessTypeNode = {
          key: `new_${Date.now()}`,
          name: values.name,
          code: values.code,
          children: [],
        };
        setTreeData([...treeData, newNode]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
    } catch {}
  };

  const renderTreeNodes = (data: BusinessTypeNode[]): any[] => {
    return data.map((node) => ({
      key: node.key,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{node.name}</span>
          <Tag color="blue" style={{ fontSize: 10 }}>{node.code}</Tag>
          <Space size={4}>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(node)} />
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(node.key)} />
          </Space>
        </div>
      ),
      children: node.children ? renderTreeNodes(node.children) : undefined,
    }));
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <Card
        title="业务类型配置"
        style={{ margin: '24px 0' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增业务类型
          </Button>
        }
      >
        <Tree
          treeData={renderTreeNodes(treeData)}
          defaultExpandAll
          blockNode
        />
      </Card>

      <Modal
        title={editingNode ? '编辑业务类型' : '新增业务类型'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="业务类型名称" rules={[{ required: true }]}>
            <Input placeholder="如：快捷支付" />
          </Form.Item>
          <Form.Item name="code" label="业务类型编码" rules={[{ required: true }]}>
            <Input placeholder="如：ONLINE.QUICK" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
