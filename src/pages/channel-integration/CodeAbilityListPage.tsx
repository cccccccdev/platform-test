import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Tooltip, Breadcrumb, message } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { mockAbilities } from '../../mock/data';
import type { Ability } from './types';
import DeployModal from './DeployModal';
import StatusModal from './StatusModal';
import ControlModal from './ControlModal';

export default function CodeAbilityListPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [deployTarget, setDeployTarget] = useState<Ability | null>(null);
  const [statusTarget, setStatusTarget] = useState<Ability | null>(null);
  const [controlTarget, setControlTarget] = useState<Ability | null>(null);

  // 初始化加载 Mock 数据（过滤 Code Integration 的 BT）
  useEffect(() => {
    // Code Integration 只有 DISBURSEMENT
    const codeAbilities = mockAbilities.filter((a) => a.bt === 'DISBURSEMENT');
    setAbilities(codeAbilities);
  }, [channelCode]);

  // 渲染发布状态
  const renderPublishStatus = (record: Ability) => {
    if (record.publishStatus === 'draft') {
      return <Tag color="default">草稿</Tag>;
    }
    if (record.publishStatus === 'pending') {
      return <Tag color="orange">待发布</Tag>;
    }
    const visible = record.badges.slice(0, 2);
    const hidden = record.badges.slice(2);
    return (
      <Space wrap>
        {visible.map((b) => (
          <Tag key={`${b.cloud}-${b.env}`} color="blue">{b.cloud} · {b.env}</Tag>
        ))}
        {hidden.length > 0 && (
          <Tooltip title={hidden.map((b) => `${b.cloud} · ${b.env}`).join('、')}>
            <Tag color="blue">+{hidden.length}</Tag>
          </Tooltip>
        )}
      </Space>
    );
  };

  // 渲染操作列
  const renderActions = (record: Ability) => {
    const isDraft = record.publishStatus === 'draft';
    if (isDraft) {
      return (
        <Space>
          <Button size="small" onClick={() => navigate(`/channel-integration/${channelCode}/integration/code/${record.bt}/${record.ability}`)}>
            Modify
          </Button>
        </Space>
      );
    }
    return (
      <Space wrap>
        <Button size="small" onClick={() => navigate(`/channel-integration/${channelCode}/integration/code/${record.bt}/${record.ability}`)}>
          Modify
        </Button>
        <Button size="small">Detail</Button>
        <Button size="small" type="primary" onClick={() => setDeployTarget(record)}>
          Deploy
        </Button>
        <Button size="small" onClick={() => setStatusTarget(record)}>
          Status
        </Button>
        <Button size="small">Log</Button>
        <Button size="small" onClick={() => setControlTarget(record)}>
          Control
        </Button>
      </Space>
    );
  };

  const columns = [
    {
      title: 'Business Type',
      dataIndex: 'bt',
      key: 'bt',
      render: (bt: string) => <span style={{ fontWeight: 600 }}>{bt}</span>,
    },
    {
      title: 'Ability',
      dataIndex: 'ability',
      key: 'ability',
    },
    {
      title: '发布状态',
      key: 'publishStatus',
      render: (_: any, record: Ability) => renderPublishStatus(record),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Ability) => renderActions(record),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration' },
          { title: 'Code Integration' },
        ]}
      />

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Code Integration</h2>
      </div>

      <Table
        dataSource={abilities}
        columns={columns}
        rowKey={(record) => `${record.bt}-${record.ability}`}
        pagination={false}
        locale={{ emptyText: '暂无 Ability' }}
      />

      <DeployModal
        open={!!deployTarget}
        bt={deployTarget?.bt || ''}
        ability={deployTarget?.ability || ''}
        onOk={() => { setDeployTarget(null); message.success('Deployed successfully'); }}
        onCancel={() => setDeployTarget(null)}
      />

      <StatusModal
        open={!!statusTarget}
        bt={statusTarget?.bt || ''}
        ability={statusTarget?.ability || ''}
        onCancel={() => setStatusTarget(null)}
      />

      <ControlModal
        open={!!controlTarget}
        ability={controlTarget?.ability || ''}
        cloud="AWS"
        env="生产"
        onCancel={() => setControlTarget(null)}
      />
    </div>
  );
}