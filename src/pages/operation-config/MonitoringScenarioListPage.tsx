import { useState } from 'react';
import { Badge, Breadcrumb, Button, Drawer, Input, Modal, Select, Space, Switch, Table, Tag, Tooltip, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getTenantOptionsByCountry, partyTenantCountryOptions } from '../basic-info/partyTenantReferenceData';
import {
  CODE_MAX_LENGTH,
  CODE_PATTERN,
  DESCRIPTION_MAX_LENGTH,
  createScenario,
  getAppliedScenarioConfig,
  getScenarioEnabled,
  getScenarioDefinitions,
  isScenarioConfigComplete,
  saveScenarioEnabled,
} from './monitoringScenarioDemo';

const logRows = [
  { key: '3', changedAt: '2026-10-14 16:32:00', fromState: 'true', toState: 'false', branchCode: 'RECOVERED', configVersion: 'v3' },
  { key: '2', changedAt: '2026-10-14 15:05:00', fromState: 'false', toState: 'true', branchCode: 'DETECTED', configVersion: 'v3' },
  { key: '1', changedAt: '2026-10-14 14:20:00', fromState: '-', toState: 'false', branchCode: '-', configVersion: 'v3' },
];

export default function MonitoringScenarioListPage() {
  const navigate = useNavigate();
  const [scenarioRows, setScenarioRows] = useState(getScenarioDefinitions);
  const [enabledByCode, setEnabledByCode] = useState<Record<string, boolean>>(() => Object.fromEntries(
    getScenarioDefinitions().map((scenario) => [scenario.scenarioCode, getScenarioEnabled(scenario.scenarioCode)]),
  ));
  const [createOpen, setCreateOpen] = useState(false);
  const [logScenarioCode, setLogScenarioCode] = useState<string | null>(null);
  const [draftCode, setDraftCode] = useState('');
  const [draftCountry, setDraftCountry] = useState('');
  const [draftTenant, setDraftTenant] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const codeAlreadyExists = scenarioRows.some((scenario) => scenario.scenarioCode === draftCode);
  const codeValidationMessage = codeAlreadyExists
    ? 'This Scenario Code already exists.'
    : draftCode && !CODE_PATTERN.test(draftCode)
      ? 'Use lowercase letters, numbers, and underscores only. Maximum 64 characters.'
      : null;
  const tenantOptions = getTenantOptionsByCountry(draftCountry);
  const tenantBelongsToCountry = tenantOptions.some((option) => option.value === draftTenant);
  const createValid = draftCode.length > 0
    && draftCode.length <= CODE_MAX_LENGTH
    && CODE_PATTERN.test(draftCode)
    && !codeAlreadyExists
    && draftCountry.trim().length > 0
    && tenantBelongsToCountry
    && draftDescription.trim().length > 0
    && draftDescription.length <= DESCRIPTION_MAX_LENGTH;

  const requestEnabledChange = (scenarioCode: string, nextEnabled: boolean) => {
    if (nextEnabled && !isScenarioConfigComplete(getAppliedScenarioConfig(scenarioCode))) {
      message.error('Complete and save the scenario configuration before enabling it.');
      return;
    }
    Modal.confirm({
      title: nextEnabled ? 'Enable monitoring scenario?' : 'Disable monitoring scenario?',
      content: nextEnabled
        ? 'The monitoring job will begin evaluating this scenario after confirmation.'
        : 'The monitoring job will stop evaluating this scenario after confirmation.',
      okText: nextEnabled ? 'Enable' : 'Disable',
      cancelText: 'Cancel',
      onOk: () => {
        setEnabledByCode((current) => ({ ...current, [scenarioCode]: nextEnabled }));
        saveScenarioEnabled(scenarioCode, nextEnabled);
        message.success(`Scenario ${nextEnabled ? 'enabled' : 'disabled'}.`);
      },
    });
  };

  const openCreate = () => {
    setDraftCode('');
    setDraftCountry('');
    setDraftTenant('');
    setDraftDescription('');
    setCreateOpen(true);
  };

  const logScenario = scenarioRows.find((scenario) => scenario.scenarioCode === logScenarioCode);
  const configSnapshot = logScenarioCode ? getAppliedScenarioConfig(logScenarioCode) : null;

  return (
    <div className="operation-config-page monitoring-page">
      <div className="operation-config-page-heading monitoring-heading">
        <div>
          <Breadcrumb items={[{ title: 'Operation Config' }, { title: 'Monitoring Scenarios' }]} />
          <h1>Monitoring Scenarios</h1>
          <p>Define monitoring scenarios and configure their complete processing flows.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Scenario</Button>
      </div>

      <div className="monitoring-content">
        <div className="monitoring-table-card">
          <Table
            rowKey="key"
            dataSource={scenarioRows}
            pagination={false}
            scroll={{ x: 1320 }}
            columns={[
              { title: 'Scenario Code', dataIndex: 'scenarioCode', width: 300, render: (value) => <code>{value}</code> },
              { title: 'Country', dataIndex: 'country', width: 100 },
              { title: 'Tenant', dataIndex: 'tenant', width: 120 },
              {
                title: 'Description',
                dataIndex: 'description',
                width: 360,
                render: (value: string) => (
                  <Tooltip title={value}>
                    <span className="monitoring-description-cell">{value}</span>
                  </Tooltip>
                ),
              },
              {
                title: 'Enabled',
                width: 100,
                render: (_, record) => {
                  const configComplete = isScenarioConfigComplete(getAppliedScenarioConfig(record.scenarioCode));
                  return (
                    <Tooltip title={configComplete ? undefined : 'Complete and save the configuration before enabling this scenario.'}>
                      <span>
                        <Switch
                          checked={enabledByCode[record.scenarioCode] ?? false}
                          disabled={!configComplete}
                          onChange={(nextEnabled) => requestEnabledChange(record.scenarioCode, nextEnabled)}
                        />
                      </span>
                    </Tooltip>
                  );
                },
              },
              { title: 'Operator', dataIndex: 'operator', width: 100 },
              { title: 'Operation Time', dataIndex: 'operationTime', width: 170 },
              {
                title: 'Operations',
                key: 'operations',
                width: 150,
                fixed: 'right',
                render: (_, record) => {
                  const configComplete = isScenarioConfigComplete(getAppliedScenarioConfig(record.scenarioCode));
                  return (
                    <Space size="middle">
                      <Button type="link" onClick={() => navigate(`/operation-config/monitoring-scenarios/${record.scenarioCode}`)}>
                        <Badge dot={!configComplete} offset={[5, 0]}><span className="monitoring-operation-link">Config</span></Badge>
                      </Button>
                      <Button type="link" onClick={() => setLogScenarioCode(record.scenarioCode)}>Log</Button>
                    </Space>
                  );
                },
              },
            ]}
          />
        </div>
      </div>

      <Drawer
        title="Create monitoring scenario"
        width={560}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        footer={(
          <div className="monitoring-drawer-footer">
            <Space>
              <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                disabled={!createValid}
                onClick={() => {
                  if (!createScenario(draftCode, draftCountry, draftTenant, draftDescription)) {
                    message.error('Scenario Code already exists.');
                    return;
                  }
                  setScenarioRows(getScenarioDefinitions());
                  setEnabledByCode((current) => ({ ...current, [draftCode]: false }));
                  message.success('Demo scenario created');
                  setCreateOpen(false);
                }}
              >
                Create
              </Button>
            </Space>
          </div>
        )}
      >
        <div className="monitoring-create-form">
          <label className="monitoring-field-label monitoring-required-label">Scenario Code</label>
          <Input
            value={draftCode}
            placeholder="lowercase_letters_numbers_and_underscores"
            maxLength={CODE_MAX_LENGTH}
            showCount
            status={codeValidationMessage ? 'error' : undefined}
            onChange={(event) => setDraftCode(event.target.value)}
          />
          {codeValidationMessage && <div className="monitoring-field-help">{codeValidationMessage}</div>}
          <label className="monitoring-field-label monitoring-required-label">Country</label>
          <Select
            showSearch
            value={draftCountry || undefined}
            placeholder="Select Country"
            options={partyTenantCountryOptions}
            onChange={(country) => {
              setDraftCountry(country);
              setDraftTenant('');
            }}
          />
          <label className="monitoring-field-label monitoring-required-label">Tenant</label>
          <Select
            showSearch
            value={draftTenant || undefined}
            placeholder={draftCountry ? 'Select Tenant' : 'Select Country first'}
            options={tenantOptions}
            disabled={!draftCountry}
            onChange={setDraftTenant}
          />
          <label className="monitoring-field-label monitoring-required-label">Description</label>
          <Input.TextArea rows={4} value={draftDescription} maxLength={DESCRIPTION_MAX_LENGTH} showCount onChange={(event) => setDraftDescription(event.target.value)} />
        </div>
      </Drawer>

      <Drawer title={`State Change Log · ${logScenarioCode ?? ''}`} width={920} open={Boolean(logScenarioCode)} onClose={() => setLogScenarioCode(null)}>
        <Table
          size="small"
          rowKey="key"
          pagination={false}
          dataSource={configSnapshot?.evaluationMode === 'STATE_BRANCHING' ? logRows : []}
          expandable={{
            expandedRowRender: (record) => (
              <pre className="monitoring-snapshot-preview">{JSON.stringify({ scenarioCode: logScenarioCode, description: logScenario?.description, matchedBranch: record.branchCode, config: configSnapshot }, null, 2)}</pre>
            ),
          }}
          columns={[
            { title: 'Changed At', dataIndex: 'changedAt', width: 170 },
            { title: 'From', dataIndex: 'fromState', width: 110, render: (value) => <Tag>{value}</Tag> },
            { title: 'To', dataIndex: 'toState', width: 110, render: (value) => <Tag color={value === 'true' ? 'red' : 'default'}>{value}</Tag> },
            { title: 'Branch Code', dataIndex: 'branchCode', width: 200, render: (value) => <code>{value}</code> },
            { title: 'Config Version', dataIndex: 'configVersion', width: 120 },
          ]}
        />
      </Drawer>
    </div>
  );
}
