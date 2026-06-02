import { Typography, Input, Button, Divider, Select, Switch, Space } from 'antd';
import type { Node, Edge } from '@xyflow/react';

const { Text } = Typography;
const { TextArea } = Input;

// Business status options
const BUSINESS_STATUS_OPTIONS = [
  { label: 'success', value: 'success' },
  { label: 'pending', value: 'pending' },
  { label: 'fail', value: 'fail' },
  { label: 'to_be_verify', value: 'to_be_verify' },
  { label: 'init', value: 'init' },
];

// Action options for State nodes
const ACTION_OPTIONS = [
  { label: 'transaction', value: 'transaction' },
  { label: 'query', value: 'query' },
  { label: 'to_be_verify', value: 'to_be_verify' },
  { label: 'inbound_transaction', value: 'inbound_transaction' },
  { label: 'inbound_query', value: 'inbound_query' },
];

// Use index signature to satisfy React Flow's Record<string, unknown> constraint
type NodeData = {
  name: string;
  description?: string;
  businessStatus?: string;
  action?: string;
  [key: string]: unknown;
};

type EdgeData = {
  label?: string;
  [key: string]: unknown;
};

interface PropertyPanelProps {
  selectedNode: Node<NodeData> | null;
  selectedEdge: Edge<EdgeData> | null;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  onNodeUpdate: (id: string, data: Partial<NodeData>) => void;
  onEdgeTypeUpdate: (id: string, isDashed: boolean) => void;
  onEdgeEndpointsUpdate: (id: string, source: string, target: string) => void;
  onEdgeLabelUpdate: (id: string, label: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

function getNodeName(nodes: Node<NodeData>[], nodeId: string): string {
  const node = nodes.find(n => n.id === nodeId);
  const name = node?.data?.name;
  return typeof name === 'string' ? name : nodeId;
}

function isEdgeDashed(edge: Edge): boolean {
  const style = edge.style as { strokeDasharray?: string };
  return !!(style && style.strokeDasharray);
}

export default function PropertyPanel({
  selectedNode,
  selectedEdge,
  nodes,
  edges,
  onNodeUpdate,
  onEdgeTypeUpdate,
  onEdgeEndpointsUpdate,
  onEdgeLabelUpdate,
  onDeleteNode,
  onDeleteEdge,
}: PropertyPanelProps) {
  // Nothing selected
  if (!selectedNode && !selectedEdge) {
    return (
      <div
        style={{
          width: 260,
          background: '#fff',
          borderLeft: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e5e5e5',
            fontWeight: 600,
            fontSize: 14,
            color: '#333',
          }}
        >
          Properties
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <span style={{ color: '#999', fontSize: 13, textAlign: 'center' }}>
            Select a node or edge to edit
          </span>
        </div>
      </div>
    );
  }

  // Edge selected
  if (selectedEdge) {
    const dashed = isEdgeDashed(selectedEdge);
    return (
      <div
        style={{
          width: 260,
          background: '#fff',
          borderLeft: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e5e5e5',
            fontWeight: 600,
            fontSize: 14,
            color: '#333',
          }}
        >
          Edge Properties
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Line Type */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Line Type
            </Text>
            <Space>
              <Switch
                checked={dashed}
                onChange={checked => onEdgeTypeUpdate(selectedEdge.id, checked)}
                checkedChildren="虚线"
                unCheckedChildren="实线"
              />
              <Text style={{ fontSize: 13 }}>{dashed ? '虚线' : '实线'}</Text>
            </Space>
          </div>

          {/* From / To */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              From → To
            </Text>
            <Text style={{ fontSize: 13 }}>
              {getNodeName(nodes, selectedEdge.source)} → {getNodeName(nodes, selectedEdge.target)}
            </Text>
          </div>

          {/* Swap Direction Button */}
          <Button block onClick={() => onEdgeEndpointsUpdate(selectedEdge.id, selectedEdge.target, selectedEdge.source)}>
            Swap Direction
          </Button>

          {/* Description / Label */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Description
            </Text>
            <Input
              value={selectedEdge.data?.label || ''}
              onChange={e => onEdgeLabelUpdate(selectedEdge.id, e.target.value)}
              placeholder="Enter description"
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Delete Edge Button */}
          <Button danger type="primary" block onClick={() => onDeleteEdge(selectedEdge.id)}>
            Delete Edge
          </Button>
        </div>
      </div>
    );
  }

  // Node selected
  if (selectedNode) {
    const isState = selectedNode.type === 'stateNode';
    const isStep = selectedNode.type === 'stepNode';
    const isResult = selectedNode.type === 'resultNode';

    // Find incoming and outgoing edges for this node
    const incomingEdges = edges.filter(e => e.target === selectedNode.id);
    const outgoingEdges = edges.filter(e => e.source === selectedNode.id);

    return (
      <div
        style={{
          width: 260,
          background: '#fff',
          borderLeft: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e5e5e5',
            fontWeight: 600,
            fontSize: 14,
            color: '#333',
          }}
        >
          {isState ? 'State Node Properties' : isResult ? 'Result Node Properties' : 'Step Node Properties'}
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Node Name */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Node Name
            </Text>
            <Input
              value={selectedNode.data.name}
              onChange={e => onNodeUpdate(selectedNode.id, { name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Description
            </Text>
            <TextArea
              value={selectedNode.data.description || ''}
              onChange={e => onNodeUpdate(selectedNode.id, { description: e.target.value })}
              rows={2}
              placeholder="Enter description"
            />
          </div>

          {/* Business Status Mapping - only for State nodes */}
          {isState && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Business Status Mapping
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Select business status"
                value={selectedNode.data.businessStatus}
                onChange={value => onNodeUpdate(selectedNode.id, { businessStatus: value })}
                options={BUSINESS_STATUS_OPTIONS}
                allowClear
              />
            </div>
          )}

          {/* Action - only for State nodes */}
          {isState && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Action
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Select action"
                value={selectedNode.data.action}
                onChange={value => onNodeUpdate(selectedNode.id, { action: value })}
                options={ACTION_OPTIONS}
                allowClear
              />
            </div>
          )}

          {/* Type */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Type
            </Text>
            <Text style={{ fontSize: 13 }}>{isState ? 'State' : isResult ? 'Result' : 'Step'}</Text>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Incoming Arcs */}
          {incomingEdges.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                ── Incoming Arcs ──
              </Text>
              {incomingEdges.map(edge => {
                const edgeDashed = isEdgeDashed(edge);
                return (
                  <div key={edge.id} style={{ fontSize: 12, marginBottom: 2 }}>
                    <Text>
                      ← <Text strong>{getNodeName(nodes, edge.source)}</Text>{' '}
                      <Text type="secondary">({edgeDashed ? '虚线' : '实线'})</Text>
                    </Text>
                  </div>
                );
              })}
            </div>
          )}

          {/* Outgoing Arcs / Branches */}
          {outgoingEdges.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                {isStep || isResult ? '── Outgoing Branches ──' : '── Outgoing Arcs ──'}
              </Text>
              {outgoingEdges.map(edge => {
                const label = edge.data?.label;
                return (
                  <div key={edge.id} style={{ fontSize: 12, marginBottom: 2 }}>
                    <Text>
                      → <Text strong>{getNodeName(nodes, edge.target)}</Text>{' '}
                      {label && (
                        <Text type="secondary" style={{ fontStyle: 'italic' }}>
                          条件: {label}
                        </Text>
                      )}
                    </Text>
                  </div>
                );
              })}
            </div>
          )}

          <Divider style={{ margin: '8px 0' }} />

          {/* Delete Node Button */}
          <Button danger type="primary" block onClick={() => onDeleteNode(selectedNode.id)}>
            Delete Node
          </Button>
        </div>
      </div>
    );
  }

  return null;
}