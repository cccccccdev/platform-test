import { create } from 'zustand';
import { initialBusinessTypeRecords } from './businessTypeReferenceData';

export interface ActionItem {
  key: string;
  name: string;
  operateTime: string;
  operator: string;
}

export interface AbilityItem {
  key: string;
  name: string;
  operateTime: string;
  operator: string;
  isExpand: boolean;
  actions: ActionItem[];
  isEditing?: boolean;
}

export interface BusinessTypeItem {
  key: string;
  name: string;
  isExpand: boolean;
  abilities: AbilityItem[];
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
      {
        key: 'ab_stablecoin_query_account_balance', name: 'QUERY_ACCOUNT_BALANCE', operateTime: '—', operator: '—', isExpand: true,
        actions: [{ key: 'act_stablecoin_query_account_balance_query', name: 'QUERY', operateTime: '—', operator: '—' }],
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
      {
        key: 'ab_bank_card_token_payment',
        name: 'TOKEN_PAYMENT',
        operateTime: '—',
        operator: '—',
        isExpand: true,
        actions: [
          { key: 'act_bank_card_token_payment_requery', name: 'RE_QUERY', operateTime: '2025-08-07 06:19:36', operator: 'Bailly' },
          { key: 'act_bank_card_token_payment_transaction', name: 'TRANSACTION', operateTime: '2025-08-07 06:19:17', operator: 'Bailly' },
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
        key: 'ab_sms_single', name: 'SINGLE_MESSAGE', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_sms_single_requery', name: 'RE_QUERY', operateTime: '2025-12-12 09:15:40', operator: 'xiajichen' },
          { key: 'act_sms_single_transaction', name: 'TRANSACTION', operateTime: '2025-12-12 09:15:40', operator: 'xiajichen' },
        ],
      },
      {
        key: 'ab_sms_bulk', name: 'BULK_MESSAGE', operateTime: '—', operator: '—', isExpand: true,
        actions: [
          { key: 'act_sms_bulk_requery', name: 'RE_QUERY', operateTime: '2026-01-07 03:40:55', operator: 'xiajichen' },
          { key: 'act_sms_bulk_transaction', name: 'TRANSACTION', operateTime: '2026-01-07 03:40:52', operator: 'xiajichen' },
        ],
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

interface CapabilityDataState {
  data: BusinessTypeItem[];
  setData: (update: BusinessTypeItem[] | ((current: BusinessTypeItem[]) => BusinessTypeItem[])) => void;
  syncBusinessTypes: (names: string[]) => void;
  removeBusinessType: (name: string) => void;
}

export const useCapabilityDataStore = create<CapabilityDataState>((set) => ({
  data: INITIAL_DATA,
  setData: (update) => set((state) => ({ data: typeof update === 'function' ? update(state.data) : update })),
  syncBusinessTypes: (names) => set((state) => ({
    data: names.map((name) => state.data.find((item) => item.name === name) ?? buildBusinessTypeItem(name)),
  })),
  removeBusinessType: (name) => set((state) => ({ data: state.data.filter((item) => item.name !== name) })),
}));
