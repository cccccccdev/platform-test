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
  const readOnlyDetail = new URLSearchParams(location.search).get('mode') === 'detail';
  const flowGroupWorkspace = location.pathname.includes('/integration/config/flow-groups/')
    && location.pathname.includes('/versions/')
    && !location.pathname.includes('/flows/');
  const backOnly = readOnlyDetail || flowGroupWorkspace;
  const detailBackPath = `/channel-integration/${channelCode}/integration/config/flow-groups`;

  // Update menu items with actual channelCode
  const getMenuItems = () => [
    {
      key: 'config-integration',
      icon: <SettingOutlined />,
      label: 'Config Integration',
      children: [
        {
          key: `/channel-integration/${channelCode}/integration/config/overview`,
          label: 'Overview',
        },
        {
          key: `/channel-integration/${channelCode}/integration/config/metadata`,
          label: 'Metadata',
        },
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

  const selectedMenuKey = location.pathname.includes('/config/overview')
    ? `/channel-integration/${channelCode}/integration/config/overview`
    : location.pathname.includes('/config/metadata')
      ? `/channel-integration/${channelCode}/integration/config/metadata`
    : location.pathname.includes('/route-matching') || location.pathname.includes('/match-capability')
    ? `/channel-integration/${channelCode}/integration/config/route-matching`
    : location.pathname.includes('/flow-groups') || location.pathname.includes('/integration/config')
      ? `/channel-integration/${channelCode}/integration/config/flow-groups`
      : location.pathname.includes('/integration/code')
        ? `/channel-integration/${channelCode}/integration/code`
        : `/channel-integration/${channelCode}/integration/config/overview`;

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
        <button type="button" className="sidebar-back" onClick={() => navigate(backOnly ? detailBackPath : '/channel-integration')}>
          <span className="sidebar-back-icon"><ArrowLeftOutlined /></span>
          <span>{backOnly ? 'Back' : 'Channel List'}</span>
        </button>
        {!backOnly && <Menu
          className="integration-menu"
          theme="dark"
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          defaultOpenKeys={['config-integration']}
          items={getMenuItems()}
          onClick={handleMenuClick}
        />}
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
