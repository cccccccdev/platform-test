import { useState, useMemo } from 'react';
import { Select, Input, Space, Tag } from 'antd';

const FIELD_NAMESPACES = {
  'spi.request': [
    'spi.request.channelId',
    'spi.request.merchantId',
    'spi.request.orderId',
    'spi.request.amount',
    'spi.request.currency',
    'spi.request.txnType',
    'spi.request.txnRef',
    'spi.request.timestamp',
    'spi.request.signature',
    'spi.request.language',
    'spi.request.notifyUrl',
    'spi.request.returnUrl',
    'spi.request.subject',
    'spi.request.description',
  ],
  'spi.response': [
    'spi.response.code',
    'spi.response.message',
    'spi.response.data',
    'spi.response.signature',
    'spi.response.timestamp',
  ],
  'globalVar': [
    'globalVar.channelId',
    'globalVar.merchantId',
    'globalVar.apiVersion',
    'globalVar.env',
    'globalVar.timestamp',
  ],
  'orderVar': [
    'orderVar.orderId',
    'orderVar.amount',
    'orderVar.currency',
    'orderVar.status',
    'orderVar.txnType',
    'orderVar.txnRef',
    'orderVar.createdAt',
    'orderVar.updatedAt',
  ],
  'contextVar': [
    'contextVar.requestId',
    'contextVar.sessionId',
    'contextVar.userId',
    'contextVar.deviceId',
    'contextVar.ipAddress',
    'contextVar.customFields',
  ],
};

interface FieldPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export default function FieldPicker({
  value,
  onChange,
  placeholder = '选择字段',
  disabled = false,
  allowClear = true,
}: FieldPickerProps) {
  const [searchValue, setSearchValue] = useState('');

  const options = useMemo(() => {
    const result: { label: string; options: { label: string; value: string }[] }[] = [];
    Object.entries(FIELD_NAMESPACES).forEach(([namespace, fields]) => {
      const filteredFields = searchValue
        ? fields.filter(f => f.toLowerCase().includes(searchValue.toLowerCase()))
        : fields;
      if (filteredFields.length > 0 || !searchValue) {
        result.push({
          label: namespace,
          options: filteredFields.map(f => ({ label: f, value: f })),
        });
      }
    });
    return result;
  }, [searchValue]);

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      showSearch
      filterOption={false}
      notFoundContent={null}
      dropdownRender={(menu) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="搜索字段..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ marginBottom: 8 }}
            autoFocus
          />
          <Space size={[4, 8]} wrap>
            {Object.keys(FIELD_NAMESPACES).map((ns) => (
              <Tag
                key={ns}
                style={{ cursor: 'pointer' }}
                onClick={() => setSearchValue(ns + '.')}
              >
                {ns}
              </Tag>
            ))}
          </Space>
          {searchValue && (
            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8 }}>
              {menu}
            </div>
          )}
        </div>
      )}
      style={{ width: '100%' }}
      options={options}
    />
  );
}
