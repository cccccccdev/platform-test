import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete, Button, Form, Input, Modal, Radio, Select, Tag, Typography, message } from 'antd';
import { ArrowRightOutlined, DownOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCapabilityDataStore, type AbilityItem, type BusinessTypeItem } from './capabilityDataStore';
import { SERVICE_MODEL_OPTIONS, type ServiceActionRecord, type ServiceRecord, type ServiceRunModel } from './serviceReferenceData';
import { useServiceStore } from './serviceStore';
import type { ActionMapping, ServiceAbilityConnection } from './serviceAbilityMapping';
import { demoFocusQuery } from './demoNavigation';
import { enableSubOrderMode } from './capability/subOrderModeStore';
import { saveBusinessAccessRequeryConfig } from './capability/businessAccessRequeryStore';
import { saveAbilityMessageSetting } from './capability/abilityMessageSettingsStore';

type Kind = 'service' | 'ability';
type Focus = { kind: Kind; name: string } | null;
type Point = { startY: number; endY: number; key: string };
type ConnectionDraft = { service?: string; ability?: string };
type ActionTarget = { kind: 'service'; service: ServiceRecord } | { kind: 'ability'; ability: AbilityItem };
type AbilityFormValues = {
  abilityName: string;
  direction: 'Outbound' | 'Inbound';
  actions: string[];
  subOrderMode?: 'ON' | 'OFF';
  balRequery?: 'ON' | 'OFF';
  metricsMessage?: 'ON' | 'OFF';
  completionMessage?: 'ON' | 'OFF';
};
const OUTBOUND_ACTION_OPTIONS = ['TRANSACTION', 'VERIFY', 'TRIGGER_VERIFY', 'RE_QUERY', 'QUERY'];
const INBOUND_ACTION_OPTIONS = ['INBOUND_TRANSACTION', 'INBOUND_QUERY'];
const ACTION_OPTIONS = [...OUTBOUND_ACTION_OPTIONS, ...INBOUND_ACTION_OPTIONS];
const ON_OFF_OPTIONS = [{ label: 'ON', value: 'ON' }, { label: 'OFF', value: 'OFF' }];
const CURRENT_OPERATOR = '我爱北京天安门';

function operationTimeNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function BusinessTypeDemoCanvas({ businessType, services, abilityGroup, connections, focus, collapsedServices, collapsedAbilities, onSelect }: {
  businessType: string;
  services: ServiceRecord[];
  abilityGroup?: BusinessTypeItem;
  connections: ServiceAbilityConnection[];
  focus: Focus;
  collapsedServices: string[];
  collapsedAbilities: string[];
  onSelect: (kind: Kind, name: string, mode?: 'toggle' | 'focus') => void;
}) {
  const navigate = useNavigate();
  const setActionModel = useServiceStore((state) => state.setActionModel);
  const addConnection = useServiceStore((state) => state.addConnection);
  const addService = useServiceStore((state) => state.addService);
  const addServiceActions = useServiceStore((state) => state.addActions);
  const setCapabilityData = useCapabilityDataStore((state) => state.setData);
  const capabilityData = useCapabilityDataStore((state) => state.data);
  const abilities = abilityGroup?.abilities || [];
  const mappings = useMemo(() => connections.flatMap((connection) => connection.mappings), [connections]);
  const [modelTarget, setModelTarget] = useState<{ service: ServiceRecord; action: ServiceActionRecord } | null>(null);
  const [selectedModel, setSelectedModel] = useState<ServiceRunModel>();
  const [hoveredAction, setHoveredAction] = useState<{ kind: Kind; name: string; action: string } | null>(null);
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [serviceForm] = Form.useForm<{ serviceName: string; actions: string[] }>();
  const [addAbilityOpen, setAddAbilityOpen] = useState(false);
  const [abilityForm] = Form.useForm<AbilityFormValues>();
  const abilityDirection = Form.useWatch('direction', abilityForm) || 'Outbound';
  const abilityName = Form.useWatch('abilityName', abilityForm);
  const abilityActions = Form.useWatch('actions', abilityForm);
  const subOrderMode = Form.useWatch('subOrderMode', abilityForm);
  const balRequery = Form.useWatch('balRequery', abilityForm);
  const metricsMessage = Form.useWatch('metricsMessage', abilityForm);
  const completionMessage = Form.useWatch('completionMessage', abilityForm);
  const canAddAbility = Boolean(abilityName?.trim() && /^[A-Za-z0-9_]+$/.test(abilityName.trim()) && abilityActions?.length
    && subOrderMode !== undefined && metricsMessage !== undefined && completionMessage !== undefined
    && (abilityDirection !== 'Inbound' || balRequery !== undefined));
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [hoveredMappingKey, setHoveredMappingKey] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const serviceRailRef = useRef<HTMLElement>(null);
  const abilityRailRef = useRef<HTMLElement>(null);
  const [geometry, setGeometry] = useState<{ width: number; height: number; coarse: Point[]; fine: Point[] }>({ width: 220, height: 60, coarse: [], fine: [] });

  const expandedService = (name: string) => Boolean(focus && !collapsedServices.includes(name) && (focus.kind === 'service'
    ? focus.name === name
    : connections.some((connection) => connection.service === name && connection.ability === focus.name)));
  const expandedAbility = (name: string) => Boolean(focus && !collapsedAbilities.includes(name) && (focus.kind === 'ability'
    ? focus.name === name
    : connections.some((connection) => connection.ability === name && connection.service === focus.name)));
  const collapsedKey = `${collapsedServices.join('\0')}|${collapsedAbilities.join('\0')}`;

  useLayoutEffect(() => {
    const diagram = diagramRef.current;
    const serviceRail = serviceRailRef.current;
    const abilityRail = abilityRailRef.current;
    if (!diagram || !serviceRail || !abilityRail) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const canvas = diagram.querySelector('.bt-demo-connection-canvas');
        const canvasTop = canvas?.getBoundingClientRect().top || diagram.getBoundingClientRect().top;
        const center = (element: Element | null) => element ? element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2 - canvasTop : -1;
        const node = (kind: Kind, name: string) => diagram.querySelector(`[data-demo-kind="${kind}"][data-demo-name="${CSS.escape(name)}"]`);
        const actionNode = (kind: Kind, name: string, action: string) => node(kind, name)?.querySelector(`[data-demo-action="${CSS.escape(action)}"]`) || null;
        const coarse = connections.map((connection) => ({
          key: `${connection.service}:${connection.ability}`,
          startY: center(node('service', connection.service)?.querySelector('.bt-demo-node') || null),
          endY: center(node('ability', connection.ability)?.querySelector('.bt-demo-node') || null),
        }));
        const fine = mappings.map((mapping) => ({
          key: `${mapping.service}:${mapping.serviceAction}:${mapping.ability}:${mapping.abilityAction}`,
          startY: center(actionNode('service', mapping.service, mapping.serviceAction)),
          endY: center(actionNode('ability', mapping.ability, mapping.abilityAction)),
        }));
        const next = {
          width: canvas?.clientWidth || 220,
          height: Math.max(serviceRail.getBoundingClientRect().height, abilityRail.getBoundingClientRect().height, 60),
          coarse, fine,
        };
        setGeometry((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(diagram);
    observer.observe(serviceRail);
    observer.observe(abilityRail);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); cancelAnimationFrame(frame); };
  }, [businessType, connections, focus, mappings, collapsedKey]);

  useEffect(() => { setHoveredAction(null); setHoveredMappingKey(null); }, [focus, collapsedKey]);

  const saveService = async () => {
    try {
      const values = await serviceForm.validateFields();
      const name = values.serviceName.trim().toUpperCase();
      if (services.some((service) => service.name.toLowerCase() === name.toLowerCase())) {
        serviceForm.setFields([{ name: 'serviceName', errors: ['This Service already exists under the current Business Type'] }]);
        return;
      }
      const timestamp = Date.now();
      const operateTime = operationTimeNow();
      addService(businessType, {
        key: `service_${timestamp}`,
        name,
        actions: values.actions.map((action, index) => ({ key: `service_action_${timestamp}_${index}`, name: action, operateTime, operator: CURRENT_OPERATOR })),
      });
      setAddServiceOpen(false);
      serviceForm.resetFields();
      onSelect('service', name, 'focus');
      message.success('Service added');
    } catch { /* Ant Design displays form validation errors. */ }
  };
  const saveAbility = async () => {
    try {
      const values = await abilityForm.validateFields();
      const name = values.abilityName.trim();
      if (abilities.some((ability) => ability.name.toLowerCase() === name.toLowerCase())) {
        abilityForm.setFields([{ name: 'abilityName', errors: ['This Ability already exists under the current Business Type'] }]);
        return;
      }
      const timestamp = Date.now();
      const operateTime = operationTimeNow();
      const ability: AbilityItem = {
        key: `ab_${timestamp}`, name, operateTime, operator: CURRENT_OPERATOR, isExpand: true, direction: values.direction,
        actions: values.actions.map((action, index) => ({ key: `act_${timestamp}_${index}`, name: action, operateTime, operator: CURRENT_OPERATOR })),
      };
      if (values.subOrderMode === 'ON') enableSubOrderMode(businessType, name);
      if (values.direction === 'Inbound') saveBusinessAccessRequeryConfig(businessType, name, values.balRequery === 'ON');
      saveAbilityMessageSetting(businessType, name, 'metrics', values.metricsMessage === 'ON');
      saveAbilityMessageSetting(businessType, name, 'completion', values.completionMessage === 'ON');
      setCapabilityData((current) => current.some((group) => group.name === businessType)
        ? current.map((group) => group.name === businessType ? { ...group, abilities: [...group.abilities, ability] } : group)
        : [...current, { key: `bt_${businessType.toLowerCase()}`, name: businessType, isExpand: true, abilities: [ability] }]);
      setAddAbilityOpen(false);
      abilityForm.resetFields();
      onSelect('ability', name, 'focus');
      message.success('Ability added');
    } catch { /* Ant Design displays form validation errors. */ }
  };
  const openAddAction = (target: ActionTarget) => {
    setActionTarget(target);
    setSelectedActions(target.kind === 'service' ? target.service.actions.map((action) => action.name) : target.ability.actions.map((action) => action.name));
  };
  const saveAction = () => {
    if (!actionTarget) return;
    const currentActions = actionTarget.kind === 'service' ? actionTarget.service.actions : actionTarget.ability.actions;
    const existing = new Set(currentActions.map((action) => action.name));
    const additions = selectedActions.filter((name) => !existing.has(name));
    if (!additions.length) return;
    const timestamp = Date.now();
    const operateTime = operationTimeNow();
    if (actionTarget.kind === 'service') {
      addServiceActions(businessType, actionTarget.service.key, additions.map((name, index) => ({
        key: `service_action_${timestamp}_${index}`, name, operateTime, operator: CURRENT_OPERATOR,
      })));
    } else {
      const abilityKey = actionTarget.ability.key;
      setCapabilityData((current) => current.map((group) => group.name !== businessType ? group : {
        ...group,
        abilities: group.abilities.map((ability) => ability.key !== abilityKey ? ability : {
          ...ability,
          actions: [...ability.actions, ...additions.map((name, index) => ({ key: `act_${timestamp}_${index}`, name, operateTime, operator: CURRENT_OPERATOR }))],
        }),
      }));
    }
    setActionTarget(null);
    setSelectedActions([]);
    message.success(`Added ${additions.length} Action${additions.length === 1 ? '' : 's'}`);
  };
  const actionTargetName = actionTarget?.kind === 'service' ? actionTarget.service.name : actionTarget?.ability.name;
  const existingActionNames = actionTarget?.kind === 'service' ? actionTarget.service.actions.map((action) => action.name)
    : actionTarget?.ability.actions.map((action) => action.name) || [];
  const availableActionOptions = actionTarget?.kind === 'service' ? ACTION_OPTIONS
    : actionTarget?.ability.direction === 'Inbound' ? INBOUND_ACTION_OPTIONS
      : actionTarget?.ability.direction === 'Outbound' ? OUTBOUND_ACTION_OPTIONS : ACTION_OPTIONS;
  const abilityNameOptions = [...new Set(capabilityData.flatMap((group) => group.abilities.map((ability) => ability.name)))]
    .filter((name) => !abilities.some((ability) => ability.name === name))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ label: name, value: name }));

  const routeQuery = (kind: Kind, name: string) => demoFocusQuery(focus?.kind || kind, focus?.name || name);
  const openServiceAction = (route: 'api' | 'api-limit', service: string, action: string) => navigate(`/basic-info/service/${route}?${new URLSearchParams({ bt: businessType, service, action, ...routeQuery('service', service) })}`);
  const openSpi = (ability: string, action: string) => navigate(`/basic-info/capability/spi?${new URLSearchParams({ bt: businessType, ability, action, ...routeQuery('ability', ability) })}`);
  const openAbilitySettings = (ability: string) => navigate(`/basic-info/demo/ability-settings?${new URLSearchParams({ bt: businessType, ability, ...routeQuery('ability', ability) })}`);
  const saveModel = () => {
    if (!modelTarget || !selectedModel || modelTarget.action.model) return;
    setActionModel(businessType, modelTarget.service.key, modelTarget.action.key, selectedModel);
    setModelTarget(null);
    setSelectedModel(undefined);
    message.success('Model configured');
  };
  const visibleMapping = (mapping: ActionMapping) => expandedService(mapping.service) && expandedAbility(mapping.ability);
  const openAddMapping = () => setConnectionDraft({
    service: focus?.kind === 'service' ? focus.name : undefined,
    ability: focus?.kind === 'ability' ? focus.name : undefined,
  });
  const saveConnection = () => {
    if (!connectionDraft?.service || !connectionDraft.ability) return;
    const result = addConnection(businessType, connectionDraft.service, connectionDraft.ability);
    if (result !== 'added') {
      message.error(result === 'duplicate' ? 'This Service and Ability are already connected.' : 'Select an existing Service and Ability.');
      return;
    }
    message.success('Service and Ability connected');
    if (focus?.kind !== 'service' || focus.name !== connectionDraft.service) onSelect('service', connectionDraft.service, 'focus');
    setConnectionDraft(null);
  };
  const openFieldMapping = (mapping: ActionMapping) => navigate(`/basic-info/service/capability/field-mapping?${new URLSearchParams({
    bt: businessType, service: mapping.service, ability: mapping.ability, action: mapping.serviceAction,
    abilityAction: mapping.abilityAction,
    ...routeQuery('service', mapping.service),
  })}`);
  const hoveredMapping = (mapping: ActionMapping) => !hoveredAction || (hoveredAction.kind === 'service'
    ? mapping.service === hoveredAction.name && mapping.serviceAction === hoveredAction.action
    : mapping.ability === hoveredAction.name && mapping.abilityAction === hoveredAction.action);

  const renderService = (service: ServiceRecord) => {
    const expanded = expandedService(service.name);
    const related = connections.filter((connection) => connection.service === service.name);
    return <article className={`bt-demo-expand-node ${expanded ? 'expanded' : ''}`} data-demo-kind="service" data-demo-name={service.name} key={service.key}>
      <button type="button" className={`bt-demo-node ${related.length ? 'mapped' : 'unmapped'}`} aria-expanded={expanded} onClick={() => onSelect('service', service.name)}>
        <span><span className="bt-demo-node-name">{service.name}</span><span className="bt-demo-node-meta">{related.length ? `${related.length} mapped ${related.length === 1 ? 'Ability' : 'Abilities'}` : 'No mapping'}</span></span><DownOutlined className="bt-demo-expand-chevron" />
      </button>
      <div className="bt-demo-expand-reveal"><div className="bt-demo-expand-content">
        {service.actions.length ? service.actions.map((action) => <div className="bt-demo-focus-action" data-demo-action={action.name} key={action.key}
          onMouseEnter={() => setHoveredAction({ kind: 'service', name: service.name, action: action.name })} onMouseLeave={() => setHoveredAction(null)}>
          <strong title={action.name}>{action.name}</strong><div className="bt-demo-focus-action-links">
            <button type="button" onClick={() => openServiceAction('api', service.name, action.name)}>API</button>
            <button type="button" onClick={() => openServiceAction('api-limit', service.name, action.name)}>API Limit</button>
            <button type="button" onClick={() => { setModelTarget({ service, action }); setSelectedModel(action.model); }}>Model</button>
          </div>
        </div>) : <div className="bt-demo-focus-action empty">No Actions</div>}
        <button type="button" className="bt-demo-add-action" onClick={() => openAddAction({ kind: 'service', service })}><PlusOutlined /> Add Action</button>
      </div></div>
    </article>;
  };
  const renderAbility = (ability: AbilityItem) => {
    const expanded = expandedAbility(ability.name);
    const related = connections.filter((connection) => connection.ability === ability.name);
    const summary = related.length ? `${related.length} mapped ${related.length === 1 ? 'Service' : 'Services'}` : 'No mapping';
    return <article className={`bt-demo-expand-node ${expanded ? 'expanded' : ''}`} data-demo-kind="ability" data-demo-name={ability.name} key={ability.key}>
      <div className="bt-demo-ability-node-header">
        <button type="button" className={`bt-demo-node ${related.length ? 'mapped' : 'unmapped'}`} aria-expanded={expanded} onClick={() => onSelect('ability', ability.name)}>
          <span><span className="bt-demo-node-name">{ability.name}</span><span className="bt-demo-node-meta" title={summary}>{summary}</span></span>
        </button>
        <button type="button" className="bt-demo-ability-expand-entry" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${ability.name}`} aria-expanded={expanded} onClick={() => onSelect('ability', ability.name)}><DownOutlined className="bt-demo-expand-chevron" /></button>
        <button type="button" className="bt-demo-ability-settings-entry" aria-label={`Configure ${ability.name}`} title="Configure Capability" onClick={() => openAbilitySettings(ability.name)}><SettingOutlined /></button>
      </div>
      <div className="bt-demo-expand-reveal"><div className="bt-demo-expand-content">
        {ability.actions.length ? ability.actions.map((action) => <div className="bt-demo-focus-action" data-demo-action={action.name} key={action.key}
          onMouseEnter={() => setHoveredAction({ kind: 'ability', name: ability.name, action: action.name })} onMouseLeave={() => setHoveredAction(null)}>
          <strong title={action.name}>{action.name}</strong><div className="bt-demo-focus-action-links"><button type="button" onClick={() => openSpi(ability.name, action.name)}>SPI Config</button></div>
        </div>) : <div className="bt-demo-focus-action empty">No Actions</div>}
        <button type="button" className="bt-demo-add-action" onClick={() => openAddAction({ kind: 'ability', ability })}><PlusOutlined /> Add Action</button>
      </div></div>
    </article>;
  };

  return <>
    <div className="bt-demo-mapping-toolbar"><div className="bt-demo-column-headings">
      <div className="bt-demo-column-title"><span>Service</span><Button size="small" icon={<PlusOutlined />} onClick={() => { serviceForm.resetFields(); setAddServiceOpen(true); }}>Add Service</Button></div>
      <span>{focus ? 'Action mapping · click ↗' : 'Service → Capability'}</span>
      <div className="bt-demo-column-title"><span>Ability</span><Button size="small" icon={<PlusOutlined />} onClick={() => { abilityForm.resetFields(); abilityForm.setFieldValue('direction', 'Outbound'); setAddAbilityOpen(true); }}>Add Capability</Button></div>
    </div><Button icon={<PlusOutlined />} onClick={openAddMapping} disabled={!services.length || !abilities.length}>Add mapping</Button></div>
    <div className="bt-demo-diagram bt-demo-inline-diagram" ref={diagramRef}>
      <section className="bt-demo-rail" ref={serviceRailRef} aria-label="Services">{services.length ? services.map(renderService) : <div className="bt-demo-rail-empty">No Service</div>}</section>
      <div className="bt-demo-connection-canvas bt-demo-inline-canvas" style={{ height: geometry.height }}>
        {connections.length ? <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-label={focus ? 'Action mappings' : 'Service and Ability connections'}>
          <defs>
            <marker id="bt-demo-inline-arrow-end" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker>
            <marker id="bt-demo-pair-arrow-end" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="#a99ab3" strokeWidth="1.3" /></marker>
          </defs>
          {connections.map((_, index) => {
            const point = geometry.coarse[index];
            if (!point || point.startY < 0 || point.endY < 0) return null;
            return <path key={point.key} className={`bt-demo-pair-line ${focus ? 'bt-demo-line-hidden' : 'bt-demo-line-visible'}`} d={`M 3 ${point.startY} C ${geometry.width * .38} ${point.startY}, ${geometry.width * .62} ${point.endY}, ${geometry.width - 12} ${point.endY}`} markerEnd="url(#bt-demo-pair-arrow-end)" />;
          })}
          {mappings.map((mapping, index) => {
            const point = geometry.fine[index];
            if (!point || point.startY < 0 || point.endY < 0) return null;
            const visible = visibleMapping(mapping);
            const highlighted = hoveredMappingKey ? hoveredMappingKey === point.key : hoveredMapping(mapping);
            const path = `M 3 ${point.startY} C ${geometry.width * .38} ${point.startY}, ${geometry.width * .62} ${point.endY}, ${geometry.width - 12} ${point.endY}`;
            return <g key={point.key} className={`bt-demo-action-connection ${visible ? 'interactive' : ''}`} role={visible ? 'link' : undefined} tabIndex={visible ? 0 : -1}
              aria-label={visible ? `Field Mapping: ${mapping.service} ${mapping.serviceAction} to ${mapping.ability} ${mapping.abilityAction}` : undefined}
              onMouseEnter={() => visible && setHoveredMappingKey(point.key)} onMouseLeave={() => setHoveredMappingKey(null)}
              onFocus={() => visible && setHoveredMappingKey(point.key)} onBlur={() => setHoveredMappingKey(null)}
              onClick={() => visible && openFieldMapping(mapping)}
              onKeyDown={(event) => { if (visible && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openFieldMapping(mapping); } }}>
              <path className={`bt-demo-line-hit ${visible ? '' : 'bt-demo-line-hidden'}`} d={path} />
              <path className={`bt-demo-action-line ${visible ? highlighted ? 'bt-demo-line-visible' : 'bt-demo-line-dimmed' : 'bt-demo-line-hidden'}`} d={path} markerEnd="url(#bt-demo-inline-arrow-end)" />
              {visible && hoveredMappingKey !== point.key && <g className={`bt-demo-line-affordance ${highlighted ? '' : 'dimmed'}`} transform={`translate(${geometry.width / 2}, ${(point.startY + point.endY) / 2})`}>
                <circle r="10" /><text textAnchor="middle" dominantBaseline="central">↗</text>
              </g>}
              {visible && hoveredMappingKey === point.key && <g className="bt-demo-line-label" transform={`translate(${geometry.width / 2}, ${(point.startY + point.endY) / 2})`}>
                <rect x="-51" y="-14" width="102" height="24" rx="3" />
                <text textAnchor="middle" dominantBaseline="central">Field Mapping ↗</text>
              </g>}
              {visible && <title>Field Mapping · {mapping.serviceAction} · click to view</title>}
            </g>;
          })}
        </svg> : <div className="bt-demo-no-connections"><ArrowRightOutlined /><span>No Action mappings yet</span></div>}
      </div>
      <section className="bt-demo-rail" ref={abilityRailRef} aria-label="Abilities">{abilities.length ? abilities.map(renderAbility) : <div className="bt-demo-rail-empty">No Ability</div>}</section>
    </div>
    <Modal title="Add Service" open={addServiceOpen} onCancel={() => { setAddServiceOpen(false); serviceForm.resetFields(); }} onOk={saveService}
      okText="OK" cancelText="Cancel" width={700} className="capability-add-ability-modal" destroyOnHidden forceRender>
      <Form form={serviceForm} labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} colon>
        <Form.Item label="Business Type" required><Typography.Text>{businessType}</Typography.Text></Form.Item>
        <Form.Item label="Service" name="serviceName" rules={[{ required: true, whitespace: true, message: 'Please enter a Service' },
          { pattern: /^[A-Za-z0-9_]+$/, message: 'Use letters, numbers, and underscores only' }]}>
          <Input placeholder="Please enter a Service" />
        </Form.Item>
        <Form.Item label="Action" name="actions" rules={[{ required: true, type: 'array', min: 1, message: 'Please select at least one Action' }]}>
          <Select mode="multiple" options={ACTION_OPTIONS.map((name) => ({ label: name, value: name }))} placeholder="Please select at least one Action" />
        </Form.Item>
      </Form>
    </Modal>
    <Modal title="Add Capability" open={addAbilityOpen} onCancel={() => { setAddAbilityOpen(false); abilityForm.resetFields(); }} onOk={saveAbility}
      okText="Add" cancelText="Cancel" okButtonProps={{ disabled: !canAddAbility }} width={700} className="capability-add-ability-modal bt-demo-add-capability-modal" destroyOnHidden forceRender>
      <Form form={abilityForm} labelCol={{ xs: { span: 24 }, sm: { span: 10 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 12 } }} colon>
        <Form.Item label="Business Type" required><Typography.Text>{businessType}</Typography.Text></Form.Item>
        <Form.Item label="Ability" name="abilityName" rules={[{ required: true, whitespace: true, message: 'Please select or enter an Ability' },
          { pattern: /^[A-Za-z0-9_]+$/, message: 'Use letters, numbers, and underscores only' }]}>
          <AutoComplete options={abilityNameOptions} placeholder="Please select or enter new option"
            filterOption={(input, option) => String(option?.value || '').toLowerCase().includes(input.toLowerCase())} />
        </Form.Item>
        <Form.Item label="Ability Direction" name="direction" initialValue="Outbound" rules={[{ required: true, message: 'Please select an Ability direction' }]}>
          <Select options={[{ label: 'Outbound', value: 'Outbound' }, { label: 'Inbound', value: 'Inbound' }]}
            onChange={() => abilityForm.setFieldValue('actions', [])} />
        </Form.Item>
        <Form.Item label="Action" name="actions" rules={[{ required: true, type: 'array', min: 1, message: 'Please select at least one Action' }]}>
          <Select mode="multiple" allowClear placeholder="Please select at least one Action"
            options={(abilityDirection === 'Inbound' ? INBOUND_ACTION_OPTIONS : OUTBOUND_ACTION_OPTIONS).map((name) => ({ label: name, value: name }))}
            maxTagCount="responsive" />
        </Form.Item>
        <Form.Item label="Sub-order Mode" name="subOrderMode" rules={[{ required: true, message: 'Please select ON or OFF' }]}>
          <Radio.Group options={ON_OFF_OPTIONS} />
        </Form.Item>
        {abilityDirection === 'Inbound' && <Form.Item label="BAL Requery" name="balRequery" rules={[{ required: true, message: 'Please select ON or OFF' }]}>
          <Radio.Group options={ON_OFF_OPTIONS} />
        </Form.Item>}
        <Form.Item label="Send metrics message" name="metricsMessage" rules={[{ required: true, message: 'Please select ON or OFF' }]}>
          <Radio.Group options={ON_OFF_OPTIONS} />
        </Form.Item>
        <Form.Item label="Send completion message" name="completionMessage" rules={[{ required: true, message: 'Please select ON or OFF' }]}>
          <Radio.Group options={ON_OFF_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
    <Modal title="Add Action" open={Boolean(actionTarget)} onCancel={() => { setActionTarget(null); setSelectedActions([]); }} onOk={saveAction}
      okText="OK" cancelText="Cancel" width={720}
      okButtonProps={{ disabled: !actionTarget || selectedActions.every((name) => existingActionNames.includes(name)) }}>
      <Form className="capability-add-action-form" labelCol={{ span: 7 }} wrapperCol={{ span: 15 }} colon>
        <Form.Item label="Business Type" required><Typography.Text>{businessType}</Typography.Text></Form.Item>
        <Form.Item label={actionTarget?.kind === 'service' ? 'Service' : 'Ability'} required><Typography.Text>{actionTargetName}</Typography.Text></Form.Item>
        {actionTarget?.kind === 'ability' && <Form.Item label="Ability Direction"><Typography.Text>{actionTarget.ability.direction || 'Legacy / Not set'}</Typography.Text></Form.Item>}
        <Form.Item label="Action" required><Select mode="multiple" value={selectedActions} placeholder="Select Action"
          options={availableActionOptions.map((name) => ({ label: name, value: name, disabled: existingActionNames.includes(name) }))}
          onChange={(values) => setSelectedActions([...existingActionNames, ...values.filter((name) => !existingActionNames.includes(name))])}
          tagRender={({ label, value, closable, onClose }) => <Tag closable={!existingActionNames.includes(String(value)) && closable}
            onClose={onClose} style={{ marginInlineEnd: 4 }}>{label}</Tag>} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Add Service / Ability mapping" open={Boolean(connectionDraft)} onCancel={() => setConnectionDraft(null)} onOk={saveConnection} okText="Add mapping" cancelText="Cancel"
      okButtonProps={{ disabled: !connectionDraft?.service || !connectionDraft.ability }} width={680} className="capability-add-ability-modal">
      <Form labelCol={{ span: 7 }} wrapperCol={{ span: 15 }} colon>
        <Form.Item label="Business Type"><Typography.Text>{businessType}</Typography.Text></Form.Item>
        <Form.Item label="Service" required><Select value={connectionDraft?.service} placeholder="Select Service" options={services.map((service) => ({ label: service.name, value: service.name }))}
          onChange={(service) => setConnectionDraft((draft) => draft && ({ ...draft, service }))} /></Form.Item>
        <Form.Item label="Ability" required><Select value={connectionDraft?.ability} placeholder="Select Ability" options={abilities.map((ability) => ({ label: ability.name, value: ability.name }))}
          onChange={(ability) => setConnectionDraft((draft) => draft && ({ ...draft, ability }))} /></Form.Item>
        <p className="bt-demo-direction-note">Actions with the same name connect automatically after this pair is mapped.</p>
      </Form>
    </Modal>
    <Modal title="Model" open={Boolean(modelTarget)} onCancel={() => setModelTarget(null)} onOk={saveModel} okText="Submit" cancelText="Cancel"
      okButtonProps={{ disabled: !selectedModel }} footer={modelTarget?.action.model ? <Button onClick={() => setModelTarget(null)}>Cancel</Button> : undefined}
      width={700} className="capability-add-ability-modal service-model-modal" destroyOnHidden>
      <Form labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} colon>
        <Form.Item label="Business Type"><Typography.Text>{businessType}</Typography.Text></Form.Item>
        <Form.Item label="Service"><Typography.Text>{modelTarget?.service.name}</Typography.Text></Form.Item>
        <Form.Item label="Action"><Typography.Text>{modelTarget?.action.name}</Typography.Text></Form.Item>
        <Form.Item label="Model" required><Select<ServiceRunModel> value={selectedModel} disabled={Boolean(modelTarget?.action.model)} placeholder="Please select a Model"
          options={SERVICE_MODEL_OPTIONS.map((model) => ({ label: model, value: model }))} onChange={setSelectedModel} /></Form.Item>
      </Form>
    </Modal>
  </>;
}
