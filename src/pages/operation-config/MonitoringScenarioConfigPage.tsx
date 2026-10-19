import { useMemo, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  message,
} from 'antd';
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BRANCH_CODE_PATTERN,
  CODE_MAX_LENGTH,
  CODE_PATTERN,
  DESCRIPTION_MAX_LENGTH,
  getAppliedScenarioConfig,
  getScenarioDefinition,
  getScenarioEnabled,
  isScenarioConfigComplete,
  saveAppliedScenarioConfig,
} from './monitoringScenarioDemo';
import type {
  ConditionGroup,
  ConsecutiveMatchGate,
  EvaluationMode,
  ExpressionCondition,
  LogicalOperator,
  MetricSource,
  ScenarioAction,
  StateBranch,
  StateOperator,
} from './monitoringScenarioDemo';

type EditorTarget = 'metrics' | 'condition' | 'counter' | 'actions' | 'predicate';
type EditorState = { target: EditorTarget; branchKey?: string } | null;

const operatorOptions = ['<', '<=', '=', '!=', '>=', '>'].map((value) => ({ value, label: value }));
const relationOptions = ['AND', 'OR'].map((value) => ({ value, label: value }));
const stateOperatorOptions = [
  { value: 'IS_TRUE', label: 'is true' },
  { value: 'IS_FALSE', label: 'is false' },
];

const condition = (key: string, metricKey = ''): ExpressionCondition => ({
  key,
  relation: 'AND',
  metricKey,
  operator: '=',
  value: null,
});

function ExpressionBuilder({
  groups,
  metricSources,
  onChange,
  disabled = false,
}: {
  groups: ConditionGroup[];
  metricSources: MetricSource[];
  onChange: (groups: ConditionGroup[]) => void;
  disabled?: boolean;
}) {
  const metricOptions = metricSources.map((metric) => ({ value: metric.key, label: metric.metricCode || metric.tagCode || 'Unnamed metric' }));

  const patchGroup = (groupKey: string, patch: Partial<ConditionGroup>) => {
    onChange(groups.map((group) => group.key === groupKey ? { ...group, ...patch } : group));
  };

  const patchCondition = (groupKey: string, conditionKey: string, patch: Partial<ExpressionCondition>) => {
    onChange(groups.map((group) => group.key === groupKey
      ? { ...group, conditions: group.conditions.map((item) => item.key === conditionKey ? { ...item, ...patch } : item) }
      : group));
  };

  const addGroup = () => {
    const key = `group-${Date.now()}`;
    onChange([...groups, { key, relation: 'OR', conditions: [condition(`${key}-condition`, metricSources[0]?.key)] }]);
  };

  if (groups.length === 0) {
    return (
      <div className="monitoring-empty-editor">
        <FilterOutlined />
        <strong>No condition configured</strong>
        <span>Add the first condition group to make this flow executable.</span>
        {!disabled && <Button type="primary" icon={<PlusOutlined />} onClick={addGroup}>Add condition group</Button>}
      </div>
    );
  }

  return (
    <div className="monitoring-expression-editor">
      {groups.map((group, groupIndex) => (
        <div key={group.key} className="monitoring-expression-group-wrap">
          {groupIndex > 0 && (
            <Select
              className="monitoring-group-relation"
              value={group.relation}
              options={relationOptions}
              disabled={disabled}
              onChange={(value: LogicalOperator) => patchGroup(group.key, { relation: value })}
            />
          )}
          <Card
            size="small"
            title={`Condition group ${groupIndex + 1}`}
            extra={!disabled && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => onChange(groups.filter((item) => item.key !== group.key))}>Remove</Button>}
          >
            {group.conditions.map((item, itemIndex) => (
              <div key={item.key} className="monitoring-expression-condition-wrap">
                {itemIndex > 0 && (
                  <Select
                    className="monitoring-condition-relation"
                    value={item.relation}
                    options={relationOptions}
                    disabled={disabled}
                    onChange={(value: LogicalOperator) => patchCondition(group.key, item.key, { relation: value })}
                  />
                )}
                <div className="monitoring-expression-condition">
                  <Select value={item.metricKey} options={metricOptions} disabled={disabled} onChange={(value) => patchCondition(group.key, item.key, { metricKey: value })} />
                  <Select value={item.operator} options={operatorOptions} disabled={disabled} onChange={(value) => patchCondition(group.key, item.key, { operator: value })} />
                  <InputNumber value={item.value} placeholder="Threshold" readOnly={disabled} onChange={(value) => patchCondition(group.key, item.key, { value })} />
                  {!disabled && <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => patchGroup(group.key, { conditions: group.conditions.filter((row) => row.key !== item.key) })}
                  />}
                </div>
              </div>
            ))}
            {!disabled && <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => patchGroup(group.key, {
                conditions: [...group.conditions, condition(`${group.key}-${Date.now()}`, metricSources[0]?.key)],
              })}
            >
              Add condition
            </Button>}
          </Card>
        </div>
      ))}
      {!disabled && <Button icon={<PlusOutlined />} onClick={addGroup}>Add condition group</Button>}
    </div>
  );
}

function FlowNode({
  icon,
  eyebrow,
  title,
  summary,
  warning,
  onClick,
}: {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  summary?: React.ReactNode;
  warning?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`monitoring-flow-node${warning ? ' monitoring-flow-node-warning' : ''}`} onClick={onClick}>
      <span className="monitoring-flow-node-icon">{icon}</span>
      <span className="monitoring-flow-node-copy">
        {eyebrow && <small>{eyebrow}</small>}
        <strong>{title}</strong>
        {summary !== undefined && <span>{summary}</span>}
      </span>
      <span className="monitoring-flow-node-edit">Configure</span>
    </button>
  );
}

const parsePreviewContext = (context?: string) => {
  if (!context?.trim()) return {};
  try {
    return JSON.parse(context) as unknown;
  } catch {
    return context;
  }
};

export default function MonitoringScenarioConfigPage() {
  const navigate = useNavigate();
  const { scenarioCode: routeScenarioCode = '' } = useParams();
  const scenario = useMemo(() => getScenarioDefinition(routeScenarioCode), [routeScenarioCode]);
  const scenarioCode = scenario.scenarioCode;
  const scenarioDescription = scenario.description;
  const initialConfig = useMemo(() => getAppliedScenarioConfig(scenarioCode), [scenarioCode]);
  const editingLocked = useMemo(() => getScenarioEnabled(scenarioCode), [scenarioCode]);
  const [metricSources, setMetricSources] = useState(initialConfig.metricSources);
  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode | null>(initialConfig.evaluationMode);
  const [matchGroups, setMatchGroups] = useState(initialConfig.matchGroups);
  const [directConsecutiveMatchGate, setDirectConsecutiveMatchGate] = useState(initialConfig.directConsecutiveMatchGate);
  const [directActions, setDirectActions] = useState(initialConfig.directActions);
  const [branches, setBranches] = useState(initialConfig.branches);
  const [editor, setEditor] = useState<EditorState>(null);
  const [branchCreateOpen, setBranchCreateOpen] = useState(false);
  const [draftBranchCode, setDraftBranchCode] = useState('');
  const [draftBranchDescription, setDraftBranchDescription] = useState('');
  const [editingBranchDescription, setEditingBranchDescription] = useState<{
    branchKey: string;
    originalDescription: string;
  } | null>(null);

  const selectedBranch = editor?.branchKey ? branches.find((branch) => branch.key === editor.branchKey) : undefined;
  const selectedGroups = selectedBranch ? selectedBranch.groups : matchGroups;
  const selectedConsecutiveMatchGate = selectedBranch ? selectedBranch.consecutiveMatchGate : directConsecutiveMatchGate;
  const selectedActions = selectedBranch ? selectedBranch.actions : directActions;

  const updateBranch = (branchKey: string, patch: Partial<StateBranch>) => {
    setBranches((current) => current.map((branch) => branch.key === branchKey ? { ...branch, ...patch } : branch));
  };

  const updateSelectedGroups = (groups: ConditionGroup[]) => {
    if (selectedBranch) updateBranch(selectedBranch.key, { groups });
    else setMatchGroups(groups);
  };

  const updateSelectedConsecutiveMatchGate = (gate: ConsecutiveMatchGate) => {
    if (selectedBranch) updateBranch(selectedBranch.key, { consecutiveMatchGate: gate });
    else setDirectConsecutiveMatchGate(gate);
  };

  const updateSelectedActions = (actions: ScenarioAction[]) => {
    if (selectedBranch) updateBranch(selectedBranch.key, { actions });
    else setDirectActions(actions);
  };

  const changeMode = (nextMode: EvaluationMode) => {
    if (nextMode === evaluationMode) return;
    if (nextMode === 'DIRECT_EVALUATION') return;
    if (editingLocked) return;
    Modal.confirm({
      title: 'Switch flow structure?',
      content: 'Configured branches, conditions, count gates, and actions will be cleared. The platform will not migrate configuration between flow structures. This draft takes effect only after Save.',
      okText: 'Switch and clear',
      cancelText: 'Keep current flow',
      okButtonProps: { danger: true },
      onOk: () => {
        setEvaluationMode(nextMode);
        setMatchGroups([]);
        setDirectConsecutiveMatchGate({ requiredCount: null });
        setDirectActions([]);
        setBranches([]);
        setEditor(null);
      },
    });
  };

  const addMetric = () => {
    const key = `metric-${Date.now()}`;
    setMetricSources((current) => [...current, { key, metricCode: '', tagCode: '', parameters: '{\n  \n}' }]);
  };

  const openAddBranch = () => {
    setDraftBranchCode('');
    setDraftBranchDescription('');
    setBranchCreateOpen(true);
  };

  const addBranch = () => {
    const key = `branch-${Date.now()}`;
    setBranches((current) => [...current, {
      key,
      branchCode: draftBranchCode,
      description: draftBranchDescription.trim(),
      stateOperator: 'IS_FALSE',
      groups: [],
      consecutiveMatchGate: { requiredCount: null },
      actions: [],
    }]);
    setBranchCreateOpen(false);
  };

  const addAction = (type: ScenarioAction['type']) => {
    if (selectedActions.some((action) => action.type === type)) return;
    const action: ScenarioAction = type === 'SEND_MQ'
      ? { key: 'send-mq', type, context: '{\n  \n}' }
      : { key: 'set-scenario-state', type, stateValue: true };
    updateSelectedActions([...selectedActions, action]);
  };

  const updateAction = (actionKey: string, patch: Partial<ScenarioAction>) => {
    updateSelectedActions(selectedActions.map((action) => action.key === actionKey ? { ...action, ...patch } : action));
  };

  const metricCodesValid = metricSources.length > 0
    && metricSources.every((metric) => metric.metricCode.length > 0 && CODE_PATTERN.test(metric.metricCode))
    && new Set(metricSources.map((metric) => metric.metricCode)).size === metricSources.length;
  const draftConfig = { metricSources, evaluationMode, matchGroups, directConsecutiveMatchGate, directActions, branches };
  const pageValid = isScenarioConfigComplete(draftConfig);
  const hasUnsavedChanges = JSON.stringify(draftConfig) !== JSON.stringify(initialConfig);

  const leaveConfigPage = () => navigate('/operation-config/monitoring-scenarios');

  const cancel = () => {
    if (editingLocked || !hasUnsavedChanges) {
      leaveConfigPage();
      return;
    }
    Modal.confirm({
      title: 'Discard all unsaved changes?',
      icon: <ExclamationCircleOutlined />,
      content: 'Save is the only way to apply changes on this page. If you leave now, every change made since the page was opened will be permanently discarded.',
      okText: 'Discard changes',
      cancelText: 'Continue editing',
      okButtonProps: { danger: true },
      onOk: leaveConfigPage,
    });
  };

  const save = () => {
    saveAppliedScenarioConfig(scenarioCode, draftConfig);
    message.success('Scenario configuration saved');
    leaveConfigPage();
  };

  const countSummary = (count: number) => (
    <Tag className="monitoring-flow-node-stat">{count}</Tag>
  );

  const countGateSummary = (gate: ConsecutiveMatchGate) => gate.requiredCount === null
    ? undefined
    : countSummary(gate.requiredCount);

  const branchCodeExists = branches.some((branch) => branch.branchCode === draftBranchCode);
  const branchDraftValid = BRANCH_CODE_PATTERN.test(draftBranchCode)
    && !branchCodeExists
    && draftBranchDescription.trim().length > 0
    && draftBranchDescription.length <= DESCRIPTION_MAX_LENGTH;

  const editorTitle = editor?.target === 'metrics'
    ? 'Configure metric sources'
    : editor?.target === 'condition'
      ? `${selectedBranch?.branchCode || 'Direct flow'} · Condition`
      : editor?.target === 'counter'
        ? `${selectedBranch?.branchCode || 'Direct flow'} · Consecutive match gate`
      : editor?.target === 'actions'
        ? `${selectedBranch?.branchCode || 'Direct flow'} · Actions`
        : editor?.target === 'predicate'
          ? `${selectedBranch?.branchCode || 'State branch'} · State predicate`
          : 'Configure flow';

  return (
    <div className="operation-config-page monitoring-page monitoring-config-page">
      <header className="monitoring-config-header">
        <div>
          <Breadcrumb items={[
            { title: 'Operation Config' },
            { title: <button type="button" onClick={cancel}>Monitoring Scenarios</button> },
            { title: scenarioCode },
          ]} />
          <div className="monitoring-config-title-row">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={cancel} />
            <div>
              <h1>Configure processing flow</h1>
              <p><code>{scenarioCode}</code> · {scenarioDescription}</p>
            </div>
          </div>
        </div>
        <Space>
          <Button onClick={cancel}>Cancel</Button>
          {!editingLocked && <Button type="primary" disabled={!pageValid} onClick={save}>Save</Button>}
        </Space>
      </header>

      <main className="monitoring-flow-workspace">
        {editingLocked && (
          <Alert
            className="monitoring-readonly-alert"
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message="This scenario is enabled and cannot be edited"
            description="Disable the scenario from the list before changing its processing flow. You can still open every node to review its configuration."
          />
        )}
        {evaluationMode === null ? (
          <section className="monitoring-mode-gate">
            <div className="monitoring-mode-gate-heading">
              <span className="monitoring-flow-kicker">First step</span>
              <h2>Choose a flow structure</h2>
              <p>Select how this scenario should evaluate conditions. Other configuration becomes available after this choice.</p>
            </div>
            <div className="monitoring-mode-choices">
              <button type="button" className="monitoring-mode-choice" disabled>
                <span className="monitoring-mode-choice-icon"><FilterOutlined /></span>
                <strong>Direct flow</strong>
                <span>Evaluate one condition and execute its actions whenever it matches.</span>
                <em>Unavailable in phase 1</em>
              </button>
              <button type="button" className="monitoring-mode-choice" onClick={() => setEvaluationMode('STATE_BRANCHING')}>
                <span className="monitoring-mode-choice-icon"><ApartmentOutlined /></span>
                <strong>State branch flow</strong>
                <span>Use the current scenario state to select a branch, then evaluate its condition and actions.</span>
                <em>Select state branch flow</em>
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="monitoring-flow-toolbar">
              <div className="monitoring-current-mode">
                <strong>{evaluationMode === 'DIRECT_EVALUATION' ? 'Direct flow' : 'State branch flow'}</strong>
              </div>
              <p>{evaluationMode === 'DIRECT_EVALUATION'
                ? 'Evaluate one condition and execute its actions whenever it matches.'
                : 'Use the current scenario state to select a branch, then evaluate its condition and actions.'}</p>
              {!editingLocked && evaluationMode === 'DIRECT_EVALUATION' && (
                <Button onClick={() => changeMode('STATE_BRANCHING')}>Switch to state branch flow</Button>
              )}
            </section>

            <section className="monitoring-flow-canvas" aria-label="Scenario processing flow">
          <FlowNode
            icon={<DatabaseOutlined />}
            title="Metric sources"
            summary={countSummary(metricSources.length)}
            warning={!metricCodesValid}
            onClick={() => setEditor({ target: 'metrics' })}
          />

          <div className="monitoring-flow-connector"><span /></div>

          {evaluationMode === 'DIRECT_EVALUATION' ? (
            <div className="monitoring-direct-stage">
              <div className="monitoring-direct-stage-heading">
                <span className="monitoring-flow-kicker">Direct processing flow</span>
              </div>
              <div className="monitoring-direct-flow">
                <FlowNode
                  icon={<FilterOutlined />}
                  eyebrow="Evaluate"
                  title="Match condition"
                  summary={countSummary(matchGroups.length)}
                  warning={matchGroups.length === 0}
                  onClick={() => setEditor({ target: 'condition' })}
                />
                <div className="monitoring-flow-inline-connector" />
                <FlowNode
                  icon={<ClockCircleOutlined />}
                  eyebrow="Consecutive matches"
                  title="Count gate"
                  summary={countGateSummary(directConsecutiveMatchGate)}
                  warning={directConsecutiveMatchGate.requiredCount === null || directConsecutiveMatchGate.requiredCount < 1}
                  onClick={() => setEditor({ target: 'counter' })}
                />
                <div className="monitoring-flow-inline-connector" />
                <FlowNode
                  icon={<ThunderboltOutlined />}
                  eyebrow="On match"
                  title="Actions"
                  summary={countSummary(directActions.length)}
                  warning={directActions.length === 0}
                  onClick={() => setEditor({ target: 'actions' })}
                />
              </div>
            </div>
          ) : (
            <div className="monitoring-branch-stage">
              <div className="monitoring-branch-stage-heading">
                <h2>STATE BRANCHES</h2>
                {!editingLocked && <Button icon={<PlusOutlined />} onClick={openAddBranch}>Add branch</Button>}
              </div>

              {branches.length === 0 ? (
                <div className="monitoring-flow-empty">
                  <ApartmentOutlined />
                  <strong>No state branch configured</strong>
                  <span>Add a branch, then configure its state predicate, condition, and actions.</span>
                </div>
              ) : branches.map((branch) => (
                <article className="monitoring-branch-lane" key={branch.key}>
                  <div className="monitoring-branch-lane-title">
                    <Tag color="purple">{branch.branchCode || 'UNNAMED_BRANCH'}</Tag>
                    <div className="monitoring-branch-description">
                      {editingBranchDescription?.branchKey === branch.key ? (
                        <>
                          <Input
                            autoFocus
                            value={branch.description}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            status={!branch.description.trim() ? 'error' : undefined}
                            aria-label={`${branch.branchCode} description`}
                            onChange={(event) => updateBranch(branch.key, { description: event.target.value })}
                            onPressEnter={() => {
                              if (branch.description.trim()) setEditingBranchDescription(null);
                            }}
                          />
                          <Button
                            type="text"
                            icon={<CheckOutlined />}
                            aria-label={`Finish editing ${branch.branchCode} description`}
                            disabled={!branch.description.trim()}
                            onClick={() => setEditingBranchDescription(null)}
                          />
                          <Button
                            type="text"
                            icon={<CloseOutlined />}
                            aria-label={`Cancel editing ${branch.branchCode} description`}
                            onClick={() => {
                              updateBranch(branch.key, { description: editingBranchDescription.originalDescription });
                              setEditingBranchDescription(null);
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <span title={branch.description}>{branch.description || 'Branch description required'}</span>
                          {!editingLocked && (
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              aria-label={`Edit ${branch.branchCode} description`}
                              danger={!BRANCH_CODE_PATTERN.test(branch.branchCode)
                                || !branch.description.trim()
                                || branch.description.length > DESCRIPTION_MAX_LENGTH}
                              onClick={() => setEditingBranchDescription({
                                branchKey: branch.key,
                                originalDescription: branch.description,
                              })}
                            />
                          )}
                        </>
                      )}
                    </div>
                    {!editingLocked && (
                      <Button
                        className="monitoring-branch-remove"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setBranches((current) => current.filter((item) => item.key !== branch.key));
                          if (editingBranchDescription?.branchKey === branch.key) setEditingBranchDescription(null);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="monitoring-branch-lane-flow">
                    <FlowNode
                      icon={<ApartmentOutlined />}
                      eyebrow="Select branch"
                      title="State predicate"
                      onClick={() => setEditor({ target: 'predicate', branchKey: branch.key })}
                    />
                    <div className="monitoring-flow-inline-connector" />
                    <FlowNode
                      icon={<FilterOutlined />}
                      eyebrow="Then evaluate"
                      title="Condition"
                      summary={countSummary(branch.groups.length)}
                      warning={branch.groups.length === 0}
                      onClick={() => setEditor({ target: 'condition', branchKey: branch.key })}
                    />
                    <div className="monitoring-flow-inline-connector" />
                    <FlowNode
                      icon={<ClockCircleOutlined />}
                      eyebrow="Consecutive matches"
                      title="Count gate"
                      summary={countGateSummary(branch.consecutiveMatchGate)}
                      warning={branch.consecutiveMatchGate.requiredCount === null || branch.consecutiveMatchGate.requiredCount < 1}
                      onClick={() => setEditor({ target: 'counter', branchKey: branch.key })}
                    />
                    <div className="monitoring-flow-inline-connector" />
                    <FlowNode
                      icon={<ThunderboltOutlined />}
                      eyebrow="On match"
                      title="Actions"
                      summary={countSummary(branch.actions.length)}
                      warning={branch.actions.length === 0}
                      onClick={() => setEditor({ target: 'actions', branchKey: branch.key })}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
            </section>
          </>
        )}
      </main>

      <Drawer
        title={editorTitle}
        width={editor?.target === 'metrics' || editor?.target === 'condition' ? 860 : 720}
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        footer={<div className="monitoring-drawer-footer"><Button type="primary" onClick={() => setEditor(null)}>Done</Button></div>}
      >
        {editor?.target === 'metrics' && (
          <div className="monitoring-config-panel">
            <div className="monitoring-section-heading">
              <div>
                <h3>Metric sources</h3>
                <p>Metrics are shared by all conditions in this scenario.</p>
              </div>
              {!editingLocked && <Button icon={<PlusOutlined />} onClick={addMetric}>Add metric</Button>}
            </div>
            <div className="metric-condition-list">
              {metricSources.map((metric, index) => (
                <Card
                  key={metric.key}
                  size="small"
                  title={`Metric ${index + 1}`}
                  extra={!editingLocked && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setMetricSources((current) => current.filter((item) => item.key !== metric.key))}>Delete</Button>}
                >
                  <div className="monitoring-metric-form-grid">
                    <div>
                      <label className="monitoring-field-label">Metric Code</label>
                      <Input
                        value={metric.metricCode}
                        maxLength={CODE_MAX_LENGTH}
                        showCount
                        readOnly={editingLocked}
                        status={metric.metricCode && !CODE_PATTERN.test(metric.metricCode) ? 'error' : undefined}
                        onChange={(event) => setMetricSources((current) => current.map((item) => item.key === metric.key ? { ...item, metricCode: event.target.value } : item))}
                      />
                      <div className="monitoring-field-help">Lowercase letters, numbers, and underscores. Maximum 64 characters.</div>
                    </div>
                    <div>
                      <label className="monitoring-field-label">Tag Code</label>
                      <Input value={metric.tagCode} readOnly={editingLocked} onChange={(event) => setMetricSources((current) => current.map((item) => item.key === metric.key ? { ...item, tagCode: event.target.value } : item))} />
                    </div>
                    <div className="monitoring-metric-parameters">
                      <label className="monitoring-field-label">Parameters (JSON)</label>
                      <Input.TextArea rows={4} value={metric.parameters} readOnly={editingLocked} onChange={(event) => setMetricSources((current) => current.map((item) => item.key === metric.key ? { ...item, parameters: event.target.value } : item))} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {editor?.target === 'predicate' && selectedBranch && (
          <div className="monitoring-branch-editor">
            <Alert type="info" showIcon message="This predicate selects the branch from the current scenario state. State changes are configured separately as optional actions." />
            <label className="monitoring-field-label">Current Scenario</label>
            <Input value={scenarioCode} disabled />
            <label className="monitoring-field-label">State Condition</label>
            <Select disabled={editingLocked} value={selectedBranch.stateOperator} options={stateOperatorOptions} onChange={(value: StateOperator) => updateBranch(selectedBranch.key, { stateOperator: value })} />
          </div>
        )}

        {editor?.target === 'condition' && (
          <ExpressionBuilder groups={selectedGroups} metricSources={metricSources} onChange={updateSelectedGroups} disabled={editingLocked} />
        )}

        {editor?.target === 'counter' && (
          <div className="monitoring-counter-editor">
            <Alert
              type="info"
              showIcon
              message="Count consecutive condition matches"
              description="The monitoring job evaluates once per minute. A matching condition increments this flow's counter. For example, a count of 10 requires the same result in 10 consecutive one-minute evaluations. Actions then run and the counter resets to zero; a non-matching result breaks the sequence and resets the counter."
            />
            <div className="monitoring-counter-threshold">
              <label className="monitoring-field-label monitoring-required-label">Required consecutive matches</label>
              <InputNumber
                min={1}
                precision={0}
                value={selectedConsecutiveMatchGate.requiredCount}
                placeholder="Count"
                readOnly={editingLocked}
                status={selectedConsecutiveMatchGate.requiredCount === null ? 'error' : undefined}
                onChange={(requiredCount) => updateSelectedConsecutiveMatchGate({ requiredCount })}
              />
              {selectedConsecutiveMatchGate.requiredCount !== null && (
                <div className="monitoring-field-help">
                  At one evaluation per minute, a count of {selectedConsecutiveMatchGate.requiredCount} requires {selectedConsecutiveMatchGate.requiredCount} consecutive one-minute matched results (about {selectedConsecutiveMatchGate.requiredCount} minutes).
                </div>
              )}
            </div>
          </div>
        )}

        {editor?.target === 'actions' && (
          <div className="monitoring-actions-editor">
            <Alert
              type="info"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message={selectedConsecutiveMatchGate.requiredCount === null
                ? 'Configure the Count gate before this flow can execute Actions'
                : `Actions execute after ${selectedConsecutiveMatchGate.requiredCount} consecutive matches`}
              description="When the count gate passes, the platform resets this flow counter to zero and executes the configured Actions in one reliable runtime context."
            />
            <div className="monitoring-section-heading">
              <div>
                <h3>Actions</h3>
                <p>Add one or more action types for this matched result.</p>
              </div>
              <Space>
                {!editingLocked && <Button disabled={selectedActions.some((action) => action.type === 'SEND_MQ')} onClick={() => addAction('SEND_MQ')}>Add Send MQ</Button>}
                {!editingLocked && <Button disabled={selectedActions.some((action) => action.type === 'SET_SCENARIO_STATE')} onClick={() => addAction('SET_SCENARIO_STATE')}>Add Set State</Button>}
              </Space>
            </div>

            {selectedActions.length === 0 && (
              <div className="monitoring-flow-empty compact">
                <ThunderboltOutlined />
                <strong>No action configured</strong>
                <span>Add an action to make this matched result executable.</span>
              </div>
            )}

            {selectedActions.map((action) => (
              <Card
                key={action.key}
                size="small"
                title={action.type === 'SEND_MQ' ? 'Send MQ' : 'Set Scenario State'}
                extra={!editingLocked && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => updateSelectedActions(selectedActions.filter((item) => item.key !== action.key))}>Remove</Button>}
                className="monitoring-action-card"
              >
                {action.type === 'SEND_MQ' ? (
                  <>
                    <Descriptions size="small" column={1} items={[
                      { key: 'tag', label: 'Tag', children: <code>{scenarioCode}</code> },
                    ]} />
                    <h4>Message Body</h4>
                    <Descriptions size="small" column={1} items={[
                      { key: 'scenarioCode', label: 'scenarioCode', children: <code>{scenarioCode}</code> },
                      { key: 'description', label: 'description', children: scenarioDescription },
                      ...(selectedBranch ? [{ key: 'branchCode', label: 'branchCode', children: <code>{selectedBranch.branchCode || '-'}</code> }] : []),
                      ...(!selectedBranch ? [{ key: 'event', label: 'event.type', children: <code>MATCHED</code> }] : []),
                      { key: 'occurredAt', label: 'occurredAt', children: <code>&lt;resolved at runtime&gt;</code> },
                    ]} />
                    <label className="monitoring-field-label monitoring-context-label">context (JSON)</label>
                    <Input.TextArea rows={6} value={action.context} readOnly={editingLocked} onChange={(event) => updateAction(action.key, { context: event.target.value })} />
                    <h4>Message Body Preview</h4>
                    <pre className="monitoring-message-preview">{JSON.stringify({
                      scenarioCode,
                      description: scenarioDescription,
                      context: parsePreviewContext(action.context),
                      occurredAt: '<resolved at runtime>',
                      ...(selectedBranch
                        ? { branchCode: selectedBranch.branchCode || '' }
                        : { event: { type: 'MATCHED' } }),
                    }, null, 2)}</pre>
                  </>
                ) : (
                  <div className="monitoring-state-action-form">
                    <label className="monitoring-field-label">Set current Scenario State to</label>
                    <Select
                      value={action.stateValue}
                      disabled={editingLocked}
                      options={[{ value: true, label: 'true' }, { value: false, label: 'false' }]}
                      onChange={(stateValue: boolean) => updateAction(action.key, { stateValue })}
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer
        title="Create branch"
        width={560}
        open={branchCreateOpen}
        onClose={() => setBranchCreateOpen(false)}
        footer={(
          <div className="monitoring-drawer-footer">
            <Space>
              <Button onClick={() => setBranchCreateOpen(false)}>Cancel</Button>
              <Button type="primary" disabled={!branchDraftValid} onClick={addBranch}>Create</Button>
            </Space>
          </div>
        )}
      >
        <div className="monitoring-branch-editor">
          <label className="monitoring-field-label monitoring-required-label">Branch Code</label>
          <Input
            value={draftBranchCode}
            maxLength={CODE_MAX_LENGTH}
            showCount
            placeholder="BRANCH_CODE"
            status={draftBranchCode && (!BRANCH_CODE_PATTERN.test(draftBranchCode) || branchCodeExists) ? 'error' : undefined}
            onChange={(event) => setDraftBranchCode(event.target.value)}
          />
          {draftBranchCode && !BRANCH_CODE_PATTERN.test(draftBranchCode) && (
            <div className="monitoring-field-help">Use uppercase letters, numbers, and underscores only. Maximum 64 characters.</div>
          )}
          {branchCodeExists && <div className="monitoring-field-help">This Branch Code already exists in the scenario.</div>}
          <label className="monitoring-field-label monitoring-required-label">Branch Description</label>
          <Input.TextArea
            rows={3}
            value={draftBranchDescription}
            maxLength={DESCRIPTION_MAX_LENGTH}
            showCount
            placeholder="Describe when this branch is used and what it does"
            onChange={(event) => setDraftBranchDescription(event.target.value)}
          />
        </div>
      </Drawer>
    </div>
  );
}
