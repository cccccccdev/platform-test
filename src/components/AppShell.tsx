import { Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand, UserProfile } from './PlatformChrome';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/basic-info/country', label: 'Country' },
  { key: '/basic-info/party', label: 'Party' },
  { key: '/basic-info/card-bin', label: 'Card Bin' },
  { key: '/basic-info/party-tenant', label: 'Party&Tenant' },
  { key: '/basic-info/business-type', label: 'Business Type' },
  { key: '/basic-info/capability', label: 'Capability' },
  { key: '/basic-info/institution-type', label: 'Institution Type' },
  { key: '/basic-info/institution', label: 'Institution' },
  { key: '/basic-info/segment', label: 'Segment' },
  { key: '/basic-info/response-code', label: 'Response Code' },
  { key: '/basic-info/application', label: 'Application' },
  { key: '/basic-info/service', label: 'Service' },
  { key: '/basic-info/stateMachine', label: 'State Machine' },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey = location.pathname === '/basic-info' ? '/basic-info/country' : location.pathname;

  return (
    <Layout className="legacy-app-shell">
      <Sider
        theme="dark"
        width={202}
        className="legacy-sidebar"
      >
        <div onClick={() => navigate('/home')} className="legacy-sidebar-brand"><Brand /></div>
        <div className="legacy-sidebar-section">Basic Info <span>⌃</span></div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="legacy-menu"
        />
      </Sider>
      <Layout className="legacy-main">
        <Header className="legacy-header"><UserProfile /></Header>
        <Content className="legacy-content">
          <div className="legacy-content-scroll">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
