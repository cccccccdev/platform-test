import { Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ProfileOutlined,
  ForkOutlined,
  ControlOutlined,
  UserOutlined,
} from '@ant-design/icons';

export default function HomePage() {
  const navigate = useNavigate();
  const modules = [
    { title: 'Basic Info', icon: <ProfileOutlined />, tone: 'violet', path: '/basic-info/country' },
    { title: 'Channel Integration', icon: <ForkOutlined />, tone: 'indigo', path: '/channel-integration' },
    { title: 'Operation Config', icon: <ControlOutlined />, tone: 'cyan', path: '/operation-config' },
  ];

  return (
    <div className="legacy-home">
      <header className="legacy-home-header">
        <strong>Omnicore Solution</strong>
        <div className="legacy-home-user"><Avatar size={28} icon={<UserOutlined />} />我爱北京天安门</div>
      </header>
      <main className="legacy-home-modules">
        {modules.map((module) => (
          <button key={module.path} className="legacy-module" onClick={() => navigate(module.path)}>
            <span className={`legacy-module-icon ${module.tone}`}>{module.icon}</span>
            <strong>{module.title}</strong>
          </button>
        ))}
      </main>
    </div>
  );
}
