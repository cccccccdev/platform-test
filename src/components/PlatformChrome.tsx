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

export function UserProfile({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`platform-user${dark ? ' platform-user-dark' : ''}`}>
      <Avatar size={28} icon={<UserOutlined />} className="platform-user-avatar" />
      <span>我爱北京天安门</span>
    </div>
  );
}

