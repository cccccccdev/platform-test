import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, TreeSelect, Button, Breadcrumb, Space, message } from 'antd';
import { mockChannels } from '../../mock/data';
import type { Channel } from './types';

const organizationTreeData = [
  {
    title: 'Technology Division',
    value: 'tech-div',
    children: [
      {
        title: 'Payment Team',
        value: 'payment-team',
        children: [
          { title: 'Zhang San', value: 'zhangsan' },
          { title: 'Li Si', value: 'lisi' },
          { title: 'Wang Wu', value: 'wangwu' },
        ],
      },
      {
        title: 'Backend Team',
        value: 'backend-team',
        children: [
          { title: 'Zhao Liu', value: 'zhaoliu' },
          { title: 'Sun Qi', value: 'sunqi' },
        ],
      },
    ],
  },
  {
    title: 'Product Division',
    value: 'product-div',
    children: [
      {
        title: 'Product Design',
        value: 'product-design',
        children: [
          { title: 'Zhou Ba', value: 'zhouba' },
          { title: 'Wu Jiu', value: 'wujiu' },
        ],
      },
    ],
  },
  {
    title: 'Operations Division',
    value: 'ops-div',
    children: [
      {
        title: 'Operations Support',
        value: 'ops-support',
        children: [
          { title: 'Zheng Shi', value: 'zhengshi' },
        ],
      },
    ],
  },
];

export default function BasicInfoPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const found = mockChannels.find((c) => (c as unknown as Channel).code === channelCode);
    if (found) {
      const ch = found as unknown as Channel;
      setChannel(ch);
      form.setFieldsValue({
        productOwner: ch.productOwner,
        developmentOwner: ch.developmentOwner,
        operationOwner: ch.operationOwner,
        productApprover: ch.productApprover,
        developmentApprover: ch.developmentApprover,
        operationApprover: ch.operationApprover,
      });
    }
  }, [channelCode, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    // Update channel in mock data
    const index = mockChannels.findIndex((c) => (c as unknown as Channel).code === channelCode);
    if (index !== -1) {
      (mockChannels[index] as unknown as Channel).productOwner = values.productOwner;
      (mockChannels[index] as unknown as Channel).developmentOwner = values.developmentOwner;
      (mockChannels[index] as unknown as Channel).operationOwner = values.operationOwner;
      (mockChannels[index] as unknown as Channel).productApprover = values.productApprover;
      (mockChannels[index] as unknown as Channel).developmentApprover = values.developmentApprover;
      (mockChannels[index] as unknown as Channel).operationApprover = values.operationApprover;
    }
    message.success('Basic Info updated successfully');
    navigate(`/channel-integration`);
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Omnicore Solution' },
          { title: 'Channel Integration', href: '/channel-integration' },
          { title: channelCode },
          { title: 'Basic Info' },
        ]}
      />

      <Card title="Basic Information">
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item
            name="productOwner"
            label="Product Owner"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Product Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="developmentOwner"
            label="Development Owner"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Development Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="operationOwner"
            label="Operation Owner"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Operation Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="productApprover"
            label="Product Approver"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Product Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="developmentApprover"
            label="Development Approver"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Development Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="operationApprover"
            label="Operation Approver"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Operation Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSave}>
                Save
              </Button>
              <Button onClick={() => navigate(`/channel-integration`)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}