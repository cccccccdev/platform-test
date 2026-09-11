import { useEffect, useRef, useState } from 'react';
import { Layout, Menu, Select } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Brand, UserProfile } from './PlatformChrome';
import { useBusinessTypeStore } from '../pages/basic-info/businessTypeReferenceData';

const { Sider, Content, Header } = Layout;
const BUSINESS_TYPE_CONTEXT_KEY = 'basicInfoBusinessTypeContext';

const workspaceMenuLabel = (label: string) => (
  <span className="business-context-entry-label">
    <span>{label}</span>
    <RightOutlined />
  </span>
);

const menuItems = [
  { key: '/basic-info/currency', label: 'Currency' },
  { key: '/basic-info/country', label: 'Country' },
  { key: '/basic-info/party', label: 'Party' },
  { key: '/basic-info/card-bin', label: 'Card Bin' },
  { key: '/basic-info/party-tenant', label: 'Party&Tenant' },
  { key: '/basic-info/business-type', label: 'Business Type' },
  { key: '/basic-info/capability', label: workspaceMenuLabel('Capability') },
  { key: '/basic-info/service', label: workspaceMenuLabel('Service') },
  { key: '/basic-info/institution-type', label: 'Institution Type' },
  { key: '/basic-info/institution', label: 'Institution' },
  { key: '/basic-info/segment', label: 'Segment' },
  { key: '/basic-info/response-code', label: 'Response Code' },
  { key: '/basic-info/application', label: 'Application' },
  { key: '/basic-info/stateMachine', label: 'State Machine' },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const businessTypeRecords = useBusinessTypeStore((state) => state.records);
  const [businessTypeLocator, setBusinessTypeLocator] = useState<string>();
  const businessTypeLocatorRef = useRef<string | undefined>(undefined);
  const businessTypeMenuRef = useRef<HTMLDivElement>(null);
  const isCapabilityWorkspace = location.pathname.startsWith('/basic-info/capability');
  const isServiceWorkspace = location.pathname.startsWith('/basic-info/service');
  const isBusinessContextWorkspace = isCapabilityWorkspace || isServiceWorkspace;
  const activeWorkspaceModule = isServiceWorkspace ? 'service' : 'capability';
  const selectedBusinessType = new URLSearchParams(location.search).get('bt')
    || window.localStorage.getItem(BUSINESS_TYPE_CONTEXT_KEY)
    || businessTypeRecords[0]?.businessType
    || '';
  const selectedKey = location.pathname === '/basic-info'
    ? '/basic-info/country'
    : location.pathname.startsWith('/basic-info/capability/')
      ? '/basic-info/capability'
      : location.pathname;

  useEffect(() => {
    if (!isBusinessContextWorkspace) return;
    window.requestAnimationFrame(() => {
      businessTypeMenuRef.current
        ?.querySelector('.ant-menu-item-selected')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [isBusinessContextWorkspace, selectedBusinessType]);

  useEffect(() => {
    if (isBusinessContextWorkspace && selectedBusinessType) {
      window.localStorage.setItem(BUSINESS_TYPE_CONTEXT_KEY, selectedBusinessType);
    }
  }, [isBusinessContextWorkspace, selectedBusinessType]);

  useEffect(() => {
    if (!isBusinessContextWorkspace || !selectedBusinessType || new URLSearchParams(location.search).has('bt')) return;
    const query = new URLSearchParams(location.search);
    query.set('bt', selectedBusinessType);
    navigate({ pathname: location.pathname, search: query.toString() }, { replace: true });
  }, [isBusinessContextWorkspace, location.pathname, location.search, navigate, selectedBusinessType]);

  const openWorkspaceModule = (module: 'capability' | 'service') => {
    const query = selectedBusinessType ? `?bt=${encodeURIComponent(selectedBusinessType)}` : '';
    navigate(`/basic-info/${module}${query}`);
  };

  const openBusinessType = (businessType: string) => {
    setBusinessTypeLocator(undefined);
    businessTypeLocatorRef.current = undefined;
    navigate(`/basic-info/${activeWorkspaceModule}?bt=${encodeURIComponent(businessType)}`);
  };

  const locateBusinessType = () => {
    const businessType = businessTypeLocatorRef.current;
    if (!businessType) return;
    openBusinessType(businessType);
  };

  return (
    <Layout className="legacy-app-shell">
      <Sider
        theme="dark"
        width={202}
        className="legacy-sidebar"
      >
        <div onClick={() => navigate('/home')} className="legacy-sidebar-brand"><Brand /></div>
        {isBusinessContextWorkspace ? (
          <div className="capability-workspace-sidebar">
            <button type="button" className="sidebar-back" onClick={() => navigate('/basic-info/country')}>
              <span className="sidebar-back-icon"><ArrowLeftOutlined /></span>
              <span>Back to Basic Info</span>
            </button>
            <div className="business-context-module-switcher" role="tablist" aria-label="Business Type configuration module">
              <button
                type="button"
                role="tab"
                aria-selected={activeWorkspaceModule === 'capability'}
                className={activeWorkspaceModule === 'capability' ? 'active' : ''}
                onClick={() => openWorkspaceModule('capability')}
              >
                Capability
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeWorkspaceModule === 'service'}
                className={activeWorkspaceModule === 'service' ? 'active' : ''}
                onClick={() => openWorkspaceModule('service')}
              >
                Service
              </button>
            </div>
            <div className="capability-sidebar-search">
              <div className="capability-sidebar-search-control">
                <Select
                  showSearch
                  allowClear
                  value={businessTypeLocator}
                  placeholder="Find Business Type"
                  suffixIcon={null}
                  options={businessTypeRecords.map(({ businessType }) => ({ label: businessType, value: businessType }))}
                  filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  onChange={(value) => {
                    setBusinessTypeLocator(value);
                    businessTypeLocatorRef.current = value;
                  }}
                  onInputKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      window.requestAnimationFrame(locateBusinessType);
                    }
                  }}
                />
                <button
                  type="button"
                  className="capability-sidebar-search-button"
                  aria-label="Locate Business Type"
                  disabled={!businessTypeLocator}
                  onClick={locateBusinessType}
                >
                  <SearchOutlined />
                </button>
              </div>
            </div>
            <div className="capability-sidebar-menu" ref={businessTypeMenuRef}>
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[selectedBusinessType]}
                items={businessTypeRecords.map(({ businessType }) => ({ key: businessType, label: businessType }))}
                onClick={({ key }) => openBusinessType(key)}
                className="legacy-menu"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="legacy-sidebar-section">Basic Info <span>⌃</span></div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => {
                if (key === '/basic-info/capability') {
                  openWorkspaceModule('capability');
                } else if (key === '/basic-info/service') {
                  openWorkspaceModule('service');
                } else {
                  navigate(key);
                }
              }}
              className="legacy-menu"
            />
          </>
        )}
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
