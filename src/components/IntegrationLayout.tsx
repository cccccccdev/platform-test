import { Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  SettingOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { Brand, UserProfile } from './PlatformChrome';

const { Sider, Content } = Layout;

export default function IntegrationLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract channelCode from current path
  const pathParts = location.pathname.split('/');
  const channelCodeIndex = pathParts.indexOf('channel-integration') + 1;
  const channelCode = pathParts[channelCodeIndex] || '';

  // Update menu items with actual channelCode
  const getMenuItems = () => [
    {
      key: '/channel-integration',
      icon: <ArrowLeftOutlined />,
      label: 'Channel List',
    },
    {
      key: 'config-integration',
      icon: <SettingOutlined />,
      label: 'Config Integration',
      children: [
        {
          key: `/channel-integration/${channelCode}/integration/config/route-matching`,
          label: 'Route Matching',
        },
        {
          key: `/channel-integration/${channelCode}/integration/config/flow-groups`,
          label: 'Flow Groups',
        },
      ],
    },
    {
      key: `/channel-integration/${channelCode}/integration/code`,
      icon: <CodeOutlined />,
      label: 'Code Integration',
    },
  ];

  // Handle menu click - navigate directly
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const selectedMenuKey = location.pathname.includes('/route-matching') || location.pathname.includes('/match-capability')
    ? `/channel-integration/${channelCode}/integration/config/route-matching`
    : location.pathname.includes('/flow-groups') || location.pathname.includes('/integration/config')
      ? `/channel-integration/${channelCode}/integration/config/flow-groups`
      : location.pathname.includes('/integration/code')
        ? `/channel-integration/${channelCode}/integration/code`
        : `/channel-integration/${channelCode}/integration/config/flow-groups`;

  return (
    <Layout className="integration-shell">
      <Sider
        className="integration-sidebar"
        theme="dark"
        width={200}
      >
        <div className="integration-brand" onClick={() => navigate('/home')}>
          <Brand />
        </div>
        <Menu
          className="integration-menu"
          theme="dark"
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          defaultOpenKeys={['config-integration']}
          items={getMenuItems()}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout className="integration-main">
        <div className="integration-topbar">
          <UserProfile />
        </div>
        <Content className="integration-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
