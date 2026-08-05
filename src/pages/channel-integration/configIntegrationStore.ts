import { create } from 'zustand';
import type { CloudType, ConfigAbility, EnvType, FlowConfig, FlowGroupVersion, GroupStatus, DeployRecord, SubmittedFlowContent } from './types';
import { capabilityActionOptions } from '../../mock/data';
import { buildTemplateCanvas } from './flowTemplates';

const now = () => {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'));
  return `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}:${parts[4]}:${parts[5]}`;
};
const timestampVersion = () => {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('');
};

const nextGroupId = (abilitiesByChannel: Record<string, ConfigAbility[]>) =>
  Object.values(abilitiesByChannel).reduce(
    (maxGroupId, abilities) => abilities.reduce(
      (channelMax, ability) => ability.versions.reduce(
        (abilityMax, version) => Math.max(abilityMax, version.groupId),
        channelMax
      ),
      maxGroupId
    ),
    122
  ) + 1;

const commonCanvasNodes = [
  { id: 'out_1', componentCode: 'initOutboundOrder', x: 320, y: 40, status: 'complete' as const },
  { id: 'out_2', componentCode: 'loadCredential', x: 320, y: 150, status: 'complete' as const },
  { id: 'out_3', componentCode: 'loadGlobalVariable', x: 320, y: 260, status: 'complete' as const },
  { id: 'out_5', componentCode: 'httpCall', x: 320, y: 370, status: 'complete' as const },
  { id: 'out_6', componentCode: 'updateOutboundOrder', x: 320, y: 480, status: 'complete' as const },
  { id: 'out_7', componentCode: 'sendCompleteMQ', x: 320, y: 590, status: 'complete' as const },
];

const commonCanvasEdges = [
  { id: 'out_e1', source: 'out_1', target: 'out_2' },
  { id: 'out_e2', source: 'out_2', target: 'out_3' },
  { id: 'out_e3', source: 'out_3', target: 'out_5' },
  { id: 'out_e5', source: 'out_5', target: 'out_6' },
  { id: 'out_e6', source: 'out_6', target: 'out_7' },
];

const callbackCanvasNodes = [
  { id: 'in_1', componentCode: 'inboundRequest', x: 320, y: 80, status: 'complete' as const },
  { id: 'in_2', componentCode: 'initInboundOrder', x: 320, y: 200, status: 'complete' as const },
  { id: 'in_3', componentCode: 'requestBusinessAccessLayer', x: 320, y: 320, status: 'complete' as const },
  { id: 'in_4', componentCode: 'inboundResponse', x: 320, y: 440, status: 'complete' as const },
];

const callbackCanvasEdges = [
  { id: 'in_e1', source: 'in_1', target: 'in_2' },
  { id: 'in_e2', source: 'in_2', target: 'in_3' },
  { id: 'in_e3', source: 'in_3', target: 'in_4' },
];

const evexinSendHttpCallConfig = {
  method: 'POST',
  protocol: 'HTTP',
  path: '/api/msg/v2/sendMsg',
  requestMappingMode: 'configuration',
  responseMappingMode: 'configuration',
  requestFormat: 'JSON',
  responseFormat: 'JSON',
  bodyFieldMode: 'all',
  responseFallback: 'PENDING',
  responseCodeMode: 'default',
  responseCodeAssembly: ['httpStatus', 'responseBody.code', 'responseBody.data.status'],
  responseMessageField: 'msg',
  timeout: 5000,
  requestHeaders: [
    { id: 'evexin_header_app_key', sourceValue: ['Credentials', 'credential.appKey'], name: 'appKey', type: 'String', required: true, description: '' },
    { id: 'evexin_header_app_secret', sourceValue: ['Credentials', 'credential.appSecret'], name: 'appSecret', type: 'String', required: true, description: '' },
  ],
  requestBody: [
    { id: 'evexin_body_content', name: 'content', type: 'String', required: true, sourceId: ['SPI Request', 'spi.request.content'], description: 'SMS content' },
    { id: 'evexin_body_to', name: 'to', type: 'String', required: true, sourceId: ['SPI Request', 'spi.request.mobileNumber'], operation: ['phone-number', 'remove-front-zero'], description: 'Recipient mobile number' },
    { id: 'evexin_body_sender_code', name: 'senderCode', type: 'String', required: true, sourceId: ['Credentials', 'credential.senderCode'], description: 'Sender code' },
    { id: 'evexin_body_short_link', name: 'shortLinkReplaceFlag', type: 'String', required: true, sourceId: ['Credentials', 'credential.shortLinkReplaceFlag'], description: 'Short-link replacement flag' },
  ],
  responseBody: [
    { id: 'evexin_res_code', name: 'code', type: 'String', required: true, targetValue: 'spi.response.channelResponseCode', description: 'Channel response code' },
    { id: 'evexin_res_msg', name: 'msg', type: 'String', required: true, targetValue: 'spi.response.responseMessage', description: 'Channel response message' },
    {
      id: 'evexin_res_data',
      name: 'data',
      type: 'Object',
      required: true,
      children: [
        { id: 'evexin_res_data_msg_id', name: 'msgId', type: 'String', required: true, targetValue: 'spi.response.responseReference', description: 'Message id for callback matching' },
        { id: 'evexin_res_data_to', name: 'to', type: 'String', required: true, description: 'Recipient mobile number' },
        { id: 'evexin_res_data_status', name: 'status', type: 'String', required: true, description: 'PENDING or FAILED' },
      ],
    },
  ],
};

const evexinSendCanvasNodes = [
  { id: 'evexin_out_1', componentCode: 'initOutboundOrder', x: 320, y: 40, status: 'complete' as const },
  { id: 'evexin_out_3', componentCode: 'httpCall', x: 320, y: 150, status: 'complete' as const, config: evexinSendHttpCallConfig },
  { id: 'evexin_out_4', componentCode: 'updateOutboundOrder', x: 320, y: 260, status: 'complete' as const, config: { targetSubState: 'SUBMITTED', failureSubState: 'FAILED' } },
  { id: 'evexin_out_5', componentCode: 'sendCompleteMQ', x: 320, y: 370, status: 'complete' as const },
];

const evexinSendCanvasEdges = [
  { id: 'evexin_out_e1', source: 'evexin_out_1', target: 'evexin_out_3' },
  { id: 'evexin_out_e3', source: 'evexin_out_3', target: 'evexin_out_4' },
  { id: 'evexin_out_e4', source: 'evexin_out_4', target: 'evexin_out_5' },
];

const evexinCallbackCanvasNodes = [
  {
    id: 'evexin_in_1',
    componentCode: 'inboundRequest',
    x: 320,
    y: 80,
    status: 'complete' as const,
    config: {
      requestMappingMode: 'configuration',
      codeMappingEnabled: true,
      componentInstance: 'PENDING',
      codeMappingMode: 'default',
      responseCodeAssembly: ['Request Body'],
      responseMessageField: '',
      requestBody: [
        { id: 'evexin_cb_msg_id', name: 'msgId', type: 'String', required: true, targetValue: 'spi.request.responseReference', description: 'Callback message id' },
        { id: 'evexin_cb_status', name: 'status', type: 'String', required: true, description: 'Callback delivery status' },
        { id: 'evexin_cb_to', name: 'to', type: 'String', required: true, description: 'Recipient mobile number' },
      ],
    },
  },
  { id: 'evexin_in_2', componentCode: 'updateOutboundOrder', x: 320, y: 200, status: 'complete' as const, config: { targetSubStates: ['SUBMITTED', 'DELIVERED', 'FAILED'] } },
  { id: 'evexin_in_3', componentCode: 'sendCompleteMQ', x: 320, y: 320, status: 'complete' as const },
  { id: 'evexin_in_4', componentCode: 'inboundResponse', x: 320, y: 440, status: 'complete' as const, config: { responseMappingMode: 'configuration', responseFormat: 'JSON', responseHeaders: [], responseBody: [] } },
];

const evexinCallbackCanvasEdges = [
  { id: 'evexin_in_e1', source: 'evexin_in_1', target: 'evexin_in_2' },
  { id: 'evexin_in_e2', source: 'evexin_in_2', target: 'evexin_in_3' },
  { id: 'evexin_in_e3', source: 'evexin_in_3', target: 'evexin_in_4' },
];

const seedDeployRecords: DeployRecord[] = [
  { cloud: 'BD', app: 'omnicore', env: 'DAILY', version: '20260601103000', operator: 'Amina Yusuf', operationTime: '2026-06-01 11:00:00' },
  { cloud: 'BD', app: 'omnicore', env: 'PRE', version: '20260601103000', operator: 'Daniel Chen', operationTime: '2026-06-02 09:00:00' },
  { cloud: 'BD', app: 'omnicore', env: 'PROD', version: '20260601103000', operator: 'admin', operationTime: '2026-06-03 14:00:00' },
  { cloud: 'ALIYUN', app: 'omnicore', env: 'DAILY', version: '20260601103000', operator: 'Amina Yusuf', operationTime: '2026-06-01 11:30:00' },
  { cloud: 'ALIYUN', app: 'omnicore', env: 'PRE', version: '20260601103000', operator: 'Daniel Chen', operationTime: '2026-06-02 10:00:00' },
  { cloud: 'ALIYUN', app: 'omnicore', env: 'PROD', version: '20260601103000', operator: 'admin', operationTime: '2026-06-03 15:00:00' },
];

const seedAbilities: Record<string, ConfigAbility[]> = {
  EVEXIN: [
    {
      bt: 'SMS',
      ability: 'SINGLE_MESSAGE',
      actions: ['TRANSACTION'],
      stateMachine: 'SMS_Single_Message_StateMachine',
      versions: [
        {
          id: 'evexin_sms_single_message_daily',
          groupId: 526,
          version: '20260629115053',
          status: 'DAILY',
          badges: [{ cloud: 'ALIYUN', env: 'DAILY' }],
          remark: 'EVEXIN single SMS daily configuration',
          operator: 'Bailly',
          operationTime: '2026-06-29 11:50:53',
          deployRecords: [
            { cloud: 'ALIYUN', app: 'omnicore', env: 'DAILY', version: '20260629115053', operator: 'Bailly', operationTime: '2026-06-29 12:00:00' },
            { cloud: 'ALIYUN', app: 'omnicore', env: 'DAILY', version: '20260620103000', operator: 'Amina Yusuf', operationTime: '2026-06-20 10:45:00' },
            { cloud: 'ALIYUN', app: 'omnicore', env: 'PRE', version: '20260620103000', operator: 'Daniel Chen', operationTime: '2026-06-21 09:30:00' },
            { cloud: 'PK', app: 'omnicore', env: 'DAILY', version: '20260620103000', operator: 'Sana Khan', operationTime: '2026-06-20 14:15:00' },
          ],
          flows: [
            {
              id: '25',
              name: 'SMS_SINGLE_MESSAGE_TRANSACTION',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              template: 'TRANSACTION',
              triggerEvents: ['TRANSACTION'],
              contextActions: [],
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: evexinSendCanvasNodes,
              canvasEdges: evexinSendCanvasEdges,
            },
            {
              id: '26',
              name: 'SMS_SINGLE_MESSAGE_CALLBACK',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              template: 'CALLBACK',
              triggerEvents: ['TRANSACTION'],
              contextActions: ['TRANSACTION'],
              inboundUriId: 'evexin_sms_status_callback',
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: evexinCallbackCanvasNodes,
              canvasEdges: evexinCallbackCanvasEdges,
            },
          ],
        },
        {
          id: 'evexin_sms_single_message_undeployed',
          groupId: 527,
          version: '20260703095237',
          status: 'UNDEPLOYED',
          badges: [],
          remark: 'EVEXIN single SMS callback configuration draft',
          operator: 'Bailly',
          operationTime: '2026-07-03 09:52:37',
          deployRecords: [],
          flows: [
            {
              id: '25',
              name: 'SMS_SINGLE_MESSAGE_TRANSACTION_DRAFT',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              template: 'TRANSACTION',
              triggerEvents: ['TRANSACTION'],
              contextActions: [],
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: evexinSendCanvasNodes,
              canvasEdges: evexinSendCanvasEdges,
            },
            {
              id: '26',
              name: 'SMS_SINGLE_MESSAGE_CALLBACK_DRAFT',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              template: 'CALLBACK',
              triggerEvents: ['TRANSACTION'],
              contextActions: ['TRANSACTION'],
              inboundUriId: 'evexin_sms_status_callback',
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: evexinCallbackCanvasNodes,
              canvasEdges: evexinCallbackCanvasEdges,
            },
          ],
        },
      ],
    },
  ],
  MTN_UG: [
    {
      bt: 'WALLET_DEBIT',
      ability: 'TRANSFER',
      actions: ['TRANSACTION', 'VERIFY', 'QUERY'],
      stateMachine: 'Wallet_Debit_StateMachine',
      versions: [
        {
          id: 'mtn_wallet_debit_transfer_prod',
          groupId: 532,
          version: '20260706170000',
          status: 'PROD',
          badges: [{ cloud: 'ALIYUN', env: 'PROD' }],
          remark: 'MTN Uganda wallet debit production group',
          operator: 'admin',
          operationTime: '2026-07-06 17:00:00',
          deployRecords: [
            { cloud: 'ALIYUN', app: 'omnicore', env: 'PROD', version: '20260706170000', operator: 'admin', operationTime: '2026-07-06 17:05:00' },
          ],
          flows: [
            {
              id: 'mtn_flow_wallet_transaction',
              name: 'WALLET_DEBIT_TRANSACTION',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              template: 'TRANSACTION',
              triggerEvents: ['TRANSACTION'],
              contextActions: [],
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: commonCanvasNodes,
              canvasEdges: commonCanvasEdges,
            },
            {
              id: 'mtn_flow_wallet_verify',
              name: 'WALLET_DEBIT_VERIFY',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              template: 'VERIFY',
              triggerEvents: ['VERIFY'],
              contextActions: [],
              isConfigured: true,
              status: 'SUBMITTED',
              ...buildTemplateCanvas('VERIFY'),
            },
            {
              id: 'mtn_flow_wallet_requery',
              name: 'WALLET_DEBIT_REQUERY',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'REQUERY_TRIGGERED',
              template: 'REQUERY',
              triggerEvents: [],
              contextActions: ['TRANSACTION'],
              stateConditions: [{ id: 'mtn-requery-wait-callback', field: 'subState', operator: '==', value: 'PAYMENT_PENDING_WAIT_CALLBACK' }],
              isConfigured: true,
              status: 'SUBMITTED',
              ...buildTemplateCanvas('REQUERY'),
            },
          ],
        },
      ],
    },
    {
      bt: 'FUND_NOTIFICATION',
      ability: 'PAYMENT_NOTIFY',
      actions: ['TRANSACTION', 'QUERY'],
      stateMachine: 'Fund_Notification_StateMachine',
      versions: [
        {
          id: 'mtn_fund_notification_payment_prod',
          groupId: 575,
          version: '20260706172000',
          status: 'PROD',
          badges: [{ cloud: 'ALIYUN', env: 'PROD' }],
          remark: 'MTN Uganda inbound notification group',
          operator: 'admin',
          operationTime: '2026-07-06 17:20:00',
          deployRecords: [
            { cloud: 'ALIYUN', app: 'omnicore', env: 'PROD', version: '20260706172000', operator: 'admin', operationTime: '2026-07-06 17:25:00' },
          ],
          flows: [
            {
              id: 'mtn_flow_payment_callback',
              name: 'PAYMENT_CALLBACK',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              template: 'CALLBACK',
              triggerEvents: ['TRANSACTION'],
              contextActions: [],
              inboundUriId: 'mtn_ug_payment_callback',
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: callbackCanvasNodes,
              canvasEdges: callbackCanvasEdges,
            },
          ],
        },
      ],
    },
  ],
  GTB_NG: [
    {
      bt: 'COLLECTION',
      ability: 'CARD_PAY',
      actions: capabilityActionOptions['COLLECTION:CARD_PAY'] ?? [],
      stateMachine: 'Default_Refund_StateMachine',
      versions: [
        // PROD group - fully deployed
        {
          id: 'gtb_card_prod_group',
          groupId: 123,
          version: '20260601103000',
          status: 'PROD',
          badges: [
            { cloud: 'BD', env: 'DAILY' },
            { cloud: 'BD', env: 'PRE' },
            { cloud: 'BD', env: 'PROD' },
            { cloud: 'ALIYUN', env: 'DAILY' },
            { cloud: 'ALIYUN', env: 'PRE' },
            { cloud: 'ALIYUN', env: 'PROD' },
          ],
          remark: 'Production version for card payment collection',
          operator: 'admin',
          operationTime: '2026-06-03 15:00:00',
          deployRecords: seedDeployRecords,
          flows: [
            {
              id: 'flow_card_transaction',
              name: 'CARD_TRANSACTION',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              triggerEvents: ['TRANSACTION'],
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: commonCanvasNodes,
              canvasEdges: commonCanvasEdges,
            },
            {
              id: 'flow_card_callback',
              name: 'CARD_CALLBACK',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              triggerEvents: ['TRANSACTION'],
              inboundUriId: 'gtb_notify_endpoint',
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: callbackCanvasNodes,
              canvasEdges: callbackCanvasEdges,
            },
          ],
        },
        // DAILY group - deployed to DAILY, with a SUBMITTED flow that has unsubmitted draft
        {
          id: 'gtb_card_daily_group',
          groupId: 124,
          version: '20260605142000',
          status: 'DAILY',
          badges: [{ cloud: 'BD', env: 'DAILY' }],
          remark: 'Daily testing for timeout handling',
          operator: 'admin',
          operationTime: '2026-06-06 09:00:00',
          deployRecords: [
            { cloud: 'BD', app: 'omnicore', env: 'DAILY', version: '20260605142000', operator: 'admin', operationTime: '2026-06-06 09:30:00' },
            // PRE and PROD still run the older version from group 123
          ],
          flows: [
            {
              id: 'flow_timeout_tx',
              name: 'TIMEOUT_TRANSACTION',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              triggerEvents: ['QUERY'],
              isConfigured: true,
              status: 'SUBMITTED',
              // This flow has unsubmitted draft content
              submittedContent: {
                name: 'TIMEOUT_TRANSACTION',
                triggerType: 'UPSTREAM_TRIGGERED',
                triggerEvents: ['QUERY'],
              },
              canvasNodes: commonCanvasNodes,
              canvasEdges: commonCanvasEdges,
            },
            {
              id: 'flow_verify_draft',
              name: 'VERIFY_CHANGE',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              triggerEvents: ['VERIFY'],
              isConfigured: false,
              status: 'DRAFT',
              canvasNodes: [],
              canvasEdges: [],
            },
          ],
        },
        // UNDEPLOYED group - no deploy records yet, one SUBMITTED flow, one DRAFT flow
        {
          id: 'gtb_card_draft_group',
          groupId: 127,
          version: '20260608120000',
          status: 'UNDEPLOYED',
          badges: [],
          remark: 'New feature exploration',
          operator: 'admin',
          operationTime: '2026-06-08 12:00:00',
          deployRecords: [],
          flows: [
            {
              id: 'flow_new_feature',
              name: 'NEW_FEATURE',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              triggerEvents: ['TRANSACTION'],
              isConfigured: true,
              status: 'SUBMITTED',
              canvasNodes: commonCanvasNodes,
              canvasEdges: commonCanvasEdges,
            },
            {
              id: 'flow_incomplete',
              name: 'INCOMPLETE_FEATURE',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              triggerEvents: ['VERIFY'],
              isConfigured: false,
              status: 'DRAFT',
              canvasNodes: [],
              canvasEdges: [],
            },
          ],
        },
      ],
    },
    {
      bt: 'COLLECTION',
      ability: 'USSD_PAY',
      actions: capabilityActionOptions['COLLECTION:USSD_PAY'] ?? [],
      stateMachine: 'BankCard_Debit_StateMachine',
      versions: [
        {
          id: 'gtb_ussd_draft',
          groupId: 125,
          version: '20260606090000',
          status: 'UNDEPLOYED',
          badges: [],
          remark: '',
          operator: 'admin',
          operationTime: '2026-06-06 09:00:00',
          deployRecords: [],
          flows: [],
        },
      ],
    },
    {
      bt: 'DISBURSEMENT',
      ability: 'BANK_TRF',
      actions: capabilityActionOptions['DISBURSEMENT:BANK_TRF'] ?? [],
      stateMachine: 'Default_Refund_StateMachine',
      versions: [
        {
          id: 'gtb_bank_prod',
          groupId: 126,
          version: '20260528164500',
          status: 'PROD',
          badges: [{ cloud: 'ONELOOP', env: 'PROD' }],
          remark: 'Bank transfer disbursement - production',
          operator: 'admin',
          operationTime: '2026-05-28 16:45:00',
          deployRecords: [
            { cloud: 'ONELOOP', app: 'omnicore', env: 'DAILY', version: '20260528164500', operator: 'admin', operationTime: '2026-05-28 17:00:00' },
            { cloud: 'ONELOOP', app: 'omnicore', env: 'PROD', version: '20260528164500', operator: 'admin', operationTime: '2026-05-30 10:00:00' },
          ],
          flows: [],
        },
      ],
    },
    {
      bt: 'BANK_CARD_DEBIT',
      ability: 'INFO_PAYMENT',
      actions: capabilityActionOptions['BANK_CARD_DEBIT:INFO_PAYMENT'] ?? [],
      stateMachine: 'BankCard_Debit_StateMachine',
      versions: [
        {
          id: 'gtb_bank_card_debit_info_payment_draft',
          groupId: 129,
          version: '20260703114910',
          status: 'UNDEPLOYED',
          badges: [],
          remark: 'Bank card debit payment and OTP verification demo',
          operator: 'admin',
          operationTime: '2026-07-03 11:49:10',
          deployRecords: [],
          flows: [
            {
              id: 'flow_1783050559924',
              name: 'place_order',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              template: 'TRANSACTION',
              triggerEvents: ['TRANSACTION'],
              contextActions: [],
              isConfigured: false,
              status: 'DRAFT',
              ...buildTemplateCanvas('TRANSACTION'),
            },
            {
              id: 'flow_1783050572774',
              name: 'verify_otp',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'UPSTREAM_TRIGGERED',
              template: 'VERIFY',
              triggerEvents: ['VERIFY'],
              contextActions: [],
              isConfigured: false,
              status: 'DRAFT',
              ...buildTemplateCanvas('VERIFY'),
            },
            {
              id: 'flow_1783050610609',
              name: 'place_order_callback',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              template: 'CALLBACK',
              triggerEvents: ['TRANSACTION'],
              contextActions: [],
              inboundUriId: 'gtb_callback_endpoint',
              isConfigured: false,
              status: 'DRAFT',
              ...buildTemplateCanvas('CALLBACK'),
            },
            {
              id: 'flow_1783050634527',
              name: 'verify_otp_callback',
              executionType: 'single',
              flowType: 'inbound',
              endType: 'wait_external',
              triggerType: 'CALLBACK_TRIGGERED',
              template: 'CALLBACK',
              triggerEvents: ['VERIFY'],
              contextActions: [],
              inboundUriId: 'gtb_callback_endpoint',
              isConfigured: false,
              status: 'DRAFT',
              ...buildTemplateCanvas('CALLBACK'),
            },
            {
              id: 'flow_1783050858525',
              name: 'result_requery',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'REQUERY_TRIGGERED',
              template: 'REQUERY',
              triggerEvents: [],
              contextActions: ['VERIFY'],
              stateConditions: [{ id: 'requery-progressing', field: 'subState', operator: '==', value: 'PROGRESSING' }],
              isConfigured: false,
              status: 'DRAFT',
              ...buildTemplateCanvas('REQUERY'),
            },
            {
              id: 'flow_1783050899045',
              name: 'verify_otp_requery',
              executionType: 'single',
              flowType: 'outbound',
              endType: 'wait_external',
              triggerType: 'REQUERY_TRIGGERED',
              template: 'REQUERY',
              triggerEvents: [],
              contextActions: ['VERIFY'],
              stateConditions: [{ id: 'requery-verifying-otp', field: 'subState', operator: '==', value: 'VERIFYING_OTP' }],
              isConfigured: false,
              status: 'DRAFT',
              ...buildTemplateCanvas('REQUERY'),
            },
          ],
        },
      ],
    },
  ],
  NPSB_BD: [
    {
      bt: 'WALLET_PAYOUT',
      ability: 'TRANSACTION',
      actions: ['TRANSACTION'],
      stateMachine: 'NPSB_Wallet_Payout_StateMachine',
      versions: [
        {
          id: 'npsb_wallet_payout_daily',
          groupId: 801,
          version: '20260715103000',
          status: 'DAILY',
          badges: [{ cloud: 'BD', env: 'DAILY' }],
          remark: 'NPSB TCP + ISO 8583 wallet payout sample',
          operator: 'admin',
          operationTime: '2026-07-15 10:30:00',
          deployRecords: [{ cloud: 'BD', app: 'omnicore', env: 'DAILY', version: '20260715103000', operator: 'admin', operationTime: '2026-07-15 10:30:00' }],
          flows: [{
            id: 'npsb_wallet_payout_flow',
            name: 'WALLET_PAYOUT',
            executionType: 'single',
            flowType: 'outbound',
            endType: 'wait_external',
            triggerType: 'UPSTREAM_TRIGGERED',
            template: 'STANDARD',
            triggerEvents: ['TRANSACTION'],
            contextActions: [],
            isConfigured: true,
            status: 'SUBMITTED',
            canvasNodes: [
              { id: 'npsb_out_1', componentCode: 'initOutboundOrder', x: 320, y: 40, status: 'complete' as const },
              { id: 'npsb_out_2', componentCode: 'tcpCall', x: 320, y: 170, status: 'complete' as const, config: { requestName: 'wallet_payout_request', requestMTI: '0100', responseMTI: '0110', profileId: 'tcp_npsb_default', responseCodeMapping: 'WALLET_PAYOUT' } },
              { id: 'npsb_out_3', componentCode: 'updateOutboundOrder', x: 320, y: 300, status: 'complete' as const },
              { id: 'npsb_out_4', componentCode: 'sendCompleteMQ', x: 320, y: 430, status: 'complete' as const },
            ],
            canvasEdges: [
              { id: 'npsb_out_e1', source: 'npsb_out_1', target: 'npsb_out_2' },
              { id: 'npsb_out_e2', source: 'npsb_out_2', target: 'npsb_out_3' },
              { id: 'npsb_out_e3', source: 'npsb_out_3', target: 'npsb_out_4' },
            ],
          }],
        },
      ],
    },
  ],
  ZENITH_NG: [
    {
      bt: 'COLLECTION',
      ability: 'CARD_PAY',
      actions: capabilityActionOptions['COLLECTION:CARD_PAY'] ?? [],
      stateMachine: 'Default_Refund_StateMachine',
      versions: [],
    },
  ],
  PAYSTACK_NG: [],
};

const seedResourceVersions: Record<string, { globalVariables: string; credentials: string; orderVariables: string }> = {
  EVEXIN: { globalVariables: '20260628110000', credentials: '20260628111000', orderVariables: '20260628110500' },
  GTB_NG: { globalVariables: '20260628110000', credentials: '20260628111000', orderVariables: '20260628110500' },
  ZENITH_NG: { globalVariables: '20260628110000', credentials: '20260628111000', orderVariables: '20260628110500' },
  PAYSTACK_NG: { globalVariables: '20260628110000', credentials: '20260628111000', orderVariables: '20260628110500' },
  NPSB_BD: { globalVariables: '20260715100000', credentials: '20260715100000', orderVariables: '20260715100000' },
};

const cloneSeed = () => Object.fromEntries(
  Object.entries(structuredClone(seedAbilities)).map(([channelCode, abilities]) => [
    channelCode,
    abilities.map((ability) => ({
      ...ability,
      versions: ability.versions.map((version) => ({
        ...version,
        resourceVersions: version.resourceVersions ?? seedResourceVersions[channelCode],
      })),
    })),
  ]),
);

// Helper to create a submitted snapshot from a flow
function snapshotFlow(flow: FlowConfig): SubmittedFlowContent {
  return {
    name: flow.name,
    triggerType: flow.triggerType,
    triggerEvents: flow.triggerEvents,
    contextActions: flow.contextActions,
    inboundUriId: flow.inboundUriId,
    flowType: flow.flowType,
    endType: flow.endType,
    executionType: flow.executionType,
    outputEvents: flow.outputEvents,
    events: flow.events,
    stateConditions: flow.stateConditions,
    canvasNodes: flow.canvasNodes,
    canvasEdges: flow.canvasEdges,
  };
}

export const CLOUD_DEPLOY_SEQUENCES = {
  MFB: ['DAILY', 'PRE', 'PROD'],
  BD: ['DAILY', 'PRE', 'PROD'],
  PK: ['DAILY', 'PRE', 'PROD'],
  ALIYUN: ['DAILY', 'PRE', 'PROD'],
  ALIYUN_FRANKFURT: ['DAILY', 'PRE', 'PROD'],
  ONELOOP: ['DAILY', 'PROD'],
} as const satisfies Record<CloudType, readonly EnvType[]>;

export interface DeployPreview {
  currentStatus: 'UNDEPLOYED' | EnvType;
  targetEnv: EnvType | null;
  isComplete: boolean;
}

function getDeployPreviewForGroup(group: FlowGroupVersion, cloud: CloudType): DeployPreview {
  const sequence = CLOUD_DEPLOY_SEQUENCES[cloud];
  const currentVersionEnvs = new Set(
    group.deployRecords
      .filter((record) => record.cloud === cloud && record.version === group.version)
      .map((record) => record.env)
  );
  let currentStatus: 'UNDEPLOYED' | EnvType = 'UNDEPLOYED';
  for (const env of sequence) {
    if (!currentVersionEnvs.has(env)) {
      return { currentStatus, targetEnv: env, isComplete: false };
    }
    currentStatus = env;
  }
  return { currentStatus, targetEnv: null, isComplete: true };
}

function nextEditableVersion(group: FlowGroupVersion) {
  return {
    version: timestampVersion(),
    status: 'UNDEPLOYED' as const,
    badges: group.deployRecords.map((record) => ({ cloud: record.cloud, env: record.env })),
  };
}

// Compute group status from deploy records
function computeGroupStatus(deployRecords: DeployRecord[], currentVersion: string): GroupStatus {
  const currentRecords = deployRecords.filter((record) => record.version === currentVersion);
  if (currentRecords.some((r) => r.env === 'PROD')) return 'PROD';
  if (currentRecords.some((r) => r.env === 'PRE')) return 'PRE';
  if (currentRecords.some((r) => r.env === 'DAILY')) return 'DAILY';
  return 'UNDEPLOYED';
}

interface ConfigIntegrationStore {
  abilitiesByChannel: Record<string, ConfigAbility[]>;
  addAbility: (channelCode: string, ability: ConfigAbility) => void;
  createFlowGroup: (channelCode: string, bt: string, ability: string, description: string) => FlowGroupVersion | null;
  updateGroup: (
    channelCode: string,
    bt: string,
    ability: string,
    groupId: number,
    updates: Partial<FlowGroupVersion>
  ) => void;
  deleteGroup: (channelCode: string, bt: string, ability: string, groupId: number) => void;
  cloneGroup: (channelCode: string, bt: string, ability: string, groupId: number, description: string) => FlowGroupVersion | null;
  getDeployPreview: (
    channelCode: string,
    bt: string,
    ability: string,
    groupId: number,
    cloud: CloudType
  ) => DeployPreview | null;
  deployGroup: (
    channelCode: string,
    bt: string,
    ability: string,
    groupId: number,
    cloud: CloudType,
    allowUnsubmittedDrafts?: boolean
  ) => {
    success: boolean;
    step?: number;
    error?: string;
    draftFlows?: string[];
    targetEnv?: EnvType;
  };
  addFlow: (channelCode: string, bt: string, ability: string, groupId: number, flow: FlowConfig) => void;
  deleteFlow: (channelCode: string, bt: string, ability: string, groupId: number, flowId: string) => void;
  updateFlow: (
    channelCode: string,
    bt: string,
    ability: string,
    groupId: number,
    flowId: string,
    updates: Partial<FlowConfig>
  ) => void;
  saveDraftFlow: (
    channelCode: string,
    bt: string,
    ability: string,
    groupId: number,
    flowId: string,
    updates: Partial<FlowConfig>
  ) => void;
  submitFlow: (
    channelCode: string,
    bt: string,
    ability: string,
    groupId: number,
    flowId: string,
    updates: Partial<FlowConfig>
  ) => { success: boolean; error?: string };
  updateAbilityConfig: (
    channelCode: string,
    bt: string,
    ability: string,
    nextActions: string[],
    nextStateMachine: string
  ) => { success: boolean; errors?: string[] };
}

function findGroup(abilitiesByChannel: Record<string, ConfigAbility[]>, channelCode: string, bt: string, abilityCode: string, groupId: number) {
  const ability = (abilitiesByChannel[channelCode] ?? []).find(
    (item) => item.bt === bt && item.ability === abilityCode
  );
  const group = ability?.versions.find((item) => item.groupId === groupId);
  return { ability, group };
}

export const useConfigIntegrationStore = create<ConfigIntegrationStore>((set, get) => ({
  abilitiesByChannel: cloneSeed(),

  addAbility: (channelCode, ability) => set((state) => ({
    abilitiesByChannel: {
      ...state.abilitiesByChannel,
      [channelCode]: [ability, ...(state.abilitiesByChannel[channelCode] ?? [])],
    },
  })),

  createFlowGroup: (channelCode, bt, abilityCode, description) => {
    const ability = (get().abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    if (!ability) return null;
    if (ability.versions.some((v) => v.status !== 'PROD')) return null;
    const group: FlowGroupVersion = {
      id: `flow_group_${Date.now()}`,
      groupId: nextGroupId(get().abilitiesByChannel),
      version: timestampVersion(),
      status: 'UNDEPLOYED',
      badges: [],
      remark: description,
      operator: 'admin',
      operationTime: now(),
      flows: [],
      deployRecords: [],
    };
    set((state) => ({
      abilitiesByChannel: {
        ...state.abilitiesByChannel,
        [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
          item.bt === bt && item.ability === abilityCode
            ? { ...item, versions: [group, ...item.versions] }
            : item
        ),
      },
    }));
    return group;
  },

  updateGroup: (channelCode, bt, abilityCode, groupId, updates) => set((state) => ({
    abilitiesByChannel: {
      ...state.abilitiesByChannel,
      [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
        item.bt === bt && item.ability === abilityCode
          ? {
              ...item,
              versions: item.versions.map((group) =>
                group.groupId === groupId
                  ? { ...group, ...updates, operationTime: now() }
                  : group
              ),
            }
          : item
      ),
    },
  })),

  deleteGroup: (channelCode, bt, abilityCode, groupId) => set((state) => ({
    abilitiesByChannel: {
      ...state.abilitiesByChannel,
      [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
        item.bt === bt && item.ability === abilityCode
          ? { ...item, versions: item.versions.filter((g) => g.groupId !== groupId || g.status === 'PROD') }
          : item
      ),
    },
  })),

  cloneGroup: (channelCode, bt, abilityCode, groupId, description) => {
    const state = get();
    const { ability, group } = findGroup(state.abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    if (!ability || !group || group.status !== 'PROD') return null;
    if (ability.versions.some((v) => v.status !== 'PROD')) return null;

    const clone: FlowGroupVersion = {
      ...structuredClone(group),
      id: `flow_group_${Date.now()}`,
      groupId: nextGroupId(state.abilitiesByChannel),
      version: timestampVersion(),
      status: 'UNDEPLOYED',
      badges: [],
      deployRecords: [],
      remark: description,
      operator: 'admin',
      operationTime: now(),
    };
    set((st) => ({
      abilitiesByChannel: {
        ...st.abilitiesByChannel,
        [channelCode]: (st.abilitiesByChannel[channelCode] ?? []).map((item) =>
          item.bt === bt && item.ability === abilityCode
            ? { ...item, versions: [clone, ...item.versions] }
            : item
        ),
      },
    }));
    return clone;
  },

  getDeployPreview: (channelCode, bt, abilityCode, groupId, cloud) => {
    const { group } = findGroup(get().abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    return group ? getDeployPreviewForGroup(group, cloud) : null;
  },

  deployGroup: (channelCode, bt, abilityCode, groupId, cloud, allowUnsubmittedDrafts = false) => {
    const state = get();
    const { ability, group } = findGroup(state.abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    if (!ability || !group) return { success: false, error: 'Group not found' };

    // Step 1: Check all flows are SUBMITTED
    if (group.flows.length === 0) {
      return { success: false, step: 1, error: 'Group has no Flows. Create and submit at least one Flow first.' };
    }
    const draftFlows = group.flows.filter((f) => f.status === 'DRAFT');
    if (draftFlows.length > 0) {
      return {
        success: false,
        step: 1,
        error: `The following Flow(s) are still DRAFT: ${draftFlows.map((f) => f.name).join(', ')}.`,
        draftFlows: draftFlows.map((f) => f.name),
      };
    }

    // Step 2: Check for unsubmitted drafts
    const flowsWithDrafts = group.flows.filter(
      (f) => f.status === 'SUBMITTED' && f.submittedContent != null
    );
    if (flowsWithDrafts.length > 0 && !allowUnsubmittedDrafts) {
      return {
        success: false,
        step: 2,
        error: `${flowsWithDrafts.length} Flow(s) have unsubmitted drafts: ${flowsWithDrafts.map((f) => f.name).join(', ')}. Drafts will not be included in this deployment.`,
        draftFlows: flowsWithDrafts.map((f) => f.name),
      };
    }

    // Proceed with deploy
    const preview = getDeployPreviewForGroup(group, cloud);
    if (!preview.targetEnv) {
      return { success: false, error: `${cloud} is already at PROD for Version ${group.version}.` };
    }
    const targetEnv = preview.targetEnv;
    const newRecord: DeployRecord = {
      cloud,
      app: 'omnicore',
      env: targetEnv,
      version: group.version,
      operator: 'admin',
      operationTime: now(),
    };
    const updatedRecords = [
      ...group.deployRecords.filter((r) => !(r.cloud === cloud && r.app === 'omnicore' && r.env === targetEnv)),
      newRecord,
    ];
    const newStatus = computeGroupStatus(updatedRecords, group.version);

    get().updateGroup(channelCode, bt, abilityCode, groupId, {
      status: newStatus,
      badges: updatedRecords.map((r) => ({ cloud: r.cloud, env: r.env })),
      deployRecords: updatedRecords,
    });
    return { success: true, targetEnv };
  },

  addFlow: (channelCode, bt, abilityCode, groupId, flow) => {
    const state = get();
    const { ability, group } = findGroup(state.abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    if (!ability || !group) return;
    const newFlow: FlowConfig = { ...flow, status: 'DRAFT' };
    get().updateGroup(channelCode, bt, abilityCode, groupId, {
      flows: [...group.flows, newFlow],
    });
  },

  deleteFlow: (channelCode, bt, abilityCode, groupId, flowId) => {
    const state = get();
    const { ability, group } = findGroup(state.abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    if (!ability || !group) return;
    const target = group.flows.find((flow) => flow.id === flowId);
    if (!target || group.status === 'PROD') return;
    get().updateGroup(channelCode, bt, abilityCode, groupId, {
      ...nextEditableVersion(group),
      flows: group.flows.filter((flow) => flow.id !== flowId),
    });
  },

  updateFlow: (channelCode, bt, abilityCode, groupId, flowId, updates) => {
    const state = get();
    const { ability, group } = findGroup(state.abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    if (!ability || !group) return;
    get().updateGroup(channelCode, bt, abilityCode, groupId, {
      flows: group.flows.map((flow) =>
        flow.id === flowId ? { ...flow, ...updates } : flow
      ),
    });
  },

  saveDraftFlow: (channelCode, bt, abilityCode, groupId, flowId, updates) => {
    const state = get();
    const { ability, group } = findGroup(state.abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    if (!ability || !group) return;

    get().updateGroup(channelCode, bt, abilityCode, groupId, {
      flows: group.flows.map((flow) => {
        if (flow.id !== flowId) return flow;
        // If flow is SUBMITTED and being edited, save snapshot as submittedContent
        if (flow.status === 'SUBMITTED' && !flow.submittedContent) {
          return { ...flow, ...updates, submittedContent: snapshotFlow(flow) };
        }
        return { ...flow, ...updates };
      }),
    });
  },

  submitFlow: (channelCode, bt, abilityCode, groupId, flowId, updates) => {
    const state = get();
    const { ability, group } = findGroup(state.abilitiesByChannel, channelCode, bt, abilityCode, groupId);
    if (!ability || !group) return { success: false, error: 'Group not found' };

    const flow = group.flows.find((f) => f.id === flowId);
    if (!flow) return { success: false, error: 'Flow not found' };

    // Generate one new Version at the start of a post-release editing round.
    // Subsequent Flow submits keep using that UNDEPLOYED Version until it is deployed.
    const currentVersionHasPublishedRecords = group.deployRecords.some(
      (record) => record.version === group.version
    );
    const newVersion = currentVersionHasPublishedRecords ? timestampVersion() : group.version;

    const updatedFlows = group.flows.map((f) => {
      if (f.id !== flowId) return f;
      return {
        ...f,
        ...updates,
        status: 'SUBMITTED' as const,
        submittedContent: undefined,
        isConfigured: true,
      };
    });

    if (currentVersionHasPublishedRecords) {
      // Generate new version for the group
      get().updateGroup(channelCode, bt, abilityCode, groupId, {
        version: newVersion,
        status: 'UNDEPLOYED',
        flows: updatedFlows,
      });
    } else {
      get().updateGroup(channelCode, bt, abilityCode, groupId, {
        flows: updatedFlows,
      });
    }
    return { success: true };
  },

  updateAbilityConfig: (channelCode, bt, abilityCode, nextActions, nextStateMachine) => {
    const abilities = get().abilitiesByChannel[channelCode] ?? [];
    const abilityRecord = abilities.find(
      (item) => item.bt === bt && item.ability === abilityCode
    );
    if (!abilityRecord) return { success: false, errors: ['Ability not found'] };

    if (!nextStateMachine) {
      return { success: false, errors: ['State Machine is required.'] };
    }
    if (nextStateMachine !== abilityRecord.stateMachine && abilityRecord.versions.length > 0) {
      return {
        success: false,
        errors: ['State Machine cannot be changed because this Ability already contains a Flow Group.'],
      };
    }

    const currentActions = abilityRecord.actions;
    const removedActions = currentActions.filter((a) => !nextActions.includes(a));
    const allowedOptions = capabilityActionOptions[`${bt}:${abilityCode}`] ?? [];

    const errors: string[] = [];
    for (const removedAction of removedActions) {
      for (const group of abilityRecord.versions) {
        for (const flow of group.flows) {
          const refs = [
            ...(flow.triggerEvents || []),
            ...(flow.contextActions || []),
          ];
          if (refs.includes(removedAction)) {
            errors.push(
              `Action ${removedAction} cannot be removed because it is referenced by Flow ${flow.name} in Version ${group.version}.`
            );
          }
        }
      }
    }

    if (errors.length > 0) return { success: false, errors };

    const addedActions = nextActions.filter((a) => !currentActions.includes(a));
    for (const addedAction of addedActions) {
      if (!allowedOptions.includes(addedAction)) {
        return {
          success: false,
          errors: [`Action ${addedAction} is not available for ${bt}:${abilityCode}.`],
        };
      }
    }

    set((state) => ({
      abilitiesByChannel: {
        ...state.abilitiesByChannel,
        [channelCode]: (state.abilitiesByChannel[channelCode] ?? []).map((item) =>
          item.bt === bt && item.ability === abilityCode
            ? { ...item, actions: nextActions, stateMachine: nextStateMachine }
            : item
        ),
      },
    }));
    return { success: true };
  },
}));
