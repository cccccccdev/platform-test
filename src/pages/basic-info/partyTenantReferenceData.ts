export type PartyTenantRelation = {
  country: string;
  tenant: string;
};

// Demo projection of the Country-Tenant associations maintained by Basic Info > Party & Tenant.
export const partyTenantReferenceData: PartyTenantRelation[] = [
  { country: 'NG', tenant: 'PALMPAY' },
];

export const partyTenantCountryOptions = [...new Set(partyTenantReferenceData.map((item) => item.country))]
  .sort((left, right) => left.localeCompare(right))
  .map((country) => ({ value: country, label: country }));

export function getTenantOptionsByCountry(country: string) {
  return partyTenantReferenceData
    .filter((item) => item.country === country)
    .map((item) => item.tenant)
    .filter((tenant, index, tenants) => tenants.indexOf(tenant) === index)
    .sort((left, right) => left.localeCompare(right))
    .map((tenant) => ({ value: tenant, label: tenant }));
}
