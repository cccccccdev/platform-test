import { useEffect, useMemo, useState } from 'react';
import { Drawer, Button, Modal, Form, Input, InputNumber, Radio, Select, Space, Tag, Checkbox, message, Steps, Alert } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useChannelScopeStore, timestampVersion } from './channelScopeStore';
import type { AuthConfig, AuthType } from './channelScopeStore';
import OAuth2RequestConfiguration from './OAuth2RequestConfiguration';

interface Props {
  visible: boolean;
  channelCode: string;
  auth: AuthConfig | null;
  onSave?: (auth: AuthConfig) => void;
  onClose: () => void;
}

const authTypeOptions = [
  { label: 'Basic Auth', value: 'basic' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'Custom Auth', value: 'custom' },
  { label: 'OAuth 2', value: 'oauth2' },
];

const emptyAuthentications: AuthConfig[] = [];

function OAuth2Form({
  watchedExpiryOption,
  watchedApiExpiryType,
}: {
  watchedExpiryOption?: string;
  watchedApiExpiryType?: string;
}) {
  return (
    <>
      <Form.Item label="Header Prefix" name="oauthHeaderPrefix">
        <Input placeholder="Enter header prefix" />
      </Form.Item>
      <Form.Item label="Expiry Option" name="expiryOption" rules={[{ required: true, message: 'Please select an expiry option' }]}>
        <Radio.Group>
          <Radio value="fixed">Fixed Expiry Duration</Radio>
          <Radio value="api">Retrieve Expiry from API</Radio>
        </Radio.Group>
      </Form.Item>
      {watchedExpiryOption === 'fixed' && (
        <Form.Item label="Expiry Time" name="expiryTime" rules={[{ required: true, message: 'Please enter expiry time' }]}>
          <InputNumber style={{ width: '100%' }} addonAfter="s" placeholder="Enter expiry time in seconds" />
        </Form.Item>
      )}
      {watchedExpiryOption === 'api' && (
        <>
          <Form.Item label="API Expiry Type" name="apiExpiryType" rules={[{ required: true, message: 'Please select an API expiry type' }]}>
            <Radio.Group>
              <Radio value="duration">Expiry Duration</Radio>
              <Radio value="timestamp">Expiry Timestamp</Radio>
            </Radio.Group>
          </Form.Item>
          {watchedApiExpiryType === 'duration' && (
            <Form.Item label="Time Unit" name="timeUnit" rules={[{ required: true, message: 'Please select a time unit' }]}>
              <Select placeholder="Select a time unit">
                <Select.Option value="d">d (Day)</Select.Option>
                <Select.Option value="h">h (Hour)</Select.Option>
                <Select.Option value="m">m (Minute)</Select.Option>
                <Select.Option value="s">s (Second)</Select.Option>
                <Select.Option value="ms">ms (milli Second)</Select.Option>
              </Select>
            </Form.Item>
          )}
        </>
      )}
    </>
  );
}

export default function AuthenticationDrawer({ visible, channelCode, auth, onSave, onClose }: Props) {
  const [form] = Form.useForm();
  const [oauthStep, setOauthStep] = useState(0);
  const addAuthentication = useChannelScopeStore((s) => s.addAuthentication);
  const credentials = useChannelScopeStore((s) => s.credentialsByChannel[channelCode] ?? []);
  const authenticationsByChannel = useChannelScopeStore((s) => s.authenticationsByChannel);
  const authentications = authenticationsByChannel[channelCode] ?? emptyAuthentications;
  const credentialVersion = useChannelScopeStore((s) => s.credentialVersionByChannel[channelCode]) ?? '';
  const refreshCredentialVersion = () => {
    const latest = useChannelScopeStore.getState().credentialVersionByChannel[channelCode] ?? '';
    if (latest === credentialVersion) {
      message.success('Credential version is up to date');
    } else {
      message.success('Credential version updated');
    }
  };

  const watchedType = Form.useWatch('type', form) as AuthType | undefined;
  const watchedExpiryOption = Form.useWatch('expiryOption', form) as string | undefined;
  const watchedApiExpiryType = Form.useWatch('apiExpiryType', form) as string | undefined;
  const watchedExpiryTime = Form.useWatch('expiryTime', form);
  const watchedTimeUnit = Form.useWatch('timeUnit', form);

  const oauth2NextStepEnabled = useMemo(() => {
    if (watchedType !== 'oauth2') return false;
    if (!watchedExpiryOption) return false;
    if (watchedExpiryOption === 'fixed') {
      return watchedExpiryTime != null && watchedExpiryTime !== '';
    }
    if (watchedExpiryOption === 'api') {
      if (!watchedApiExpiryType) return false;
      if (watchedApiExpiryType === 'duration') {
        return !!watchedTimeUnit;
      }
      return true; // timestamp: no additional required fields
    }
    return false;
  }, [watchedType, watchedExpiryOption, watchedApiExpiryType, watchedExpiryTime, watchedTimeUnit]);

  useEffect(() => {
    if (visible) {
      setOauthStep(0);
      if (auth) {
        let oauthConfiguration: Record<string, unknown> = {};
        try {
          oauthConfiguration = auth.credentials?.oauthConfiguration
            ? JSON.parse(auth.credentials.oauthConfiguration)
            : {};
        } catch {
          oauthConfiguration = {};
        }
        form.setFieldsValue({
          name: auth.name,
          type: auth.type,
          username: auth.credentials?.username,
          password: auth.credentials?.password,
          token: auth.credentials?.token,
          customHeader: auth.credentials?.customHeader,
          customValue: auth.credentials?.customValue,
          base64: auth.credentials?.base64 === 'true',
          clientId: auth.credentials?.clientId,
          clientSecret: auth.credentials?.clientSecret,
          authorizationUrl: auth.credentials?.authorizationUrl,
          scopes: auth.credentials?.scopes,
          oauthHeaderPrefix: auth.credentials?.oauthHeaderPrefix,
          expiryOption: auth.credentials?.expiryOption,
          expiryTime: auth.credentials?.expiryTime ? Number(auth.credentials.expiryTime) : undefined,
          apiExpiryType: auth.credentials?.apiExpiryType,
          timeUnit: auth.credentials?.timeUnit,
          ...oauthConfiguration,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, auth, form]);

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;

    const authType = values.type as AuthType;
    let creds: Record<string, string> = {};

    switch (authType) {
      case 'basic':
        creds = { username: values.username || '', password: values.password || '' };
        break;
      case 'bearer':
        creds = { token: values.token || '' };
        break;
      case 'custom':
        creds = { token: values.token || '', customHeader: values.customHeader || '', base64: values.base64 ? 'true' : '' };
        break;
      case 'oauth2':
        creds = {
          oauthHeaderPrefix: values.oauthHeaderPrefix || '',
          expiryOption: values.expiryOption || '',
          expiryTime: values.expiryTime != null ? String(values.expiryTime) : '',
          apiExpiryType: values.apiExpiryType || '',
          timeUnit: values.timeUnit || '',
          oauthConfiguration: JSON.stringify(values),
        };
        break;
    }

    const now = new Date().toLocaleString();
    if (auth) {
      Modal.confirm({
        title: 'Confirmation',
        content: 'After modifying Auth settings, you need to update all associated flows referencing this auth method and publish changes for the new configuration to take effect.',
        okText: 'Confirm',
        onOk: () => {
          useChannelScopeStore.getState().updateAuthentication(channelCode, auth.id, {
            name: values.name,
            type: authType,
            credentials: creds,
            operator: 'admin',
            operationTime: now,
          });
          message.success('Authentication updated');
          onClose();
        },
      });
    } else {
      const newAuth: AuthConfig = {
        id: `auth_${Date.now()}`,
        name: values.name,
        type: authType,
        version: timestampVersion(),
        credentials: creds,
        operator: 'admin',
        operationTime: now,
      };
      addAuthentication(channelCode, newAuth);
      onSave?.(newAuth);
      message.success('Authentication added');
      onClose();
    }
  };

  const getAuthFieldsByType = (type: AuthType | undefined) => {
    switch (type) {
      case 'basic':
        return (
          <>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please select a Credential key' }]}>
              <Select placeholder="Select from Credential">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please select a Credential key' }]}>
              <Select placeholder="Select from Credential">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
          </>
        );
      case 'bearer':
        return (
          <Form.Item label="Token" name="token" rules={[{ required: true, message: 'Please select a Credential key' }]}>
            <Select placeholder="Select from Credential">
              {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
            </Select>
          </Form.Item>
        );
      case 'custom':
        return (
          <>
            <Form.Item label="Header Prefix" name="customHeader">
              <Input placeholder="Enter header prefix" />
            </Form.Item>
            <Form.Item label="Token" name="token" rules={[{ required: true, message: 'Please select a Credential key' }]}>
              <Select placeholder="Select from Credential">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="base64" valuePropName="checked">
              <Checkbox>Base64</Checkbox>
            </Form.Item>
          </>
        );
      case 'oauth2':
        return <OAuth2Form watchedExpiryOption={watchedExpiryOption} watchedApiExpiryType={watchedApiExpiryType} />;
      default:
        return <div style={{ color: '#999', fontSize: 12 }}>Select an Auth Type first</div>;
    }
  };

  const handleNextStep = async () => {
    const fields = watchedExpiryOption === 'fixed'
      ? ['expiryOption', 'expiryTime']
      : watchedExpiryOption === 'api' && watchedApiExpiryType === 'duration'
        ? ['expiryOption', 'apiExpiryType', 'timeUnit']
        : ['expiryOption', 'apiExpiryType'];
    try {
      await form.validateFields(['name', 'type', ...fields]);
      setOauthStep(1);
    } catch {
      // validation errors will be displayed on the form
    }
  };

  const isOAuth2 = watchedType === 'oauth2';

  const closeDrawer = () => {
    setOauthStep(0);
    onClose();
  };

  return (
    <Drawer
      title={auth ? 'Edit Authentication Scheme' : 'Create Authentication Scheme'}
      placement="right"
      width={isOAuth2 && oauthStep === 1 ? 1080 : 500}
      open={visible}
      onClose={closeDrawer}
      extra={
        <Space>
          {isOAuth2 && oauthStep === 1 ? (
            <>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setOauthStep(0)}>Back</Button>
              <Button type="primary" onClick={handleSave}>Submit</Button>
            </>
          ) : <Button onClick={closeDrawer}>Cancel</Button>}
          {isOAuth2 && oauthStep === 0 ? (
            <Button type="primary" disabled={!oauth2NextStepEnabled} onClick={handleNextStep}>Next Step</Button>
          ) : !isOAuth2 ? (
            <Button type="primary" onClick={handleSave}>Submit</Button>
          ) : null}
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        {isOAuth2 && (
          <Steps
            size="small"
            current={oauthStep}
            items={[{ title: 'Scheme Settings' }, { title: 'Token Request' }]}
            style={{ marginBottom: 20 }}
          />
        )}

        <div style={{ display: oauthStep === 0 ? 'block' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
              <Space size={8}>
                <span style={{ fontSize: 12, color: '#595959' }}>Credential Version</span>
                <Tag color="blue" style={{ margin: 0 }}>{credentialVersion || '—'}</Tag>
              </Space>
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={refreshCredentialVersion}>Refresh</Button>
            </div>
            <Form.Item label="Auth Name" name="name" rules={[{ required: true, message: 'Please enter auth name' }]}>
              <Input placeholder="Enter auth name" />
            </Form.Item>
            <Form.Item label="Auth Type" name="type" rules={[{ required: true, message: 'Please select auth type' }]}>
              <Select placeholder="Select auth type" options={authTypeOptions} />
            </Form.Item>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
                {({ getFieldValue }) => getAuthFieldsByType(getFieldValue('type') as AuthType)}
              </Form.Item>
            </div>
            {isOAuth2 && (
              <Alert
                type="info"
                showIcon
                title="OAuth 2 requires a token request"
                description="Continue to configure the channel request, security processing, response-code assembly, and token response mapping."
                style={{ marginTop: 8 }}
              />
            )}
        </div>
        {oauthStep === 1 && (
          <OAuth2RequestConfiguration
            form={form}
            credentials={credentials}
            credentialVersion={credentialVersion}
            authentications={authentications}
            currentAuthId={auth?.id}
          />
        )}
      </Form>
    </Drawer>
  );
}
