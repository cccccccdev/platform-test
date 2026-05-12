import { Modal, Form, Checkbox, Divider, Tag, Alert, Button, Space } from 'antd';

interface DeployModalProps {
  open: boolean;
  bt: string;
  ability: string;
  onOk: () => void;
  onCancel: () => void;
}

export default function DeployModal({ open, bt, ability, onOk, onCancel }: DeployModalProps) {
  const [selectedClouds, setSelectedClouds] = useState<string[]>(['AWS', 'GCP']);
  const [selectedApps, setSelectedApps] = useState<string[]>(['payment-core']);
  const [form] = Form.useForm();

  return (
    <Modal
      title={`Deploy · ${bt} · ${ability}`}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="Confirm Deploy"
      cancelText="Cancel"
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 版本信息 */}
        <div>
          <span style={{ fontWeight: 600 }}>版本：</span>
          <span>v1.2.0（2026-05-07 14:30 提交）</span>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 部署目标 */}
        <Form form={form} layout="vertical">
          <Form.Item label="部署目标 - 云">
            <Checkbox.Group
              value={selectedClouds}
              onChange={(values) => setSelectedClouds(values as string[])}
              options={['AWS', 'GCP', 'Azure'].map((c) => ({ label: c, value: c }))}
            />
          </Form.Item>
          <Form.Item label="部署目标 - 应用">
            <Checkbox.Group
              value={selectedApps}
              onChange={(values) => setSelectedApps(values as string[])}
              options={['payment-core', 'payment-gateway'].map((a) => ({ label: a, value: a }))}
            />
          </Form.Item>
        </Form>

        <Divider style={{ margin: '12px 0' }} />

        {/* 目标环境 */}
        <div>
          <span style={{ fontWeight: 600 }}>目标环境（自动判断，只读展示）</span>
          <div style={{ marginTop: 8 }}>
            <Space>
              <Tag color="blue">AWS → 测试</Tag>
              <span style={{ color: '#999' }}>当前最高：未发布</span>
            </Space>
          </div>
          <div style={{ marginTop: 4 }}>
            <Space>
              <Tag color="green">GCP → PRE</Tag>
              <span style={{ color: '#999' }}>当前最高：测试 ✅ Happy Path 已通过</span>
            </Space>
          </div>
        </div>

        {/* 警告信息 */}
        <Alert
          type="warning"
          message="GCP 晋级到 PRE 需确认 Happy Path 测试已通过"
          action={<Button size="small" type="link">查看测试报告</Button>}
        />
      </Space>
    </Modal>
  );
}

import { useState } from 'react';