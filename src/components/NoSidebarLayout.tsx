import { Layout } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { ReactFlowProvider } from '@xyflow/react';

const { Content, Header } = Layout;

export default function NoSidebarLayout() {
  const navigate = useNavigate();

  return (
    <Layout style={{ width: '100vw', height: '100vh' }}>
      <Header
        style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e5e4e7',
          height: 64,
        }}
      >
        <Button
          type="text"
          icon={<HomeOutlined />}
          onClick={() => navigate('/home')}
          style={{ marginRight: 16 }}
        >
          首页
        </Button>
        <span
          onClick={() => navigate('/home')}
          style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer' }}
        >
          接入平台 2.0
        </span>
        <span style={{ fontSize: 13, color: '#999', marginLeft: 12 }}>
          Channel Integration
        </span>
      </Header>
      <Content style={{ height: 'calc(100vh - 64px)', overflow: 'auto', background: '#f5f5f5' }}>
        <ReactFlowProvider>
          <div style={{ height: '100%', padding: 0 }}>
            <Outlet />
          </div>
        </ReactFlowProvider>
      </Content>
    </Layout>
  );
}
