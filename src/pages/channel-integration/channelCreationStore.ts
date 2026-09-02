export type CreatedCapabilityScope = {
  businessType: string;
  integrationType: 'CONFIG' | 'CODE';
  ability: string;
  countries: string[];
};

export type CreatedPartyScope = {
  party: string;
  capabilities: CreatedCapabilityScope[];
};

export type CreatedIntegrationRecord = {
  recordName: string;
  partyScopes: CreatedPartyScope[];
  debugReports: string;
  prdDocuments: string;
  contracts?: string;
  accessApprovalRecords?: string;
  brdDocuments?: string;
  owners?: {
    productOwners: string[];
    technicalOwners: string[];
    operationOwners: string[];
    bd: string[];
    sre: string[];
    businessOwners: string[];
  };
  approvers?: {
    productApprover: string;
    technicalApprover: string;
    operationsApprover: string;
  };
};

const storageKey = 'platform-test-created-channel-records';

export function saveCreatedIntegrationRecord(channelCode: string, record: CreatedIntegrationRecord) {
  const current = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
  sessionStorage.setItem(storageKey, JSON.stringify({ ...current, [channelCode]: record }));
}

export function getCreatedIntegrationRecord(channelCode: string): CreatedIntegrationRecord | undefined {
  const current = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
  return current[channelCode];
}
