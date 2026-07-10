import { Alert, Empty, Modal, Space, Tag, Typography } from 'antd';
import { Background, Controls, MarkerType, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const { Text } = Typography;

export const NO_STATE_MACHINE = 'NO_STATE_MACHINE';

export function isNoStateMachine(stateMachine?: string) {
  return !stateMachine || stateMachine === NO_STATE_MACHINE;
}

export function stateMachineDisplayName(stateMachine?: string) {
  return isNoStateMachine(stateMachine) ? 'No State Machine' : stateMachine;
}

type StateDefinition = { id: string; name: string; description: string; x: number; y: number; status?: string };
type TransitionDefinition = { id: string; source: string; target: string; event?: string };

const stateMachines: Record<string, { description: string; states: StateDefinition[]; transitions: TransitionDefinition[] }> = {
  Wallet_Debit_StateMachine: {
    description: 'Wallet debit lifecycle covering pending callback, requery and final result states.',
    states: [
      { id: 'init', name: 'INIT', description: 'Wallet debit initialized', x: 40, y: 160, status: 'INIT' },
      { id: 'wait_callback', name: 'PAYMENT_PENDING_WAIT_CALLBACK', description: 'Waiting for payment callback', x: 310, y: 80, status: 'PENDING' },
      { id: 'wait_requery', name: 'PAYMENT_PENDING_WAIT_REQUERY', description: 'Waiting for requery execution', x: 310, y: 250, status: 'PENDING' },
      { id: 'success', name: 'PAYMENT_SUCCESS', description: 'Wallet debit succeeded', x: 670, y: 80, status: 'SUCCESS' },
      { id: 'failed', name: 'PAYMENT_FAILED_BY_CHANNEL', description: 'Wallet debit failed', x: 670, y: 250, status: 'FAIL' },
    ],
    transitions: [
      { id: 'e1', source: 'init', target: 'wait_callback', event: 'accepted' },
      { id: 'e2', source: 'wait_callback', target: 'success', event: 'callback_success' },
      { id: 'e3', source: 'wait_callback', target: 'wait_requery', event: 'callback_timeout' },
      { id: 'e4', source: 'wait_requery', target: 'success', event: 'requery_success' },
      { id: 'e5', source: 'wait_requery', target: 'failed', event: 'requery_failed' },
    ],
  },
  Fund_Notification_StateMachine: {
    description: 'Inbound fund notification lifecycle for payment and bill query callbacks.',
    states: [
      { id: 'pending', name: 'PAYMENT_PENDING_WAIT_CALLBACK', description: 'Notification is pending', x: 40, y: 170, status: 'PENDING' },
      { id: 'payment_success', name: 'PAYMENT_SUCCESS', description: 'Payment notification succeeded', x: 350, y: 70, status: 'SUCCESS' },
      { id: 'payment_failed', name: 'PAYMENT_FAILED_BY_CHANNEL', description: 'Payment notification failed', x: 350, y: 270, status: 'FAIL' },
      { id: 'bill_success', name: 'BILL_QUERY_SUCCESS', description: 'Bill query notification succeeded', x: 660, y: 70, status: 'SUCCESS' },
      { id: 'bill_failed', name: 'BILL_QUERY_FAILED', description: 'Bill query notification failed', x: 660, y: 270, status: 'FAIL' },
    ],
    transitions: [
      { id: 'e1', source: 'pending', target: 'payment_success', event: 'payment_success' },
      { id: 'e2', source: 'pending', target: 'payment_failed', event: 'payment_failed' },
      { id: 'e3', source: 'pending', target: 'bill_success', event: 'bill_query_success' },
      { id: 'e4', source: 'pending', target: 'bill_failed', event: 'bill_query_failed' },
    ],
  },
  BankCard_Debit_StateMachine: {
    description: 'Bank card debit lifecycle with OTP, authentication and frictionless processing paths.',
    states: [
      { id: 'init', name: 'INIT', description: 'Payment request entry', x: 20, y: 180, status: 'INIT' },
      { id: 'waiting_otp', name: 'WAITING_OTP', description: 'Waiting for OTP input', x: 250, y: 20 },
      { id: 'verifying_otp', name: 'VERIFYING_OTP', description: 'Verifying submitted OTP', x: 500, y: 20 },
      { id: 'authenticating', name: 'AUTHENTICATING', description: 'Authentication in progress', x: 300, y: 200 },
      { id: 'progressing', name: 'PROGRESSING', description: 'Debit processing', x: 520, y: 260 },
      { id: 'success', name: 'SUCCESS', description: 'Debit completed', x: 740, y: 180, status: 'SUCCESS' },
      { id: 'failed', name: 'FAILED', description: 'Debit failed', x: 740, y: 340, status: 'FAIL' },
    ],
    transitions: [
      { id: 'e1', source: 'init', target: 'waiting_otp', event: 'otp_required' },
      { id: 'e2', source: 'waiting_otp', target: 'verifying_otp', event: 'otp_submitted' },
      { id: 'e3', source: 'verifying_otp', target: 'authenticating', event: 'otp_verified' },
      { id: 'e4', source: 'init', target: 'authenticating', event: 'authentication_required' },
      { id: 'e5', source: 'init', target: 'progressing', event: 'frictionless' },
      { id: 'e6', source: 'authenticating', target: 'progressing', event: 'authenticated' },
      { id: 'e7', source: 'progressing', target: 'success', event: 'debit_success' },
      { id: 'e8', source: 'progressing', target: 'failed', event: 'debit_failed' },
      { id: 'e9', source: 'authenticating', target: 'failed', event: 'authentication_failed' },
    ],
  },
  SMS_Single_Message_StateMachine: {
    description: 'Single SMS lifecycle from initialization to submitted state and final delivery result.',
    states: [
      { id: 'init', name: 'INIT', description: 'SMS request initialized', x: 40, y: 170, status: 'INIT' },
      { id: 'submitted', name: 'SUBMITTED', description: 'Request submitted to channel; waiting for final result', x: 350, y: 170, status: 'PENDING' },
      { id: 'delivered', name: 'DELIVERED', description: 'SMS delivered successfully', x: 690, y: 80, status: 'SUCCESS' },
      { id: 'failed', name: 'FAILED', description: 'SMS failed, rejected, expired, or invalid', x: 690, y: 260, status: 'FAIL' },
    ],
    transitions: [
      { id: 'sms_e1', source: 'init', target: 'submitted', event: 'submitted' },
      { id: 'sms_e2', source: 'init', target: 'failed', event: 'submit_failed' },
      { id: 'sms_e3', source: 'submitted', target: 'delivered', event: 'delivered' },
      { id: 'sms_e4', source: 'submitted', target: 'failed', event: 'failed' },
    ],
  },
  Default_Refund_StateMachine: {
    description: 'Default transaction lifecycle from initialization to processing and final result.',
    states: [
      { id: 'init', name: 'INIT', description: 'Transaction initialized', x: 40, y: 160, status: 'INIT' },
      { id: 'progressing', name: 'PROGRESSING', description: 'Transaction processing', x: 330, y: 160 },
      { id: 'success', name: 'SUCCESS', description: 'Transaction completed', x: 650, y: 60, status: 'SUCCESS' },
      { id: 'failed', name: 'FAILED', description: 'Transaction failed', x: 650, y: 270, status: 'FAIL' },
    ],
    transitions: [
      { id: 'e1', source: 'init', target: 'progressing', event: 'processing_started' },
      { id: 'e2', source: 'progressing', target: 'success', event: 'completed' },
      { id: 'e3', source: 'progressing', target: 'failed', event: 'failed' },
    ],
  },
};

export default function StateMachinePreviewModal({
  open,
  stateMachine,
  highlightedState,
  onClose,
}: {
  open: boolean;
  stateMachine: string;
  highlightedState?: string;
  onClose: () => void;
}) {
  if (isNoStateMachine(stateMachine)) {
    return (
      <Modal title="State Machine: No State Machine" open={open} footer={null} width={720} onCancel={onClose} destroyOnHidden>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="State machine is not applicable"
        />
        <Alert
          type="info"
          showIcon
          message="Legacy Flow Group has no State Machine association"
          description="This record was migrated from 1.0 distributed Flow information. It can be viewed and used for compatibility, but no state machine preview is available."
        />
      </Modal>
    );
  }

  const definition = stateMachines[stateMachine];

  if (!definition) {
    return (
      <Modal title={`State Machine: ${stateMachine}`} open={open} footer={null} width={720} onCancel={onClose} destroyOnHidden>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="State Machine definition is unavailable"
        />
        <Alert
          type="warning"
          showIcon
          message="State Machine definition not found in this demo"
          description="The Ability has a State Machine name, but the preview canvas data has not been modeled in the current demo."
        />
      </Modal>
    );
  }
  const nodes: Node[] = definition.states.map((state) => {
    const highlighted = state.name === highlightedState;
    return {
      id: state.id,
      position: { x: state.x, y: state.y },
      data: {
        label: <div style={{ minWidth: 150 }}>
          <Space size={5} wrap>
            <strong>{state.name}</strong>
            {state.status && <Tag color={state.status === 'SUCCESS' ? 'green' : state.status === 'FAIL' ? 'red' : 'blue'} style={{ margin: 0 }}>{state.status}</Tag>}
            {highlighted && <Tag color="orange" style={{ margin: 0 }}>Trigger Sub-State</Tag>}
          </Space>
          <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 5 }}>{state.description}</div>
        </div>,
      },
      style: {
        border: highlighted ? '2px solid #fa8c16' : '1px solid #91caff',
        background: highlighted ? '#fff7e6' : '#fff',
        borderRadius: 8,
        padding: 10,
        boxShadow: highlighted ? '0 0 0 3px rgba(250,140,22,.15)' : '0 2px 6px rgba(0,0,0,.06)',
      },
    };
  });
  const edges: Edge[] = definition.transitions.map((transition) => ({
    id: transition.id,
    source: transition.source,
    target: transition.target,
    label: transition.event,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#595959', strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: '#595959' },
  }));

  return <Modal title={`State Machine: ${stateMachine}`} open={open} footer={null} width={960} onCancel={onClose} destroyOnHidden>
    <Text type="secondary">{definition.description}</Text>
    <div style={{ height: 500, marginTop: 12, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
      <ReactFlowProvider>
        <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} minZoom={0.4} maxZoom={1.5}>
          <Background color="#e8e8e8" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  </Modal>;
}
