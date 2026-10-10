import { Layout, Menu } from 'antd';
import { CloudUploadOutlined, NotificationOutlined, RocketOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand, UserProfile } from './PlatformChrome';
import { AnnouncementChrome } from './AnnouncementOverlays';

const { Sider, Content, Header } = Layout;

export default function AnnouncementLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  // 编辑页归属 Publish Management（用户从那里点进来）；详情页回归所属列表；列表页按 kind 高亮
  const selectedKey = path.includes('/edit/new') || path.startsWith('/announcement/manage')
    ? '/announcement/manage'
    : path.includes('iteration')
      ? '/announcement/iteration'
      : '/announcement/system';

  return (
    <Layout className="legacy-app-shell">
      <Sider theme="dark" width={202} className="legacy-sidebar">
        <div onClick={() => navigate('/home')} className="legacy-sidebar-brand"><Brand /></div>
        <div className="legacy-sidebar-section">Announcement <span>⌃</span></div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
          className="legacy-menu"
          items={[
            { key: '/announcement/system', icon: <NotificationOutlined />, label: 'System Announcement' },
            { key: '/announcement/iteration', icon: <RocketOutlined />, label: 'Iteration Announcement' },
            { key: '/announcement/manage', icon: <CloudUploadOutlined />, label: 'Publish Management' },
          ]}
        />
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
