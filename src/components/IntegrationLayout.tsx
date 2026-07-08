import { Button, Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  SettingOutlined,
  CodeOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';

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
          icon: <DatabaseOutlined />,
          label: 'Route Matching',
        },
        {
          key: `/channel-integration/${channelCode}/integration/config/flow-groups`,
          icon: <SettingOutlined />,
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

  const breadcrumbLeaf = location.pathname.includes('/route-matching') || location.pathname.includes('/match-capability')
    ? 'Route Matching'
    : location.pathname.includes('/flow-groups') || location.pathname.includes('/integration/config')
      ? 'Flow Groups'
    : location.pathname.includes('/integration/code')
        ? 'Code Integration'
        : 'Flow Groups';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={240}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          overflow: 'auto',
          borderRight: '1px solid #e5e4e7',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a1a2e',
            fontSize: 14,
            fontWeight: 'bold',
            borderBottom: '1px solid #e5e4e7',
          }}
        >
          Integration
          <div style={{ fontSize: 12, fontWeight: 'normal', color: '#666', marginTop: 4 }}>
            Channel: {channelCode}
          </div>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          defaultOpenKeys={['config-integration']}
          items={getMenuItems()}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: 240, minHeight: '100vh' }}>
        <div
          style={{
            padding: '16px 24px',
            background: '#fff',
            borderBottom: '1px solid #e5e4e7',
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            color: '#666',
          }}
        >
          <Button
            type="link"
            onClick={() => navigate('/home')}
            style={{ height: 'auto', padding: 0, color: '#666' }}
          >
            Omnicore Solution
          </Button>
          <span style={{ margin: '0 8px', color: '#ccc' }}>/</span>
          Channel Integration
          <span style={{ margin: '0 8px', color: '#ccc' }}>/</span>
          Integration
          <span style={{ margin: '0 8px', color: '#ccc' }}>/</span>
          {breadcrumbLeaf}
        </div>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 57px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
