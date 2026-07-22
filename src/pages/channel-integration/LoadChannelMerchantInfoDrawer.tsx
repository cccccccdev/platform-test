import { Alert, Button, Drawer, Form, Select, Space, Tag } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

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

type Props = {
  open: boolean;
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
};

export default function LoadChannelMerchantInfoDrawer({ open, initialValues = {}, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();

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
          description="Select the field that contains the internal merchant ID. You can choose from the current SPI public fields and extraRequest fields; extraResponse fields are not available. At runtime, the platform uses this value with the current channel, country, and party to find the matching Channel Merchant Info. Once available, downstream field mappings can select keys from the Channel Merchant Info object."
        />
        <Form.Item
          name="internalMerchantId"
          label="Internal Merchant ID"
          rules={[{ required: true, message: 'Select the Internal Merchant ID field' }]}
        >
          <Select placeholder="Select a field" options={internalMerchantIdOptions} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
