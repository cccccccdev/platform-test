import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Empty, Form, Input, Modal, Select, Tag, Typography, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CaretDownOutlined, CaretRightOutlined, PlusOutlined } from '@ant-design/icons';
import { useBusinessTypeStore } from './businessTypeReferenceData';
import { type ServiceRecord } from './serviceReferenceData';
import { useServiceStore } from './serviceStore';

const { Title, Text } = Typography;
const ACTION_OPTIONS = ['TRANSACTION', 'VERIFY', 'TRIGGER_VERIFY', 'RE_QUERY', 'QUERY', 'INBOUND_TRANSACTION', 'INBOUND_QUERY'];
const CURRENT_OPERATOR = '我爱北京天安门';

function operationTimeNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function ServicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessTypeRecords = useBusinessTypeStore((state) => state.records);
  const businessType = searchParams.get('bt') || businessTypeRecords[0]?.businessType || '';
  const records = useServiceStore((state) => state.records);
  const addService = useServiceStore((state) => state.addService);
  const addActions = useServiceStore((state) => state.addActions);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(() => new Set(
    Object.entries(useServiceStore.getState().records).flatMap(([bt, services]) => services.map((service) => `${bt}:${service.key}`)),
  ));
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [addServiceForm] = Form.useForm<{ serviceName: string; actions: string[] }>();
  const [addActionTarget, setAddActionTarget] = useState<ServiceRecord | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const services = records[businessType] || [];
  const existingServiceNames = useMemo(() => new Set(services.map((service) => service.name.toLowerCase())), [services]);

  const toggleService = (service: ServiceRecord) => {
    const key = `${businessType}:${service.key}`;
    setExpandedServices((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openAddService = () => {
    addServiceForm.resetFields();
    setAddServiceOpen(true);
  };

  const saveService = async () => {
    try {
      const values = await addServiceForm.validateFields();
      const serviceName = values.serviceName.trim().toUpperCase();
      if (existingServiceNames.has(serviceName.toLowerCase())) {
        addServiceForm.setFields([{ name: 'serviceName', errors: ['This Service already exists under the current Business Type'] }]);
        return;
      }
      const timestamp = Date.now();
      const operateTime = operationTimeNow();
      const service: ServiceRecord = {
        key: `service_${timestamp}`,
        name: serviceName,
        actions: values.actions.map((name, index) => ({
          key: `service_action_${timestamp}_${index}`,
          name,
          operateTime,
          operator: CURRENT_OPERATOR,
        })),
      };
      addService(businessType, service);
      setExpandedServices((current) => new Set(current).add(`${businessType}:${service.key}`));
      setAddServiceOpen(false);
      message.success('Service added');
    } catch { /* Validation errors are displayed by Ant Design. */ }
  };

  const openAddAction = (service: ServiceRecord) => {
    setAddActionTarget(service);
    setSelectedActions(service.actions.map((serviceAction) => serviceAction.name));
  };

  const saveAction = () => {
    if (!addActionTarget) return;
    const existingActions = addActionTarget.actions.map((serviceAction) => serviceAction.name);
    const additions = selectedActions.filter((name) => !existingActions.includes(name));
    if (additions.length === 0) return;
    const timestamp = Date.now();
    const operateTime = operationTimeNow();
    addActions(businessType, addActionTarget.key, additions.map((name, index) => ({
      key: `service_action_${timestamp}_${index}`,
      name,
      operateTime,
      operator: CURRENT_OPERATOR,
    })));
    setAddActionTarget(null);
    setSelectedActions([]);
    message.success('Action added');
  };

  const openServiceCapability = (service: ServiceRecord) => {
    const query = new URLSearchParams({ bt: businessType, service: service.name });
    navigate(`/basic-info/service/capability?${query.toString()}`);
  };

  const openServiceApi = (service: ServiceRecord, action: string) => {
    const query = new URLSearchParams({ bt: businessType, service: service.name, action });
    navigate(`/basic-info/service/api?${query.toString()}`);
  };

  const openServiceApiLimit = (service: ServiceRecord, action: string) => {
    const query = new URLSearchParams({ bt: businessType, service: service.name, action });
    navigate(`/basic-info/service/api-limit?${query.toString()}`);
  };

  return (
    <div className="capability-page service-workspace-page">
      <section className="capability-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info/country' }, { title: 'Service' }]} />
        <div className="capability-title-line">
          <Title level={4}>Service</Title>
        </div>
      </section>

      <main className="capability-workspace">
        <section className="capability-master-panel">
          <div className="capability-workspace-actions">
            <div className="capability-page-context">
              <Text>Business Type: <Text strong>{businessType}</Text></Text>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddService}>Add Service</Button>
          </div>

          {services.length > 0 ? (
            <section className="capability-ability-list service-list">
              {services.map((service) => {
                const expanded = expandedServices.has(`${businessType}:${service.key}`);
                return (
                  <article key={service.key} className="capability-ability-card service-card">
                    <header className="capability-ability-card-header">
                      <button type="button" className="capability-ability-toggle" onClick={() => toggleService(service)}>
                        {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                        <span>{service.name}</span>
                      </button>
                      <div className="capability-ability-header-actions service-header-actions">
                        <Button type="link" className="service-capability-button" onClick={() => openServiceCapability(service)}>Capability</Button>
                        <span className="capability-header-action-divider" aria-hidden="true" />
                        <Button className="capability-add-action-button" size="small" icon={<PlusOutlined />} onClick={() => openAddAction(service)}>Add Action</Button>
                      </div>
                    </header>

                    {expanded && (
                      <div className="capability-action-list service-action-list">
                        <div className="capability-action-list-header">
                          <span>Action</span><span>Operate Time</span><span>Operator</span><span>Operation</span>
                        </div>
                        {service.actions.map((serviceAction) => (
                          <div className="capability-action-item" key={serviceAction.key}>
                            <div className="capability-action-item-name"><span>{serviceAction.name}</span></div>
                            <Text type="secondary" className="capability-action-audit">{serviceAction.operateTime}</Text>
                            <Text type="secondary" className="capability-action-audit">{serviceAction.operator}</Text>
                            <div className="capability-action-operations service-action-operations">
                              <Button type="link" onClick={() => openServiceApi(service, serviceAction.name)}>Api</Button>
                              <Button type="link" onClick={() => openServiceApiLimit(service, serviceAction.name)}>API Limit</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          ) : (
            <div className="service-workspace-empty">
              <Empty
                description="No data"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddService}>Add Service</Button>
              </Empty>
            </div>
          )}
        </section>
      </main>

      <Modal
        title="Add Service"
        open={addServiceOpen}
        onCancel={() => setAddServiceOpen(false)}
        onOk={saveService}
        okText="OK"
        cancelText="Cancel"
        width={700}
        className="capability-add-ability-modal"
        destroyOnHidden
        forceRender
      >
        <Form form={addServiceForm} labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} colon>
          <Form.Item label="Business Type" required><Text>{businessType}</Text></Form.Item>
          <Form.Item
            label="Service"
            name="serviceName"
            rules={[
              { required: true, whitespace: true, message: 'Please enter a Service' },
              { pattern: /^[A-Za-z0-9_]+$/, message: 'Use letters, numbers, and underscores only' },
            ]}
          >
            <Input placeholder="Please enter a Service" />
          </Form.Item>
          <Form.Item label="Action" name="actions" rules={[{ required: true, type: 'array', min: 1, message: 'Please select at least one Action' }]}>
            <Select mode="multiple" options={ACTION_OPTIONS.map((name) => ({ label: name, value: name }))} placeholder="Please select at least one Action" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Action"
        open={Boolean(addActionTarget)}
        onCancel={() => { setAddActionTarget(null); setSelectedActions([]); }}
        onOk={saveAction}
        okText="OK"
        cancelText="Cancel"
        okButtonProps={{
          disabled: !addActionTarget || selectedActions.every((name) => addActionTarget.actions.some((serviceAction) => serviceAction.name === name)),
        }}
        width={720}
      >
        <Form className="capability-add-action-form" labelCol={{ span: 7 }} wrapperCol={{ span: 15 }} colon>
          <Form.Item label="Business Type" required><Text>{businessType}</Text></Form.Item>
          <Form.Item label="Service" required><Text>{addActionTarget?.name}</Text></Form.Item>
          <Form.Item label="Action" required>
            <Select
              mode="multiple"
              value={selectedActions}
              options={ACTION_OPTIONS.map((name) => ({
                label: name,
                value: name,
                disabled: addActionTarget?.actions.some((serviceAction) => serviceAction.name === name),
              }))}
              onChange={(values) => {
                const existing = addActionTarget?.actions.map((serviceAction) => serviceAction.name) || [];
                setSelectedActions([...existing, ...values.filter((name) => !existing.includes(name))]);
              }}
              tagRender={({ label, value, closable, onClose }) => {
                const existing = addActionTarget?.actions.some((serviceAction) => serviceAction.name === String(value));
                return <Tag closable={!existing && closable} onClose={onClose} style={{ marginInlineEnd: 4 }}>{label}</Tag>;
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
