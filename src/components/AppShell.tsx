import { useEffect, useRef, useState } from 'react';
import { Breadcrumb, Button, Dropdown, Form, Input, Layout, Menu, Modal, Select, Typography, message } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ArrowRightOutlined, DeleteOutlined, MoreOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Brand, UserProfile } from './PlatformChrome';
import { useBusinessTypeStore } from '../pages/basic-info/businessTypeReferenceData';
import { useCapabilityDataStore } from '../pages/basic-info/capabilityDataStore';
import { useServiceStore } from '../pages/basic-info/serviceStore';

const { Sider, Content, Header } = Layout;
const BUSINESS_TYPE_CONTEXT_KEY = 'basicInfoBusinessTypeContext';

function operationTimeNow() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const workspaceMenuLabel = (label: string) => (
  <span className="business-context-entry-label">
    <span>{label}</span>
    <ArrowRightOutlined aria-label="Enter Business Type workspace" />
  </span>
);

const menuItems = [
  { key: '/basic-info/currency', label: 'Currency' },
  { key: '/basic-info/country', label: 'Country' },
  { key: '/basic-info/party', label: 'Party' },
  { key: '/basic-info/card-bin', label: 'Card Bin' },
  { key: '/basic-info/party-tenant', label: 'Party&Tenant' },
  { key: '/basic-info/business-type', label: workspaceMenuLabel('Business Type') },
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
  const capabilityData = useCapabilityDataStore((state) => state.data);
  const serviceRecords = useServiceStore((state) => state.records);
  const [addBusinessTypeOpen, setAddBusinessTypeOpen] = useState(false);
  const [addBusinessTypeForm] = Form.useForm<{ businessType: string }>();
  const [businessTypeLocator, setBusinessTypeLocator] = useState<string>();
  const businessTypeLocatorRef = useRef<string | undefined>(undefined);
  const businessTypeMenuRef = useRef<HTMLDivElement>(null);
  const isCapabilityWorkspace = location.pathname.startsWith('/basic-info/capability');
  const isServiceWorkspace = location.pathname.startsWith('/basic-info/service');
  const isDemoWorkspace = location.pathname.startsWith('/basic-info/demo');
  const isBusinessContextWorkspace = isCapabilityWorkspace || isServiceWorkspace || isDemoWorkspace;
  const isWorkspaceRoot = location.pathname === '/basic-info/demo';
  const availableBusinessTypes = new Set(businessTypeRecords.map((record) => record.businessType));
  const queryBusinessType = new URLSearchParams(location.search).get('bt');
  const rememberedBusinessType = window.localStorage.getItem(BUSINESS_TYPE_CONTEXT_KEY);
  const selectedBusinessType = (queryBusinessType && availableBusinessTypes.has(queryBusinessType) ? queryBusinessType : '')
    || (rememberedBusinessType && availableBusinessTypes.has(rememberedBusinessType) ? rememberedBusinessType : '')
    || businessTypeRecords[0]?.businessType
    || '';
  const abilityCount = capabilityData.find((record) => record.name === selectedBusinessType)?.abilities.length || 0;
  const serviceCount = serviceRecords[selectedBusinessType]?.length || 0;
  const canDeleteBusinessType = Boolean(selectedBusinessType && abilityCount === 0 && serviceCount === 0);
  const selectedKey = location.pathname === '/basic-info'
    ? '/basic-info/country'
    : isBusinessContextWorkspace ? '/basic-info/business-type' : location.pathname;

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
    if (!isBusinessContextWorkspace || !selectedBusinessType || queryBusinessType === selectedBusinessType) return;
    const query = new URLSearchParams(location.search);
    query.set('bt', selectedBusinessType);
    navigate({ pathname: location.pathname, search: query.toString() }, { replace: true });
  }, [isBusinessContextWorkspace, location.pathname, location.search, navigate, queryBusinessType, selectedBusinessType]);

  const openWorkspace = () => {
    const query = selectedBusinessType ? `?bt=${encodeURIComponent(selectedBusinessType)}` : '';
    navigate(`/basic-info/demo${query}`);
  };

  const saveBusinessType = async () => {
    try {
      const values = await addBusinessTypeForm.validateFields();
      const businessType = values.businessType.trim().toUpperCase();
      if (businessTypeRecords.some((record) => record.businessType === businessType)) {
        addBusinessTypeForm.setFields([{ name: 'businessType', errors: ['Business Type already exists'] }]);
        return;
      }
      useBusinessTypeStore.getState().addBusinessType({ businessType, operator: 'Current User', operationTime: operationTimeNow() });
      useCapabilityDataStore.getState().syncBusinessTypes([...businessTypeRecords.map((record) => record.businessType), businessType]);
      setAddBusinessTypeOpen(false);
      setBusinessTypeLocator(undefined);
      businessTypeLocatorRef.current = undefined;
      navigate(`/basic-info/demo?bt=${encodeURIComponent(businessType)}`);
      message.success('Business Type created');
    } catch { /* Field errors are rendered by Ant Design. */ }
  };

  const confirmDeleteBusinessType = () => {
    if (!canDeleteBusinessType) return;
    const target = selectedBusinessType;
    Modal.confirm({
      title: `Delete ${target}?`,
      content: 'This Business Type has no Service or Ability. This action cannot be undone in the current Demo session.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        const currentAbilityCount = useCapabilityDataStore.getState().data.find((record) => record.name === target)?.abilities.length || 0;
        const currentServiceCount = useServiceStore.getState().records[target]?.length || 0;
        if (currentAbilityCount || currentServiceCount) {
          message.error('This Business Type now contains a Service or Ability and cannot be deleted.');
          return;
        }
        const names = useBusinessTypeStore.getState().records.map((record) => record.businessType);
        const index = names.indexOf(target);
        const next = names[index + 1] || names[index - 1] || '';
        useBusinessTypeStore.getState().removeBusinessType(target);
        useCapabilityDataStore.getState().removeBusinessType(target);
        useServiceStore.getState().removeBusinessType(target);
        if (next) window.localStorage.setItem(BUSINESS_TYPE_CONTEXT_KEY, next);
        else window.localStorage.removeItem(BUSINESS_TYPE_CONTEXT_KEY);
        navigate(`/basic-info/demo${next ? `?bt=${encodeURIComponent(next)}` : ''}`, { replace: true });
        message.success('Business Type deleted');
      },
    });
  };

  const openBusinessType = (businessType: string) => {
    setBusinessTypeLocator(undefined);
    businessTypeLocatorRef.current = undefined;
    navigate(`/basic-info/demo?bt=${encodeURIComponent(businessType)}`);
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
            <div className="business-type-sidebar-heading">
              <span>Business Type</span>
              <button type="button" aria-label="Add Business Type" title="Add Business Type" onClick={() => { addBusinessTypeForm.resetFields(); setAddBusinessTypeOpen(true); }}>
                <PlusOutlined /> <span>Add</span>
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
                if (key === '/basic-info/business-type') openWorkspace();
                else navigate(key);
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
            {isWorkspaceRoot && (
              <section className="business-type-workspace-heading">
                <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info/country' }, { title: 'Business Type' }]} />
                <div className="business-type-workspace-title-row">
                  <Typography.Title level={4}>{selectedBusinessType || 'Business Type'}</Typography.Title>
                  {selectedBusinessType && (
                    <Dropdown
                      menu={{ items: [{ key: 'delete', label: (
                        <span className="business-type-delete-menu-label">
                          <span><DeleteOutlined /> Delete Business Type</span>
                          {!canDeleteBusinessType && <small>Requires 0 Abilities and 0 Services (currently {abilityCount} / {serviceCount})</small>}
                        </span>
                      ), disabled: !canDeleteBusinessType, danger: true }], onClick: ({ key }) => { if (key === 'delete') confirmDeleteBusinessType(); } }}
                      trigger={['click']}
                    >
                      <Button type="text" icon={<MoreOutlined />} aria-label="Business Type actions" />
                    </Dropdown>
                  )}
                </div>
              </section>
            )}
            <Outlet />
          </div>
        </Content>
      </Layout>
      <Modal className="business-type-modal" title="Create Business Type" open={addBusinessTypeOpen} width={700} okText="Save" cancelText="Cancel" onOk={saveBusinessType} onCancel={() => setAddBusinessTypeOpen(false)} destroyOnHidden forceRender>
        <Form form={addBusinessTypeForm} labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} preserve={false}>
          <Form.Item name="businessType" label="Business Type" rules={[{ required: true, whitespace: true, message: 'Enter Business Type' }, { pattern: /^[A-Za-z0-9_]+$/, message: 'Use letters, numbers, and underscores only' }]}>
            <Input placeholder="Business Type" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
