import { Switch, Space, Typography } from 'antd';

const { Text } = Typography;

interface EnableSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function EnableSwitch({
  checked,
  onChange,
  label = '启用',
  disabled = false,
}: EnableSwitchProps) {
  return (
    <Space>
      <Text>{label}</Text>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size="small"
      />
      <Text type="secondary" style={{ fontSize: 12 }}>
        {checked ? '已启用' : '已关闭'}
      </Text>
    </Space>
  );
}
