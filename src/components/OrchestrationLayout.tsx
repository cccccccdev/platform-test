import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ApiOutlined,
  AppstoreOutlined,
  ForkOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

const orchestrationMenuItems = [
  { key: '/process-orchestration/l2-dictionary', icon: <ApiOutlined />, label: 'L2 Dictionary' },
  { key: '/process-orchestration/l3-library', icon: <AppstoreOutlined />, label: 'L3 Library' },
  { key: '/process-orchestration/l4-library', icon: <ForkOutlined />, label: 'L4 Library' },
];

export default function OrchestrationLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
          selectedKeys={[location.pathname]}
          items={orchestrationMenuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s', height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e5e4e7',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 64,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
            流程编排
          </span>
          <span style={{ fontSize: 13, color: '#999', marginLeft: 12 }}>
            L2原子层 → L3组合层 → L4模板层
          </span>
        </Header>
        <Content style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#f5f5f5' }}>
          <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
