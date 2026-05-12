import { useState, useEffect } from 'react';
import { Table, Button, Select, Input, Radio, Collapse, Breadcrumb, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { mockInboundEndpoints, abilityOptions, actionOptions } from '../../mock/data';
import type { InboundEndpoint, MatchRule } from './types';

export default function MatchCapabilityPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<InboundEndpoint[]>([]);

  // 初始化加载 Mock 数据
  useEffect(() => {
    const data = mockInboundEndpoints.map((ep) => ({ ...ep }));
    setEndpoints(data);
  }, [channelCode]);

  // 获取所有 Ability 选项
  const getAbilitiesByBT = (bt: string) => {
    return abilityOptions[bt] || [];
  };

  // 更新单个 endpoint
  const updateEndpoint = (index: number, updates: Partial<InboundEndpoint>) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => (i === index ? { ...ep, ...updates } : ep))
    );
  };

  // 更新规则
  const updateRule = (epIndex: number, ruleId: string, field: keyof MatchRule, value: string) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => {
        if (i !== epIndex) return ep;
        const newRules = ep.rules.map((rule) =>
          rule.id === ruleId ? { ...rule, [field]: value } : rule
        );
        return { ...ep, rules: newRules };
      })
    );
  };

  // 删除规则
  const deleteRule = (epIndex: number, ruleId: string) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => {
        if (i !== epIndex) return ep;
        return { ...ep, rules: ep.rules.filter((rule) => rule.id !== ruleId) };
      })
    );
  };

  // 新增规则
  const addRule = (epIndex: number) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => {
        if (i !== epIndex) return ep;
        const newRule: MatchRule = {
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          field1: '',
          field2: '',
          bt: 'COLLECTION',
          ability: 'CARD_PAY',
          action: 'TRANSACTION',
        };
        return { ...ep, rules: [...ep.rules, newRule] };
      })
    );
  };

  // 检查规则冲突
  const checkRuleConflict = (ep: InboundEndpoint, ruleId: string): { conflict: boolean; conflictWith?: string } => {
    const rule = ep.rules.find((r) => r.id === ruleId);
    if (!rule) return { conflict: false };

    for (const other of ep.rules) {
      if (other.id === ruleId) continue;
      const matchFieldCount = ep.matchFields.length;

      let isConflict = true;
      if (matchFieldCount >= 1) {
        if (rule.field1 !== '*' && other.field1 !== '*' && rule.field1 !== other.field1) isConflict = false;
        if (matchFieldCount >= 2) {
          if (rule.field2 !== '*' && other.field2 !== '*' && rule.field2 !== other.field2) isConflict = false;
        }
      }

      if (isConflict) return { conflict: true, conflictWith: other.id };
    }
    return { conflict: false };
  };

  // 保存
  const handleSave = () => {
    message.success('Saved successfully', 2);
  };

  // 提交
  const handleSubmit = () => {
    message.success('Submitted, version v1.2.0 generated');
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration', onClick: () => navigate(`/channel-integration/${channelCode}/integration/match-capability`) },
          { title: 'matchCapability' },
        ]}
      />

      {/* 页面标题和按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={handleSave}>Save</Button>
        <Button type="primary" onClick={handleSubmit}>Submit</Button>
      </div>

      {/* 按 inboundEndpoint 分组的 Collapse */}
      <Collapse
        accordion
        items={endpoints.map((ep, epIndex) => ({
          key: ep.name,
          label: <span style={{ fontWeight: 600 }}>{ep.name}</span>,
          children: (
            <div>
              {/* Match 类型切换 */}
              <div style={{ marginBottom: 16 }}>
                <Radio.Group
                  value={ep.matchType}
                  onChange={(e) => updateEndpoint(epIndex, { matchType: e.target.value as 'A' | 'B' })}
                >
                  <Radio value="A">基于单号匹配</Radio>
                  <Radio value="B">基于字段组合匹配 Ability</Radio>
                </Radio.Group>
              </div>

              {/* 类型 A：基于单号匹配 */}
              {ep.matchType === 'A' && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ marginRight: 8 }}>单号字段：</span>
                  <Select
                    style={{ width: 300 }}
                    placeholder="请选择携带平台单号的字段"
                    value={ep.singleNoField || undefined}
                    onChange={(val) => updateEndpoint(epIndex, { singleNoField: val })}
                    options={ep.fields.map((f) => ({ label: f, value: f }))}
                  />
                </div>
              )}

              {/* 类型 B：基于字段组合匹配 */}
              {ep.matchType === 'B' && (
                <>
                  {/* 参与匹配的字段 */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ marginRight: 8 }}>参与匹配的字段：</span>
                    <Select
                      mode="multiple"
                      style={{ width: 400 }}
                      placeholder="选择参与匹配的字段"
                      value={ep.matchFields}
                      onChange={(val) => updateEndpoint(epIndex, { matchFields: val })}
                      options={ep.fields.map((f) => ({ label: f, value: f }))}
                    />
                  </div>

                  {/* 规则表格 */}
                  {ep.matchFields.length > 0 && (
                    <Table
                      dataSource={ep.rules}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      rowClassName={(record) => (checkRuleConflict(ep, record.id).conflict ? 'ant-table-row-error' : '')}
                      footer={() => (
                        <Button
                          type="dashed"
                          block
                          icon={<PlusOutlined />}
                          onClick={() => addRule(epIndex)}
                        >
                          + Add Rule
                        </Button>
                      )}
                      columns={[
                        {
                          title: '',
                          width: 40,
                          render: () => <HolderOutlined style={{ color: '#999', cursor: 'grab' }} />,
                        },
                        {
                          title: ep.matchFields[0] || '字段1值',
                          width: 150,
                          render: (_: any, record: MatchRule) => {
                            const conflict = checkRuleConflict(ep, record.id).conflict;
                            return (
                              <Tooltip title={conflict ? '规则冲突' : ''}>
                                <Input
                                  placeholder="值或 *"
                                  value={record.field1 || ''}
                                  onChange={(e) => updateRule(epIndex, record.id, 'field1', e.target.value)}
                                  style={{ background: conflict ? '#fff2f0' : undefined }}
                                />
                              </Tooltip>
                            );
                          },
                        },
                        ...(ep.matchFields.length >= 2
                          ? [{
                              title: ep.matchFields[1] || '字段2值',
                              width: 150,
                              render: (_: any, record: MatchRule) => (
                                <Input
                                  placeholder="值或 *"
                                  value={record.field2 || ''}
                                  onChange={(e) => updateRule(epIndex, record.id, 'field2', e.target.value)}
                                />
                              ),
                            }]
                          : []),
                        {
                          title: '',
                          width: 40,
                          render: () => <span style={{ color: '#999' }}>→</span>,
                        },
                        {
                          title: 'BT',
                          width: 150,
                          render: (_: any, record: MatchRule) => (
                            <Select
                              value={record.bt}
                              onChange={(val) => updateRule(epIndex, record.id, 'bt', val)}
                              options={Object.keys(abilityOptions).map((bt) => ({ label: bt, value: bt }))}
                            />
                          ),
                        },
                        {
                          title: 'Ability',
                          width: 150,
                          render: (_: any, record: MatchRule) => (
                            <Select
                              value={record.ability}
                              onChange={(val) => updateRule(epIndex, record.id, 'ability', val)}
                              options={getAbilitiesByBT(record.bt).map((a) => ({ label: a, value: a }))}
                            />
                          ),
                        },
                        {
                          title: 'Action',
                          width: 120,
                          render: (_: any, record: MatchRule) => (
                            <Select
                              value={record.action}
                              onChange={(val) => updateRule(epIndex, record.id, 'action', val)}
                              options={actionOptions.map((a) => ({ label: a, value: a }))}
                            />
                          ),
                        },
                        {
                          title: '操作',
                          width: 60,
                          render: (_: any, record: MatchRule) => (
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => deleteRule(epIndex, record.id)}
                            />
                          ),
                        },
                      ]}
                    />
                  )}
                </>
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}