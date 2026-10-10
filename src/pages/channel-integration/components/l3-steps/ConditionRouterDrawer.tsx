import { useState } from 'react';
import { Drawer, Form, Input, Radio, Button, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ConditionGroupEditor } from '../common';

interface BranchRow {
  key: string;
  name: string;
  relation: 'AND' | 'OR';
  conditions: { key: string; field: string; operator: string; value: string }[];
  isDefault?: boolean;
}

interface ConditionRouterDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
  initialValues?: any;
}

export default function ConditionRouterDrawer({
  visible,
  onClose,
  onSave,
  initialValues,
}: ConditionRouterDrawerProps) {
  const [form] = Form.useForm();
  const [branchMode, setBranchMode] = useState<'multi' | 'binary'>('multi');
  const [branches, setBranches] = useState<BranchRow[]>(initialValues?.branches || [
    { key: 'branch_1', name: '分支 1', relation: 'AND', conditions: [] },
    { key: 'branch_2', name: '分支 2', relation: 'AND', conditions: [] },
    { key: 'default', name: 'DEFAULT', relation: 'AND', conditions: [], isDefault: true },
  ]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    onSave({ ...values, branches, branchMode });
  };

  const addBranch = () => {
    setBranches([...branches, {
      key: `branch_${Date.now()}`,
      name: `分支 ${branches.length}`,
      relation: 'AND',
      conditions: [],
    }]);
  };

  const removeBranch = (key: string) => {
    setBranches(branches.filter(b => b.key !== key));
  };

  return (
    <Drawer
      title="Condition Branch"
      open={visible}
      onClose={onClose}
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="分支模式" name="branchMode">
          <Radio.Group onChange={(e) => setBranchMode(e.target.value)}>
            <Radio value="multi">多路分支</Radio>
            <Radio value="binary">二元分支（IF / ELSE）</Radio>
          </Radio.Group>
        </Form.Item>

        <div style={{ fontWeight: 500, marginBottom: 8 }}>分支配置</div>
        <Space direction="vertical" style={{ width: '100%' }}>
          {branches.map((branch, index) => (
            <div key={branch.key} style={{
              padding: 16,
              background: branch.isDefault ? '#fffbe6' : '#fafafa',
              borderRadius: 4,
              border: branch.isDefault ? '1px solid #ffe58f' : '1px solid #f0f0f0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space>
                  {branch.isDefault ? (
                    <Tag color="orange">DEFAULT（兜底）</Tag>
                  ) : (
                    <Input
                      value={branch.name}
                      onChange={(e) => {
                        const newBranches = [...branches];
                        newBranches[index].name = e.target.value;
                        setBranches(newBranches);
                      }}
                      placeholder="分支名称"
                      style={{ width: 120 }}
                    />
                  )}
                </Space>
                {!branch.isDefault && (
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeBranch(branch.key)} />
                )}
              </div>

              {!branch.isDefault && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    条件关系：
                    <Radio.Group
                      value={branch.relation}
                      onChange={(e) => {
                        const newBranches = [...branches];
                        newBranches[index].relation = e.target.value;
                        setBranches(newBranches);
                      }}
                      style={{ marginLeft: 8 }}
                    >
                      <Radio value="AND">AND</Radio>
                      <Radio value="OR">OR</Radio>
                    </Radio.Group>
                  </div>

                  <ConditionGroupEditor
                    value={{ relation: branch.relation, conditions: branch.conditions }}
                    onChange={(val) => {
                      const newBranches = [...branches];
                      newBranches[index].conditions = val?.conditions || [];
                      setBranches(newBranches);
                    }}
                  />
                </>
              )}

              {branch.isDefault && (
                <div style={{ color: '#999', fontSize: 12 }}>
                  无条件，所有分支均不匹配时执行
                </div>
              )}
            </div>
          ))}

          {branchMode === 'multi' && (
            <Button type="dashed" icon={<PlusOutlined />} onClick={addBranch} block>
              新增分支
            </Button>
          )}
        </Space>
      </Form>
    </Drawer>
  );
}
