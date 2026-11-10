import { Button, Cascader, Checkbox, ConfigProvider, Form, Input, Modal, Select, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import GroovyScriptEditor from './GroovyScriptEditor';
import {
  concatRuleOptions,
  createTypeConvertRow,
  customScriptTemplate,
  defaultOperationConfig,
  stringFieldTypeOptions,
  type OperationConfig,
  type OperationKind,
} from './operationConfigs';

const { Text } = Typography;

export interface OperationFieldOption {
  label: string;
  value?: string;
  children?: OperationFieldOption[];
  /** 分组节点用 options 承载子项。 */
  options?: OperationFieldOption[];
}

interface CascaderNode {
  label: string;
  value: string;
  children?: CascaderNode[];
}

const toCascaderOptions = (options: OperationFieldOption[]): CascaderNode[] =>
  options.map((option) => option.options
    ? { label: option.label, value: option.label, children: toCascaderOptions(option.options) }
    : {
      label: option.label,
      value: option.value ?? option.label,
      children: option.children ? toCascaderOptions(option.children) : undefined,
    });

interface Props {
  open: boolean;
  kind: OperationKind;
  config?: OperationConfig;
  /** Field Concat 可选字段，来源与 Source Value 候选树一致。 */
  fieldOptions?: OperationFieldOption[];
  /** 详情只读态：只能看，不能改。 */
  readOnly?: boolean;
  onCancel: () => void;
  onConfirm: (config: OperationConfig) => void;
}

export default function OperationConfigModal({ open, kind, config, fieldOptions = [], readOnly = false, onCancel, onConfirm }: Props) {
  const [form] = Form.useForm();
  // 组件每次打开都重新挂载（外层按 pendingConfig 卸载），因此 initialValues 必然在挂载时读到最新缓存。
  // 不用 useEffect + resetFields：Modal 首次渲染时 Form 可能尚未连接，回填会丢失。
  const initial = config && config.kind === kind ? config : defaultOperationConfig(kind);

  const submit = async () => {
    const values = await form.validateFields();
    let next: OperationConfig;
    switch (kind) {
      case 'typeConvert':
        next = { kind, rows: values.rows ?? [] };
        break;
      case 'customScript':
        next = { kind, script: values.script };
        break;
      case 'phoneNumberOperate':
        next = {
          kind,
          removeCountryCodeZero: !!values.removeCountryCodeZero,
          removePhoneNumberZero: !!values.removePhoneNumberZero,
        };
        break;
      case 'fieldConcat':
        next = { kind, field: values.field, rule: values.rule };
        break;
      case 'stringToDate':
        next = {
          kind,
          customFormat: !!values.customFormat,
          stringFieldType: values.stringFieldType,
          customFormatValue: values.customFormat ? values.customFormatValue : undefined,
        };
        break;
      default:
        return;
    }
    onConfirm(next);
  };

  const body = () => {
    switch (kind) {
      case 'typeConvert':
        return (
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 8, padding: '7px 10px', background: '#fafafa', color: '#8c8c8c', fontSize: 12, borderBottom: '1px solid #f0f0f0' }}>
              <span>Inner</span><span>Outer</span><span />
            </div>
            <Form.List name="rows">
              {(fields, { add, remove }) => (
                <div style={{ padding: 10 }}>
                  {fields.map((field) => (
                    <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 8, marginBottom: 8 }}>
                      <Form.Item name={[field.name, 'inner']} rules={[{ required: true, message: 'Enter inner value' }]} style={{ margin: 0 }}>
                        <Input placeholder="Inner" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'outer']} rules={[{ required: true, message: 'Enter outer value' }]} style={{ margin: 0 }}>
                        <Input placeholder="Outer" />
                      </Form.Item>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Remove field" disabled={readOnly || fields.length === 1} onClick={() => remove(field.name)} />
                    </div>
                  ))}
                  <Button type="dashed" block icon={<PlusOutlined />} disabled={readOnly} onClick={() => add(createTypeConvertRow())}>Add field</Button>
                </div>
              )}
            </Form.List>
          </div>
        );
      case 'customScript':
        return <GroovyScriptEditor name="script" label="Custom Script" template={customScriptTemplate} languageNote="Please write in JavaScript" />;
      case 'phoneNumberOperate':
        return (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              This operation is designed to handle cases where both the country code and the phone number contain leading zeros.
              It removes all leading zeros within the first four digits (typically the country code) and all leading zeros starting
              from the fifth digit (the phone number). For example, given the input 023401234567890, the processed result will be 2341234567890.
            </Text>
            <Form.Item name="removeCountryCodeZero" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Checkbox>Remove the leading zero from the country code</Checkbox>
            </Form.Item>
            <Form.Item name="removePhoneNumberZero" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>Remove the leading zero from the phone number</Checkbox>
            </Form.Item>
          </>
        );
      case 'fieldConcat':
        return (
          <>
            <Form.Item name="field" label="Field Concat" rules={[{ required: true, message: 'Select the field to concat' }]}>
              <Cascader
                showSearch
                options={toCascaderOptions(fieldOptions)}
                placeholder="Please Select"
                expandTrigger="click"
                notFoundContent="No field available"
              />
            </Form.Item>
            <Form.Item name="rule" label="Concat Rule" rules={[{ required: true, message: 'Select the concat rule' }]} style={{ marginBottom: 0 }}>
              <Select options={concatRuleOptions} placeholder="Please Select" />
            </Form.Item>
          </>
        );
      case 'stringToDate':
        return (
          <>
            <Form.Item name="customFormat" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>Custom Format</Checkbox>
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(previous, current) => previous.customFormat !== current.customFormat}>
              {({ getFieldValue }) => getFieldValue('customFormat') && (
                <Form.Item name="customFormatValue" label="Custom Format" rules={[{ required: true, whitespace: true, message: 'Enter the custom format' }]}>
                  <Input placeholder="For example: yyyy-MM-dd" />
                </Form.Item>
              )}
            </Form.Item>
            <Form.Item name="stringFieldType" label="StringFieldType" rules={[{ required: true, message: 'Select the string field type' }]} style={{ marginBottom: 0 }}>
              <Select options={stringFieldTypeOptions} placeholder="Please Select" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    // 外层 Form 处于只读态时会把 disabled 传染给 Modal 的按钮，这里重置回来，只让表单本身只读
    <ConfigProvider componentDisabled={false}>
    <Modal
      title="Operation Config"
      open={open}
      onCancel={onCancel}
      onOk={() => { submit().catch(() => undefined); }}
      okText="Confirm"
      cancelText="Cancel"
      footer={readOnly ? <div style={{ textAlign: 'right' }}><Button onClick={onCancel}>Close</Button></div> : undefined}
      destroyOnHidden
      width={kind === 'customScript' ? 720 : 520}
    >
      <Form form={form} layout="vertical" initialValues={initial} preserve={false} disabled={readOnly}>
        {body()}
      </Form>
    </Modal>
    </ConfigProvider>
  );
}
