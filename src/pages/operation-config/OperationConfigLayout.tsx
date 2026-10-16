import { DownOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnnouncementChrome } from '../../components/AnnouncementOverlays';
import { Brand, UserProfile } from '../../components/PlatformChrome';
import './operation-config.css';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/operation-config/business-type-service-channel', label: 'Business Type - Service Channel' },
  { key: '/operation-config/service-channel-asset-route', label: 'Service Channel AssetRoute' },
  { key: '/operation-config/service-channel-institution', label: 'Service Channel Institution' },
  { key: '/operation-config/pos-channel-acquirer', label: 'POS Channel Acquirer' },
  { key: '/operation-config/pos-service-channel-institution', label: 'POS Service Channel Institution' },
  { key: '/operation-config/schedule-trans', label: 'Schedule Trans' },
  { key: '/operation-config/probe-test-list', label: 'ProbeTest List' },
  { key: '/operation-config/route-event', label: 'Route Event' },
  { key: '/operation-config/availability-monitoring', label: 'Availability monitoring' },
  { key: '/operation-config/monitoring-scenarios', label: 'Monitoring Scenarios' },
];

export default function OperationConfigLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedMenuKey = location.pathname.startsWith('/operation-config/monitoring-scenarios')
    ? '/operation-config/monitoring-scenarios'
    : location.pathname;

  return (
    <Layout className="operation-config-shell">
      <Sider width={250} className="operation-config-sidebar">
        <button type="button" className="operation-config-brand" onClick={() => navigate('/home')}>
          <Brand />
        </button>
        <div className="operation-config-section-title">
          <span>Operation Config</span>
          <DownOutlined />
        </div>
        <Menu
          className="operation-config-menu"
          theme="dark"
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout className="operation-config-main">
        <Header className="operation-config-header">
          <div className="operation-config-header-actions">
            <AnnouncementChrome />
            <UserProfile />
          </div>
        </Header>
        <Content className="operation-config-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
