import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Cascader, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Tooltip, Typography, message } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { create } from 'zustand';
import { useBasicInfoReferenceStore } from '../basic-info/basicInfoReferenceStore';
import type { ConfigAbility } from './types';
import { useChannelInstitutionStore } from './channelInstitutionStore';

const { Text } = Typography;

type AssetRouteAbility = 'ON_RAMP' | 'OFF_RAMP' | 'PAY_OUT';

interface AssetRouteProfile {
  ability: AssetRouteAbility;
  direction: string;
  summary: string;
  sourceType: 'Fiat' | 'Stablecoin';
  targetType: 'Fiat' | 'Stablecoin';
  showSourceChain: boolean;
  showTargetChain: boolean;
  showInstitution: boolean;
}

interface AssetRoute {
  id: string;
  businessType: 'STABLECOIN';
  ability: string;
  country: 'GSA';
  sourceCurrency: string;
  sourceChain?: string;
  targetCurrency: string;
  targetChain?: string;
  institutionCode: string;
  decimal: number;
  minSourceAmount?: string;
  maxSourceAmount?: string;
  operator: string;
  operationTime: string;
}

type AssetRouteForm = Omit<AssetRoute, 'id' | 'businessType' | 'ability' | 'country' | 'operator' | 'operationTime' | 'institutionCode'> & { institutionSelection: string[] };

interface AssetRouteStore {
  recordsByScope: Record<string, AssetRoute[]>;
  saveRoute: (scope: string, route: AssetRoute) => void;
}

const ASSET_ROUTE_PROFILES: Record<AssetRouteAbility, AssetRouteProfile> = {
  ON_RAMP: {
    ability: 'ON_RAMP',
    direction: 'Fiat → Stablecoin',
    summary: 'Accept fiat from the supported institution, convert it to stablecoin, and deliver it on the target chain.',
    sourceType: 'Fiat',
    targetType: 'Stablecoin',
    showSourceChain: false,
    showTargetChain: true,
    showInstitution: true,
  },
  OFF_RAMP: {
    ability: 'OFF_RAMP',
    direction: 'Stablecoin → Fiat',
    summary: 'Receive stablecoin on the source chain, convert it to fiat, and pay it to the supported institution.',
    sourceType: 'Stablecoin',
    targetType: 'Fiat',
    showSourceChain: true,
    showTargetChain: false,
    showInstitution: true,
  },
  PAY_OUT: {
    ability: 'PAY_OUT',
    direction: 'Stablecoin → Stablecoin',
    summary: 'Transfer stablecoin from the source chain to the target chain. Institution is not involved.',
    sourceType: 'Stablecoin',
    targetType: 'Stablecoin',
    showSourceChain: true,
    showTargetChain: true,
    showInstitution: false,
  },
};
const ASSET_ROUTE_ABILITIES = new Set<AssetRouteAbility>(Object.keys(ASSET_ROUTE_PROFILES) as AssetRouteAbility[]);
const CHAIN_OPTIONS = [
  { value: 'ERC20', label: 'ERC20' },
  { value: 'TRC20', label: 'TRC20' },
  { value: 'SOLANA', label: 'SOLANA' },
  { value: 'ARBITRUM', label: 'ARBITRUM' },
  { value: 'BASE', label: 'BASE' },
];
const EMPTY_ROUTES: AssetRoute[] = [];

const COBO_ROUTES_BY_ABILITY: Record<string, AssetRoute[]> = {
  ON_RAMP: [
  {
    id: 'cobo_onramp_usd_usdt_trc20',
    businessType: 'STABLECOIN',
    ability: 'ON_RAMP',
    country: 'GSA',
    sourceCurrency: 'USD',
    targetCurrency: 'USDT',
    targetChain: 'TRC20',
    institutionCode: 'ALL',
    decimal: 6,
    minSourceAmount: '100.00',
    maxSourceAmount: '10000.00',
    operator: 'Bailly',
    operationTime: '2026-09-03 10:15:26',
  },
  {
    id: 'cobo_onramp_usd_usdc_erc20',
    businessType: 'STABLECOIN',
    ability: 'ON_RAMP',
    country: 'GSA',
    sourceCurrency: 'USD',
    targetCurrency: 'USDC',
    targetChain: 'ERC20',
    institutionCode: '198765',
    decimal: 6,
    minSourceAmount: '50.00',
    maxSourceAmount: '5000.00',
    operator: 'Rick',
    operationTime: '2026-09-03 10:22:41',
  }],
  OFF_RAMP: [{
    id: 'cobo_offramp_usdt_trc20_usd',
    businessType: 'STABLECOIN',
    ability: 'OFF_RAMP',
    country: 'GSA',
    sourceCurrency: 'USDT',
    sourceChain: 'TRC20',
    targetCurrency: 'USD',
    institutionCode: 'ALL',
    decimal: 6,
    minSourceAmount: '10.000000',
    maxSourceAmount: '25000.000000',
    operator: 'Bailly',
    operationTime: '2026-09-03 10:31:08',
  }],
  PAY_OUT: [{
    id: 'cobo_payout_usdt_trc20_usdc_erc20',
    businessType: 'STABLECOIN',
    ability: 'PAY_OUT',
    country: 'GSA',
    sourceCurrency: 'USDT',
    sourceChain: 'TRC20',
    targetCurrency: 'USDC',
    targetChain: 'ERC20',
    institutionCode: 'ALL',
    decimal: 6,
    minSourceAmount: '5.000000',
    maxSourceAmount: '100000.000000',
    operator: 'Rick',
    operationTime: '2026-09-03 10:38:52',
  }],
};

const initialRecordsByScope = ['ALIYUN', 'BD', 'MFB'].reduce<Record<string, AssetRoute[]>>((clouds, cloud) => {
  ['DAILY', 'PRE', 'PROD'].forEach((env) => {
    if (cloud === 'ALIYUN' && env === 'PRE') return;
    Object.entries(COBO_ROUTES_BY_ABILITY).forEach(([ability, routes]) => {
      clouds[`COBO::${cloud}::${env}::${ability}`] = structuredClone(routes);
    });
  });
  return clouds;
}, {});

const useAssetRouteStore = create<AssetRouteStore>((set) => ({
  recordsByScope: initialRecordsByScope,
  saveRoute: (scope, route) => set((state) => {
    const current = state.recordsByScope[scope] ?? [];
    const exists = current.some((record) => record.id === route.id);
    return {
      recordsByScope: {
        ...state.recordsByScope,
        [scope]: exists
          ? current.map((record) => record.id === route.id ? route : record)
          : [...current, route],
      },
    };
  }),
}));

function formatOperationTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function compareDecimal(left: string, right: string) {
  const normalize = (value: string) => {
    const [integer, fraction = ''] = value.split('.');
    return { integer: integer.replace(/^0+(?=\d)/, ''), fraction };
  };
  const a = normalize(left);
  const b = normalize(right);
  if (a.integer.length !== b.integer.length) return a.integer.length - b.integer.length;
  if (a.integer !== b.integer) return a.integer.localeCompare(b.integer);
  const scale = Math.max(a.fraction.length, b.fraction.length);
  return a.fraction.padEnd(scale, '0').localeCompare(b.fraction.padEnd(scale, '0'));
}

function formatAmount(value: string | undefined, scale: number) {
  if (!value) return '-';
  const [integer, fraction = ''] = value.split('.');
  if (scale === 0) return integer;
  return `${integer}.${fraction.padEnd(scale, '0').slice(0, scale)}`;
}

function normalizeAmount(value: string | undefined, scale: number) {
  if (!value) return undefined;
  const [integer, fraction = ''] = value.split('.');
  if (scale === 0) return integer;
  return `${integer}.${fraction.padEnd(scale, '0')}`;
}

function fieldLabel(label: string, description: string) {
  return (
    <Space size={5}>
      {label}
      <Tooltip title={description}>
        <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
      </Tooltip>
    </Space>
  );
}

export default function ChannelInfoAssetRoutePage({
  channelCode,
  cloud,
  env,
  configuredAbilities,
}: {
  channelCode: string;
  cloud: string;
  env: string;
  configuredAbilities: ConfigAbility[];
}) {
  const currencies = useBasicInfoReferenceStore((state) => state.currencies);
  const abilityOptions = useMemo(() => configuredAbilities
    .filter((item) => item.bt === 'STABLECOIN' && ASSET_ROUTE_ABILITIES.has(item.ability as AssetRouteAbility))
    .map((item) => item.ability as AssetRouteAbility), [configuredAbilities]);
  const [ability, setAbility] = useState<AssetRouteAbility>();
  const profile = ability ? ASSET_ROUTE_PROFILES[ability] : undefined;
  const scope = ability ? `${channelCode}::${cloud}::${env}::${ability}` : '';
  const scopedRecords = useAssetRouteStore((state) => scope ? state.recordsByScope[scope] : undefined);
  const records = scopedRecords ?? EMPTY_ROUTES;
  const saveRoute = useAssetRouteStore((state) => state.saveRoute);
  const institutionMappings = useChannelInstitutionStore((state) => state.records);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetRoute | null>(null);
  const [form] = Form.useForm<AssetRouteForm>();
  const sourceCurrencyCode = Form.useWatch('sourceCurrency', form);
  const targetCurrencyCode = Form.useWatch('targetCurrency', form);
  const institutionSelection = Form.useWatch('institutionSelection', form);
  const decimal = Form.useWatch('decimal', form);
  const sourceCurrency = currencies.find((item) => item.code === sourceCurrencyCode);
  const targetCurrency = currencies.find((item) => item.code === targetCurrencyCode);
  const sourceAmountScale = profile?.sourceType === 'Fiat' ? 2 : (decimal ?? 0);

  useEffect(() => {
    if (!abilityOptions.includes(ability as AssetRouteAbility)) setAbility(abilityOptions[0]);
  }, [ability, abilityOptions]);

  useEffect(() => {
    if (!modalOpen) return;
    form.resetFields();
    if (editing) {
      const mapping = institutionMappings.find((item) => item.channelCode === channelCode && item.bt === 'STABLECOIN' && item.ability === ability && item.country === 'GSA' && item.institutionCode === editing.institutionCode);
      form.setFieldsValue({ ...editing, institutionSelection: editing.institutionCode === 'ALL' ? ['ALL'] : [mapping?.institutionCountry ?? 'GSA', editing.institutionCode] });
    }
  }, [ability, channelCode, editing, form, institutionMappings, modalOpen]);

  useEffect(() => {
    if (!profile?.showSourceChain) form.setFieldValue('sourceChain', undefined);
    if (!profile?.showTargetChain) form.setFieldValue('targetChain', undefined);
  }, [form, profile, sourceCurrency, targetCurrency]);

  const sourceCurrencyOptions = currencies.filter((currency) => currency.type === profile?.sourceType).map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }));
  const targetCurrencyOptions = currencies.filter((currency) => currency.type === profile?.targetType).map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }));

  const openCreate = () => { setEditing(null); setModalOpen(true); };

  const openEdit = (record: AssetRoute) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!ability || !scope) return;
    try {
      const values = await form.validateFields();
      const institutionCode = profile?.showInstitution ? values.institutionSelection.at(-1) : 'ALL';
      if (!institutionCode) return;
      const source = currencies.find((item) => item.code === values.sourceCurrency);
      const target = currencies.find((item) => item.code === values.targetCurrency);
      if (!profile || source?.type !== profile.sourceType || target?.type !== profile.targetType) {
        message.error('The selected currencies do not match the current Ability direction.');
        return;
      }
      if (values.minSourceAmount && values.maxSourceAmount && compareDecimal(values.minSourceAmount, values.maxSourceAmount) > 0) {
        form.setFields([{ name: 'maxSourceAmount', errors: ['Max Source Amount must be greater than or equal to Min Source Amount.'] }]);
        return;
      }
      const sameRouteRecords = records.filter((record) => record.id !== editing?.id
        && record.sourceCurrency === values.sourceCurrency
        && (record.sourceChain ?? '') === (values.sourceChain ?? '')
        && record.targetCurrency === values.targetCurrency
        && (record.targetChain ?? '') === (values.targetChain ?? ''));
      const duplicateForInstitution = sameRouteRecords.some((record) => record.institutionCode === institutionCode);
      if (duplicateForInstitution) {
        message.error('The same Asset Route and Institution rule already exists in the current Ability and environment.');
        return;
      }
      const { institutionSelection: _institutionSelection, ...routeValues } = values;
      saveRoute(scope, {
        id: editing?.id ?? `asset_route_${Date.now()}`,
        businessType: 'STABLECOIN',
        ability,
        country: 'GSA',
        ...routeValues,
        institutionCode,
        sourceChain: profile.showSourceChain ? values.sourceChain : undefined,
        targetChain: profile.showTargetChain ? values.targetChain : undefined,
        minSourceAmount: normalizeAmount(values.minSourceAmount, profile.sourceType === 'Fiat' ? 2 : values.decimal),
        maxSourceAmount: normalizeAmount(values.maxSourceAmount, profile.sourceType === 'Fiat' ? 2 : values.decimal),
        operator: 'Current User',
        operationTime: formatOperationTime(),
      });
      setModalOpen(false);
      message.success(editing ? 'Asset Route updated and effective immediately.' : 'Asset Route created and effective immediately.');
    } catch {
      // Ant Design renders field-level validation feedback.
    }
  };

  const amountRules = (scale: number) => [{
    validator: (_: unknown, value?: string) => {
      if (!value) return Promise.resolve();
      if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) return Promise.reject(new Error('Enter a non-negative decimal amount.'));
      const fractionLength = value.split('.')[1]?.length ?? 0;
      if (fractionLength > scale) return Promise.reject(new Error(`Enter no more than ${scale} decimal places.`));
      return Promise.resolve();
    },
  }];
  const identityLocked = Boolean(editing);
  const scopedInstitutionMappings = institutionMappings.filter((item) => item.channelCode === channelCode && item.bt === 'STABLECOIN' && item.ability === ability && item.country === 'GSA');
  const institutionOptions = [{ value: 'ALL', label: 'ALL' }, ...Array.from(new Set(scopedInstitutionMappings.map((item) => item.institutionCountry))).sort().map((institutionCountry) => ({ value: institutionCountry, label: institutionCountry, children: scopedInstitutionMappings.filter((item) => item.institutionCountry === institutionCountry).map((item) => ({ value: item.institutionCode, label: item.institutionName })) }))];
  const displayedAssetRouteInstitutionCode = profile?.showInstitution ? institutionSelection?.at(-1) ?? editing?.institutionCode ?? '-' : 'ALL';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space size={8} style={{ marginBottom: 12 }}>
          <Text type="secondary">Business Type</Text>
          <Tag color="purple">STABLECOIN</Tag>
        </Space>
        <Tabs
          type="card"
          activeKey={ability}
          onChange={(key) => setAbility(key as AssetRouteAbility)}
          items={abilityOptions.map((item) => ({
            key: item,
            label: (
              <div style={{ minWidth: 180, padding: '4px 8px', textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{item}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 2 }}>{ASSET_ROUTE_PROFILES[item].direction}</div>
              </div>
            ),
          }))}
        />
        {profile && (
          <Alert
            type="info"
            showIcon
            message={`${profile.direction}: ${profile.summary}`}
            style={{ marginBottom: 20 }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button type="primary" disabled={!ability} onClick={openCreate}>Create</Button>
        </div>
        <Table<AssetRoute>
          rowKey="id"
          dataSource={records}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
          locale={{ emptyText: ability ? 'No Asset Routes in the current scope.' : 'Select an applicable Ability first.' }}
          columns={[
            { title: 'Source Currency', dataIndex: 'sourceCurrency', width: 150 },
            ...(profile?.showSourceChain ? [{ title: 'Source Chain', dataIndex: 'sourceChain', width: 140 }] : []),
            { title: 'Target Currency', dataIndex: 'targetCurrency', width: 150 },
            ...(profile?.showTargetChain ? [{ title: 'Target Chain', dataIndex: 'targetChain', width: 140 }] : []),
            { title: 'Institution', dataIndex: 'institutionCode', width: 190 },
            { title: 'Decimal', dataIndex: 'decimal', width: 100 },
            { title: 'Min Source Amount', dataIndex: 'minSourceAmount', width: 210, render: (value, record) => formatAmount(value, currencies.find((item) => item.code === record.sourceCurrency)?.type === 'Fiat' ? 2 : record.decimal) },
            { title: 'Max Source Amount', dataIndex: 'maxSourceAmount', width: 210, render: (value, record) => formatAmount(value, currencies.find((item) => item.code === record.sourceCurrency)?.type === 'Fiat' ? 2 : record.decimal) },
            { title: 'Operator', dataIndex: 'operator', width: 150 },
            { title: 'Operation Time', dataIndex: 'operationTime', width: 190 },
            { title: 'Operation', fixed: 'right', width: 120, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }), render: (_, record) => <Button type="link" size="small" onClick={() => openEdit(record)}>Edit</Button> },
          ]}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Asset Route' : 'Create Asset Route'}
        open={modalOpen}
        onOk={handleSave}
        okText="Save"
        cancelText="Cancel"
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={720}
      >
        <Form form={form} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} style={{ marginTop: 20 }}>
          <div>
            <Form.Item name="sourceCurrency" label="Source Currency" rules={[{ required: true, message: 'Select Source Currency' }]}>
              <Select showSearch optionFilterProp="label" options={sourceCurrencyOptions} disabled={identityLocked} />
            </Form.Item>
            {profile?.showSourceChain && <Form.Item
              name="sourceChain"
              label={fieldLabel('Source Chain', `Select the chain where the ${profile.sourceType.toLowerCase()} source asset is received.`)}
              rules={[{ required: true, message: 'Select Source Chain' }]}
            >
              <Select showSearch options={CHAIN_OPTIONS} disabled={identityLocked} />
            </Form.Item>}
            <Form.Item name="targetCurrency" label="Target Currency" rules={[{ required: true, message: 'Select Target Currency' }]}>
              <Select showSearch optionFilterProp="label" options={targetCurrencyOptions} disabled={identityLocked} />
            </Form.Item>
            {profile?.showTargetChain && <Form.Item
              name="targetChain"
              label={fieldLabel('Target Chain', `Select the chain where the ${profile.targetType.toLowerCase()} target asset is delivered.`)}
              rules={[{ required: true, message: 'Select Target Chain' }]}
            >
              <Select showSearch options={CHAIN_OPTIONS} disabled={identityLocked} />
            </Form.Item>}
            {profile?.showInstitution && <Form.Item name="institutionSelection" label={fieldLabel('Institution Name', 'Select ALL when this Asset Route applies without distinguishing a specific Institution.')} rules={[{ required: true, message: 'Select Institution Name' }]}>
              <Cascader showSearch options={institutionOptions} disabled={identityLocked} placeholder="Select ALL or Country / Institution" />
            </Form.Item>}
            <Form.Item label="Institution Code"><span>{displayedAssetRouteInstitutionCode}</span></Form.Item>
            <Form.Item
              name="decimal"
              label={fieldLabel('Decimal', 'The decimal scale accepted by the external channel for this Asset Route and Institution.')}
              rules={[{ required: true, message: 'Enter Decimal' }]}
            >
              <InputNumber min={0} max={32} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="minSourceAmount"
              label={fieldLabel('Min Source Amount', 'Minimum supported Source Amount in the Source Currency main unit.')}
              rules={amountRules(sourceAmountScale)}
            >
              <Input placeholder={`Optional, ${sourceAmountScale} decimal places`} />
            </Form.Item>
            <Form.Item
              name="maxSourceAmount"
              label={fieldLabel('Max Source Amount', 'Maximum supported Source Amount in the Source Currency main unit.')}
              rules={amountRules(sourceAmountScale)}
            >
              <Input placeholder={`Optional, ${sourceAmountScale} decimal places`} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Space>
  );
}
