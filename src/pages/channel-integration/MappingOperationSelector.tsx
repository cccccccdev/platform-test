import { useEffect, useState } from 'react';
import { Alert, Button, Cascader, Form, InputNumber, Modal, Space } from 'antd';

export interface DecimalScaleConfig {
  targetScale: number;
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
  targetScale: 18,
};

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
  const [open, setOpen] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<DecimalScaleOperation>();
  const [form] = Form.useForm<DecimalScaleConfig>();

  useEffect(() => {
    if (open) form.setFieldsValue(config ?? defaultConfig);
  }, [config, form, open]);

  const selectOperation = (next: string[]) => {
    if (!next?.length) {
      onChange(undefined, undefined);
      return;
    }
    if (decimalScaleOperation(next)) {
      setPendingOperation(decimalScaleOperation(next));
      form.setFieldsValue(config ?? defaultConfig);
      setOpen(true);
      return;
    }
    onChange(next, undefined);
  };

  const save = async () => {
    const nextConfig = await form.validateFields();
    const operation = pendingOperation ?? decimalScaleOperation(value);
    if (operation) onChange(['money', operation], nextConfig);
    setOpen(false);
    setPendingOperation(undefined);
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
      {decimalScaleOperation(value) && config && <Button type="link" size="small" onClick={() => { setPendingOperation(decimalScaleOperation(value)); setOpen(true); }} style={{ height: 20, padding: 0, fontSize: 11 }}>
        Target Scale: {config.targetScale}
      </Button>}
    </Space>
    <Modal title={(pendingOperation ?? decimalScaleOperation(value)) === 'enforce-exact-decimal-scale' ? 'Enforce Exact Decimal Scale' : 'Ensure Minimum Decimal Scale'} open={open} onCancel={() => { setOpen(false); setPendingOperation(undefined); }} onOk={() => void save()} okText="Apply">
      <Form form={form} layout="vertical" initialValues={defaultConfig}>
        <Form.Item name="targetScale" label="Target Scale" rules={[{ required: true, message: 'Enter the target scale.' }]}>
          <InputNumber min={0} max={32} precision={0} style={{ width: '100%' }} placeholder="For example: 2, 12 or 18" />
        </Form.Item>
        <Alert type="info" showIcon message={(pendingOperation ?? decimalScaleOperation(value)) === 'enforce-exact-decimal-scale'
          ? 'BigDecimal only. Pads zeros; removes only an all-zero suffix.'
          : 'BigDecimal only. Pads zeros; never reduces the source scale.'} />
      </Form>
    </Modal>
  </>;
}
