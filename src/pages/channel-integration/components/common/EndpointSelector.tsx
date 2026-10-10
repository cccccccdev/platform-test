import { Select } from 'antd';

const ENDPOINTS = [
  { id: 'ep_001', name: 'Payment_Gateway_API', url: 'https://api.example.com/v1/payment', method: 'POST' },
  { id: 'ep_002', name: 'Query_API', url: 'https://api.example.com/v1/query', method: 'POST' },
  { id: 'ep_003', name: 'Refund_API', url: 'https://api.example.com/v1/refund', method: 'POST' },
  { id: 'ep_004', name: 'Notify_API', url: 'https://api.example.com/v1/notify', method: 'POST' },
  { id: 'ep_005', name: 'Withdraw_API', url: 'https://api.example.com/v1/withdraw', method: 'POST' },
  { id: 'ep_006', name: 'Balance_API', url: 'https://api.example.com/v1/balance', method: 'GET' },
];

interface EndpointSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export default function EndpointSelector({
  value,
  onChange,
  placeholder = '选择 Endpoint',
  disabled = false,
  allowClear = true,
}: EndpointSelectorProps) {
  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      style={{ width: '100%' }}
    >
      {ENDPOINTS.map((ep) => (
        <Select.Option key={ep.id} value={ep.id}>
          {ep.name} <span style={{ color: '#999', fontSize: 10 }}>({ep.method} {ep.url})</span>
        </Select.Option>
      ))}
    </Select>
  );
}

export { ENDPOINTS };
