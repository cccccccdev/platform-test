import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export function Brand() {
  return (
    <div className="platform-brand">
      <span className="platform-brand-mark">◇</span>
      <span>Omnicore Solution</span>
    </div>
  );
}

export function UserProfile({ dark = false, name = '我爱北京天安门' }: { dark?: boolean; name?: string }) {
  return (
    <div className={`platform-user${dark ? ' platform-user-dark' : ''}`}>
      <Avatar size={28} icon={<UserOutlined />} className="platform-user-avatar" />
      <span>{name}</span>
    </div>
  );
}
