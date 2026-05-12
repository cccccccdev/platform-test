import { Select } from 'antd';

const CREDENTIALS = [
  { id: 'cred_001', name: 'Channel_Credential_001', type: 'API_KEY' },
  { id: 'cred_002', name: 'Channel_Credential_002', type: 'API_KEY' },
  { id: 'cred_003', name: 'Merchant_Credential_001', type: 'BASIC_AUTH' },
  { id: 'cred_004', name: 'OAuth_Credential_001', type: 'OAUTH2' },
  { id: 'cred_005', name: 'Signature_Key_001', type: 'SIGNATURE' },
  { id: 'cred_006', name: 'Encrypt_Key_001', type: 'ENCRYPTION' },
  { id: 'cred_007', name: 'Verify_Key_001', type: 'VERIFY' },
  { id: 'cred_008', name: 'Decrypt_Key_001', type: 'DECRYPTION' },
];

interface CredentialSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  credentialType?: 'API_KEY' | 'BASIC_AUTH' | 'OAUTH2' | 'SIGNATURE' | 'ENCRYPTION' | 'DECRYPTION' | 'VERIFY';
  allowClear?: boolean;
}

export default function CredentialSelector({
  value,
  onChange,
  placeholder = '选择 Credential',
  disabled = false,
  credentialType,
  allowClear = true,
}: CredentialSelectorProps) {
  const filtered = credentialType
    ? CREDENTIALS.filter(c => c.type === credentialType)
    : CREDENTIALS;

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      style={{ width: '100%' }}
    >
      {filtered.map((cred) => (
        <Select.Option key={cred.id} value={cred.id}>
          {cred.name} <span style={{ color: '#999', fontSize: 10 }}>({cred.type})</span>
        </Select.Option>
      ))}
    </Select>
  );
}

export { CREDENTIALS };
