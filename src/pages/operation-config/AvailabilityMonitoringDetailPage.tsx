import { useMemo, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  message,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useBasicInfoReferenceStore } from '../basic-info/basicInfoReferenceStore';
import { useBusinessTypeStore } from '../basic-info/businessTypeReferenceData';
import { useInstitutionReferenceStore } from '../basic-info/institutionReferenceData';
import { getTenantOptionsByCountry } from '../basic-info/partyTenantReferenceData';
import {
  type AmountOperator,
  type AvailabilityDetectType,
  type AvailabilityMetricType,
  type AvailabilityMonitoringRule,
  type AvailabilityMonitoringUpdate,
  type InternalTrafficConfiguration,
  availabilityValidationDemoData,
  useAvailabilityMonitoringStore,
} from './availabilityMonitoringDemo';

interface BasicInfoDraft {
  country?: string;
  tenant?: string;
  businessType?: string;
  service: string;
  serviceChannel?: string;
  priority?: number;
}

interface RuleDraft {
  institution?: string;
  institutionLabel?: string;
  detectType?: AvailabilityDetectType;
  metricType?: AvailabilityMetricType;
  frequency?: number;
  amountOperator?: AmountOperator;
  amount?: number;
  startTime: string;
  endTime: string;
}

interface InternalConfigurationDraft {
  initialAccount: string;
  initialMemberId: string;
  targetAccountNumber: string;
  targetAccountName: string;
  amount?: number;
}

const emptyRuleDraft = (): RuleDraft => ({
  startTime: '',
  endTime: '',
});

const emptyInternalDraft = (): InternalConfigurationDraft => ({
  initialAccount: '',
  initialMemberId: '',
  targetAccountNumber: '',
  targetAccountName: '',
  amount: undefined,
});

const nextKey = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface DemoValidationFailure {
  title: string;
  message: string;
}

const validateDemoConfiguration = (
  rules: AvailabilityMonitoringRule[],
): DemoValidationFailure | undefined => {
  const configurations = rules.flatMap((rule) => rule.internalTraffic
    ? rule.internalConfigurations.map((configuration) => ({ rule, configuration }))
    : []);

  for (const { rule, configuration } of configurations) {
    const location = `${rule.institutionLabel} · ${configuration.initialAccount}`;
    if (configuration.initialAccount === availabilityValidationDemoData.account.systemError) {
      return {
        title: 'Account validation is temporarily unavailable',
        message: `${location}: the account service returned a system error. Please try again.`,
      };
    }
    if (configuration.initialAccount !== availabilityValidationDemoData.account.valid) {
      return {
        title: 'Account ID was not found',
        message: `${location}: please verify the Initial Account and try again.`,
      };
    }
    if (configuration.initialMemberId === availabilityValidationDemoData.member.systemError) {
      return {
        title: 'Member validation is temporarily unavailable',
        message: `${rule.institutionLabel}: the member service returned a system error. Please try again.`,
      };
    }
    if (configuration.initialMemberId === availabilityValidationDemoData.member.disable) {
      return {
        title: 'Member ID is disabled',
        message: `${rule.institutionLabel}: this member exists, but its status is DISABLE. Use an enabled Member ID.`,
      };
    }
    if (configuration.initialMemberId === availabilityValidationDemoData.member.close) {
      return {
        title: 'Member ID is closed',
        message: `${rule.institutionLabel}: this member exists, but its status is CLOSE. Use an enabled Member ID.`,
      };
    }
    if (configuration.initialMemberId !== availabilityValidationDemoData.member.enable) {
      return {
        title: 'Member ID was not found',
        message: `${rule.institutionLabel}: please verify the Initial Member ID and try again.`,
      };
    }
  }
  return undefined;
};

export default function AvailabilityMonitoringDetailPage() {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const numericRecordId = recordId ? Number(recordId) : undefined;
  const isModify = Number.isFinite(numericRecordId);
  const records = useAvailabilityMonitoringStore((state) => state.records);
  const addRecord = useAvailabilityMonitoringStore((state) => state.addRecord);
  const submitForApproval = useAvailabilityMonitoringStore((state) => state.submitForApproval);
  const sourceRecord = isModify ? records.find(({ id }) => id === numericRecordId) : undefined;
  const approvalLocked = sourceRecord?.approval?.status === 'PENDING';
  const countries = useBasicInfoReferenceStore((state) => state.countries);
  const businessTypes = useBusinessTypeStore((state) => state.records);
  const institutions = useInstitutionReferenceStore((state) => state.records);

  const [basicInfo, setBasicInfo] = useState<BasicInfoDraft>(() => sourceRecord ? {
    country: sourceRecord.country,
    tenant: sourceRecord.tenant,
    businessType: sourceRecord.businessType,
    service: sourceRecord.service,
    serviceChannel: sourceRecord.serviceChannel,
    priority: sourceRecord.priority,
  } : {
    country: 'NG',
    tenant: 'PALMPAY',
    service: '',
  });
  const [rules, setRules] = useState<AvailabilityMonitoringRule[]>(() => sourceRecord
    ? sourceRecord.rules.map((rule) => ({
      ...rule,
      internalConfigurations: rule.internalConfigurations.map((configuration) => ({ ...configuration })),
    }))
    : []);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string>();
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(emptyRuleDraft);
  const [configurationRuleId, setConfigurationRuleId] = useState<string>();
  const [configurationRows, setConfigurationRows] = useState<InternalTrafficConfiguration[]>([]);
  const [configurationDraft, setConfigurationDraft] = useState<InternalConfigurationDraft>(emptyInternalDraft);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [pendingPayload, setPendingPayload] = useState<AvailabilityMonitoringUpdate>();

  const countryOptions = countries.map(({ code }) => ({ value: code, label: code }));
  const tenantOptions = basicInfo.country ? getTenantOptionsByCountry(basicInfo.country) : [];
  const businessTypeOptions = businessTypes.map(({ businessType }) => ({ value: businessType, label: businessType }));
  const serviceChannelEnabled = Boolean(
    basicInfo.country && basicInfo.tenant && basicInfo.businessType && basicInfo.service.trim(),
  );
  const serviceChannelOptions = useMemo(() => {
    if (!serviceChannelEnabled) return [];
    return records
      .filter((record) => record.country === basicInfo.country
        && record.tenant === basicInfo.tenant
        && record.businessType === basicInfo.businessType
        && record.service.toLowerCase() === basicInfo.service.trim().toLowerCase())
      .map(({ serviceChannel }) => serviceChannel)
      .filter((value, index, values) => values.indexOf(value) === index)
      .map((value) => ({ value, label: value }));
  }, [basicInfo.businessType, basicInfo.country, basicInfo.service, basicInfo.tenant, records, serviceChannelEnabled]);
  const informationValidationRequired = basicInfo.businessType === 'BANK_ACCOUNT_CREDIT'
    && basicInfo.service.trim().toUpperCase() === 'TRANSFER';
  const validationSummary = informationValidationRequired
    ? 'Account ID and Member ID validation passed'
    : 'No Account ID or Member ID validation is required for this configuration';
  const institutionOptions = useMemo(() => [
    { value: 'all', label: 'all' },
    ...institutions
      .filter(({ country }) => country === basicInfo.country)
      .map(({ code, name }) => ({ value: code, label: name })),
  ], [basicInfo.country, institutions]);

  const patchBasicInfo = (patch: Partial<BasicInfoDraft>, clearServiceChannel = false) => {
    setBasicInfo((current) => ({
      ...current,
      ...patch,
      ...(clearServiceChannel ? { serviceChannel: undefined } : {}),
    }));
  };

  const openCreateRule = () => {
    setEditingRuleId(undefined);
    setRuleDraft(emptyRuleDraft());
    setRuleModalOpen(true);
  };

  const openModifyRule = (rule: AvailabilityMonitoringRule) => {
    setEditingRuleId(rule.id);
    setRuleDraft({
      institution: rule.institution,
      institutionLabel: rule.institutionLabel,
      detectType: rule.detectType,
      metricType: rule.metricType,
      frequency: rule.frequency,
      amountOperator: rule.amountOperator,
      amount: rule.amount,
      startTime: rule.timeRange?.[0] ?? '',
      endTime: rule.timeRange?.[1] ?? '',
    });
    setRuleModalOpen(true);
  };

  const confirmRule = () => {
    if (!ruleDraft.institution || !ruleDraft.detectType || !ruleDraft.metricType
      || !ruleDraft.amountOperator || ruleDraft.amount === undefined) {
      message.error('Please complete all required Rule fields.');
      return;
    }
    if (ruleDraft.detectType === 'availability' && !ruleDraft.frequency) {
      message.error('Please enter Frequency.');
      return;
    }
    if (Boolean(ruleDraft.startTime) !== Boolean(ruleDraft.endTime)) {
      message.error('Please select both start and end time, or leave both empty.');
      return;
    }
    if (ruleDraft.startTime && ruleDraft.endTime && ruleDraft.startTime > ruleDraft.endTime) {
      message.error('Time Range must be a continuous interval within one UTC+0 day.');
      return;
    }

    const existing = rules.find(({ id }) => id === editingRuleId);
    const nextRule: AvailabilityMonitoringRule = {
      id: editingRuleId ?? nextKey('rule'),
      institution: ruleDraft.institution,
      institutionLabel: ruleDraft.institutionLabel ?? ruleDraft.institution,
      detectType: ruleDraft.detectType,
      metricType: ruleDraft.metricType,
      frequency: ruleDraft.detectType === 'availability' ? ruleDraft.frequency : undefined,
      amountOperator: ruleDraft.amountOperator,
      amount: ruleDraft.amount,
      timeRange: ruleDraft.startTime && ruleDraft.endTime
        ? [ruleDraft.startTime, ruleDraft.endTime]
        : undefined,
      internalTraffic: existing?.internalTraffic ?? false,
      realTraffic: existing?.realTraffic ?? false,
      internalConfigurations: existing?.internalConfigurations ?? [],
    };
    setRules((current) => editingRuleId
      ? current.map((rule) => rule.id === editingRuleId ? nextRule : rule)
      : [...current, nextRule]);
    setRuleModalOpen(false);
  };

  const patchRule = (id: string, patch: Partial<AvailabilityMonitoringRule>) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  };

  const openInternalConfiguration = (rule: AvailabilityMonitoringRule) => {
    setConfigurationRuleId(rule.id);
    setConfigurationRows(rule.internalConfigurations.map((configuration) => ({ ...configuration })));
    setConfigurationDraft(emptyInternalDraft());
  };

  const addInternalConfiguration = () => {
    const { initialAccount, initialMemberId, targetAccountNumber, targetAccountName, amount } = configurationDraft;
    if (!initialAccount.trim() || !initialMemberId.trim() || !targetAccountNumber.trim()
      || !targetAccountName.trim() || amount === undefined) {
      message.error('Please complete all Internal Traffic Configuration fields.');
      return;
    }
    setConfigurationRows((current) => [...current, {
      id: nextKey('account'),
      initialAccount: initialAccount.trim(),
      initialMemberId: initialMemberId.trim(),
      targetAccountNumber: targetAccountNumber.trim(),
      targetAccountName: targetAccountName.trim(),
      amount,
      status: 'enable',
    }]);
    setConfigurationDraft(emptyInternalDraft());
  };

  const confirmInternalConfiguration = () => {
    if (configurationRuleId) {
      patchRule(configurationRuleId, { internalConfigurations: configurationRows });
    }
    setConfigurationRuleId(undefined);
  };

  const save = () => {
    if (approvalLocked) {
      message.warning('This record has a pending approval and cannot be modified until the approval is completed.');
      return;
    }
    if (!basicInfo.country || !basicInfo.tenant || !basicInfo.businessType
      || !basicInfo.service.trim() || !basicInfo.serviceChannel || basicInfo.priority === undefined) {
      message.error('Please complete all Basic Info fields.');
      return;
    }
    if (!rules.length) {
      message.error('Please add at least one Rule.');
      return;
    }
    const duplicate = records.some((record) => record.id !== numericRecordId
      && record.country === basicInfo.country
      && record.tenant === basicInfo.tenant
      && record.businessType === basicInfo.businessType
      && record.service === basicInfo.service.trim()
      && record.serviceChannel === basicInfo.serviceChannel);
    if (duplicate) {
      message.error('Please do not create repeatedly.');
      return;
    }
    const payload: AvailabilityMonitoringUpdate = {
      country: basicInfo.country,
      tenant: basicInfo.tenant,
      businessType: basicInfo.businessType,
      service: basicInfo.service.trim(),
      serviceChannel: basicInfo.serviceChannel,
      priority: basicInfo.priority,
      rules,
    };

    if (informationValidationRequired) {
      const failure = validateDemoConfiguration(rules);
      if (failure) {
        Modal.error({ title: failure.title, content: failure.message, okText: 'Got it' });
        return;
      }
      message.success('Account ID and Member ID validation passed.');
    }

    setPendingPayload(payload);
    setApprovalReason('');
    setApprovalModalOpen(true);
  };

  const confirmApproval = () => {
    if (!pendingPayload || !approvalReason.trim()) {
      message.error('Please enter a reason for change.');
      return;
    }
    const targetRecord = sourceRecord ?? addRecord(pendingPayload);
    const approval = submitForApproval(
      targetRecord.id,
      pendingPayload,
      approvalReason.trim(),
      validationSummary,
    );
    if (!approval) {
      message.error('This record already has a pending approval. Wait for it to complete before modifying the record again.');
      setApprovalModalOpen(false);
      return;
    }
    setApprovalModalOpen(false);
    message.success(`Submitted for approval (${approval.requestId}). The current configuration remains effective until approval is completed.`);
    navigate('/operation-config/availability-monitoring');
  };

  if (isModify && !sourceRecord) {
    return (
      <div className="availability-monitoring-detail-page availability-monitoring-not-found">
        <Empty description={`Availability monitoring record ${recordId} was not found.`} />
        <Button type="primary" onClick={() => navigate('/operation-config/availability-monitoring')}>Back to list</Button>
      </div>
    );
  }

  return (
    <div className="availability-monitoring-detail-page">
      <div className="availability-monitoring-detail-heading">
        <Breadcrumb items={[
          { title: 'Operation Config' },
          { title: <button type="button" onClick={() => navigate('/operation-config/availability-monitoring')}>Availability monitoring</button> },
          { title: isModify ? 'Modify' : 'Create' },
        ]} />
        <h1>{isModify ? 'Modify Availability monitoring' : 'Create Availability monitoring'}</h1>
      </div>

      {approvalLocked && (
        <Alert
          className="availability-monitoring-approval-lock"
          type="warning"
          showIcon
          message={`Pending approval · ${sourceRecord.approval?.requestId}`}
          description="This record cannot be modified, deleted, or switched on/off until the current approval is completed. The active configuration remains unchanged."
        />
      )}

      <fieldset
        className="availability-monitoring-detail-content availability-monitoring-edit-area"
        disabled={approvalLocked}
      >
        <section className="availability-monitoring-detail-card">
          <h2>Basic Info</h2>
          <div className="availability-monitoring-basic-form">
            <label>
              <span>Country</span>
              <Select
                showSearch
                value={basicInfo.country}
                options={countryOptions}
                placeholder="Please select"
                onChange={(country) => patchBasicInfo({ country, tenant: undefined }, true)}
              />
            </label>
            <label>
              <span>Tenant</span>
              <Select
                showSearch
                value={basicInfo.tenant}
                options={tenantOptions}
                disabled={!basicInfo.country}
                placeholder="Please select"
                onChange={(tenant) => patchBasicInfo({ tenant }, true)}
              />
            </label>
            <label>
              <span>Business Type</span>
              <Select
                showSearch
                value={basicInfo.businessType}
                options={businessTypeOptions}
                placeholder="Please select"
                onChange={(businessType) => patchBasicInfo({ businessType }, true)}
              />
            </label>
            <label>
              <span>Service</span>
              <Input
                value={basicInfo.service}
                placeholder="Please enter"
                onChange={(event) => patchBasicInfo({ service: event.target.value }, true)}
              />
            </label>
            <label>
              <span>Service Channel</span>
              <Select
                showSearch
                value={basicInfo.serviceChannel}
                options={serviceChannelOptions}
                disabled={!serviceChannelEnabled}
                placeholder={serviceChannelEnabled ? 'Please select' : 'Complete the first four fields'}
                notFoundContent={serviceChannelEnabled ? 'No matching Service Channel' : null}
                onOpenChange={() => undefined}
                onChange={(serviceChannel) => patchBasicInfo({ serviceChannel })}
              />
            </label>
            <label>
              <span>Priority</span>
              <InputNumber
                min={1}
                precision={0}
                value={basicInfo.priority}
                placeholder="Please enter"
                onChange={(priority) => patchBasicInfo({ priority: priority ?? undefined })}
              />
            </label>
          </div>
        </section>

        <section className="availability-monitoring-detail-card availability-monitoring-rule-card">
          <h2>Rule Configuration</h2>
          <div className="availability-monitoring-rule-toolbar">
            <Button type="primary" onClick={openCreateRule}>Add Rule</Button>
            <strong>Note: please enter amount in the smallest currency unit (kobo).</strong>
          </div>
          <Table<AvailabilityMonitoringRule>
            rowKey="id"
            dataSource={rules}
            pagination={false}
            scroll={{ x: 1300 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" /> }}
            columns={[
              { title: 'Institution', dataIndex: 'institutionLabel', width: 170 },
              { title: 'DetectType', dataIndex: 'detectType', width: 120 },
              { title: 'Metric Type', dataIndex: 'metricType', width: 120 },
              {
                title: 'Frequency',
                dataIndex: 'frequency',
                width: 110,
                render: (frequency?: number) => frequency === undefined ? '-' : `${frequency}s`,
              },
              {
                title: 'Amount(kobo)',
                key: 'amount',
                width: 140,
                render: (_, rule) => `${rule.amountOperator} ${rule.amount}`,
              },
              {
                title: 'Time Range',
                dataIndex: 'timeRange',
                width: 150,
                render: (timeRange?: [string, string]) => timeRange ? `${timeRange[0]} to ${timeRange[1]}` : 'All Time',
              },
              {
                title: 'Internal traffic',
                key: 'internalTraffic',
                width: 160,
                render: (_, rule) => (
                  <div className="availability-monitoring-traffic-cell">
                    <Switch
                      checked={rule.internalTraffic}
                      onChange={(checked) => {
                        if (checked && !rule.internalConfigurations.length) {
                          message.error('Please add configuration at first.');
                          return;
                        }
                        patchRule(rule.id, { internalTraffic: checked });
                      }}
                    />
                    <Button type="link" onClick={() => openInternalConfiguration(rule)}>Configuration</Button>
                  </div>
                ),
              },
              {
                title: 'Real traffic',
                key: 'realTraffic',
                width: 110,
                render: (_, rule) => (
                  <Switch checked={rule.realTraffic} onChange={(checked) => patchRule(rule.id, { realTraffic: checked })} />
                ),
              },
              {
                title: 'Operation',
                key: 'operation',
                width: 145,
                render: (_, rule) => (
                  <Space>
                    <Button type="link" onClick={() => openModifyRule(rule)}>Modify</Button>
                    <Popconfirm
                      title="Delete this Rule?"
                      onConfirm={() => setRules((current) => current.filter(({ id }) => id !== rule.id))}
                    >
                      <Button type="link" danger>Delete</Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
          <div className="availability-monitoring-save-actions">
            <Button type="primary" onClick={save}>Submit</Button>
            <Button onClick={() => navigate('/operation-config/availability-monitoring')}>Cancel</Button>
          </div>
        </section>
      </fieldset>

      <Modal
        title={editingRuleId ? 'Edit Rule Configuration' : 'Add Rule Configuration'}
        open={ruleModalOpen}
        width={720}
        okText="Confirm"
        onOk={confirmRule}
        onCancel={() => setRuleModalOpen(false)}
        destroyOnHidden
      >
        <div className="availability-monitoring-modal-form">
          <label>
            <span>Institution</span>
            <Select
              showSearch
              value={ruleDraft.institution}
              options={institutionOptions}
              placeholder="Please select"
              onChange={(institution, option) => {
                const selected = Array.isArray(option) ? option[0] : option;
                setRuleDraft((current) => ({
                  ...current,
                  institution,
                  institutionLabel: String(selected?.label ?? institution),
                  metricType: institution === 'all' ? 'channel' : 'institution',
                }));
              }}
            />
          </label>
          <label>
            <span>Detect Type</span>
            <Select
              value={ruleDraft.detectType}
              options={[
                { value: 'availability', label: 'availability' },
                { value: 'probeTest', label: 'probeTest' },
              ]}
              placeholder="Please select"
              onChange={(detectType) => setRuleDraft((current) => ({ ...current, detectType }))}
            />
          </label>
          <label>
            <span>Metric Type</span>
            <Select
              value={ruleDraft.metricType}
              options={ruleDraft.institution === 'all'
                ? [{ value: 'channel', label: 'channel' }]
                : [{ value: 'institution', label: 'institution' }]}
              disabled={!ruleDraft.institution}
              placeholder="Please select Institution first"
              onChange={(metricType) => setRuleDraft((current) => ({ ...current, metricType }))}
            />
          </label>
          {ruleDraft.detectType === 'availability' && (
            <label>
              <span>Frequency</span>
              <InputNumber
                min={1}
                precision={0}
                addonAfter="s"
                value={ruleDraft.frequency}
                onChange={(frequency) => setRuleDraft((current) => ({ ...current, frequency: frequency ?? undefined }))}
              />
            </label>
          )}
          <label>
            <span>Amount</span>
            <Space.Compact block>
              <Select
                className="availability-monitoring-amount-operator"
                value={ruleDraft.amountOperator}
                options={['>', '<', '='].map((value) => ({ value, label: value }))}
                onChange={(amountOperator) => setRuleDraft((current) => ({ ...current, amountOperator }))}
              />
              <InputNumber
                min={0}
                precision={2}
                step={0.01}
                value={ruleDraft.amount}
                onChange={(amount) => setRuleDraft((current) => ({ ...current, amount: amount ?? undefined }))}
              />
            </Space.Compact>
          </label>
          <label className="availability-monitoring-time-range-field">
            <span>Time Range</span>
            <div>
              <Input
                type="time"
                value={ruleDraft.startTime}
                onChange={(event) => setRuleDraft((current) => ({ ...current, startTime: event.target.value }))}
              />
              <em>to</em>
              <Input
                type="time"
                value={ruleDraft.endTime}
                onChange={(event) => setRuleDraft((current) => ({ ...current, endTime: event.target.value }))}
              />
              <small>UTC+0 · optional · no cross-day range</small>
            </div>
          </label>
        </div>
      </Modal>

      <Modal
        title="Internal Traffic Configuration"
        open={Boolean(configurationRuleId)}
        width={1050}
        okText="Confirm"
        onOk={confirmInternalConfiguration}
        onCancel={() => setConfigurationRuleId(undefined)}
        destroyOnHidden
      >
        <Alert
          className="availability-monitoring-demo-data"
          type="info"
          showIcon
          message="Demo validation data"
          description={(
            <div>
              <div><strong>Account:</strong> valid <code>{availabilityValidationDemoData.account.valid}</code></div>
              <div>not found <code>{availabilityValidationDemoData.account.notFound}</code> · service error <code>{availabilityValidationDemoData.account.systemError}</code></div>
              <div><strong>Member:</strong> ENABLE <code>{availabilityValidationDemoData.member.enable}</code></div>
              <div>not found <code>{availabilityValidationDemoData.member.notFound}</code> · DISABLE <code>{availabilityValidationDemoData.member.disable}</code></div>
              <div>CLOSE <code>{availabilityValidationDemoData.member.close}</code> · service error <code>{availabilityValidationDemoData.member.systemError}</code></div>
              <div><strong>Other required fields:</strong> Target Account Number <code>8135492339</code> · Target Account Name <code>Demo beneficiary</code> · Amount <code>1000</code></div>
            </div>
          )}
        />
        <div className="availability-monitoring-internal-form">
          <label>
            <span>Initial Account</span>
            <Input value={configurationDraft.initialAccount} onChange={(event) => setConfigurationDraft((current) => ({ ...current, initialAccount: event.target.value }))} />
          </label>
          <label>
            <span>Initial Member Id</span>
            <Input value={configurationDraft.initialMemberId} onChange={(event) => setConfigurationDraft((current) => ({ ...current, initialMemberId: event.target.value }))} />
          </label>
          <label>
            <span>Target Account Number</span>
            <Input value={configurationDraft.targetAccountNumber} onChange={(event) => setConfigurationDraft((current) => ({ ...current, targetAccountNumber: event.target.value }))} />
          </label>
          <label>
            <span>Target Account Name</span>
            <Input value={configurationDraft.targetAccountName} onChange={(event) => setConfigurationDraft((current) => ({ ...current, targetAccountName: event.target.value }))} />
          </label>
          <label>
            <span>Amount</span>
            <InputNumber
              min={0}
              precision={2}
              step={0.01}
              addonAfter="kobo"
              value={configurationDraft.amount}
              onChange={(amount) => setConfigurationDraft((current) => ({ ...current, amount: amount ?? undefined }))}
            />
          </label>
          <Button type="primary" onClick={addInternalConfiguration}>Add</Button>
        </div>
        <Table<InternalTrafficConfiguration>
          className="availability-monitoring-internal-table"
          rowKey="id"
          dataSource={configurationRows}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" /> }}
          columns={[
            { title: 'Initial Account', dataIndex: 'initialAccount' },
            { title: 'Initial Member Id', dataIndex: 'initialMemberId' },
            {
              title: 'Target Account',
              key: 'targetAccount',
              render: (_, row) => row.targetAccountName
                ? `${row.targetAccountNumber} / ${row.targetAccountName}`
                : row.targetAccountNumber,
            },
            { title: 'Amount(kobo)', dataIndex: 'amount' },
            { title: 'Status', dataIndex: 'status' },
            {
              title: 'Operation',
              key: 'operation',
              render: (_, row) => (
                <Popconfirm
                  title="Delete this account configuration?"
                  onConfirm={() => {
                    const configuredRule = rules.find(({ id }) => id === configurationRuleId);
                    if (configuredRule?.internalTraffic && configurationRows.length === 1) {
                      message.error('Please turn off the internal traffic switch at first.');
                      return;
                    }
                    setConfigurationRows((current) => current.filter(({ id }) => id !== row.id));
                  }}
                >
                  <Button type="link" danger>Delete</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title="Submit Availability Monitoring Change for Approval"
        open={approvalModalOpen}
        width={760}
        okText="Submit for Approval"
        onOk={confirmApproval}
        onCancel={() => setApprovalModalOpen(false)}
        okButtonProps={{ disabled: !approvalReason.trim() }}
        destroyOnHidden
      >
        <Alert
          type="success"
          showIcon
          message={informationValidationRequired ? 'Information validation passed' : 'Ready for approval'}
          description="The change has not taken effect. Review the approval message and submit it for approval."
        />
        <Descriptions
          className="availability-monitoring-approval-summary"
          bordered
          column={2}
          size="small"
          items={[
            { key: 'environment', label: 'Environment', children: 'PROD' },
            { key: 'record', label: 'Record ID', children: sourceRecord?.id ?? 'New record' },
            { key: 'scope', label: 'Configuration', children: `${basicInfo.businessType ?? '-'} / ${basicInfo.service || '-'} / ${basicInfo.serviceChannel ?? '-'}`, span: 2 },
            { key: 'country', label: 'Country / Tenant', children: `${basicInfo.country ?? '-'} / ${basicInfo.tenant ?? '-'}` },
            { key: 'operator', label: 'Applicant', children: 'Current User' },
            { key: 'validation', label: 'Validation', children: validationSummary, span: 2 },
            { key: 'effect', label: 'Effective rule', children: 'The current configuration remains effective until this request is approved.', span: 2 },
          ]}
        />
        <label className="availability-monitoring-approval-reason">
          <span>Reason for change</span>
          <Input.TextArea
            rows={4}
            value={approvalReason}
            placeholder="Required. This reason will be included in the approval message."
            onChange={(event) => setApprovalReason(event.target.value)}
          />
        </label>
      </Modal>
    </div>
  );
}
