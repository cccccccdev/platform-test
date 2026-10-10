import { ArrowLeftOutlined } from '@ant-design/icons';
import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from './PlatformChrome';

const { Sider, Content } = Layout;

export default function IntegrationDetailLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const readOnly = new URLSearchParams(location.search).get('mode') === 'detail';

  if (!readOnly) return <Outlet />;

  const pathParts = location.pathname.split('/');
  const channelCode = pathParts[pathParts.indexOf('channel-integration') + 1] ?? '';
  const flowIndex = pathParts.indexOf('flows');
  const backPath = flowIndex >= 0
    ? `${pathParts.slice(0, flowIndex).join('/')}?mode=detail`
    : `/channel-integration/${channelCode}/integration/config/route-matching`;

  return (
    <Layout className="integration-shell">
      <Sider width={200} theme="dark" className="integration-sidebar">
        <div className="integration-brand" onClick={() => navigate('/home')}>
          <Brand />
        </div>
        <button type="button" className="sidebar-back" onClick={() => navigate(backPath)}>
          <span className="sidebar-back-icon"><ArrowLeftOutlined /></span>
          <span>Back</span>
        </button>
      </Sider>
      <Content style={{ minWidth: 0, overflow: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
