export type IntegrationMode = 'CONFIG' | 'CODE';

export type PartyCapabilityScope = {
  party: string;
  capabilities: Array<{
    businessType: string;
    integrationType: IntegrationMode;
    countries: string[];
  }>;
};

export type BusinessTypeScopeForm = {
  businessType: string;
  integrationType: IntegrationMode;
  partyCountries: Array<{
    party: string;
    countries: string[];
  }>;
};

export function toPartyScopes(scopes: BusinessTypeScopeForm[]): PartyCapabilityScope[] {
  const parties = new Map<string, PartyCapabilityScope>();
  scopes.forEach((scope) => scope.partyCountries.forEach((row) => {
    const party = parties.get(row.party) || { party: row.party, capabilities: [] };
    party.capabilities.push({
      businessType: scope.businessType,
      integrationType: scope.integrationType,
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
      partyCountries: [],
    };
    scope.partyCountries.push({ party, countries: capability.countries });
    businessTypes.set(capability.businessType, scope);
  }));
  return Array.from(businessTypes.values());
}

export function isBusinessTypeScopeComplete(scopes?: BusinessTypeScopeForm[]) {
  if (!scopes?.length) return false;
  const businessTypes = scopes.map(({ businessType }) => businessType).filter(Boolean);
  if (businessTypes.length !== scopes.length || new Set(businessTypes).size !== businessTypes.length) return false;
  return scopes.every(({ integrationType, partyCountries }) => Boolean(integrationType)
    && partyCountries?.length > 0
    && partyCountries.every(({ party, countries }) => Boolean(party && countries?.length)));
}
