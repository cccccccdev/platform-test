import { useEffect, useState } from 'react';
import { Alert, Button, Cascader, Form, InputNumber, Modal, Radio, Space } from 'antd';
import { useParams } from 'react-router-dom';

export interface DecimalScaleConfig {
  scaleSource: 'fixed' | 'assetRoute';
  targetScale?: number;
  sourceCurrencyField?: string[];
  sourceChainField?: string[];
  targetCurrencyField?: string[];
  targetChainField?: string[];
}

export type MappingOperationOption = {
  label: string;
  value: string;
  children?: Array<{ label: string; value: string }>;
};

type DecimalScaleOperation = 'enforce-exact-decimal-scale' | 'ensure-minimum-decimal-scale';

const decimalScaleOperation = (value?: string[]): DecimalScaleOperation | undefined => {
  const operation = value?.[1];
  return value?.[0] === 'money' && (operation === 'enforce-exact-decimal-scale' || operation === 'ensure-minimum-decimal-scale')
    ? operation
    : undefined;
};

const defaultConfig: DecimalScaleConfig = {
  scaleSource: 'fixed',
  targetScale: 18,
};

const ASSET_ROUTE_ABILITIES = new Set(['ON_RAMP', 'OFF_RAMP', 'PAY_OUT']);
const amountContextOptions = [
  {
    label: 'SPI Request',
    value: 'spi.request',
    children: [
      {
        label: 'sourceAmount',
        value: 'spi.request.sourceAmount',
        children: [
          { label: 'currency', value: 'spi.request.sourceAmount.currency' },
          { label: 'chain', value: 'spi.request.sourceAmount.chain' },
        ],
      },
      {
        label: 'targetAmount',
        value: 'spi.request.targetAmount',
        children: [
          { label: 'currency', value: 'spi.request.targetAmount.currency' },
          { label: 'chain', value: 'spi.request.targetAmount.chain' },
        ],
      },
    ],
  },
];

export default function MappingOperationSelector({
  value,
  config,
  options,
  placeholder = 'Select operation (optional)',
  onChange,
}: {
  value?: string[];
  config?: DecimalScaleConfig;
  options: MappingOperationOption[];
  placeholder?: string;
  onChange: (value?: string[], config?: DecimalScaleConfig) => void;
}) {
  const params = useParams<{ bt?: string; ability?: string }>();
  const businessType = (params.bt ?? '').toUpperCase();
  const ability = (params.ability ?? '').toUpperCase();
  const assetRouteDecimalAvailable = businessType === 'STABLECOIN' && ASSET_ROUTE_ABILITIES.has(ability);
  const [open, setOpen] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<DecimalScaleOperation>();
  const [clearOnCancel, setClearOnCancel] = useState(false);
  const [form] = Form.useForm<DecimalScaleConfig>();
  const scaleSource = Form.useWatch('scaleSource', form) ?? 'fixed';

  useEffect(() => {
    if (open) form.setFieldsValue({ ...defaultConfig, ...config });
  }, [config, form, open]);

  const selectOperation = (next: string[]) => {
    if (!next?.length) {
      onChange(undefined, undefined);
      return;
    }
    if (decimalScaleOperation(next)) {
      setPendingOperation(decimalScaleOperation(next));
      setClearOnCancel(true);
      onChange(next, undefined);
      form.setFieldsValue({ ...defaultConfig, ...config });
      setOpen(true);
      return;
    }
    onChange(next, undefined);
  };

  const save = async () => {
    const values = await form.validateFields();
    const nextConfig: DecimalScaleConfig = values.scaleSource === 'assetRoute'
      ? {
        scaleSource: 'assetRoute',
        sourceCurrencyField: values.sourceCurrencyField,
        sourceChainField: ability === 'ON_RAMP' ? undefined : values.sourceChainField,
        targetCurrencyField: values.targetCurrencyField,
        targetChainField: ability === 'OFF_RAMP' ? undefined : values.targetChainField,
      }
      : { scaleSource: 'fixed', targetScale: values.targetScale };
    const operation = pendingOperation ?? decimalScaleOperation(value);
    if (operation) onChange(['money', operation], nextConfig);
    setOpen(false);
    setPendingOperation(undefined);
    setClearOnCancel(false);
  };

  const cancel = () => {
    if (clearOnCancel) onChange(undefined, undefined);
    setOpen(false);
    setPendingOperation(undefined);
    setClearOnCancel(false);
  };

  return <>
    <Space direction="vertical" size={3} style={{ width: '100%' }}>
      <Cascader
        allowClear
        value={value}
        placeholder={placeholder}
        options={options}
        expandTrigger="click"
        onChange={(next) => selectOperation(next as string[])}
      />
      {decimalScaleOperation(value) && config && <Button type="link" size="small" onClick={() => { setPendingOperation(decimalScaleOperation(value)); setClearOnCancel(false); setOpen(true); }} style={{ height: 20, padding: 0, fontSize: 11 }}>
        {config.scaleSource === 'assetRoute' ? 'Scale: Asset Route Decimal' : `Target Scale: ${config.targetScale}`}
      </Button>}
    </Space>
    <Modal title={(pendingOperation ?? decimalScaleOperation(value)) === 'enforce-exact-decimal-scale' ? 'Enforce Exact Decimal Scale' : 'Ensure Minimum Decimal Scale'} open={open} onCancel={cancel} onOk={() => void save()} okText="Apply">
      <Form form={form} layout="vertical" initialValues={defaultConfig}>
        <Form.Item name="scaleSource" label="Target Scale Source" rules={[{ required: true }]}>
          <Radio.Group
            options={assetRouteDecimalAvailable
              ? [
                { label: 'Asset Route Decimal', value: 'assetRoute' },
                { label: 'Fixed Value', value: 'fixed' },
              ]
              : [{ label: 'Fixed Value', value: 'fixed' }]}
          />
        </Form.Item>
        {!assetRouteDecimalAvailable && (
          <Alert
            type="info"
            showIcon
            message="Only Fixed Value is available for the current Business Type and Ability."
            description="Asset Route Decimal is available for STABLECOIN / ON_RAMP, OFF_RAMP, and PAY_OUT."
            style={{ marginBottom: 20 }}
          />
        )}
        {scaleSource === 'fixed' ? (
          <Form.Item name="targetScale" label="Target Scale" rules={[{ required: true, message: 'Enter the target scale.' }]}>
            <InputNumber min={0} max={32} precision={0} style={{ width: '100%' }} placeholder="For example: 2, 12 or 18" />
          </Form.Item>
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message="Decimal comes from Channel Info > Asset Route."
              description="At runtime, the operation reads Currency and Chain from the SPI fields selected below, resolves the unique Asset Route, and uses its Decimal as Target Scale. If Institution Matching is required, Institution is read automatically from _order.route.institution."
              style={{ marginBottom: 20 }}
            />
            <Form.Item name="sourceCurrencyField" label="Source Currency Field" rules={[{ required: true, message: 'Select Source Currency Field.' }]}>
              <Cascader showSearch options={amountContextOptions} placeholder="Select Source Currency Field" />
            </Form.Item>
            {ability !== 'ON_RAMP' && <Form.Item name="sourceChainField" label="Source Chain Field" rules={[{ required: true, message: 'Select Source Chain Field.' }]}>
              <Cascader showSearch options={amountContextOptions} placeholder="Select Source Chain Field" />
            </Form.Item>}
            <Form.Item name="targetCurrencyField" label="Target Currency Field" rules={[{ required: true, message: 'Select Target Currency Field.' }]}>
              <Cascader showSearch options={amountContextOptions} placeholder="Select Target Currency Field" />
            </Form.Item>
            {ability !== 'OFF_RAMP' && <Form.Item name="targetChainField" label="Target Chain Field" rules={[{ required: true, message: 'Select Target Chain Field.' }]}>
              <Cascader showSearch options={amountContextOptions} placeholder="Select Target Chain Field" />
            </Form.Item>}
          </>
        )}
        <Alert type="info" showIcon message={(pendingOperation ?? decimalScaleOperation(value)) === 'enforce-exact-decimal-scale'
          ? 'BigDecimal only. Pads zeros; removes only an all-zero suffix.'
          : 'BigDecimal only. Pads zeros; never reduces the source scale.'} />
      </Form>
    </Modal>
  </>;
}
