import { useEffect, useState } from 'react';
import { Alert, Button, Cascader, Form, InputNumber, Modal, Space } from 'antd';

export interface DecimalScaleConfig {
  targetScale: number;
}

export type DecimalScaleDirection = 'outbound' | 'inbound';

export type MappingOperationOption = {
  label: string;
  value: string;
  children?: Array<{ label: string; value: string }>;
};

export const isAdjustDecimalScale = (value?: string[]) =>
  value?.[0] === 'money' && value?.[1] === 'adjust-decimal-scale';

const defaultConfig: DecimalScaleConfig = {
  targetScale: 18,
};

export default function MappingOperationSelector({
  value,
  config,
  options,
  dataDirection,
  placeholder = 'Select operation (optional)',
  onChange,
}: {
  value?: string[];
  config?: DecimalScaleConfig;
  options: MappingOperationOption[];
  dataDirection: DecimalScaleDirection;
  placeholder?: string;
  onChange: (value?: string[], config?: DecimalScaleConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<DecimalScaleConfig>();

  useEffect(() => {
    if (open) form.setFieldsValue(config ?? defaultConfig);
  }, [config, form, open]);

  const selectOperation = (next: string[]) => {
    if (!next?.length) {
      onChange(undefined, undefined);
      return;
    }
    if (isAdjustDecimalScale(next)) {
      form.setFieldsValue(config ?? defaultConfig);
      setOpen(true);
      return;
    }
    onChange(next, undefined);
  };

  const save = async () => {
    const nextConfig = await form.validateFields();
    onChange(['money', 'adjust-decimal-scale'], nextConfig);
    setOpen(false);
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
      {isAdjustDecimalScale(value) && config && <Button type="link" size="small" onClick={() => setOpen(true)} style={{ height: 20, padding: 0, fontSize: 11 }}>
        Target Scale: {config.targetScale}
      </Button>}
    </Space>
    <Modal title="Adjust Decimal Scale" open={open} onCancel={() => setOpen(false)} onOk={() => void save()} okText="Apply">
      <Form form={form} layout="vertical" initialValues={defaultConfig}>
        <Form.Item name="targetScale" label="Target Scale" rules={[{ required: true, message: 'Enter the target scale.' }]}>
          <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} placeholder="For example: 2, 12 or 18" />
        </Form.Item>
        <Alert type="info" showIcon message={dataDirection === 'outbound'
          ? 'BigDecimal only. Pads zeros; reduction requires an all-zero suffix.'
          : 'BigDecimal only. Pads zeros; values above the target scale are preserved.'} />
      </Form>
    </Modal>
  </>;
}
