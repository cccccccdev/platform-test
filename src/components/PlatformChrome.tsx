import { useState } from 'react';
import { Avatar, Button, Modal, Popover, Table, Tooltip } from 'antd';
import { CloudServerOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

type CloudEnvironmentRow = {
  key: string;
  cloudCode: string;
  cloudName: string;
  environment: string;
  egressIp: string;
  cloudRowSpan: number;
};

const cloudEnvironmentRows: CloudEnvironmentRow[] = [
  { key: 'aliyun-daily', cloudCode: 'ALIYUN', cloudName: 'Alibaba Cloud', environment: 'DAILY', egressIp: '203.0.113.18', cloudRowSpan: 3 },
  { key: 'aliyun-pre', cloudCode: 'ALIYUN', cloudName: 'Alibaba Cloud', environment: 'PRE', egressIp: '203.0.113.24', cloudRowSpan: 0 },
  { key: 'aliyun-prod', cloudCode: 'ALIYUN', cloudName: 'Alibaba Cloud', environment: 'PROD', egressIp: '203.0.113.30', cloudRowSpan: 0 },
  { key: 'pk-daily', cloudCode: 'PK', cloudName: 'Pakistan Regional Cloud', environment: 'DAILY', egressIp: '198.51.100.12', cloudRowSpan: 3 },
  { key: 'pk-pre', cloudCode: 'PK', cloudName: 'Pakistan Regional Cloud', environment: 'PRE', egressIp: '198.51.100.16', cloudRowSpan: 0 },
  { key: 'pk-prod', cloudCode: 'PK', cloudName: 'Pakistan Regional Cloud', environment: 'PROD', egressIp: '198.51.100.20', cloudRowSpan: 0 },
  { key: 'bd-daily', cloudCode: 'BD', cloudName: 'Bangladesh Regional Cloud', environment: 'DAILY', egressIp: '192.0.2.42', cloudRowSpan: 3 },
  { key: 'bd-pre', cloudCode: 'BD', cloudName: 'Bangladesh Regional Cloud', environment: 'PRE', egressIp: '192.0.2.48', cloudRowSpan: 0 },
  { key: 'bd-prod', cloudCode: 'BD', cloudName: 'Bangladesh Regional Cloud', environment: 'PROD', egressIp: '192.0.2.54', cloudRowSpan: 0 },
  { key: 'mfb-daily', cloudCode: 'MFB', cloudName: 'MFB Private Cloud', environment: 'DAILY', egressIp: '198.51.100.72', cloudRowSpan: 3 },
  { key: 'mfb-pre', cloudCode: 'MFB', cloudName: 'MFB Private Cloud', environment: 'PRE', egressIp: '198.51.100.78', cloudRowSpan: 0 },
  { key: 'mfb-prod', cloudCode: 'MFB', cloudName: 'MFB Private Cloud', environment: 'PROD', egressIp: '198.51.100.84', cloudRowSpan: 0 },
];

export function Brand() {
  return (
    <div className="platform-brand">
      <span className="platform-brand-mark">◇</span>
      <span>Omnicore Solution</span>
    </div>
  );
}

export function UserProfile({ dark = false, name = '我爱北京天安门' }: { dark?: boolean; name?: string }) {
  const navigate = useNavigate();
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileCard = (
    <div className="account-popover-card">
      <div className="account-popover-identity">
        <Avatar size={48} icon={<UserOutlined />} className="platform-user-avatar" />
        <div>
          <span className="account-popover-label">Signed in as</span>
          <strong>{name}</strong>
        </div>
      </div>
      <button
        type="button"
        className="account-popover-action"
        onClick={() => {
          setProfileOpen(false);
          navigate('/home');
        }}
      >
        <LogoutOutlined />
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <>
      <div className={`platform-user${dark ? ' platform-user-dark' : ''}`}>
        <Tooltip title="Cloud environment and egress IP">
          <button
            type="button"
            className="platform-header-icon-button"
            aria-label="View cloud environment and egress IP"
            onClick={() => setNetworkModalOpen(true)}
          >
            <CloudServerOutlined />
          </button>
        </Tooltip>
        <Popover
          arrow={false}
          trigger="click"
          placement="bottomRight"
          open={profileOpen}
          onOpenChange={setProfileOpen}
          content={profileCard}
          rootClassName="account-popover"
        >
          <button
            type="button"
            className="platform-avatar-button"
            aria-label={`Open account menu for ${name}`}
          >
            <Avatar size={28} icon={<UserOutlined />} className="platform-user-avatar" />
          </button>
        </Popover>
      </div>
      <Modal
        className="cloud-network-modal"
        title="Cloud network information"
        open={networkModalOpen}
        width={720}
        footer={null}
        onCancel={() => setNetworkModalOpen(false)}
      >
        <Table<CloudEnvironmentRow>
          className="cloud-network-table"
          dataSource={cloudEnvironmentRows}
          pagination={false}
          size="middle"
          columns={[
            {
              title: 'Cloud',
              dataIndex: 'cloudCode',
              width: '42%',
              onCell: (record) => ({ rowSpan: record.cloudRowSpan }),
              render: (_, record) => (
                <div className="cloud-name-cell">
                  <strong>{record.cloudCode}</strong>
                  <span>{record.cloudName}</span>
                </div>
              ),
            },
            {
              title: 'Environment',
              dataIndex: 'environment',
              width: '24%',
              render: (environment: string) => <span className="environment-code">{environment}</span>,
            },
            {
              title: 'Egress IP',
              dataIndex: 'egressIp',
              render: (egressIp: string) => <code className="egress-ip">{egressIp}</code>,
            },
          ]}
        />
        <div className="cloud-network-footer">
          <Button onClick={() => setNetworkModalOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  );
}
