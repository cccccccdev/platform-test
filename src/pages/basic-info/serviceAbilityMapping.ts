import type { BusinessTypeItem } from './capabilityDataStore';
import type { ServiceAbilityDirection, ServiceRecord } from './serviceReferenceData';

export interface ActionMapping {
  service: string;
  serviceAction: string;
  ability: string;
  abilityAction: string;
  direction: ServiceAbilityDirection;
}

export interface ServiceAbilityConnection {
  service: string;
  ability: string;
  mappings: ActionMapping[];
  direction: ServiceAbilityDirection;
}

/** Service–Ability links are explicit; Action links are derived from shared Action names. */
export function getServiceAbilityConnections(
  services: ServiceRecord[],
  businessType: BusinessTypeItem | undefined,
): ServiceAbilityConnection[] {
  const abilities = new Map((businessType?.abilities || []).map((ability) => [ability.name, ability]));
  const connections: ServiceAbilityConnection[] = [];

  for (const service of services) {
    const serviceActions = new Set(service.actions.map((action) => action.name));
    for (const reference of service.capabilityReferences || []) {
      const ability = abilities.get(reference.ability);
      if (!ability) continue;
      const abilityActions = new Set(ability.actions.map((action) => action.name));
      const direction: ServiceAbilityDirection = 'service-to-ability';
      const mappings = [...serviceActions]
        .filter((action) => abilityActions.has(action))
        .map((action) => ({ service: service.name, serviceAction: action, ability: ability.name, abilityAction: action, direction }));
      connections.push({ service: service.name, ability: ability.name, direction, mappings });
    }
  }

  return connections;
}
