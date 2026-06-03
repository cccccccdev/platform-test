import { Typography, Input, Button, Divider, Select } from 'antd';
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

// Use index signature to satisfy React Flow's Record<string, unknown> constraint
type NodeData = {
  name: string;
  description?: string;
  businessStatus?: string;
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

export default function PropertyPanel({
  selectedNode,
  selectedEdge,
  nodes,
  edges,
  onNodeUpdate,
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
          State Node Properties
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

          {/* Business Status Mapping */}
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

          <Divider style={{ margin: '8px 0' }} />

          {/* Incoming Arcs */}
          {incomingEdges.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                ── Incoming Arcs ──
              </Text>
              {incomingEdges.map(edge => {
                return (
                  <div key={edge.id} style={{ fontSize: 12, marginBottom: 2 }}>
                    <Text>
                      ← <Text strong>{getNodeName(nodes, edge.source)}</Text>
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
                ── Outgoing Arcs ──
              </Text>
              {outgoingEdges.map(edge => {
                return (
                  <div key={edge.id} style={{ fontSize: 12, marginBottom: 2 }}>
                    <Text>
                      → <Text strong>{getNodeName(nodes, edge.target)}</Text>
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