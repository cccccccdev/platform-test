import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand, UserProfile } from './PlatformChrome';
import { AnnouncementChrome } from './AnnouncementOverlays';

const { Sider, Content, Header } = Layout;

export default function AnnouncementLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  return (
    <Layout className="legacy-app-shell">
      <Sider theme="dark" width={202} className="legacy-sidebar">
        <div onClick={() => navigate('/home')} className="legacy-sidebar-brand"><Brand /></div>
        <div className="legacy-sidebar-section">Announcement <span>⌃</span></div>
        <ul className="announcement-sidebar-nav">
          <li>
            <button
              type="button"
              className={path.startsWith('/announcement') ? 'announcement-sidebar-item announcement-sidebar-item-active' : 'announcement-sidebar-item'}
              onClick={() => navigate('/announcement/manage')}
            >
              Publish Management
            </button>
          </li>
        </ul>
      </Sider>
      <Layout className="legacy-main">
        <Header className="legacy-header announcement-header">
          <AnnouncementChrome />
          <UserProfile />
        </Header>
        <Content className="legacy-content">
          <div className="legacy-content-scroll">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
