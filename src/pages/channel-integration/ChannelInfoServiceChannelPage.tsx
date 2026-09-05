import { useMemo, useState } from 'react';
import { Button, Checkbox, Collapse, Empty, Form, Input, Modal, Select, Space, Table, Tabs, Typography, message } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import { mockChannels } from '../../mock/data';
import type { ConfigAbility } from './types';

type PublishedAbility = {
  key: string;
  businessType: string;
  ability: string;
  actions: string[];
};

type ServiceChannelRecord = {
  key: string;
  code: string;
  party: string;
  operator: string;
  operationTime: string;
  support: Record<string, string[]>;
};

const now = () => new Date().toLocaleString('sv-SE').replace('T', ' ');

function publishedAbilities(configuredAbilities: ConfigAbility[], cloud: string, env: string): PublishedAbility[] {
  return configuredAbilities.flatMap((capability) => {
    const versions = capability.versions.filter((version) =>
      version.badges.some((badge) => badge.cloud === cloud && badge.env === env));
    if (!versions.length) return [];
    const actions = Array.from(new Set(versions.flatMap((version) =>
      version.flows.flatMap((flow) => flow.triggerEvents ?? []))));
    return [{
      key: `${capability.bt}:${capability.ability}`,
      businessType: capability.bt,
      ability: capability.ability,
      actions,
    }];
  });
}

const seedRecords = (channelCode: string, partyOptions: string[], abilities: PublishedAbility[]): ServiceChannelRecord[] => {
  if (channelCode !== 'COBO' || !partyOptions.length || !abilities.length) return [];
  return [{
    key: 'COBO:ALIYUN:DAILY:COBO',
    code: 'COBO',
    party: partyOptions[0],
    operator: 'Abe',
    operationTime: '2026-09-04 10:00:00',
    support: Object.fromEntries(abilities.map((item) => [item.key, item.actions])),
  }];
};

export default function ChannelInfoServiceChannelPage({
  channelCode,
  cloud,
  env,
  configuredAbilities,
  selectedCode,
  onSelect,
}: {
  channelCode: string;
  cloud: string;
  env: string;
  configuredAbilities: ConfigAbility[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
}) {
  const [createForm] = Form.useForm<{ code: string; party: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [abilityOpen, setAbilityOpen] = useState(false);
  const abilities = useMemo(
    () => publishedAbilities(configuredAbilities, cloud, env),
    [cloud, configuredAbilities, env],
  );
  const partyOptions = useMemo(() => {
    const channel = mockChannels.find((item) => item.code === channelCode);
    return channel?.party ?? [];
  }, [channelCode]);
  const storageKey = `${channelCode}:${cloud}:${env}`;
  const [recordsByScope, setRecordsByScope] = useState<Record<string, ServiceChannelRecord[]>>({});
  const records = recordsByScope[storageKey] ?? seedRecords(channelCode, partyOptions, abilities);
  const selected = records.find((item) => item.code === selectedCode) ?? null;
  const businessTypes = useMemo(
    () => Array.from(new Set(abilities.map((item) => item.businessType))),
    [abilities],
  );
  const [activeBusinessType, setActiveBusinessType] = useState<string>();
  const currentBusinessType = activeBusinessType && businessTypes.includes(activeBusinessType)
    ? activeBusinessType
    : businessTypes[0];
  const [draftSupport, setDraftSupport] = useState<Record<string, string[]>>({});

  const saveCreate = async () => {
    const values = await createForm.validateFields();
    if (records.some((item) => item.code.trim().toLowerCase() === values.code.trim().toLowerCase())) {
      createForm.setFields([{ name: 'code', errors: ['Service Channel already exists in this Cloud and Env'] }]);
      return;
    }
    const record: ServiceChannelRecord = {
      key: `${storageKey}:${values.code.trim()}`,
      code: values.code.trim(),
      party: values.party,
      operator: 'current.user',
      operationTime: now(),
      support: {},
    };
    setRecordsByScope((current) => ({ ...current, [storageKey]: [...records, record] }));
    setCreateOpen(false);
    createForm.resetFields();
    message.success('Service Channel created');
  };

  const openAbility = (businessType: string) => {
    setActiveBusinessType(businessType);
    setDraftSupport(Object.fromEntries(abilities
      .filter((item) => item.businessType === businessType)
      .map((item) => [item.key, selected?.support[item.key] ?? []])));
    setAbilityOpen(true);
  };

  const saveAbility = () => {
    if (!selected || !currentBusinessType) return;
    const nextSupport = { ...selected.support };
    abilities.filter((item) => item.businessType === currentBusinessType).forEach((item) => {
      nextSupport[item.key] = draftSupport[item.key] ?? [];
    });
    setRecordsByScope((current) => ({
      ...current,
      [storageKey]: records.map((item) => item.key === selected.key
        ? { ...item, support: nextSupport, operator: 'current.user', operationTime: now() }
        : item),
    }));
    setAbilityOpen(false);
    message.success('Supported Ability updated');
  };

  const abilityTabs = (businessType: string, editable: boolean) => abilities
    .filter((item) => item.businessType === businessType)
    .map((ability) => ({
      key: ability.key,
      label: ability.ability,
      children: ability.actions.length ? (
        <Table
          rowKey={(action) => action}
          pagination={false}
          dataSource={ability.actions}
          columns={[
            { title: 'Action', dataIndex: 'action', render: (_, action: string) => action },
            { title: 'Mandatory', width: '30%', render: () => 'No' },
            {
              title: editable ? <Space><Checkbox
                checked={ability.actions.length > 0 && (draftSupport[ability.key]?.length ?? 0) === ability.actions.length}
                indeterminate={(draftSupport[ability.key]?.length ?? 0) > 0 && (draftSupport[ability.key]?.length ?? 0) < ability.actions.length}
                onChange={(event) => setDraftSupport((current) => ({
                  ...current,
                  [ability.key]: event.target.checked ? ability.actions : [],
                }))}
              />Support</Space> : 'Support',
              width: '34%',
              render: (_, action: string) => <Checkbox
                disabled={!editable}
                checked={(editable ? draftSupport : selected?.support ?? {})[ability.key]?.includes(action)}
                onChange={(event) => setDraftSupport((current) => ({
                  ...current,
                  [ability.key]: event.target.checked
                    ? Array.from(new Set([...(current[ability.key] ?? []), action]))
                    : (current[ability.key] ?? []).filter((item) => item !== action),
                }))}
              />,
            },
          ]}
        />
      ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No published Action" />,
    }));

  if (selected) return <div className="service-channel-detail">
    <div className="service-channel-context"><strong>Service Channel:</strong> {selected.code}</div>
    {businessTypes.length ? <Collapse
      defaultActiveKey={businessTypes}
      items={businessTypes.map((businessType) => ({
        key: businessType,
        label: businessType,
        extra: <Button type="text" icon={<PlusCircleOutlined />} onClick={(event) => {
          event.stopPropagation();
          openAbility(businessType);
        }}>Add Support Ability</Button>,
        children: <Tabs items={abilityTabs(businessType, false)} />,
      }))}
    /> : <Empty description="No published Ability in the current Cloud and Env." />}
    <Modal
      title="Add Ability"
      open={abilityOpen}
      width={1100}
      className="service-channel-ability-modal"
      onCancel={() => setAbilityOpen(false)}
      onOk={saveAbility}
      okText="Submit"
    >
      <Typography.Title level={5}>Business Type: {currentBusinessType}</Typography.Title>
      {currentBusinessType && <Tabs items={abilityTabs(currentBusinessType, true)} />}
    </Modal>
  </div>;

  return <div className="service-channel-list">
    <div className="service-channel-list-actions">
      <Button type="primary" onClick={() => setCreateOpen(true)}>Create Service Channel</Button>
    </div>
    <Table<ServiceChannelRecord>
      rowKey="key"
      dataSource={records}
      pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }}
      columns={[
        { title: 'Channel Code', dataIndex: 'code' },
        { title: 'Party', dataIndex: 'party' },
        { title: 'Operator', dataIndex: 'operator' },
        { title: 'Operation Time', dataIndex: 'operationTime' },
        { title: 'Operation', width: 150, render: (_, record) => <Button type="link" onClick={() => onSelect(record.code)}>Capability</Button> },
      ]}
    />
    <Modal
      title="Create Service"
      open={createOpen}
      width={720}
      className="service-channel-create-modal"
      onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
      onOk={saveCreate}
      okText="OK"
    >
      <Form form={createForm} layout="vertical">
        <Form.Item name="code" label="Service Channel" rules={[{ required: true, whitespace: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="party" label="Party" rules={[{ required: true }]}>
          <Select showSearch options={partyOptions.map((value) => ({ label: value, value }))} />
        </Form.Item>
      </Form>
    </Modal>
  </div>;
}
