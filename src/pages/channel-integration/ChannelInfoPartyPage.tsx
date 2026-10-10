import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockChannelInfoPartyAccounts, mockChannels, mockCredentials } from '../../mock/data';
import { getCreatedIntegrationRecord } from './channelCreationStore';
import { parsePartyPath } from './channelInfoPartyRoute';
import type { InboundEndpoint } from './types';
import PartyLineWorkspace from './PartyLineWorkspace';
import './ChannelInfoPartyPage.css';

type CredentialRow = { field: string; value: string };
type CredentialDraft = CredentialRow;
type AccountRow = { accountCode: string; operator: string; operationTime: string };

interface PartyPageProps {
  channelCode: string;
  cloud: string;
  env: string;
  routeMatchingEndpoints: InboundEndpoint[];
}

function maskCredential(value: string) {
  if (!value) return '-';
  if (value.length < 5) return '•'.repeat(value.length);
  return `${value.slice(0, 2)}${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`;
}

function now() {
  return new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19);
}

export default function ChannelInfoPartyPage({ channelCode, cloud, env, routeMatchingEndpoints }: PartyPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const route = parsePartyPath(location.pathname);
  const basePath = `/channel-integration/${encodeURIComponent(channelCode)}/channel-info/party`;
  const environmentKey = `${channelCode}:${cloud}:${env}`;
  const [credentialRows, setCredentialRows] = useState<Record<string, CredentialRow[]>>({});
  const [credentialMeta, setCredentialMeta] = useState<Record<string, { validity: string; operator: string; operationTime: string }>>({});
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [credentialForm] = Form.useForm<{ rows: CredentialDraft[]; validity: string; notStoredInKms: boolean }>();
  const [accountRows, setAccountRows] = useState<Record<string, AccountRow[]>>({});
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountForm] = Form.useForm<{ accountCode: string }>();

  const parties = useMemo(() => {
    const integrationRecord = getCreatedIntegrationRecord(channelCode);
    const configured = integrationRecord?.partyScopes.map((item) => item.party) ?? [];
    const seeded = mockChannels.find((item) => item.code === channelCode)?.party ?? [];
    return Array.from(new Set(configured.length ? configured : seeded));
  }, [channelCode]);

  const accountScopeKey = `${environmentKey}:${route.party}`;
  const accounts = accountRows[accountScopeKey] ?? mockChannelInfoPartyAccounts[accountScopeKey] ?? [];

  const credentialKey = `${environmentKey}:${route.party}:${route.account || 'party'}`;
  const defaultCredentials = useMemo<CredentialRow[]>(() => {
    return (mockCredentials[channelCode] ?? []).map((item, index) => ({
      field: item.key,
      value: index === 0 ? `${channelCode}-${route.party}-${route.account || 'party'}-${item.key}-value` : `${item.key}-${route.account || 'party'}-secret-value`,
    }));
  }, [channelCode, route.account, route.party]);
  const currentCredentials = credentialRows[credentialKey] ?? defaultCredentials;
  const meta = credentialMeta[credentialKey] ?? {
    validity: '2034-03-31',
    operator: 'Zhang Wei',
    operationTime: '2026-05-19 11:23:28',
  };

  const go = (suffix = '') => navigate(`${basePath}${suffix}`);
  const openCredentialConfig = () => {
    credentialForm.setFieldsValue({
      rows: currentCredentials.map((row) => ({ ...row })),
      validity: meta.validity,
      notStoredInKms: true,
    });
    setCredentialOpen(true);
  };

  const saveCredential = async () => {
    const values = await credentialForm.validateFields();
    const rows = (values.rows ?? [])
      .filter((row) => row.field?.trim() || row.value?.trim())
      .map((row) => ({ field: row.field.trim(), value: row.value.trim() }));
    if (!rows.length || rows.some((row) => !row.field || !row.value)) {
      message.error('Complete at least one Credential Field and Credential Value.');
      return;
    }
    setCredentialRows((current) => ({ ...current, [credentialKey]: rows }));
    setCredentialMeta((current) => ({
      ...current,
      [credentialKey]: { validity: values.validity, operator: 'current.user', operationTime: now() },
    }));
    setCredentialOpen(false);
    message.success('Credential configuration saved');
  };

  const createAccount = async () => {
    const { accountCode } = await accountForm.validateFields();
    const normalizedCode = accountCode.trim();
    if (accounts.some((row) => row.accountCode.toLowerCase() === normalizedCode.toLowerCase())) {
      message.error('Account already exists in the selected Cloud and Environment.');
      return;
    }
    setAccountRows((current) => ({
      ...current,
      [accountScopeKey]: [
        ...accounts,
        { accountCode: normalizedCode, operator: 'current.user', operationTime: now() },
      ],
    }));
    accountForm.resetFields();
    setAccountOpen(false);
    message.success('Account created');
  };

  const context = (
    <div className="party-page-context">
      {route.party && <span><strong>Party:</strong> {route.party}</span>}
      {route.account && <span><strong>Account:</strong> {route.account}</span>}
    </div>
  );

  const credentialPage = () => (
    <Card className="party-runtime-card">
      {context}
      <div className="party-credential-meta">
        <span>Validity Period: <Tag color="purple">{meta.validity}</Tag></span>
        <span>Operator: <strong>{meta.operator}</strong></span>
        <span>Operation Time: <strong>{meta.operationTime}</strong></span>
        <span>Approval Status: <b>-</b></span>
        <span>Approval Order Number: <b>-</b></span>
        <span>Approval Approver: <b>-</b></span>
        <Button type="primary" onClick={openCredentialConfig}>Config</Button>
      </div>
      <Table
        rowKey="field"
        dataSource={currentCredentials}
        locale={{ emptyText: <Empty description="No credential configured for this scope." /> }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        columns={[
          { title: 'Credential Field', dataIndex: 'field', width: '38%' },
          { title: 'Credential Value', dataIndex: 'value', render: (value: string) => <span className="credential-secret">{maskCredential(value)}</span> },
        ]}
      />
    </Card>
  );

  const linePage = () => <PartyLineWorkspace
    channelCode={channelCode}
    cloud={cloud}
    env={env}
    party={route.party}
    account={route.account}
    routeMatchingEndpoints={routeMatchingEndpoints}
  />;

  let content;
  if (route.view === 'list') {
    content = <Card className="party-runtime-card party-list-card">
        <Table
          rowKey={(party) => party}
          dataSource={parties}
          locale={{ emptyText: <Empty description="No Party is configured for this Channel in Channel Integration." /> }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
          columns={[
            { title: 'Party', width: '34%', render: (party: string) => party },
            {
              title: 'Operation',
              render: (party: string) => <Space size={4} wrap>
                  <Button type="link" onClick={() => go(`/${encodeURIComponent(party)}/credential`)}>Credential</Button>
                  <Button type="link" onClick={() => go(`/${encodeURIComponent(party)}/line`)}>Line</Button>
                  <Button type="link" onClick={() => go(`/${encodeURIComponent(party)}/accounts`)}>Accounts</Button>
                  <Button type="link" onClick={() => go(`/${encodeURIComponent(party)}/portal`)}>Portal</Button>
                </Space>,
            },
          ]}
        />
      </Card>;
  } else if (route.view === 'credential' || route.view === 'account-credential') {
    content = credentialPage();
  } else if (route.view === 'line' || route.view === 'account-line') {
    content = linePage();
  } else if (route.view === 'accounts') {
    content = <Card className="party-runtime-card">
      {context}
      <div className="party-line-actions"><Button type="primary" onClick={() => setAccountOpen(true)}>Add Account</Button></div>
      <Table
        rowKey="accountCode"
        dataSource={accounts}
        locale={{ emptyText: <Empty description="No account configured for this Party in the selected Cloud and Environment." /> }}
        pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }}
        columns={[
          { title: 'Account', dataIndex: 'accountCode', width: '45%' },
          { title: 'Operation', render: (_, row) => <Space size={4}>
            <Button type="link" onClick={() => go(`/${encodeURIComponent(route.party)}/accounts/${encodeURIComponent(row.accountCode)}/credential`)}>Credential</Button>
            <Button type="link" onClick={() => go(`/${encodeURIComponent(route.party)}/accounts/${encodeURIComponent(row.accountCode)}/line`)}>Line</Button>
          </Space> },
        ]}
      />
    </Card>;
  } else {
    content = <Card className="party-runtime-card">
      {context}
      <Alert
        type="info"
        showIcon
        message="Portal remains on the production 1.0 experience"
        description="The reference workspace contains the Portal entry but no restored Portal page or interaction. This page is intentionally left as a reviewable placeholder until production screenshots are provided."
      />
    </Card>;
  }

  return <>
    {content}

    <Modal title="Config Credential" open={credentialOpen} onCancel={() => setCredentialOpen(false)} onOk={() => void saveCredential()} okText="Save" width={760} destroyOnHidden>
      <div className="credential-modal-context"><strong>Party:</strong> {route.party}{route.account && <><strong>Account:</strong> {route.account}</>}</div>
      <Form form={credentialForm} layout="vertical">
        <Form.List name="rows">
          {(fields) => <>
            <div className="credential-modal-grid credential-modal-head"><span>Credential Field</span><span>Credential Value</span><span /></div>
            {fields.map((field) => <div className="credential-modal-grid" key={field.key}>
                <Form.Item name={[field.name, 'field']} rules={[{ required: true, message: 'Enter Credential Field' }]}><Input disabled /></Form.Item>
                <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: 'Enter Credential Value' }]}><Input.Password visibilityToggle /></Form.Item>
                <span />
              </div>)}
          </>}
        </Form.List>
        <Form.Item name="validity" label="Credential Value Validity Period" rules={[{ required: true }]} style={{ marginTop: 24 }}><Input type="date" /></Form.Item>
        <Form.Item name="notStoredInKms" valuePropName="checked"><Checkbox>not stored in KMS</Checkbox></Form.Item>
      </Form>
    </Modal>

    <Modal title="Add Account" open={accountOpen} onCancel={() => setAccountOpen(false)} onOk={() => void createAccount()} okText="OK" destroyOnHidden>
      <Form form={accountForm} layout="vertical" style={{ marginTop: 20 }}>
        <Form.Item name="accountCode" label="Account" rules={[{ required: true, whitespace: true, message: 'Enter Account' }]}>
          <Input placeholder="Enter Account" maxLength={100} />
        </Form.Item>
      </Form>
    </Modal>

  </>;
}
