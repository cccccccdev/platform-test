export type AbilityMessageSetting = 'metrics' | 'completion';

export interface AbilityMessageSettingConfig {
  enabled: boolean;
  operationTime: string;
}

const STORAGE_KEY = 'basic-info-ability-message-settings';
const configKey = (businessType: string, ability: string, setting: AbilityMessageSetting) =>
  JSON.stringify([businessType, ability, setting]);

function readAll(): Record<string, AbilityMessageSettingConfig> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

export function getAbilityMessageSetting(
  businessType: string,
  ability: string,
  setting: AbilityMessageSetting,
): AbilityMessageSettingConfig | undefined {
  return readAll()[configKey(businessType, ability, setting)];
}

export function saveAbilityMessageSetting(
  businessType: string,
  ability: string,
  setting: AbilityMessageSetting,
  enabled: boolean,
): AbilityMessageSettingConfig {
  const records = readAll();
  const key = configKey(businessType, ability, setting);
  if (records[key]) return records[key];
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const config = {
    enabled,
    operationTime: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...records, [key]: config }));
  return config;
}
