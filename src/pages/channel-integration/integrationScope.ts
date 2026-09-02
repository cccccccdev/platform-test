export type IntegrationMode = 'CONFIG' | 'CODE';

export type PartyCapabilityScope = {
  party: string;
  capabilities: Array<{
    businessType: string;
    integrationType: IntegrationMode;
    ability: string;
    countries: string[];
  }>;
};

export type BusinessTypeScopeForm = {
  businessType: string;
  integrationType: IntegrationMode;
  partyAbilities: Array<{
    party: string;
    ability: string;
    countries: string[];
  }>;
};

export function toPartyScopes(scopes: BusinessTypeScopeForm[]): PartyCapabilityScope[] {
  const parties = new Map<string, PartyCapabilityScope>();
  scopes.forEach((scope) => scope.partyAbilities.forEach((row) => {
    const party = parties.get(row.party) || { party: row.party, capabilities: [] };
    party.capabilities.push({
      businessType: scope.businessType,
      integrationType: scope.integrationType,
      ability: row.ability,
      countries: row.countries,
    });
    parties.set(row.party, party);
  }));
  return Array.from(parties.values());
}

export function toBusinessTypeScopes(partyScopes: PartyCapabilityScope[]): BusinessTypeScopeForm[] {
  const businessTypes = new Map<string, BusinessTypeScopeForm>();
  partyScopes.forEach(({ party, capabilities }) => capabilities.forEach((capability) => {
    const scope = businessTypes.get(capability.businessType) || {
      businessType: capability.businessType,
      integrationType: capability.integrationType,
      partyAbilities: [],
    };
    scope.partyAbilities.push({ party, ability: capability.ability, countries: capability.countries });
    businessTypes.set(capability.businessType, scope);
  }));
  return Array.from(businessTypes.values());
}

export function isBusinessTypeScopeComplete(scopes?: BusinessTypeScopeForm[]) {
  if (!scopes?.length) return false;
  const businessTypes = scopes.map(({ businessType }) => businessType).filter(Boolean);
  if (businessTypes.length !== scopes.length || new Set(businessTypes).size !== businessTypes.length) return false;
  return scopes.every(({ integrationType, partyAbilities }) => Boolean(integrationType)
    && partyAbilities?.length > 0
    && partyAbilities.every(({ party, ability, countries }) => Boolean(party && ability && countries?.length)));
}
