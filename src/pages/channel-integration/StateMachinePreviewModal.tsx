import { Modal, Space, Tag, Typography } from 'antd';
import { Background, Controls, MarkerType, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const { Text } = Typography;

type StateDefinition = { id: string; name: string; description: string; x: number; y: number; status?: string };
type TransitionDefinition = { id: string; source: string; target: string; event?: string };

const stateMachines: Record<string, { description: string; states: StateDefinition[]; transitions: TransitionDefinition[] }> = {
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
  const definition = stateMachines[stateMachine] ?? stateMachines.Default_Refund_StateMachine;
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
