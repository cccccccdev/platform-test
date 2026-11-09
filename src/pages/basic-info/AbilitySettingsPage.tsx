import { useState, type ReactNode } from 'react';
import { Breadcrumb, Button, Empty, Switch, Tabs, Tag, Typography, message } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCapabilityDataStore } from './capabilityDataStore';
import { getDemoReturnUrl } from './demoNavigation';
import { isSubOrderModeEnabled } from './capability/subOrderModeStore';
import { getBusinessAccessRequeryConfig, saveBusinessAccessRequeryConfig } from './capability/businessAccessRequeryStore';
import { getAbilityMessageSetting, saveAbilityMessageSetting } from './capability/abilityMessageSettingsStore';
import CapabilityFeaturesPage from './capability/CapabilityFeaturesPage';
import LinkStateMachinePage from './capability/LinkStateMachinePage';

type TabKey = 'general' | 'features' | 'state-machines';

function LockedSetting({ label, description, enabled, applicable = true }: { label: string; description: string; enabled?: boolean; applicable?: boolean }) {
  return <section className="bt-ability-locked-setting" aria-label={label}>
    <div className="bt-ability-locked-setting-copy">
      <h3>{label}</h3>
      <p>{description}</p>
    </div>
    <div className="bt-ability-locked-setting-value">
      {!applicable ? <Tag>Not applicable</Tag> : enabled === undefined ? <Tag>Not configured</Tag> : <><Switch checked={enabled} disabled aria-label={`${label}: ${enabled ? 'ON' : 'OFF'}`} /><strong>{enabled ? 'ON' : 'OFF'}</strong></>}
    </div>
  </section>;
}

function EditableSetting({ label, description, enabled, editable, applicable = true, onChange }: {
  label: string; description: string; enabled: boolean; editable: boolean; applicable?: boolean; onChange: (enabled: boolean) => void;
}) {
  return <section className="bt-ability-locked-setting" aria-label={label}>
    <div className="bt-ability-locked-setting-copy"><h3>{label}</h3><p>{description}</p></div>
    <div className="bt-ability-locked-setting-value">
      {!applicable ? <Tag>Not applicable</Tag> : <><Switch checked={enabled} disabled={!editable} aria-label={label} onChange={onChange} /><strong>{enabled ? 'ON' : 'OFF'}</strong></>}
    </div>
  </section>;
}

export default function AbilitySettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const businessType = searchParams.get('bt') || '';
  const abilityName = searchParams.get('ability') || '';
  const ability = useCapabilityDataStore((state) => state.data.find((group) => group.name === businessType)?.abilities.find((item) => item.name === abilityName));
  const [, refreshSettings] = useState(0);
  const backUrl = getDemoReturnUrl(searchParams, businessType) || `/basic-info/demo?bt=${encodeURIComponent(businessType)}`;
  const balConfig = ability?.direction === 'Inbound' ? getBusinessAccessRequeryConfig(businessType, abilityName) : undefined;
  const metricsConfig = ability ? getAbilityMessageSetting(businessType, abilityName, 'metrics') : undefined;
  const completionConfig = ability ? getAbilityMessageSetting(businessType, abilityName, 'completion') : undefined;
  const saveGeneralSetting = (save: () => void) => {
    if (searchParams.get('generalEdit') === '0') return;
    try { save(); refreshSettings((revision) => revision + 1); message.success('Setting saved'); }
    catch { message.error('Unable to save this setting. Please try again.'); }
  };
  // Demo-only permission preview; the production allowlist will be supplied separately.
  const canEditGeneral = searchParams.get('generalEdit') !== '0';
  const tabs: { key: TabKey; label: string; children: ReactNode }[] = [
    { key: 'general', label: 'General', children: <div className="bt-ability-general-settings">
      <LockedSetting label="Sub-order Mode" description="Whether this Ability uses sub-order processing." enabled={ability ? isSubOrderModeEnabled(businessType, abilityName) : undefined} />
      <EditableSetting label="BAL Requery" description="Whether the business access layer re-queries this inbound Ability."
        enabled={balConfig?.enabled ?? false} editable={canEditGeneral} applicable={ability?.direction === 'Inbound'}
        onChange={(enabled) => saveGeneralSetting(() => saveBusinessAccessRequeryConfig(businessType, abilityName, enabled))} />
      <EditableSetting label="Send metrics message" description="Whether this Ability sends a metrics message."
        enabled={metricsConfig?.enabled ?? false} editable={canEditGeneral}
        onChange={(enabled) => saveGeneralSetting(() => saveAbilityMessageSetting(businessType, abilityName, 'metrics', enabled))} />
      <EditableSetting label="Send completion message" description="Whether this Ability sends an order-completion message."
        enabled={completionConfig?.enabled ?? false} editable={canEditGeneral}
        onChange={(enabled) => saveGeneralSetting(() => saveAbilityMessageSetting(businessType, abilityName, 'completion', enabled))} />
    </div> },
    { key: 'features', label: 'Features', children: <CapabilityFeaturesPage embedded /> },
    { key: 'state-machines', label: 'State Machines', children: <LinkStateMachinePage embedded /> },
  ];
  const requestedTab = searchParams.get('tab');
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab! : 'general';

  return <div className="bt-ability-settings-page">
    <header className="bt-ability-settings-heading">
      <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info/country' }, { title: 'Demo', href: backUrl }, { title: businessType }, { title: abilityName }, { title: 'Capability settings' }]} />
      <div className="bt-ability-settings-title-row">
        <Button type="text" className="bt-ability-settings-back" icon={<LeftOutlined />} aria-label="Back to Demo" onClick={() => navigate(backUrl)} />
        <Typography.Title level={4}>Capability settings</Typography.Title>
      </div>
      {ability && <Tabs className="bt-ability-settings-tabs" activeKey={activeTab} items={tabs.map(({ key, label }) => ({ key, label }))}
        onChange={(key) => { const next = new URLSearchParams(searchParams); next.set('tab', key); setSearchParams(next); }} />}
    </header>
    {ability ? <main className="bt-ability-settings-content">
      <div className="bt-ability-settings-context"><span>Business Type: <strong>{businessType}</strong></span><span>Ability: <strong>{abilityName}</strong></span></div>
      <div className="bt-ability-settings-tab-panel">{tabs.find((tab) => tab.key === activeTab)?.children}</div>
    </main> : <main className="bt-ability-settings-content"><Empty description="This Capability is not available under the selected Business Type." /><Button onClick={() => navigate(backUrl)}>Back to Demo</Button></main>}
  </div>;
}
