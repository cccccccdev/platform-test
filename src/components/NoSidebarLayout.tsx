import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';

const { Content } = Layout;

export default function NoSidebarLayout() {
  return (
    <Layout style={{ width: '100vw', height: '100vh' }}>
      <Content style={{ height: '100vh', overflow: 'auto', background: '#f5f5f5' }}>
        <ReactFlowProvider>
          <div style={{ height: '100%', padding: 0 }}>
            <Outlet />
          </div>
        </ReactFlowProvider>
      </Content>
    </Layout>
  );
}
