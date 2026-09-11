import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Empty, Form, Modal, Select, Tag, Typography, message } from 'antd';
import { LeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { capabilityAbilitiesByBusinessType, getServiceCapabilityConnections } from './serviceCapabilityReferenceData';
import { useServiceStore } from './serviceStore';

const { Title, Text } = Typography;

export default function ServiceCapabilityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessType = searchParams.get('bt') || '';
  const serviceName = searchParams.get('service') || '';
  const service = useServiceStore((state) => (state.records[businessType] || []).find((item) => item.name === serviceName));
  const connectAbilityInStore = useServiceStore((state) => state.connectAbility);
  const availableAbilities = capabilityAbilitiesByBusinessType[businessType] || [];
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<string>();
  const explicitConnections = service?.capabilityReferences?.map((reference) => reference.ability) || [];
  const connections = getServiceCapabilityConnections(businessType, serviceName, explicitConnections);
  const connectedAbilities = useMemo(
    () => connections.map((name) => availableAbilities.find((ability) => ability.name === name)).filter(Boolean),
    [availableAbilities, connections],
  );
  const connectOptions = availableAbilities
    .filter((ability) => !connections.includes(ability.name))
    .map((ability) => ({ label: ability.name, value: ability.name }));

  const connectAbility = () => {
    if (!selectedAbility) return;
    connectAbilityInStore(businessType, serviceName, selectedAbility);
    setConnectOpen(false);
    setSelectedAbility(undefined);
    message.success('Ability connected');
  };

  const openFieldMapping = (ability: string, action: string) => {
    const query = new URLSearchParams({ bt: businessType, service: serviceName, ability, action });
    navigate(`/basic-info/service/capability/field-mapping?${query.toString()}`);
  };

  return (
    <div className="service-capability-page">
      <section className="capability-features-heading">
        <Breadcrumb items={[
          { title: 'Basic Info', href: '/basic-info/country' },
          { title: 'Service', href: `/basic-info/service?bt=${encodeURIComponent(businessType)}` },
          { title: 'Service Capability' },
        ]} />
        <button className="capability-child-back" type="button" onClick={() => navigate(`/basic-info/service?bt=${encodeURIComponent(businessType)}`)}>
          <LeftOutlined />
          <Title level={4}>Service Capability</Title>
        </button>
      </section>

      <main className="service-capability-panel">
        <div className="service-capability-toolbar">
          <div className="capability-page-context">
            <Text>Business Type: <Text strong>{businessType}</Text></Text>
            <Text>Service: <Text strong>{serviceName}</Text></Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setConnectOpen(true)} disabled={connectOptions.length === 0}>Connect Ability</Button>
        </div>

        <div className="service-support-legend" aria-label="Support status legend">
          <span><i className="supported" />Supported</span>
          <span><i />Unsupported</span>
        </div>

        {service && connectedAbilities.length > 0 ? connectedAbilities.map((ability) => {
          if (!ability) return null;
          const serviceActions = new Set(service.actions.map((item) => item.name));
          const abilityActions = new Set(ability.actions);
          const actions = Array.from(new Set([...serviceActions, ...abilityActions]));
          return (
            <section className="service-capability-ability" key={ability.name}>
              <header>
                <Title level={5}>{ability.name}</Title>
                <div className="service-capability-audit">
                  <Text type="secondary">Operator: <Text>{ability.operator}</Text></Text>
                  <Text type="secondary">Operate Time: <Text>{ability.operateTime}</Text></Text>
                </div>
              </header>
              <div className="service-capability-table">
                <div className="service-capability-table-head"><span>Action</span><span>Support</span><span>Operation</span></div>
                {actions.map((action) => {
                  const serviceSupported = serviceActions.has(action);
                  const abilitySupported = abilityActions.has(action);
                  const mappable = serviceSupported && abilitySupported;
                  return (
                    <div className="service-capability-row" key={action}>
                      <Text strong>{action}</Text>
                      <div className="service-support-tags">
                        <Tag className={serviceSupported ? 'supported' : 'unsupported'}>Service</Tag>
                        <Tag className={abilitySupported ? 'supported' : 'unsupported'}>Ability</Tag>
                      </div>
                      <Button type="link" disabled={!mappable} onClick={() => openFieldMapping(ability.name, action)}>Field Mapping</Button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }) : (
          <Empty className="service-capability-empty" description="No Ability connected" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            {connectOptions.length > 0 && <Button type="primary" onClick={() => setConnectOpen(true)}>Connect Ability</Button>}
          </Empty>
        )}
      </main>

      <Modal
        title="Connect Ability"
        open={connectOpen}
        onCancel={() => { setConnectOpen(false); setSelectedAbility(undefined); }}
        onOk={connectAbility}
        okText="OK"
        cancelText="Cancel"
        okButtonProps={{ disabled: !selectedAbility }}
        width={700}
        className="capability-add-ability-modal service-connect-ability-modal"
      >
        <Form labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} colon>
          <Form.Item label="Ability" required>
            <Select value={selectedAbility} onChange={setSelectedAbility} options={connectOptions} placeholder="Please select an Ability" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
