import { useState, useCallback, useEffect, useMemo } from 'react';
import { AutoComplete, Badge, Button, Input, Space, message, Breadcrumb, Select, Form, Modal, Typography, Tag, Switch, Empty, Tooltip } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusOutlined, CaretRightOutlined, CaretDownOutlined } from '@ant-design/icons';
import { useConfigIntegrationStore } from '../channel-integration/configIntegrationStore';
import { initialBusinessTypeRecords, useBusinessTypeStore } from './businessTypeReferenceData';
import { enableSubOrderMode, getEnabledSubOrderModes, getSubOrderModeKey } from './capability/subOrderModeStore';

const { Title, Text } = Typography;
const ACTION_OPTIONS = [
  'TRANSACTION',
  'VERIFY',
  'TRIGGER_VERIFY',
  'RE_QUERY',
  'QUERY',
  'INBOUND_TRANSACTION',
  'INBOUND_QUERY',
] as const;
const CAPABILITY_OPERATOR = '我爱北京天安门';

function operationTimeNow(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

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

interface AddActionTarget {
  btKey: string;
  btName: string;
  abilityKey: string;
  abilityName: string;
  existingActions: string[];
}

const CONFIGURED_BT_DATA: BusinessTypeItem[] = [
  {
    key: 'bt_viber',
    name: 'VIBER',
    isExpand: true,
    abilities: [
      {
        key: 'ab_viber_bulk_message', name: 'BULK_MESSAGE', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_viber_bulk_transaction', name: 'TRANSACTION', operateTime: '2026-08-21 02:53:05', operator: '顾丰荣 gufengrong' }],
      },
      {
        key: 'ab_viber_single_message', name: 'SINGLE_MESSAGE', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_viber_single_requery', name: 'RE_QUERY', operateTime: '2026-08-26 02:12:05', operator: '顾丰荣 gufengrong' },
          { key: 'act_viber_single_transaction', name: 'TRANSACTION', operateTime: '2026-08-21 02:52:45', operator: '顾丰荣 gufengrong' },
        ],
      },
    ],
  },
  {
    key: 'bt_insurance',
    name: 'INSURANCE',
    isExpand: true,
    abilities: [
      {
        key: 'ab_insurance_get_policy_info', name: 'GET_POLICY_INFO', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_insurance_get_policy_info_query', name: 'QUERY', operateTime: '2026-08-17 08:35:56', operator: '王斌 Bin' }],
      },
      {
        key: 'ab_insurance_get_policy_subject_kyc', name: 'GET_POLICY_SUBJECT_KYC', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_insurance_policy_kyc_inbound_query', name: 'INBOUND_QUERY', operateTime: '2026-08-26 15:48:12', operator: '叶子豪 Abe' }],
      },
      {
        key: 'ab_insurance_update_policy_status', name: 'UPDATE_POLICY_LIFECYCLE_STATUS', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_insurance_update_policy_status_inbound_query', name: 'INBOUND_QUERY', operateTime: '2026-08-26 15:44:00', operator: '叶子豪 Abe' }],
      },
    ],
  },
  {
    key: 'bt_giftcard',
    name: 'GIFTCARD',
    isExpand: true,
    abilities: [
      {
        key: 'ab_giftcard_get_products', name: 'GET_PRODUCTS', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_giftcard_get_products_query', name: 'QUERY', operateTime: '2026-07-15 10:37:54', operator: '潘一泓' }],
      },
      {
        key: 'ab_giftcard_products_update_notify', name: 'PRODUCTS_UPDATE_NOTIFY', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_giftcard_products_update_notify_inbound', name: 'INBOUND_TRANSACTION', operateTime: '2026-07-22 03:04:04', operator: '潘一泓' }],
      },
      {
        key: 'ab_giftcard_recharge', name: 'RECHARGE', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_giftcard_recharge_requery', name: 'RE_QUERY', operateTime: '2026-07-16 02:29:31', operator: '潘一泓' },
          { key: 'act_giftcard_recharge_transaction', name: 'TRANSACTION', operateTime: '2026-07-16 02:29:31', operator: '潘一泓' },
        ],
      },
    ],
  },
  {
    key: 'bt_stablecoin',
    name: 'STABLECOIN',
    isExpand: true,
    abilities: [
      {
        key: 'ab_stablecoin_query_payout_list', name: 'QUERY_PAYOUT_LIST', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_stablecoin_query_payout_list_query', name: 'QUERY', operateTime: '2026-05-21 03:05:15', operator: '潘一泓' }],
      },
      {
        key: 'ab_stablecoin_fund_allocation', name: 'FUND_ALLOCATION', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_stablecoin_fund_allocation_requery', name: 'RE_QUERY', operateTime: '2026-08-28 08:40:25', operator: '胡亮亮 Jack' },
          { key: 'act_stablecoin_fund_allocation_transaction', name: 'TRANSACTION', operateTime: '2026-08-28 08:40:25', operator: '胡亮亮 Jack' },
        ],
      },
      {
        key: 'ab_stablecoin_transfer', name: 'TRANSFER', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_stablecoin_transfer_requery', name: 'RE_QUERY', operateTime: '2026-05-21 02:51:43', operator: '潘一泓' },
          { key: 'act_stablecoin_transfer_transaction', name: 'TRANSACTION', operateTime: '2026-05-21 02:51:43', operator: '潘一泓' },
          { key: 'act_stablecoin_transfer_verify', name: 'VERIFY', operateTime: '2026-05-21 02:51:43', operator: '潘一泓' },
        ],
      },
      {
        key: 'ab_stablecoin_query_rate', name: 'STABLECOIN_QUERY_RATE', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_stablecoin_query_rate_query', name: 'QUERY', operateTime: '2026-08-25 05:59:20', operator: '胡亮亮 Jack' }],
      },
      {
        key: 'ab_stablecoin_query_fee', name: 'QUERY_FEE', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_stablecoin_query_fee_query', name: 'QUERY', operateTime: '2026-05-21 02:45:54', operator: '潘一泓' }],
      },
      {
        key: 'ab_stablecoin_pay_out', name: 'PAY_OUT', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_stablecoin_pay_out_requery', name: 'RE_QUERY', operateTime: '2026-08-25 05:50:40', operator: '胡亮亮 Jack' },
          { key: 'act_stablecoin_pay_out_transaction', name: 'TRANSACTION', operateTime: '2026-08-25 05:50:40', operator: '胡亮亮 Jack' },
        ],
      },
      {
        key: 'ab_stablecoin_off_ramp', name: 'OFF_RAMP', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_stablecoin_off_ramp_requery', name: 'RE_QUERY', operateTime: '2026-08-25 05:57:33', operator: '胡亮亮 Jack' },
          { key: 'act_stablecoin_off_ramp_transaction', name: 'TRANSACTION', operateTime: '2026-08-25 05:57:33', operator: '胡亮亮 Jack' },
        ],
      },
    ],
  },
  {
    key: 'bt_funds_in',
    name: 'FUNDS_IN',
    isExpand: true,
    abilities: [
      {
        key: 'ab_funds_in_payment', name: 'PAYMENT', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_funds_in_payment_inbound', name: 'INBOUND_TRANSACTION', operateTime: '2026-09-01 03:36:56', operator: '冯启航 Felix' },
          { key: 'act_funds_in_payment_requery', name: 'RE_QUERY', operateTime: '2026-05-14 03:55:25', operator: 'xiajichen' },
          { key: 'act_funds_in_payment_transaction', name: 'TRANSACTION', operateTime: '2026-05-14 03:55:25', operator: 'xiajichen' },
        ],
      },
      {
        key: 'ab_funds_in_stablecoin_notify', name: 'STABLECOIN_NOTIFY', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_funds_in_stablecoin_notify_inbound', name: 'INBOUND_TRANSACTION', operateTime: '2026-09-07 03:40:32', operator: '胡亮亮 Jack' }],
      },
      {
        key: 'ab_funds_in_biz_type_notify', name: 'BIZ_TYPE_NOTIFY', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_funds_in_biz_type_notify_inbound', name: 'INBOUND_TRANSACTION', operateTime: '2026-09-07 07:41:29', operator: '冯启航 Felix' }],
      },
    ],
  },
  {
    key: 'bt_product_management',
    name: 'PRODUCT_MANAGEMENT',
    isExpand: true,
    abilities: [
      { key: 'ab_product_update', name: 'UPDATE_PRODUCT', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_product_update_transaction', name: 'TRANSACTION', operateTime: '2026-05-09 02:40:55', operator: '顾丰荣 gufengrong' }] },
      { key: 'ab_product_open', name: 'OPEN_PRODUCT', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_product_open_transaction', name: 'TRANSACTION', operateTime: '2026-05-09 02:40:31', operator: '顾丰荣 gufengrong' }] },
      { key: 'ab_product_close', name: 'CLOSE_PRODUCT', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_product_close_transaction', name: 'TRANSACTION', operateTime: '2026-05-09 02:41:23', operator: '顾丰荣 gufengrong' }] },
    ],
  },
  {
    key: 'bt_ussd_dial',
    name: 'USSD_DIAL',
    isExpand: true,
    abilities: [
      { key: 'ab_ussd_start', name: 'START_SESSION', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_ussd_start_inbound_query', name: 'INBOUND_QUERY', operateTime: '2026-04-21 14:40:21', operator: '王斌 Bin' }] },
      { key: 'ab_ussd_query', name: 'QUERY', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_ussd_query', name: 'QUERY', operateTime: '2026-04-14 13:19:22', operator: '王斌 Bin' }] },
      { key: 'ab_ussd_continue', name: 'CONTINUE_SESSION', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_ussd_continue_inbound_query', name: 'INBOUND_QUERY', operateTime: '2026-04-21 14:40:34', operator: '王斌 Bin' }] },
      { key: 'ab_ussd_end', name: 'END_SESSION', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_ussd_end_inbound_query', name: 'INBOUND_QUERY', operateTime: '2026-04-21 14:40:51', operator: '王斌 Bin' }] },
    ],
  },
  {
    key: 'bt_dispute_in',
    name: 'DISPUTE_IN',
    isExpand: true,
    abilities: [
      { key: 'ab_dispute_notification', name: 'NOTIFICATION', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_dispute_notification_query', name: 'QUERY', operateTime: '2026-03-13 14:00:01', operator: '顾丰荣 gufengrong' }] },
      { key: 'ab_dispute_info_modify', name: 'INFO_MODIFY', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_dispute_info_modify_inbound', name: 'INBOUND_QUERY', operateTime: '2026-03-23 15:12:33', operator: '顾丰荣 gufengrong' }] },
      {
        key: 'ab_dispute_designate_refund', name: 'DESIGNATE_REFUND', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_dispute_designate_refund_requery', name: 'RE_QUERY', operateTime: '2026-03-13 15:21:04', operator: '顾丰荣 gufengrong' },
          { key: 'act_dispute_designate_refund_transaction', name: 'TRANSACTION', operateTime: '2026-03-13 15:20:39', operator: '顾丰荣 gufengrong' },
        ],
      },
      { key: 'ab_dispute_create', name: 'CREATE', operateTime: '—', operator: '—', isExpand: true, actions: [{ key: 'act_dispute_create_inbound', name: 'INBOUND_QUERY', operateTime: '2026-03-23 15:11:23', operator: '顾丰荣 gufengrong' }] },
    ],
  },
  {
    key: 'bt_wallet_account',
    name: 'WALLET_ACCOUNT',
    isExpand: true,
    abilities: [
      {
        key: 'ab_wallet_account_create_bind', name: 'CREATE_BIND', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_wallet_account_create_bind_requery', name: 'RE_QUERY', operateTime: '2026-01-23 09:55:04', operator: '顾丰荣 gufengrong' },
          { key: 'act_wallet_account_create_bind_transaction', name: 'TRANSACTION', operateTime: '2026-01-23 09:53:53', operator: '顾丰荣 gufengrong' },
        ],
      },
      {
        key: 'ab_wallet_account_auto_debit', name: 'AUTO_DEBIT', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_wallet_account_auto_debit_requery', name: 'RE_QUERY', operateTime: '2026-01-23 09:56:18', operator: '顾丰荣 gufengrong' },
          { key: 'act_wallet_account_auto_debit_transaction', name: 'TRANSACTION', operateTime: '2026-01-23 09:55:59', operator: '顾丰荣 gufengrong' },
        ],
      },
    ],
  },
  {
    key: 'bt_whatsapp',
    name: 'WHATSAPP',
    isExpand: true,
    abilities: [{
      key: 'ab_whatsapp_single_message', name: 'SINGLE_MESSAGE', operateTime: '—', operator: '—', isExpand: true,
      actions: [
        { key: 'act_whatsapp_single_requery', name: 'RE_QUERY', operateTime: '2026-02-02 11:13:26', operator: '王斌 Bin' },
        { key: 'act_whatsapp_single_transaction', name: 'TRANSACTION', operateTime: '2026-01-24 09:09:45', operator: '王斌 Bin' },
      ],
    }],
  },
  {
    key: 'bt1',
    name: 'BANK_CARD_DEBIT',
    isExpand: true,
    abilities: [
      {
        key: 'ab_bank_card_refund',
        name: 'REFUND',
        operateTime: '—',
        operator: '—',
        isExpand: true,
        actions: [
          { key: 'act_bank_card_refund_requery', name: 'RE_QUERY', operateTime: '2025-08-07 06:20:26', operator: 'Bailly' },
          { key: 'act_bank_card_refund_transaction', name: 'TRANSACTION', operateTime: '2025-08-07 06:20:15', operator: 'Bailly' },
        ],
      },
      {
        key: 'ab_bank_card_info_payment',
        name: 'INFO_PAYMENT',
        operateTime: '—',
        operator: '—',
        isExpand: true,
        actions: [
          { key: 'act_bank_card_info_payment_requery', name: 'RE_QUERY', operateTime: '2025-08-07 06:18:52', operator: 'Bailly' },
          { key: 'act_bank_card_info_payment_transaction', name: 'TRANSACTION', operateTime: '2025-08-07 06:18:14', operator: 'Bailly' },
          { key: 'act_bank_card_info_payment_verify', name: 'VERIFY', operateTime: '2025-08-07 06:18:35', operator: 'Bailly' },
        ],
      },
    ],
  },
  {
    key: 'bt_wallet_debit',
    name: 'WALLET_DEBIT',
    isExpand: true,
    abilities: [{
      key: 'ab_wallet_transfer', name: 'TRANSFER', operateTime: '2026-07-03 10:00:00', operator: 'admin', isExpand: true,
      actions: [
        { key: 'act_wallet_transaction', name: 'TRANSACTION', operateTime: '2026-07-03 10:00:00', operator: 'admin' },
        { key: 'act_wallet_verify', name: 'VERIFY', operateTime: '2026-07-03 10:00:00', operator: 'admin' },
      ],
    }],
  },
  {
    key: 'bt_sms', name: 'SMS', isExpand: true,
    abilities: [
      {
        key: 'ab_sms_single', name: 'SINGLE_MESSAGE', operateTime: '2026-07-03 09:52:37', operator: 'Bailly', isExpand: true,
        actions: [{ key: 'act_sms_single_transaction', name: 'TRANSACTION', operateTime: '2026-07-03 09:52:37', operator: 'Bailly' }],
      },
      {
        key: 'ab_sms_bulk', name: 'BULK_MESSAGE', operateTime: '2026-07-03 10:00:00', operator: 'admin', isExpand: true,
        actions: [{ key: 'act_sms_bulk_transaction', name: 'TRANSACTION', operateTime: '2026-07-03 10:00:00', operator: 'admin' }],
      },
    ],
  },
  {
    key: 'bt_kyc', name: 'KYC', isExpand: true,
    abilities: [{
      key: 'ab_kyc_fingerprint', name: 'FINGERPRINT_VERIFY', operateTime: '2026-07-03 10:00:00', operator: 'admin', isExpand: true,
      actions: [{ key: 'act_kyc_query', name: 'QUERY', operateTime: '2026-07-03 10:00:00', operator: 'admin' }],
    }],
  },
  {
    key: 'bt_fund_notification', name: 'FUND_NOTIFICATION', isExpand: true,
    abilities: [{
      key: 'ab_fund_customer_validation', name: 'CUSTOMER_VALIDATION', operateTime: '2026-07-03 10:00:00', operator: 'admin', isExpand: true,
      actions: [{ key: 'act_fund_inbound_query', name: 'INBOUND_QUERY', operateTime: '2026-07-03 10:00:00', operator: 'admin' }],
    }],
  },
];

const configuredByName = new Map(CONFIGURED_BT_DATA.map((item) => [item.name, item]));
const buildBusinessTypeItem = (name: string): BusinessTypeItem => {
  const configured = configuredByName.get(name);
  return configured ? { ...configured, abilities: configured.abilities.map((ability) => ({ ...ability, actions: [...ability.actions] })) } : {
    key: `bt_${name.toLowerCase()}`,
    name,
    isExpand: true,
    abilities: [],
  };
};

const INITIAL_DATA = initialBusinessTypeRecords.map(({ businessType }) => buildBusinessTypeItem(businessType));

export default function CapabilityPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const businessTypeRecords = useBusinessTypeStore((state) => state.records);
  const [data, setData] = useState<BusinessTypeItem[]>(INITIAL_DATA);
  const [addAbilityOpen, setAddAbilityOpen] = useState(false);
  const [addAbilityBt, setAddAbilityBt] = useState<string>('');
  const [addAbilityForm] = Form.useForm();
  const [addActionTarget, setAddActionTarget] = useState<AddActionTarget | null>(null);
  const [selectedActionNames, setSelectedActionNames] = useState<string[]>([]);
  const [editingActionKey, setEditingActionKey] = useState<string | null>(null);
  const [editingActionName, setEditingActionName] = useState('');
  const [linkSmModalOpen, setLinkSmModalOpen] = useState(false);
  const [linkSmAbility, setLinkSmAbility] = useState<{ bt: string; ability: string } | null>(null);
  const [linkSmForm] = Form.useForm();
  const [linkSmList, setLinkSmList] = useState<LinkedSMRecord[]>([]);
  const [enabledSubOrderModes, setEnabledSubOrderModes] = useState<Set<string>>(() => getEnabledSubOrderModes());
  const [subOrderModeTarget, setSubOrderModeTarget] = useState<{ businessType: string; ability: string } | null>(null);
  const [subOrderModeDraft, setSubOrderModeDraft] = useState(false);
  const selectedBusinessTypeName = searchParams.get('bt') || businessTypeRecords[0]?.businessType || '';
  const addAbilityOptions = useMemo(() => {
    const currentAbilityNames = new Set(
      data.find((businessType) => businessType.name === addAbilityBt)?.abilities.map((ability) => ability.name) || [],
    );
    return Array.from(new Set(data.flatMap((businessType) => businessType.abilities.map((ability) => ability.name))))
      .filter((abilityName) => !currentAbilityNames.has(abilityName))
      .sort((left, right) => left.localeCompare(right))
      .map((abilityName) => ({ label: abilityName, value: abilityName }));
  }, [addAbilityBt, data]);

  useEffect(() => {
    setData((current) => businessTypeRecords.map(({ businessType }) => current.find((item) => item.name === businessType) ?? buildBusinessTypeItem(businessType)));
  }, [businessTypeRecords]);

  useEffect(() => {
    if (!selectedBusinessTypeName || searchParams.get('bt')) return;
    const next = new URLSearchParams(searchParams);
    next.set('bt', selectedBusinessTypeName);
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedBusinessTypeName, setSearchParams]);

  // LocalStorage key for linked state machines
  const LINKED_SM_KEY = 'linkedStateMachines';

  interface LinkedSMRecord {
    bt: string;
    ability: string;
    smName: string;
    operator: string;
    operationTime: string;
    isNew?: boolean;
  }

  const DEFAULT_LINKED_STATE_MACHINES: LinkedSMRecord[] = [
    { bt: 'BANK_CARD_DEBIT', ability: 'REFUND', smName: 'Default_Refund_StateMachine', operator: 'admin', operationTime: '2026-05-19 10:00:00' },
    { bt: 'BANK_CARD_DEBIT', ability: 'INFO_PAYMENT', smName: 'BankCard_Debit_StateMachine', operator: 'admin', operationTime: '2026-05-21 09:15:00' },
    { bt: 'SMS', ability: 'SINGLE_MESSAGE', smName: 'SMS_Single_Message_StateMachine', operator: 'Bailly', operationTime: '2026-07-03 09:52:37' },
    { bt: 'SMS', ability: 'SINGLE_MESSAGE', smName: 'SMS_Single_Message_Detailed_StateMachine', operator: 'Bailly', operationTime: '2026-08-18 10:00:00' },
  ];

  const mergeBy = <T,>(records: T[], defaults: T[], keyOf: (record: T) => string): T[] => {
    const keys = new Set(records.map(keyOf));
    return [...records, ...defaults.filter((record) => !keys.has(keyOf(record)))];
  };

  const getLinkedSM = useCallback((): LinkedSMRecord[] => {
    try {
      const stored = localStorage.getItem(LINKED_SM_KEY);
      return mergeBy(stored ? JSON.parse(stored) : [], DEFAULT_LINKED_STATE_MACHINES, (item) => `${item.bt}:${item.ability}:${item.smName}`);
    } catch {
      return DEFAULT_LINKED_STATE_MACHINES;
    }
  }, []);

  const saveLinkedSM = useCallback((records: LinkedSMRecord[]) => {
    localStorage.setItem(LINKED_SM_KEY, JSON.stringify(records));
  }, []);

  const openSubOrderMode = (businessType: string, ability: string) => {
    const enabled = enabledSubOrderModes.has(getSubOrderModeKey(businessType, ability));
    setSubOrderModeTarget({ businessType, ability });
    setSubOrderModeDraft(enabled);
  };

  const closeSubOrderMode = () => {
    setSubOrderModeTarget(null);
    setSubOrderModeDraft(false);
  };

  const saveSubOrderMode = () => {
    if (!subOrderModeTarget) return;
    if (!subOrderModeDraft) {
      closeSubOrderMode();
      return;
    }
    setEnabledSubOrderModes(enableSubOrderMode(subOrderModeTarget.businessType, subOrderModeTarget.ability));
    closeSubOrderMode();
    message.success('Sub Order Mode enabled.');
  };

  const SM_LIST_KEY = 'stateMachineList';
  const STORAGE_KEY = 'stateMachineStatuses';

  interface StateMachineItem {
    id: string;
    name: string;
    description?: string;
    status?: 'DRAFT' | 'SUBMITTED';
  }

  const DEFAULT_STATE_MACHINES: StateMachineItem[] = [
    { id: 'sm1', name: 'Default_Refund_StateMachine', description: 'REFUND state machine', status: 'SUBMITTED' },
    { id: 'sm2', name: 'BankCard_Debit_StateMachine', description: 'Bank card debit state machine', status: 'SUBMITTED' },
    { id: 'sm_sms_single_message', name: 'SMS_Single_Message_StateMachine', description: 'Single SMS lifecycle', status: 'SUBMITTED' },
    { id: 'sm_sms_single_message_detailed', name: 'SMS_Single_Message_Detailed_StateMachine', description: 'Single SMS lifecycle with detailed failure states', status: 'SUBMITTED' },
  ];

  const DEFAULT_STATE_MACHINE_STATUSES: Record<string, 'DRAFT' | 'SUBMITTED'> = {
    Default_Refund_StateMachine: 'SUBMITTED',
    BankCard_Debit_StateMachine: 'SUBMITTED',
    SMS_Single_Message_StateMachine: 'SUBMITTED',
    SMS_Single_Message_Detailed_StateMachine: 'SUBMITTED',
  };

  const getStateMachineList = useCallback((): StateMachineItem[] => {
    try {
      const stored = localStorage.getItem(SM_LIST_KEY);
      return mergeBy(stored ? JSON.parse(stored) : [], DEFAULT_STATE_MACHINES, (item) => item.name);
    } catch {
      return DEFAULT_STATE_MACHINES;
    }
  }, []);

  const getStoredStatuses = useCallback((): Record<string, 'DRAFT' | 'SUBMITTED'> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return { ...DEFAULT_STATE_MACHINE_STATUSES, ...(stored ? JSON.parse(stored) : {}) };
    } catch {
      return DEFAULT_STATE_MACHINE_STATUSES;
    }
  }, []);

  const abilitiesByChannel = useConfigIntegrationStore((state) => state.abilitiesByChannel);

  const isReferencedByFlowGroup = useCallback((bt: string, ability: string, smName: string) => Object.values(abilitiesByChannel)
    .flat()
    .some((item) => item.bt === bt && item.ability === ability && item.stateMachine === smName && item.versions.length > 0), [abilitiesByChannel]);

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

  const selectedBusinessType = data.find((item) => item.name === selectedBusinessTypeName);

  const getFeatureCount = (businessType: string, ability: string) => {
    const demoCounts: Record<string, number> = {
      'BANK_CARD_DEBIT:REFUND': 5,
      'SMS:SINGLE_MESSAGE': 5,
      'STABLECOIN:TRANSFER': 5,
      'GIFTCARD:RECHARGE': 5,
    };
    return demoCounts[`${businessType}:${ability}`] || 0;
  };

  const openConfig = (businessType: string, ability: string, action: string) => {
    const query = new URLSearchParams({ bt: businessType, ability, action });
    navigate(`/basic-info/capability/spi?${query.toString()}`);
  };

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
      const abilityName = String(values.abilityName).trim();
      const actionNames = values.actions as string[];
      const operationTime = operationTimeNow();

      if (bt.abilities.some((ability) => ability.name.toLowerCase() === abilityName.toLowerCase())) {
        addAbilityForm.setFields([{ name: 'abilityName', errors: ['This Ability already exists under the current Business Type'] }]);
        return;
      }

      const newAbility: AbilityItem = {
        key: `ab_${Date.now()}`,
        name: abilityName,
        operateTime: operationTime,
        operator: CAPABILITY_OPERATOR,
        isExpand: true,
        actions: actionNames.map((actionName, index) => ({
          key: `act_${Date.now()}_${index}`,
          name: actionName,
          operateTime: operationTime,
          operator: CAPABILITY_OPERATOR,
        })),
      };

      setData(prev => prev.map(b =>
        b.key === bt.key ? { ...b, abilities: [...b.abilities, newAbility] } : b
      ));
      setAddAbilityOpen(false);
      message.success(`Ability ${abilityName} added.`);
    } catch {}
  };

  const openAddAction = useCallback((bt: BusinessTypeItem, ability: AbilityItem) => {
    const existingActions = ability.actions.map((action) => action.name);
    setAddActionTarget({
      btKey: bt.key,
      btName: bt.name,
      abilityKey: ability.key,
      abilityName: ability.name,
      existingActions,
    });
    setSelectedActionNames(existingActions);
  }, []);

  const closeAddAction = useCallback(() => {
    setAddActionTarget(null);
    setSelectedActionNames([]);
  }, []);

  const saveAddAction = useCallback(() => {
    if (!addActionTarget) return;
    const actionsToAdd = selectedActionNames.filter((name) => !addActionTarget.existingActions.includes(name));
    if (actionsToAdd.length === 0) {
      closeAddAction();
      return;
    }

    setData(prev => prev.map(bt =>
      bt.key === addActionTarget.btKey
        ? {
            ...bt,
            abilities: bt.abilities.map(ab => {
              if (ab.key !== addActionTarget.abilityKey) return ab;
              const operationTime = operationTimeNow();
              const newActions: ActionItem[] = actionsToAdd.map((name, index) => ({
                key: `act_${Date.now()}_${index}`,
                name,
                operateTime: operationTime,
                operator: CAPABILITY_OPERATOR,
              }));
              return { ...ab, actions: [...ab.actions, ...newActions] };
            }),
          }
        : bt
    ));
    message.success(`Added ${actionsToAdd.length} Action${actionsToAdd.length > 1 ? 's' : ''}.`);
    closeAddAction();
  }, [addActionTarget, closeAddAction, selectedActionNames]);

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
                  act.key === editingActionKey
                    ? { ...act, name: editingActionName.trim(), operateTime: operationTimeNow(), operator: CAPABILITY_OPERATOR }
                    : act
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

  return (
    <div className="capability-page">
      <section className="capability-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info/country' }, { title: 'Capability' }]} />
        <div className="capability-title-line">
          <Title level={4}>Capability</Title>
        </div>
      </section>

      <main className="capability-workspace">
        <section className="capability-master-panel">
          <div className="capability-workspace-actions">
            {selectedBusinessType && (
              <div className="capability-page-context">
                <Text>Business Type: <Text strong>{selectedBusinessType.name}</Text></Text>
              </div>
            )}
            {selectedBusinessType && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddAbility(selectedBusinessType.name)}>
                Add Capability
              </Button>
            )}
          </div>

          {selectedBusinessType ? (
            <section key={selectedBusinessType.key} className="capability-ability-list">
              {selectedBusinessType.abilities.map(ab => {
                const subOrderEnabled = enabledSubOrderModes.has(getSubOrderModeKey(selectedBusinessType.name, ab.name));
                const featureCount = getFeatureCount(selectedBusinessType.name, ab.name);
                const stateMachineCount = getLinkedSMListForAbility(selectedBusinessType.name, ab.name).length;
                return (
                  <article key={ab.key} className="capability-ability-card">
                    <header className="capability-ability-card-header">
                      <button
                        type="button"
                        className="capability-ability-toggle"
                        onClick={() => ab.actions.length > 0 && toggleAbility(selectedBusinessType.key, ab.key)}
                      >
                        {ab.actions.length > 0 && (ab.isExpand ? <CaretDownOutlined /> : <CaretRightOutlined />)}
                        <span>{ab.name}</span>
                      </button>
                      <div className="capability-ability-header-actions">
                        <div className="capability-settings-controls">
                          <Badge count={subOrderEnabled ? 'ON' : 'OFF'} className={`capability-control-badge ${subOrderEnabled ? 'active' : 'inactive'}`}>
                            <button type="button" className="capability-status-chip" onClick={() => openSubOrderMode(selectedBusinessType.name, ab.name)}>Sub-order</button>
                          </Badge>
                          <Badge count={featureCount} showZero className={`capability-control-badge ${featureCount ? 'active' : 'inactive'}`}>
                            <button type="button" className="capability-status-chip" onClick={() => navigate(`/basic-info/capability/features?bt=${selectedBusinessType.name}&ability=${ab.name}`)}>Features</button>
                          </Badge>
                          <Badge count={stateMachineCount} showZero className={`capability-control-badge ${stateMachineCount ? 'active' : 'inactive'}`}>
                            <button type="button" className="capability-status-chip" onClick={() => navigate(`/basic-info/capability/link-state-machine?bt=${selectedBusinessType.name}&ability=${ab.name}`)}>State Machines</button>
                          </Badge>
                        </div>
                        <span className="capability-header-action-divider" aria-hidden="true" />
                        <Button className="capability-add-action-button" size="small" icon={<PlusOutlined />} onClick={() => openAddAction(selectedBusinessType, ab)}>
                          Add Action
                        </Button>
                      </div>
                    </header>

                    {ab.isExpand && (
                      <>
                        {ab.actions.length > 0 && (
                          <div className="capability-action-list">
                            <div className="capability-action-list-header">
                              <span>Action</span><span>Operate Time</span><span>Operator</span><span>Operation</span>
                            </div>
                            {ab.actions.map(action => {
                              const isEditing = editingActionKey === action.key;
                              return (
                                <div className="capability-action-item" key={action.key}>
                                  <div className="capability-action-item-name">
                                    {isEditing ? (
                                      <Input
                                        value={editingActionName}
                                        onChange={event => setEditingActionName(event.target.value)}
                                        onPressEnter={() => saveEditAction(selectedBusinessType.key, ab.key)}
                                        onBlur={() => saveEditAction(selectedBusinessType.key, ab.key)}
                                        autoFocus
                                        onKeyDown={event => {
                                          if (event.key === 'Escape') cancelEditAction();
                                        }}
                                      />
                                    ) : (
                                      <Tooltip title="Double-click to rename">
                                        <button type="button" onDoubleClick={() => startEditAction(action)}>{action.name}</button>
                                      </Tooltip>
                                    )}
                                  </div>
                                  <Text type="secondary" className="capability-action-audit">{action.operateTime}</Text>
                                  <Text type="secondary" className="capability-action-audit">{action.operator}</Text>
                                  <div className="capability-action-operations">
                                    <Button type="link" onClick={() => openConfig(selectedBusinessType.name, ab.name, action.name)}>
                                      Config
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      </>
                    )}
                  </article>
                );
              })}
            </section>
          ) : (
            <Empty description="Select a Business Type from the sidebar" />
          )}
        </section>
      </main>

      <Modal
        title="Sub Order Mode Configuration"
        open={Boolean(subOrderModeTarget)}
        onCancel={closeSubOrderMode}
        onOk={saveSubOrderMode}
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{
          disabled: !subOrderModeTarget
            || enabledSubOrderModes.has(getSubOrderModeKey(subOrderModeTarget.businessType, subOrderModeTarget.ability)),
        }}
        width={640}
        className="sub-order-mode-modal"
      >
        <div className="sub-order-mode-context">
          <span>Business Type</span><strong>{subOrderModeTarget?.businessType}</strong>
          <span>Ability</span><strong>{subOrderModeTarget?.ability}</strong>
        </div>
        <div className="sub-order-mode-switch-row">
          <span>Sub Order Mode</span>
          <Switch
            checked={subOrderModeDraft}
            checkedChildren="ON"
            unCheckedChildren="OFF"
            disabled={Boolean(subOrderModeTarget && enabledSubOrderModes.has(getSubOrderModeKey(subOrderModeTarget.businessType, subOrderModeTarget.ability)))}
            onChange={setSubOrderModeDraft}
          />
        </div>
        <p className="sub-order-mode-note">
          Note: This setting affects sub-order mode support for all Flows under this Business Type+Ability. Once enabled, the SPI config page will display subOrderList related fields, and the Flow&apos;s Network / callbackRequest will also show sub-order response code mapping configuration.
        </p>
      </Modal>

      <Modal
        title="Add Ability"
        open={addAbilityOpen}
        onCancel={() => { setAddAbilityOpen(false); addAbilityForm.resetFields(); }}
        onOk={handleAddAbility}
        okText="OK"
        cancelText="Cancel"
        width={700}
        className="capability-add-ability-modal"
        destroyOnHidden
        forceRender
      >
        <Form form={addAbilityForm} labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} colon>
          <Form.Item label="Business Type" required>
            <Text>{addAbilityBt}</Text>
          </Form.Item>
          <Form.Item
            label="Ability"
            name="abilityName"
            rules={[
              { required: true, whitespace: true, message: 'Please select or enter an Ability' },
              { pattern: /^[A-Za-z0-9_]+$/, message: 'Use letters, numbers, and underscores only' },
            ]}
          >
            <AutoComplete
              options={addAbilityOptions}
              placeholder="Please select or enter new option"
              filterOption={(inputValue, option) => String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())}
            />
          </Form.Item>
          <Form.Item
            label="Action"
            name="actions"
            rules={[{ required: true, type: 'array', min: 1, message: 'Please select at least one Action' }]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Please select at least one Action"
              options={ACTION_OPTIONS.map((action) => ({ label: action, value: action }))}
              maxTagCount="responsive"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Action"
        open={Boolean(addActionTarget)}
        onCancel={closeAddAction}
        onOk={saveAddAction}
        okText="OK"
        cancelText="Cancel"
        okButtonProps={{
          disabled: !addActionTarget
            || selectedActionNames.every((name) => addActionTarget.existingActions.includes(name)),
        }}
        width={720}
      >
        <Form
          className="capability-add-action-form"
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 15 }}
          colon
        >
          <Form.Item label="Business Type" required>
            <Text>{addActionTarget?.btName}</Text>
          </Form.Item>
          <Form.Item label="Ability" required>
            <Text>{addActionTarget?.abilityName}</Text>
          </Form.Item>
          <Form.Item label="Action" required>
            <Select
              mode="multiple"
              value={selectedActionNames}
              placeholder="Select Action"
              options={ACTION_OPTIONS.map((action) => ({
                label: action,
                value: action,
                disabled: addActionTarget?.existingActions.includes(action),
              }))}
              onChange={(values) => {
                const existingActions = addActionTarget?.existingActions || [];
                setSelectedActionNames([...existingActions, ...values.filter((value) => !existingActions.includes(value))]);
              }}
              tagRender={({ label, value, closable, onClose }) => {
                const isExisting = addActionTarget?.existingActions.includes(String(value));
                return (
                  <Tag
                    closable={!isExisting && closable}
                    onClose={onClose}
                    style={{ marginInlineEnd: 4 }}
                  >
                    {label}
                  </Tag>
                );
              }}
            />
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
                            queryParams.set('bt', record.bt);
                            queryParams.set('ability', record.ability);
                            navigate(`/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`);
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          danger
                          disabled={isReferencedByFlowGroup(record.bt, record.ability, record.smName)}
                          onClick={() => {
                            if (isReferencedByFlowGroup(record.bt, record.ability, record.smName)) {
                              message.error('Cannot Remove: StateMachine is referenced by Flow Group');
                              return;
                            }
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
                    const newRecords = toAdd.map((smName: string) => ({
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
    </div>
  );
}
