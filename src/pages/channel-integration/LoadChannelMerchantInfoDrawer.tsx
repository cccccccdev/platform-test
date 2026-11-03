import { Alert, Button, Drawer, Form, Select, Space, Tag, Tooltip } from 'antd';
import { InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const internalMerchantIdOptions = [
  {
    label: 'SPI Public Fields',
    options: [
      { label: 'merchantId', value: 'spi.request.merchantId' },
      { label: 'reference', value: 'spi.request.reference' },
      { label: 'customerId', value: 'spi.request.customerId' },
      { label: 'accountNumber', value: 'spi.request.accountNumber' },
    ],
  },
  {
    label: 'extraRequest',
    options: [
      { label: 'merchantId', value: 'extraRequest.merchantId' },
      { label: 'merchantName', value: 'extraRequest.merchantName' },
      { label: 'customerPhone', value: 'extraRequest.customerPhone' },
    ],
  },
];

const spiRequestFieldOptions = [
  {
    label: 'SPI Public Fields',
    options: [
      { label: 'merchantId', value: 'spi.request.merchantId' },
      { label: 'reference', value: 'spi.request.reference' },
      { label: 'customerId', value: 'spi.request.customerId' },
      { label: 'accountNumber', value: 'spi.request.accountNumber' },
    ],
  },
  {
    label: 'extraRequest',
    options: [
      { label: 'merchantId', value: 'extraRequest.merchantId' },
      { label: 'merchantName', value: 'extraRequest.merchantName' },
      { label: 'customerPhone', value: 'extraRequest.customerPhone' },
      {
        label: 'extraRequest.extend.threeDSRequiredType',
        value: 'extraRequest.extend.threeDSRequiredType',
      },
    ],
  },
];

const autoMerchantIdOptions = [
  {
    label: 'Use channelMerchantId (3DS)',
    value: 'CHANNEL_MERCHANT_ID',
  },
  {
    label: 'Use non3dsChannelMerchantId (non-3DS)',
    value: 'NON3DS_CHANNEL_MERCHANT_ID',
  },
];

type Props = {
  open: boolean;
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
};

export default function LoadChannelMerchantInfoDrawer({ open, initialValues = {}, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const threeDSRequiredTypeField = Form.useWatch('threeDSRequiredTypeField', form);

  return (
    <Drawer
      title={<Space><span>Configure Load Channel Merchant Info</span><Tag color="blue">loadChannelMerchantInfo</Tag></Space>}
      width={520}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => form.validateFields().then(onSave)}>Save</Button></Space>}
    >
      <Form form={form} layout="vertical" disabled={readOnly} initialValues={initialValues}>
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
          description="Select the field that contains the internal merchant ID. For channels that use different merchant IDs for 3DS and non-3DS requests, optionally select the SPI Request field carrying the 3DS requirement. The component resolves FORCE, NONE, or AUTO internally and still exposes one final channelMerchantId to downstream mappings."
        />
        <Form.Item
          name="internalMerchantId"
          label={<Space size={4}><span>Internal Merchant ID</span><Tooltip title="Select the current SPI Request field that contains the internal merchant ID."><QuestionCircleOutlined /></Tooltip></Space>}
          rules={[{ required: true, message: 'Select the Internal Merchant ID field' }]}
        >
          <Select placeholder="Select a field" options={internalMerchantIdOptions} />
        </Form.Item>
        <Form.Item
          name="threeDSRequiredTypeField"
          label={<Space size={4}><span>3DS Required Type Field</span><Tooltip title="Optional. Select the SPI Request field that specifies the required merchant ID type for this request. The selected field must provide FORCE, NONE, or AUTO in uppercase. Leave empty for channels that always use channelMerchantId."><QuestionCircleOutlined /></Tooltip></Space>}
        >
          <Select
            allowClear
            placeholder="Select a SPI Request field"
            options={spiRequestFieldOptions}
            onChange={(value) => {
              if (!value) form.setFieldValue('merchantIdForAuto', undefined);
            }}
          />
        </Form.Item>
        {threeDSRequiredTypeField && <Form.Item
          name="merchantIdForAuto"
          label={<Space size={4}><span>Merchant ID for AUTO</span><Tooltip title="Select the merchant ID used when the 3DS requirement is AUTO. FORCE uses channelMerchantId; NONE uses non3dsChannelMerchantId."><QuestionCircleOutlined /></Tooltip></Space>}
          rules={[{ required: true, message: 'Select which merchant ID AUTO should use' }]}
        >
          <Select placeholder="Select the ID used for AUTO" options={autoMerchantIdOptions} />
        </Form.Item>}
      </Form>
    </Drawer>
  );
}
