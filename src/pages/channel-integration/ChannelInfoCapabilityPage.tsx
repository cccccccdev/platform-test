import { useMemo } from 'react';
import { Button, Collapse, Empty, Space, Table, Tag, message } from 'antd';
import type { ConfigAbility } from './types';

type CapabilityRow = { key: string; ability: string; actions: string[] };

export default function ChannelInfoCapabilityPage({ cloud, env, configuredAbilities }: {
  cloud: string;
  env: string;
  configuredAbilities: ConfigAbility[];
}) {
  const groups = useMemo(() => {
    const byBusinessType = new Map<string, CapabilityRow[]>();
    configuredAbilities.forEach((capability) => {
      const publishedVersions = capability.versions.filter((version) =>
        version.badges.some((badge) => badge.cloud === cloud && badge.env === env));
      if (!publishedVersions.length) return;
      const actions = Array.from(new Set(publishedVersions.flatMap((version) =>
        version.flows.flatMap((flow) => flow.triggerEvents ?? []))));
      const rows = byBusinessType.get(capability.bt) ?? [];
      rows.push({ key: `${capability.bt}:${capability.ability}`, ability: capability.ability, actions });
      byBusinessType.set(capability.bt, rows);
    });
    return Array.from(byBusinessType.entries());
  }, [cloud, configuredAbilities, env]);

  if (!groups.length) return <Empty description="No published Capability in the current Cloud and Env." />;

  return <Collapse
    defaultActiveKey={groups.map(([businessType]) => businessType)}
    items={groups.map(([businessType, rows]) => ({
      key: businessType,
      label: <Space><strong>{businessType}</strong><Tag color="purple">CONFIG</Tag></Space>,
      children: <Table<CapabilityRow>
        rowKey="key"
        dataSource={rows}
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'ability', key: 'ability' },
          { title: 'Operation', key: 'operation', width: 180, render: (_, row) => <Button type="link" onClick={() => message.info(`Features for ${businessType} / ${row.ability}`)}>Features</Button> },
        ]}
        expandable={{
          defaultExpandAllRows: true,
          expandedRowRender: (row) => <div style={{ paddingLeft: 28 }}>
            {row.actions.length ? row.actions.map((action) => <div key={action} style={{ padding: '8px 0' }}>{action}</div>) : <span style={{ color: '#8c8c8c' }}>No Action</span>}
          </div>,
        }}
      />,
    }))}
  />;
}
