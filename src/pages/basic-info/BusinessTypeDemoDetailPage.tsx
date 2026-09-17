import { Breadcrumb, Button, Empty, Typography } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCapabilityDataStore } from './capabilityDataStore';
import { useServiceStore } from './serviceStore';
import { getEnabledSubOrderModes, getSubOrderModeKey } from './capability/subOrderModeStore';
import { demoFocusQuery } from './demoNavigation';

const { Title } = Typography;

export default function BusinessTypeDemoDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessType = searchParams.get('bt') || '';
  const kind = searchParams.get('kind') === 'ability' ? 'ability' : 'service';
  const name = searchParams.get('name') || '';
  const serviceRecords = useServiceStore((state) => state.records);
  const abilityGroup = useCapabilityDataStore((state) => state.data.find((group) => group.name === businessType));
  const services = serviceRecords[businessType] || [];
  const service = services.find((item) => item.name === name);
  const ability = abilityGroup?.abilities.find((item) => item.name === name);
  const actions = kind === 'service' ? service?.actions || [] : ability?.actions || [];
  const subOrderEnabled = getEnabledSubOrderModes().has(getSubOrderModeKey(businessType, name));
  const demoUrl = `/basic-info/demo?${new URLSearchParams({ bt: businessType, focusKind: kind, focusName: name }).toString()}`;
  const openServiceAction = (route: 'api' | 'api-limit', action: string) => {
    const query = new URLSearchParams({ bt: businessType, service: name, action, ...demoFocusQuery(kind, name) });
    navigate(`/basic-info/service/${route}?${query.toString()}`);
  };
  const openSpi = (action: string) => {
    const query = new URLSearchParams({ bt: businessType, ability: name, action, ...demoFocusQuery(kind, name) });
    navigate(`/basic-info/capability/spi?${query.toString()}`);
  };

  return (
    <div className="bt-demo-detail-page">
      <section className="linked-state-machine-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info/country' }, { title: businessType, href: demoUrl }, { title: 'Demo', href: demoUrl }, { title: name }]} />
        <button className="linked-state-machine-back" type="button" onClick={() => navigate(demoUrl)}>
          <LeftOutlined /><Title level={4}>{kind === 'service' ? 'Service' : 'Ability'} · {name}</Title>
        </button>
      </section>
      <main className="bt-demo-detail-panel">
        <div className="bt-demo-detail-toolbar">
          <div className="bt-demo-detail-context"><span>Business Type</span><strong>{businessType}</strong><span>{kind === 'service' ? 'Service' : 'Ability'}</span><strong>{name}</strong></div>
          <Button onClick={() => navigate(`/basic-info/${kind === 'service' ? 'service' : 'capability'}?bt=${encodeURIComponent(businessType)}`)}>
            Open {kind === 'service' ? 'Service' : 'Capability'}
          </Button>
        </div>
        {kind === 'ability' && <div className="bt-demo-detail-config-links">
          <span>Sub-order <strong>{subOrderEnabled ? 'ON' : 'OFF'}</strong></span>
          <Button type="link" onClick={() => navigate(`/basic-info/capability/features?${new URLSearchParams({ bt: businessType, ability: name, ...demoFocusQuery(kind, name) }).toString()}`)}>Features</Button>
          <Button type="link" onClick={() => navigate(`/basic-info/capability/link-state-machine?${new URLSearchParams({ bt: businessType, ability: name, ...demoFocusQuery(kind, name) }).toString()}`)}>State Machines</Button>
        </div>}
        <div className="bt-demo-detail-intro"><h2>{kind === 'service' ? 'Service configuration' : 'Ability configuration'}</h2>
          <p>{kind === 'service' ? 'Review API, API Limit and runtime Model for each Service Action.' : 'Review SPI configuration and Ability-level settings.'}</p>
        </div>
        {actions.length === 0 ? <Empty description="No Actions configured" /> : (
          <div className="bt-demo-detail-table">
            <div className="bt-demo-detail-table-head"><span>Action</span><span>{kind === 'service' ? 'Model' : 'Operate Time'}</span><span>{kind === 'service' ? 'Operate Time / Operator' : 'Operator'}</span><span>Operation</span></div>
            {actions.map((action) => (
              <div className="bt-demo-detail-row" key={action.key}>
                <strong>{action.name}</strong>
                <span>{kind === 'service' ? service?.actions.find((item) => item.key === action.key)?.model || 'Not set' : action.operateTime}</span>
                <span>{kind === 'service' ? `${action.operateTime} · ${action.operator}` : action.operator}</span>
                <div className="bt-demo-detail-operations">
                  {kind === 'service' ? <><Button type="link" onClick={() => openServiceAction('api', action.name)}>API</Button><Button type="link" onClick={() => openServiceAction('api-limit', action.name)}>API Limit</Button></>
                    : <Button type="link" onClick={() => openSpi(action.name)}>SPI Config</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
