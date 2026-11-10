import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Alert, Button, Cascader, ConfigProvider, Form, InputNumber, Modal, Radio, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import OperationConfigModal, { type OperationFieldOption } from './OperationConfigModal';
import { operationKindOf, operationNeedsConfig, type OperationConfig, type OperationKind } from './operationConfigs';

export interface DecimalScaleConfig {
  scaleSource: 'fixed' | 'assetRoute';
  targetScale?: number;
  sourceCurrencyField?: string[];
  sourceChainField?: string[];
  targetCurrencyField?: string[];
  targetChainField?: string[];
}

/** operation 行上保存的配置：小数位换算 + 五类 Operation Config。 */
export type MappingOperationConfig = DecimalScaleConfig | OperationConfig;

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
  fieldOptions,
  placeholder = 'Select operation',
  readOnly = false,
  onChange,
}: {
  value?: string[];
  config?: MappingOperationConfig;
  options: MappingOperationOption[];
  fieldOptions?: OperationFieldOption[];
  placeholder?: string;
  /** 详情只读态：有配置弹窗的 operation 改为小眼睛查看，其余只显示文字。 */
  readOnly?: boolean;
  onChange: (value?: string[], config?: MappingOperationConfig) => void;
}) {
  const params = useParams<{ bt?: string; ability?: string }>();
  const businessType = (params.bt ?? '').toUpperCase();
  const ability = (params.ability ?? '').toUpperCase();
  const assetRouteDecimalAvailable = businessType === 'STABLECOIN' && ASSET_ROUTE_ABILITIES.has(ability);
  const [open, setOpen] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<DecimalScaleOperation>();
  const [form] = Form.useForm<DecimalScaleConfig>();
  const scaleSource = Form.useWatch('scaleSource', form) ?? 'fixed';
  const [configOpen, setConfigOpen] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<{ operation: string[]; kind: OperationKind }>();
  const [decimalInitial, setDecimalInitial] = useState<DecimalScaleConfig>(defaultConfig);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(decimalInitial);
  }, [decimalInitial, form, open]);

  const activeConfig = config && 'kind' in config ? config : undefined;

  /** 打开某个 operation 的配置弹窗；reuseConfig 仅在同值重开时为 true。 */
  const openOperationModal = (operation: string[], reuseConfig: boolean) => {
    const decimal = decimalScaleOperation(operation);
    if (decimal) {
      setPendingOperation(decimal);
      setDecimalInitial(reuseConfig && config && !('kind' in config) ? config : defaultConfig);
      setOpen(true);
      return;
    }
    const kind = operationKindOf(operation);
    if (kind) {
      setPendingConfig({ operation, kind });
      setConfigOpen(true);
    }
  };

  const selectOperation = (next: string[]) => {
    if (!next?.length) {
      onChange(undefined, undefined);
      return;
    }
    // 重复选中同一个 operation 时，Cascader 仍可能回调一次 onChange。
    // 此时必须沿用已有配置，不能当成「切换」把它清掉。
    if (value?.[0] === next[0] && value?.[1] === next[1]) {
      openOperationModal(next, true);
      return;
    }
    // 切换到新选项时，上一份配置一并丢弃。
    onChange(next, undefined);
    openOperationModal(next, false);
  };

  /** 再次点中同一个 operation 时重新打开弹窗（Cascader 值未变不会触发 onChange）。 */
  const reopenSameOperation = (next: string[]) => {
    if (value?.[0] !== next[0] || value?.[1] !== next[1]) return;
    if (!operationNeedsConfig(next)) return;
    openOperationModal(next, true);
  };

  /**
   * Cascader 值不变时不触发 onChange，只能从 DOM 上识别点击。
   * rc-cascader 在每个选项 li 上写了 data-path-key（值以 __RC_CASCADER_SPLIT__ 连接），
   * 比包一层 label 更稳：不受 optionRender、onMouseDown preventDefault 影响。
   */
  const handleCascaderClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!value?.length) return;
    const target = event.target as HTMLElement;
    const option = target.closest('[data-path-key]');
    if (option) {
      const path = (option.getAttribute('data-path-key') ?? '').split('__RC_CASCADER_SPLIT__');
      if (path.length >= 2) reopenSameOperation([path[0], path[1]]);
      return;
    }
    // 点已选中的显示区域，等同于再选一次同一项。
    if (target.closest('.ant-select-selection-item')) reopenSameOperation(value);
  };

  const saveConfig = (nextConfig: OperationConfig) => {
    onChange(pendingConfig?.operation ?? value, nextConfig);
    setConfigOpen(false);
    setPendingConfig(undefined);
  };

  const cancelConfig = () => {
    setConfigOpen(false);
    setPendingConfig(undefined);
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
  };

  const cancel = () => {
    setOpen(false);
    setPendingOperation(undefined);
  };

  // Cancel 后可能留下「已选但未配置」的 operation，用红框提示，保存时再拦一次。
  const unconfigured = !readOnly && operationNeedsConfig(value) && !config && !open && !configOpen;

  return <>
    {readOnly
      ? <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
        <Cascader disabled value={value} placeholder={placeholder} options={options} style={{ flex: 1, minWidth: 0 }} />
        {value?.length && operationNeedsConfig(value) ? <ConfigProvider componentDisabled={false}>
          <Tooltip title="View operation configuration">
            <Button type="text" size="small" style={{ flexShrink: 0 }} aria-label="View operation configuration" icon={<EyeOutlined />} onClick={() => openOperationModal(value, true)} />
          </Tooltip>
        </ConfigProvider> : null}
      </div>
      : <div onClickCapture={handleCascaderClick}>
        <Cascader
          allowClear
          value={value}
          placeholder={placeholder}
          options={options}
          expandTrigger="click"
          status={unconfigured ? 'error' : undefined}
          onChange={(next) => selectOperation(next as string[])}
        />
      </div>}
    {/* 只读态下 Form 的 disabled 会传染给 Modal 按钮，这里重置上下文，按钮才点得动 */}
    <ConfigProvider componentDisabled={false}>
    <Modal
      title={(pendingOperation ?? decimalScaleOperation(value)) === 'enforce-exact-decimal-scale' ? 'Enforce Exact Decimal Scale' : 'Ensure Minimum Decimal Scale'}
      open={open}
      onCancel={cancel}
      onOk={readOnly ? undefined : () => void save()}
      okText="Apply"
      footer={readOnly ? <div style={{ textAlign: 'right' }}><Button onClick={cancel}>Close</Button></div> : undefined}
    >
      <Form form={form} layout="vertical" initialValues={defaultConfig} disabled={readOnly}>
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
    </ConfigProvider>
    {pendingConfig && <OperationConfigModal
      open={configOpen}
      kind={pendingConfig.kind}
      config={activeConfig && activeConfig.kind === pendingConfig.kind ? activeConfig : undefined}
      fieldOptions={fieldOptions}
      readOnly={readOnly}
      onCancel={cancelConfig}
      onConfirm={saveConfig}
    />}
  </>;
}
