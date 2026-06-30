import { useEffect, useState } from 'react';
import { Button, Collapse, Input, Modal, Space, Tag, message } from 'antd';
import { PlusOutlined, QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useChannelScopeStore } from './channelScopeStore';
import type { AuthConfig, CredentialItem, VariableItem } from './channelScopeStore';
import AuthenticationDrawer from './sharedAuthenticationDrawer';

const EMPTY_VARIABLES: VariableItem[] = [];
const EMPTY_CREDENTIALS: CredentialItem[] = [];
const EMPTY_AUTHENTICATIONS: AuthConfig[] = [];

const authTypeLabels: Record<AuthConfig['type'], string> = {
  basic: 'Basic Auth',
  bearer: 'Bearer Token',
  custom: 'Custom Auth',
  oauth2: 'OAuth 2',
};

function VersionTag({ version }: { version?: string }) {
  return <Tag color="blue" style={{ margin: 0, fontSize: 9 }}>{version ?? '—'}</Tag>;
}

function EmptyContext({ children }: { children: string }) {
  return <div style={{ padding: 9, color: '#8c8c8c', background: '#fafafa', borderRadius: 6, fontSize: 11 }}>{children}</div>;
}

function EnterHint() {
  return <div style={{ marginTop: 4, color: '#8c8c8c', fontSize: 9 }}>Press Enter to add</div>;
}

function GlobalVariableRow({
  variable,
  readOnly,
  onCommit,
  onSelect,
}: {
  variable: VariableItem;
  readOnly: boolean;
  onCommit: (value: string) => void;
  onSelect: () => void;
}) {
  const [value, setValue] = useState(variable.value);

  useEffect(() => setValue(variable.value), [variable.value]);

  const commit = () => {
    if (value === variable.value) return;
    if (!value.trim()) {
      message.error('Global Variable value is required');
      setValue(variable.value);
      return;
    }
    onCommit(value);
  };

  return <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 6, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
    <div onClick={onSelect} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }} title={variable.name}>{variable.name}</div>
    <Input size="small" disabled={readOnly} value={value} aria-label={`Global Variable Value ${variable.name}`} onChange={(event) => setValue(event.target.value)} onBlur={commit} onPressEnter={commit} />
  </div>;
}

export default function CanvasContextPanel({
  channelCode,
  mode,
  actions = [],
  readOnly = false,
  isMappingActive = false,
  onFieldSelect,
}: {
  channelCode: string;
  mode: 'flow' | 'matching';
  actions?: string[];
  readOnly?: boolean;
  isMappingActive?: boolean;
  onFieldSelect?: (fieldPath: string) => void;
}) {
  const globalVariables = useChannelScopeStore((state) => state.globalVariablesByChannel[channelCode]) ?? EMPTY_VARIABLES;
  const globalVariableVersion = useChannelScopeStore((state) => state.globalVariableVersionByChannel[channelCode]);
  const orderVariables = useChannelScopeStore((state) => state.orderVariablesByChannel[channelCode]) ?? EMPTY_VARIABLES;
  const orderVariableVersion = useChannelScopeStore((state) => state.orderVariableVersionByChannel[channelCode]);
  const credentials = useChannelScopeStore((state) => state.credentialsByChannel[channelCode]) ?? EMPTY_CREDENTIALS;
  const credentialVersion = useChannelScopeStore((state) => state.credentialVersionByChannel[channelCode]);
  const authentications = useChannelScopeStore((state) => state.authenticationsByChannel[channelCode]) ?? EMPTY_AUTHENTICATIONS;
  const addCredential = useChannelScopeStore((state) => state.addCredential);
  const addGlobalVariable = useChannelScopeStore((state) => state.addGlobalVariable);
  const updateGlobalVariableValue = useChannelScopeStore((state) => state.updateGlobalVariableValue);
  const addOrderVariable = useChannelScopeStore((state) => state.addOrderVariable);

  const [globalVariableKeyDraft, setGlobalVariableKeyDraft] = useState('');
  const [globalVariableValueDraft, setGlobalVariableValueDraft] = useState('');
  const [credentialKeyDraft, setCredentialKeyDraft] = useState('');
  const [orderVariableKeyDraft, setOrderVariableKeyDraft] = useState('');
  const [showCredentialGuidance, setShowCredentialGuidance] = useState(false);
  const [editingAuthentication, setEditingAuthentication] = useState<AuthConfig | null>(null);
  const [showAuthenticationDrawer, setShowAuthenticationDrawer] = useState(false);

  const addButton = (onClick: () => void, label: string) => readOnly ? null : (
    <Button type="text" size="small" aria-label={`Add ${label}`} icon={<PlusOutlined />} onClick={(event) => { event.stopPropagation(); onClick(); }} style={{ padding: '0 4px', height: 20 }} />
  );

  const submitGlobalVariable = () => {
    const key = globalVariableKeyDraft.trim();
    const value = globalVariableValueDraft.trim();
    if (!key || !value) return;
    if (globalVariables.some((item) => item.name.toLowerCase() === key.toLowerCase())) {
      message.error('Global Variable key already exists in this Channel');
      return;
    }
    addGlobalVariable(channelCode, { id: `global_${Date.now()}`, name: key, value });
    setGlobalVariableKeyDraft('');
    setGlobalVariableValueDraft('');
    message.success('Global Variable added; collection version updated');
  };

  const submitCredentialKey = () => {
    const key = credentialKeyDraft.trim();
    if (!key) return;
    if (credentials.some((item) => item.key.toLowerCase() === key.toLowerCase())) {
      message.error('Credential key already exists in this Channel');
      return;
    }
    addCredential(channelCode, { id: `cred_${Date.now()}`, key });
    setCredentialKeyDraft('');
    message.success('Credential key added; collection version updated');
  };

  const submitOrderVariableKey = () => {
    const key = orderVariableKeyDraft.trim();
    if (!key) return;
    if (orderVariables.some((item) => item.name.toLowerCase() === key.toLowerCase())) {
      message.error('Order Variable key already exists in this Channel');
      return;
    }
    addOrderVariable(channelCode, { id: `order_${Date.now()}`, name: key, value: '' });
    setOrderVariableKeyDraft('');
    message.success('Order Variable key added; collection version updated');
  };

  const spiItems = [...new Set(actions)].map((action) => ({
    key: action,
    label: <strong>{action}</strong>,
    children: <div style={{ fontSize: 11 }}>
      <div style={{ color: '#1677ff', fontWeight: 600, marginBottom: 4 }}>spi.request</div>
      {['amount', 'currency', 'reference'].map((field) => <div key={`request.${field}`} onClick={() => isMappingActive && onFieldSelect?.(`spi.request.${field}`)} style={{ padding: '3px 4px', cursor: isMappingActive ? 'pointer' : 'default' }}>{field} <Tag style={{ fontSize: 9 }}>string</Tag></div>)}
      <div style={{ color: '#722ed1', fontWeight: 600, margin: '8px 0 4px' }}>spi.response</div>
      {['status', 'code', 'message'].map((field) => <div key={`response.${field}`} onClick={() => isMappingActive && onFieldSelect?.(`spi.response.${field}`)} style={{ padding: '3px 4px', cursor: isMappingActive ? 'pointer' : 'default' }}>{field} <Tag style={{ fontSize: 9 }}>string</Tag></div>)}
    </div>,
  }));

  const channelItems = [
    ...(mode === 'flow' ? [{
      key: 'spi',
      label: <Space><span>🔵</span><span>SPI</span><Tag>Read only</Tag></Space>,
      children: spiItems.length ? <Collapse ghost items={spiItems} defaultActiveKey={spiItems.slice(0, 1).map((item) => item.key)} /> : <EmptyContext>No SPI Action available.</EmptyContext>,
    }] : []),
    {
      key: 'global-variable',
      label: <Space><span>📝</span><span>Global Variable</span><VersionTag version={globalVariableVersion} /></Space>,
      children: <div>
        {globalVariables.length
          ? globalVariables.map((item) => <GlobalVariableRow
              key={item.id}
              variable={item}
              readOnly={readOnly}
              onSelect={() => isMappingActive && onFieldSelect?.(`globalVariables.${item.name}`)}
              onCommit={(value) => {
                updateGlobalVariableValue(channelCode, item.id, value);
                message.success('Global Variable value updated; collection version updated');
              }}
            />)
          : <EmptyContext>No Global Variable configured.</EmptyContext>}
        {!readOnly && <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 6, marginTop: 8 }}>
          <Input size="small" value={globalVariableKeyDraft} onChange={(event) => setGlobalVariableKeyDraft(event.target.value)} onPressEnter={submitGlobalVariable} placeholder="Key" aria-label="New Global Variable Key" />
          <Input size="small" value={globalVariableValueDraft} onChange={(event) => setGlobalVariableValueDraft(event.target.value)} onPressEnter={submitGlobalVariable} placeholder="Value" aria-label="New Global Variable Value" />
        </div>}
        {!readOnly && <EnterHint />}
      </div>,
    },
    {
      key: 'credential',
      label: <Space><span>🔐</span><span>Credential</span><VersionTag version={credentialVersion} /><Button type="text" size="small" aria-label="Credential Guidance" icon={<QuestionCircleOutlined />} onClick={(event) => { event.stopPropagation(); setShowCredentialGuidance(true); }} style={{ padding: '0 4px', height: 20 }} /></Space>,
      children: <div>
        {credentials.length
          ? credentials.map((item) => <div key={item.id} style={{ padding: '5px 4px', borderBottom: '1px solid #f5f5f5', fontSize: 11, color: '#262626' }}>{item.key}</div>)
          : <EmptyContext>No Credential key configured.</EmptyContext>}
        {!readOnly && <Input
          size="small"
          value={credentialKeyDraft}
          onChange={(event) => setCredentialKeyDraft(event.target.value)}
          onPressEnter={submitCredentialKey}
          placeholder="Credential key"
          aria-label="New Credential Key"
          style={{ marginTop: 8 }}
        />}
        {!readOnly && <EnterHint />}
      </div>,
    },
    {
      key: 'authentication',
      label: <Space><span>🛡️</span><span>Authentication</span>{addButton(() => { setEditingAuthentication(null); setShowAuthenticationDrawer(true); }, 'Authentication')}</Space>,
      children: authentications.length ? authentications.map((item) => <div key={item.id} onClick={() => { if (!readOnly) { setEditingAuthentication(item); setShowAuthenticationDrawer(true); } }} style={{ padding: '5px 2px', cursor: readOnly ? 'default' : 'pointer', fontSize: 11 }}><Tag color="geekblue">{item.name}</Tag><div style={{ color: '#595959', marginTop: 3 }}>{authTypeLabels[item.type]}</div><div style={{ color: '#8c8c8c', marginTop: 2 }}>Version {item.version}</div></div>) : <EmptyContext>No Authentication configured.</EmptyContext>,
    },
  ];

  const orderItems = mode === 'flow' ? [{
    key: 'order-variable',
    label: <Space><span>📦</span><span>Order Variable</span><VersionTag version={orderVariableVersion} /></Space>,
    children: <div>
      {orderVariables.length
        ? orderVariables.map((item) => <div key={item.id} style={{ padding: '5px 4px', borderBottom: '1px solid #f5f5f5', fontSize: 11, color: '#262626' }}>{item.name}</div>)
        : <EmptyContext>No Order Variable key configured.</EmptyContext>}
      {!readOnly && <Input
        size="small"
        value={orderVariableKeyDraft}
        onChange={(event) => setOrderVariableKeyDraft(event.target.value)}
        onPressEnter={submitOrderVariableKey}
        placeholder="Order Variable key"
        aria-label="New Order Variable Key"
        style={{ marginTop: 8 }}
      />}
      {!readOnly && <EnterHint />}
    </div>,
  }] : [];

  const scopeItems = [
    { key: 'channel-context', label: <strong>Channel Context</strong>, children: <Collapse ghost items={channelItems} defaultActiveKey={mode === 'flow' ? ['spi', 'global-variable'] : ['global-variable']} /> },
    { key: 'order-context', label: <strong>Order Context</strong>, children: orderItems.length ? <Collapse ghost items={orderItems} defaultActiveKey={['order-variable']} /> : <EmptyContext>Not available in Capability Matching.</EmptyContext> },
  ];

  return <>
    <div style={{ width: 292, height: '100%', borderRight: '1px solid #f0f0f0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Context</span>
        <Button type="text" size="small" icon={<ReloadOutlined />} aria-label="Refresh Context" onClick={() => message.success('Context references are up to date')} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
        <Collapse ghost items={scopeItems} defaultActiveKey={['channel-context', 'order-context']} />
      </div>
    </div>

    <AuthenticationDrawer visible={showAuthenticationDrawer} channelCode={channelCode} auth={editingAuthentication} onClose={() => { setShowAuthenticationDrawer(false); setEditingAuthentication(null); }} />
    <Modal title="Credential Guidance" open={showCredentialGuidance} footer={null} onCancel={() => setShowCredentialGuidance(false)}>
      <ol style={{ paddingLeft: 22, marginBottom: 0, lineHeight: 1.8 }}>
        <li>Create the required credential field names for the Channel here, such as username and password.</li>
        <li>Credentials refer to information that must be sent when requesting the Channel and may vary for different Parties.</li>
        <li>The actual values of the credentials must be maintained on the Party-related page.</li>
        <li>Credential field names cannot be edited or deleted after creation.</li>
        <li>If an error occurs during creation, add a new record to make corrections.</li>
      </ol>
    </Modal>
  </>;
}
