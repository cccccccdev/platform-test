import { useMemo } from 'react';
import { Empty } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useBusinessTypeStore } from './businessTypeReferenceData';
import { useCapabilityDataStore } from './capabilityDataStore';
import { useServiceStore } from './serviceStore';
import { getServiceAbilityConnections } from './serviceAbilityMapping';
import BusinessTypeDemoCanvas from './BusinessTypeDemoCanvas';

const EMPTY_SERVICES: ReturnType<typeof useServiceStore.getState>['records'][string] = [];

export default function BusinessTypeDemoLivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const businessTypeRecords = useBusinessTypeStore((state) => state.records);
  const businessType = searchParams.get('bt') || businessTypeRecords[0]?.businessType || '';
  const serviceRecords = useServiceStore((state) => state.records);
  const services = serviceRecords[businessType] || EMPTY_SERVICES;
  const abilityGroup = useCapabilityDataStore((state) => state.data.find((group) => group.name === businessType));
  const connections = useMemo(() => getServiceAbilityConnections(services, abilityGroup), [services, abilityGroup]);
  const kind = searchParams.get('focusKind');
  const name = searchParams.get('focusName');
  const focus: { kind: 'service' | 'ability'; name: string } | null = kind === 'service' && name && services.some((service) => service.name === name) ? { kind, name }
    : kind === 'ability' && name && abilityGroup?.abilities.some((ability) => ability.name === name) ? { kind, name } : null;
  const showAllActions = searchParams.get('actionView') === 'all';
  const collapsedServices = searchParams.getAll('collapsedService');
  const collapsedAbilities = searchParams.getAll('collapsedAbility');

  const select = (selectedKind: 'service' | 'ability', selectedName: string, mode: 'toggle' | 'focus' | 'inspect' = 'toggle') => {
    const isAnchor = focus?.kind === selectedKind && focus.name === selectedName;
    if (showAllActions) {
      const next = new URLSearchParams(searchParams);
      next.delete('collapsedService');
      next.delete('collapsedAbility');
      if (mode === 'inspect' && isAnchor) {
        next.delete('focusKind');
        next.delete('focusName');
      } else {
        next.set('focusKind', selectedKind);
        next.set('focusName', selectedName);
      }
      setSearchParams(next);
      return;
    }
    const isRelated = Boolean(focus && connections.some((connection) => selectedKind === 'service'
      ? focus.kind === 'ability' && focus.name === connection.ability && selectedName === connection.service
      : focus.kind === 'service' && focus.name === connection.service && selectedName === connection.ability));
    if (mode === 'toggle' && isAnchor) {
      setSearchParams(new URLSearchParams({ bt: businessType }));
      return;
    }
    if (mode === 'toggle' && focus && isRelated) {
      const next = new URLSearchParams(searchParams);
      const key = selectedKind === 'service' ? 'collapsedService' : 'collapsedAbility';
      const collapsed = next.getAll(key);
      next.delete(key);
      for (const item of collapsed.filter((item) => item !== selectedName)) next.append(key, item);
      if (!collapsed.includes(selectedName)) next.append(key, selectedName);
      setSearchParams(next);
      return;
    }
    setSearchParams(new URLSearchParams({ bt: businessType, focusKind: selectedKind, focusName: selectedName }));
  };

  const toggleAllActions = () => setSearchParams(new URLSearchParams(showAllActions
    ? { bt: businessType }
    : { bt: businessType, actionView: 'all' }));

  return <div className="bt-demo-page"><main className={`bt-demo-panel ${showAllActions ? 'all-actions' : ''} ${focus ? 'has-focus' : ''}`}>
    <div className="bt-demo-intro">
      <div><h2>Service → Capability</h2><p>Browse every Action with Show all Actions, or select a Service or Ability to focus its mappings. Connections flow from Service to Ability.</p></div>
    </div>
    {!businessType ? <Empty description="Select a Business Type from the sidebar" /> : <BusinessTypeDemoCanvas
      businessType={businessType} services={services} abilityGroup={abilityGroup} connections={connections} focus={focus}
      showAllActions={showAllActions} onToggleAllActions={toggleAllActions}
      collapsedServices={collapsedServices} collapsedAbilities={collapsedAbilities} onSelect={select} />}
    <p className="bt-demo-footnote">Use Add mapping to connect a Service and Ability. Matching Action names link automatically. In Show all Actions, select a card to see only its Action mappings; select it again to return to the connection overview.</p>
  </main></div>;
}
