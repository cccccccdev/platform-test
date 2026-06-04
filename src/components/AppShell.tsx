import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  DashboardOutlined,
  ForkOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/home', icon: <HomeOutlined />, label: '首页' },
  {
    key: 'channel-integration',
    icon: <DashboardOutlined />,
    label: 'Channel Integration',
  },
  {
    key: 'process-orchestration',
    icon: <ForkOutlined />,
    label: 'Process Orchestration',
    children: [
      { key: '/process-orchestration/l2-dictionary', label: 'L2 Dictionary' },
      { key: '/process-orchestration/l3-library', label: 'L3 Library' },
      { key: '/process-orchestration/l4-library', label: 'L4 Library' },
    ],
  },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = '/' + location.pathname.split('/')[1];

  return (
    <Layout style={{ width: '100vw', height: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={200}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          overflow: 'auto',
        }}
      >
        <div
          onClick={() => navigate('/home')}
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 'bold',
            letterSpacing: 1,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
          }}
        >
          {collapsed ? '2.0' : '接入平台 2.0'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s', height: '100vh', overflow: 'hidden' }}>
        <Content style={{ height: '100vh', overflow: 'hidden', background: '#f5f5f5' }}>
          <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
