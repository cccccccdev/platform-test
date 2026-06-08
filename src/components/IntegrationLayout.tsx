import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  SettingOutlined,
  CodeOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;

export default function IntegrationLayout() {
  const [collapsed, setCollapsed] = useState(true); // Default collapsed
  const location = useLocation();
  const navigate = useNavigate();

  // Extract channelCode from current path
  const pathParts = location.pathname.split('/');
  const channelCodeIndex = pathParts.indexOf('channel-integration') + 1;
  const channelCode = pathParts[channelCodeIndex] || '';

  // Update menu items with actual channelCode
  const getMenuItems = () => [
    {
      key: `/channel-integration/${channelCode}/integration/match-capability`,
      icon: <DatabaseOutlined />,
      label: 'Match Capability',
    },
    {
      key: `/channel-integration/${channelCode}/integration`,
      icon: <SettingOutlined />,
      label: 'Config Integration',
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={200}
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
            fontSize: collapsed ? 14 : 14,
            fontWeight: 'bold',
            borderBottom: '1px solid #e5e4e7',
          }}
        >
          {collapsed ? 'INT' : 'Integration'}
          {!collapsed && (
            <div style={{ fontSize: 12, fontWeight: 'normal', color: '#666', marginTop: 4 }}>
              Channel: {channelCode}
            </div>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s', minHeight: '100vh' }}>
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
          Omnicore Solution
          <span style={{ margin: '0 8px', color: '#ccc' }}>/</span>
          Channel Integration
          <span style={{ margin: '0 8px', color: '#ccc' }}>/</span>
          {location.pathname.includes('/match-capability') && 'Match Capability'}
          {location.pathname.includes('/integration/config') && location.pathname.split('/').length <= 5 && 'Config Integration'}
          {location.pathname.includes('/integration/code') && !location.pathname.includes('/integration/code/') && 'Code Integration'}
        </div>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 57px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}