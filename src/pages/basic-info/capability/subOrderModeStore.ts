const STORAGE_KEY = 'basic-info-capability-sub-order-modes';
const DEFAULT_ENABLED_KEYS = ['SMS:BULK_MESSAGE'];

export const getSubOrderModeKey = (businessType: string, ability: string) => `${businessType}:${ability}`;

export const getEnabledSubOrderModes = (): Set<string> => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const keys = Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [];
    return new Set([...DEFAULT_ENABLED_KEYS, ...keys]);
  } catch {
    return new Set(DEFAULT_ENABLED_KEYS);
  }
};

export const enableSubOrderMode = (businessType: string, ability: string): Set<string> => {
  const enabled = getEnabledSubOrderModes();
  enabled.add(getSubOrderModeKey(businessType, ability));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabled]));
  return enabled;
};

export const isSubOrderModeEnabled = (businessType: string, ability: string): boolean =>
  getEnabledSubOrderModes().has(getSubOrderModeKey(businessType, ability));
