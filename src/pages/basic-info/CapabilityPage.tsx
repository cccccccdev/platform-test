import { useState, useCallback, useEffect } from 'react';
import { Table, Button, Input, Space, message, Breadcrumb, Select, Form, Modal, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, CaretRightOutlined, CaretDownOutlined, MinusCircleOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ActionItem {
  key: string;
  name: string;
  operateTime: string;
  operator: string;
}

interface AbilityItem {
  key: string;
  name: string;
  operateTime: string;
  operator: string;
  isExpand: boolean;
  actions: ActionItem[];
  isEditing?: boolean;
}

interface BusinessTypeItem {
  key: string;
  name: string;
  isExpand: boolean;
  abilities: AbilityItem[];
}

const INITIAL_DATA: BusinessTypeItem[] = [
  {
    key: 'bt1',
    name: 'BANK_CARD_DEBIT',
    isExpand: true,
    abilities: [
      {
        key: 'ab1',
        name: 'REFUND',
        operateTime: '—',
        operator: '—',
        isExpand: false,
        actions: [],
      },
      {
        key: 'ab2',
        name: 'RE_QUERY',
        operateTime: '2008-08-08 20:08:00',
        operator: '我爱北京天安门',
        isExpand: true,
        actions: [
          { key: 'act1', name: 'default_action_01', operateTime: '2008-08-08 20:08:00', operator: '我爱北京天安门' },
          { key: 'act2', name: 'default_action_02', operateTime: '2008-08-08 20:08:00', operator: '我爱北京天安门' },
        ],
      },
      {
        key: 'ab3',
        name: 'TRANSACTION',
        operateTime: '2008-08-08 20:08:00',
        operator: '我爱北京天安门',
        isExpand: false,
        actions: [],
      },
    ],
  },
  {
    key: 'bt2',
    name: 'INFO_PAYMENT',
    isExpand: false,
    abilities: [
      {
        key: 'ab4',
        name: 'RE_QUERY',
        operateTime: '2008-08-08 20:08:00',
        operator: '我爱北京天安门',
        isExpand: false,
        actions: [],
      },
      {
        key: 'ab5',
        name: 'TRANSACTION',
        operateTime: '2008-08-08 20:08:00',
        operator: '我爱北京天安门',
        isExpand: false,
        actions: [],
      },
      {
        key: 'ab6',
        name: 'VERIFY',
        operateTime: '2008-08-08 20:08:00',
        operator: '我爱北京天安门',
        isExpand: false,
        actions: [
          { key: 'act3', name: 'default_action_01', operateTime: '2008-08-08 20:08:00', operator: '我爱北京天安门' },
        ],
      },
    ],
  },
];

const BUSINESS_TYPE_OPTIONS = ['BANK_CARD_DEBIT', 'INFO_PAYMENT'].map(v => ({ label: v, value: v }));

function generateActionName(existingActions: ActionItem[]): string {
  const nums = existingActions
    .map(a => {
      const m = a.name.match(/^default_action_(\d+)$/);
      return m ? parseInt(m[1]) : 0;
    });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `default_action_${String(max + 1).padStart(2, '0')}`;
}

export default function CapabilityPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<BusinessTypeItem[]>(INITIAL_DATA);
  const [filteredBt, setFilteredBt] = useState<string>('');
  const [addAbilityOpen, setAddAbilityOpen] = useState(false);
  const [addAbilityBt, setAddAbilityBt] = useState<string>('');
  const [addAbilityForm] = Form.useForm();
  const [editingActionKey, setEditingActionKey] = useState<string | null>(null);
  const [editingActionName, setEditingActionName] = useState('');
  const [linkSmModalOpen, setLinkSmModalOpen] = useState(false);
  const [linkSmAbility, setLinkSmAbility] = useState<{ bt: string; ability: string } | null>(null);
  const [linkSmForm] = Form.useForm();
  const [previewSmListOpen, setPreviewSmListOpen] = useState(false);
  const [linkSmList, setLinkSmList] = useState<LinkedSMRecord[]>([]);

  // LocalStorage key for linked state machines
  const LINKED_SM_KEY = 'linkedStateMachines';

  interface LinkedSMRecord {
    bt: string;
    ability: string;
    smName: string;
    operator: string;
    operationTime: string;
  }

  const getLinkedSM = useCallback((): LinkedSMRecord[] => {
    try {
      const stored = localStorage.getItem(LINKED_SM_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveLinkedSM = useCallback((records: LinkedSMRecord[]) => {
    localStorage.setItem(LINKED_SM_KEY, JSON.stringify(records));
  }, []);

  const getLinkedSMForAbility = useCallback((bt: string, ability: string): string => {
    const records = getLinkedSM();
    const record = records.find(r => r.bt === bt && r.ability === ability);
    return record?.smName || '';
  }, [getLinkedSM]);

  const handleLinkSM = useCallback(async () => {
    try {
      const values = await linkSmForm.validateFields();
      if (!linkSmAbility) return;

      // Check if already linked
      const records = getLinkedSM();
      const alreadyLinked = records.some(r => r.bt === linkSmAbility.bt && r.ability === linkSmAbility.ability && r.smName === values.smName);
      if (alreadyLinked) {
        message.info('StateMachine is already linked');
        return;
      }

      records.push({
        bt: linkSmAbility.bt,
        ability: linkSmAbility.ability,
        smName: values.smName,
        operator: 'admin',
        operationTime: new Date().toLocaleString(),
      });
      saveLinkedSM(records);

      linkSmForm.resetFields();
      message.success('StateMachine linked successfully');
    } catch {}
  }, [linkSmForm, linkSmAbility, getLinkedSM, saveLinkedSM]);

  const openLinkSmModal = useCallback((bt: string, ability: string) => {
    setLinkSmAbility({ bt, ability });
    linkSmForm.resetFields();
    // Load existing linked state machines for this BT+Ability
    const existing = getLinkedSM().filter(r => r.bt === bt && r.ability === ability);
    setLinkSmList(existing);
    setLinkSmModalOpen(true);
  }, [linkSmForm, getLinkedSM]);

  const openPreviewSmListModal = useCallback((bt: string, ability: string) => {
    const records = getLinkedSM().filter(r => r.bt === bt && r.ability === ability);
    setLinkSmList(records);
    setPreviewSmListOpen(true);
  }, [getLinkedSM]);

  const SM_LIST_KEY = 'stateMachineList';
  const STORAGE_KEY = 'stateMachineStatuses';

  interface StateMachineItem {
    id: string;
    name: string;
    description?: string;
    status?: 'DRAFT' | 'SUBMITTED';
  }

  const getStateMachineList = useCallback((): StateMachineItem[] => {
    try {
      const stored = localStorage.getItem(SM_LIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const getStoredStatuses = useCallback((): Record<string, 'DRAFT' | 'SUBMITTED'> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  const getLinkedSMListForAbility = useCallback((bt: string, ability: string): string[] => {
    const records = getLinkedSM();
    return records.filter(r => r.bt === bt && r.ability === ability).map(r => r.smName);
  }, [getLinkedSM]);

  const getSubmittedStateMachines = useCallback((bt: string, ability: string, excludeList: string[] = []) => {
    const list = getStateMachineList();
    const statuses = getStoredStatuses();
    const linked = getLinkedSMListForAbility(bt, ability);
    // Exclude already linked and explicitly excluded state machines
    return list
      .filter(sm => statuses[sm.name] === 'SUBMITTED' && !linked.includes(sm.name) && !excludeList.includes(sm.name))
      .map(sm => ({ label: sm.name, value: sm.name }));
  }, [getStateMachineList, getStoredStatuses, getLinkedSMListForAbility]);

  const isStateMachineReferenced = useCallback((smName: string): boolean => {
    // Placeholder: In real implementation, this would check Channel Integration references
    return false;
  }, []);

  const handleUnlinkSM = useCallback((bt: string, ability: string, smName: string) => {
    if (isStateMachineReferenced(smName)) {
      message.error('Cannot unlink: StateMachine is referenced in Channel Integration');
      return;
    }
    const records = getLinkedSM();
    const filtered = records.filter(r => !(r.bt === bt && r.ability === ability && r.smName === smName));
    saveLinkedSM(filtered);
    message.success('StateMachine unlinked');
  }, [getLinkedSM, saveLinkedSM, isStateMachineReferenced]);

  const filteredData = filteredBt
    ? data.filter(bt => bt.name === filteredBt)
    : data;

  const toggleBusinessType = useCallback((btKey: string) => {
    setData(prev => prev.map(bt =>
      bt.key === btKey ? { ...bt, isExpand: !bt.isExpand } : bt
    ));
  }, []);

  const toggleAbility = useCallback((btKey: string, abKey: string) => {
    setData(prev => prev.map(bt =>
      bt.key === btKey
        ? {
            ...bt,
            abilities: bt.abilities.map(ab =>
              ab.key === abKey ? { ...ab, isExpand: !ab.isExpand } : ab
            ),
          }
        : bt
    ));
  }, []);

  const openAddAbility = useCallback((btName: string) => {
    setAddAbilityBt(btName);
    addAbilityForm.resetFields();
    setAddAbilityOpen(true);
  }, [addAbilityForm]);

  const handleAddAbility = async () => {
    try {
      const values = await addAbilityForm.validateFields();
      const bt = data.find(b => b.name === addAbilityBt);
      if (!bt) return;

      const newAbility: AbilityItem = {
        key: `ab_${Date.now()}`,
        name: values.abilityName,
        operateTime: '—',
        operator: '—',
        isExpand: false,
        actions: [],
      };

      setData(prev => prev.map(b =>
        b.key === bt.key ? { ...b, abilities: [...b.abilities, newAbility] } : b
      ));
      setAddAbilityOpen(false);
      message.success(`已添加 Ability: ${values.abilityName}`);
    } catch {}
  };

  const addAction = useCallback((btKey: string, abKey: string) => {
    setData(prev => prev.map(bt =>
      bt.key === btKey
        ? {
            ...bt,
            abilities: bt.abilities.map(ab => {
              if (ab.key !== abKey) return ab;
              const newAction: ActionItem = {
                key: `act_${Date.now()}`,
                name: generateActionName(ab.actions),
                operateTime: '—',
                operator: '—',
              };
              return { ...ab, actions: [...ab.actions, newAction] };
            }),
          }
        : bt
    ));
  }, []);

  const startEditAction = useCallback((act: ActionItem) => {
    setEditingActionKey(act.key);
    setEditingActionName(act.name);
  }, []);

  const saveEditAction = useCallback((btKey: string, abKey: string) => {
    if (!editingActionKey || !editingActionName.trim()) return;
    setData(prev => prev.map(bt =>
      bt.key === btKey
        ? {
            ...bt,
            abilities: bt.abilities.map(ab =>
              ab.key !== abKey ? ab : {
                ...ab,
                actions: ab.actions.map(act =>
                  act.key === editingActionKey ? { ...act, name: editingActionName.trim() } : act
                ),
              }
            ),
          }
        : bt
    ));
    setEditingActionKey(null);
    setEditingActionName('');
  }, [editingActionKey, editingActionName]);

  const cancelEditAction = useCallback(() => {
    setEditingActionKey(null);
    setEditingActionName('');
  }, []);

  const columns: ColumnsType<ActionItem> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => {
        const isEditing = editingActionKey === record.key;
        return (
          <Space>
            <MinusCircleOutlined style={{ color: '#d9d9d9', marginRight: 8 }} />
            {isEditing ? (
              <Input
                value={editingActionName}
                onChange={e => setEditingActionName(e.target.value)}
                onPressEnter={() => {
                  const ability = data.flatMap(bt => bt.abilities).find(a => a.actions.some(act => act.key === editingActionKey));
                  const btItem = data.find(bt => bt.abilities.some(a => a.key === ability?.key));
                  if (btItem && ability) saveEditAction(btItem.key, ability.key);
                }}
                onBlur={() => {
                  const ability = data.flatMap(bt => bt.abilities).find(a => a.actions.some(act => act.key === editingActionKey));
                  const btItem = data.find(bt => bt.abilities.some(a => a.key === ability?.key));
                  if (btItem && ability) saveEditAction(btItem.key, ability.key);
                }}
                autoFocus
                style={{ width: 160 }}
                onKeyDown={e => {
                  if (e.key === 'Escape') cancelEditAction();
                }}
              />
            ) : (
              <span
                onDoubleClick={() => startEditAction(record)}
                style={{ cursor: 'text', padding: '2px 4px', borderRadius: 4 }}
              >
                {record.name}
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Operate Time',
      dataIndex: 'operateTime',
      key: 'operateTime',
      width: 200,
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 150,
    },
    {
      title: 'Operation',
      key: 'operation',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          style={{ color: '#ef4444', borderColor: '#ef4444', borderRadius: 6, padding: '4px 12px' }}
          onClick={() => {
            const ability = data.flatMap(bt => bt.abilities).find(a => a.actions.some(act => act.key === record.key));
            const bt = data.find(b => b.abilities.some(a => a.key === ability?.key));
            if (bt && ability) {
              navigate(`/basic-info/capability/spi?bt=${bt.name}&ability=${ability.name}&action=${record.name}`);
            }
          }}
        >
          SPI
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      <Breadcrumb
        style={{ margin: '16px 0' }}
        items={[
          { title: 'Basic Info' },
          { title: 'Capability' },
        ]}
      />

      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>Capability</Title>

        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="Business Type">
            <Select
              allowClear
              placeholder="Select Business Type"
              style={{ width: 240 }}
              options={BUSINESS_TYPE_OPTIONS}
              value={filteredBt || undefined}
              onChange={v => setFilteredBt(v || '')}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setFilteredBt('')}>Reset</Button>
              <Button type="primary" onClick={() => {}}>Query</Button>
            </Space>
          </Form.Item>
        </Form>

        {filteredData.map(bt => (
          <div key={bt.key} style={{ marginBottom: 16, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: bt.isExpand ? '#fff' : '#fafafa',
                cursor: 'pointer',
                borderBottom: bt.isExpand ? '1px solid #f0f0f0' : 'none',
              }}
              onClick={() => toggleBusinessType(bt.key)}
            >
              <Space>
                {bt.isExpand ? <CaretDownOutlined /> : <CaretRightOutlined />}
                <Text strong style={{ fontSize: 15 }}>{bt.name}</Text>
              </Space>
              <Button
                type="primary"
                ghost
                icon={<PlusOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  openAddAbility(bt.name);
                }}
                style={{ borderColor: '#ef4444', color: '#ef4444', borderRadius: 6 }}
              >
                Add Capability
              </Button>
            </div>

            {bt.isExpand && bt.abilities.map(ab => (
              <div key={ab.key} style={{ borderTop: '1px solid #f0f0f0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 16px',
                    background: '#fafafa',
                    cursor: ab.actions.length > 0 ? 'pointer' : 'default',
                  }}
                  onClick={() => ab.actions.length > 0 && toggleAbility(bt.key, ab.key)}
                >
                  {ab.actions.length > 0 ? (
                    ab.isExpand ? <CaretDownOutlined style={{ marginRight: 8 }} /> : <CaretRightOutlined style={{ marginRight: 8 }} />
                  ) : (
                    <span style={{ width: 20, marginRight: 8 }} />
                  )}
                  <Text style={{ flex: 1 }}>{ab.name}</Text>
                  <Text type="secondary" style={{ marginRight: 16, width: 200 }}>{ab.operateTime}</Text>
                  <Text type="secondary" style={{ marginRight: 16, width: 150 }}>{ab.operator}</Text>
                  <Space onClick={e => e.stopPropagation()}>
                    <Button
                      type="link"
                      style={{ color: '#ef4444', borderColor: '#ef4444', borderRadius: 6, padding: '4px 12px' }}
                      onClick={() => navigate(`/basic-info/capability/features?bt=${bt.name}&ability=${ab.name}`)}
                    >
                      Features
                    </Button>
                    <Button
                      type="link"
                      style={{ color: '#22c55e', borderColor: '#22c55e', borderRadius: 6, padding: '4px 12px' }}
                      onClick={() => openLinkSmModal(bt.name, ab.name)}
                    >
                      linkStateMachine
                    </Button>
                    {getLinkedSMForAbility(bt.name, ab.name) && (
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openPreviewSmListModal(bt.name, ab.name)}
                      />
                    )}
                  </Space>
                </div>

                {ab.isExpand && ab.actions.length > 0 && (
                  <div style={{ paddingLeft: 40, background: '#fff' }}>
                    <Table
                      dataSource={ab.actions}
                      columns={columns}
                      rowKey="key"
                      pagination={false}
                      size="small"
                    />
                  </div>
                )}

                {ab.isExpand && ab.actions.length === 0 && (
                  <div style={{ paddingLeft: 40, padding: '8px 16px', background: '#fff' }}>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => addAction(bt.key, ab.key)}
                      block
                    >
                      + Add Action
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {bt.isExpand && (
              <div style={{ padding: '8px 16px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary">
                  共 {bt.abilities.length} 个 Ability
                </Text>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        title="Add Capability"
        open={addAbilityOpen}
        onCancel={() => setAddAbilityOpen(false)}
        onOk={handleAddAbility}
        okText="OK"
        cancelText="Cancel"
      >
        <Form form={addAbilityForm} layout="vertical">
          <Form.Item label="Business Type">
            <Text strong>{addAbilityBt}</Text>
          </Form.Item>
          <Form.Item
            label="Ability Name"
            name="abilityName"
            rules={[{ required: true, message: 'Please enter Ability name' }]}
          >
            <Input placeholder="Enter Ability name" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Link StateMachine Modal */}
      <Modal
        title="Link StateMachine"
        open={linkSmModalOpen}
        onCancel={() => { setLinkSmModalOpen(false); linkSmForm.resetFields(); setLinkSmAbility(null); setLinkSmList([]); }}
        onOk={() => {
          if (!linkSmAbility) return;
          const records = getLinkedSM();
          // Remove existing links for this BT+Ability
          const filtered = records.filter(r => !(r.bt === linkSmAbility.bt && r.ability === linkSmAbility.ability));
          // Add all items from linkSmList
          linkSmList.forEach(record => {
            filtered.push({
              bt: record.bt,
              ability: record.ability,
              smName: record.smName,
              operator: record.operator,
              operationTime: record.operationTime,
            });
          });
          saveLinkedSM(filtered);
          setLinkSmModalOpen(false);
          linkSmForm.resetFields();
          setLinkSmAbility(null);
          setLinkSmList([]);
          message.success('StateMachine linked successfully');
        }}
        okText="Submit"
        cancelText="Cancel"
        width={600}
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Business Type: </Text>
            <Text>{linkSmAbility?.bt}</Text>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Ability: </Text>
            <Text>{linkSmAbility?.ability}</Text>
          </div>

          {/* Currently linked state machines */}
          {linkSmAbility && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Linked State Machines:</Text>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkSmList.length === 0 ? (
                  <Text type="secondary">No StateMachine linked</Text>
                ) : (
                  linkSmList.map((record, idx) => (
                    <div key={`${record.smName}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: record.isNew ? '#e6f7ff' : '#f5f5f5', borderRadius: 6 }}>
                      <Space>
                        <Tag color="blue">{record.smName}</Tag>
                        {record.isNew && <Tag color="green">New</Tag>}
                      </Space>
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            const queryParams = new URLSearchParams();
                            queryParams.set('sm', record.smName);
                            queryParams.set('mode', 'view');
                            window.location.href = `/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`;
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => {
                            setLinkSmList(linkSmList.filter((_, i) => i !== idx));
                          }}
                        >
                          Remove
                        </Button>
                      </Space>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Add new link */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Text strong>Add StateMachine:</Text>
            <Form form={linkSmForm} layout="inline" style={{ marginTop: 8 }}>
              <Form.Item
                name="smName"
                style={{ flex: 1 }}
              >
                <Select
                  mode="multiple"
                  placeholder="Select Submitted StateMachines"
                  options={getSubmittedStateMachines(linkSmAbility?.bt || '', linkSmAbility?.ability || '', linkSmList.map(r => r.smName))}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  maxTagCount={3}
                />
              </Form.Item>
              <Button type="primary" onClick={() => {
                const values = linkSmForm.getFieldsValue();
                if (values.smName && Array.isArray(values.smName)) {
                  const toAdd = values.smName.filter((sm: string) => !linkSmList.some(r => r.smName === sm));
                  if (toAdd.length > 0) {
                    const newRecords = toAdd.map(smName => ({
                      bt: linkSmAbility?.bt || '',
                      ability: linkSmAbility?.ability || '',
                      smName,
                      operator: 'admin',
                      operationTime: new Date().toLocaleString(),
                      isNew: true,
                    }));
                    setLinkSmList([...linkSmList, ...newRecords]);
                    message.success(`Added ${toAdd.length} StateMachine(s)`);
                  } else {
                    message.info('Selected StateMachine(s) already linked');
                  }
                  linkSmForm.resetFields();
                }
              }}>Add</Button>
            </Form>
         </div>
        </div>
      </Modal>

      {/* Preview StateMachine List Modal */}
      <Modal
        title="Linked StateMachines"
        open={previewSmListOpen}
        onCancel={() => { setPreviewSmListOpen(false); setLinkSmList([]); }}
        footer={[
          <Button key="close" onClick={() => { setPreviewSmListOpen(false); setLinkSmList([]); }}>
            Close
          </Button>,
        ]}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          {linkSmList.length === 0 ? (
            <Text type="secondary">No StateMachine linked</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {linkSmList.map((record, idx) => (
                <div key={`${record.smName}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                  <Tag color="blue">{record.smName}</Tag>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      const queryParams = new URLSearchParams();
                      queryParams.set('sm', record.smName);
                      queryParams.set('mode', 'view');
                      window.location.href = `/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`;
                    }}
                  >
                    Preview
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}