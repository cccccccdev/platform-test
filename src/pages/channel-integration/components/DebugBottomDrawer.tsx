import { useState } from 'react';
import { Drawer, Tabs, Input, Space, Tag, Typography, Empty } from 'antd';

const { Text } = Typography;
const { Search } = Input;

export interface LogEntry {
  key: string;
  timestamp: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
  l3Code?: string;
  l3Name?: string;
  l2Code?: string;
  l2Name?: string;
  message: string;
  duration?: number;
  details?: string;
}

export interface L2ExecutionData {
  l3Code: string;
  l3Name: string;
  l2Code: string;
  l2Name: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'breakpoint';
  duration?: number;
  timestamp?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
}

export interface ContextChange {
  key: string;
  initialValue?: any;
  changes: {
    source: string; // L3 code or 'initial'
    value: any;
    timestamp: string;
    isCurrent?: boolean;
  }[];
}

export interface TraceNode {
  l3Code: string;
  l3Name: string;
  l2Nodes: {
    l2Code: string;
    l2Name: string;
    status: 'pending' | 'completed' | 'error' | 'current';
    duration?: number;
  }[];
  totalDuration?: number;
  status: 'completed' | 'current' | 'pending';
}

interface DebugBottomDrawerProps {
  visible: boolean;
  height?: number;
  logs: LogEntry[];
  selectedL2Execution: L2ExecutionData | null;
  contextChanges: ContextChange[];
  traceNodes: TraceNode[];
  onClose: () => void;
  onSelectL2: (l2Code: string, l3Code: string) => void;
  currentExecutingL2?: string;
}

const LOG_LEVEL_COLORS: Record<string, string> = {
  INFO: '#52c41a',
  DEBUG: '#999',
  WARN: '#fa8c16',
  ERROR: '#ff4d4f',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#999',
  running: '#1890ff',
  completed: '#52c41a',
  error: '#ff4d4f',
  breakpoint: '#fa8c16',
};

export default function DebugBottomDrawer({
  visible,
  height = 320,
  logs,
  selectedL2Execution,
  contextChanges,
  traceNodes,
  onClose,
  onSelectL2,
}: DebugBottomDrawerProps) {
  const [activeTab, setActiveTab] = useState('logs');
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'DEBUG' | 'WARN' | 'ERROR'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [showContextDiff, setShowContextDiff] = useState(false);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilter !== 'ALL' && log.level !== logFilter) return false;
    if (searchText && !log.message.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const renderLogContent = () => (
    <div>
      {/* Filters */}
      <Space style={{ marginBottom: 12 }}>
        <Text type="secondary">筛选:</Text>
        <Space size={4}>
          {(['ALL', 'INFO', 'DEBUG', 'WARN', 'ERROR'] as const).map(level => (
            <Tag
              key={level}
              color={logFilter === level ? 'blue' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => setLogFilter(level)}
            >
              {level}
            </Tag>
          ))}
        </Space>
        <Search
          placeholder="搜索关键词"
          style={{ width: 200 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Space>

      {/* Log List */}
      <div style={{
        maxHeight: height - 100,
        overflow: 'auto',
        background: '#1e1e1e',
        borderRadius: 4,
        padding: 8,
        fontFamily: 'monospace',
        fontSize: 12,
      }}>
        {filteredLogs.map(log => (
          <div
            key={log.key}
            style={{
              padding: '2px 8px',
              marginBottom: 2,
              borderLeft: `3px solid ${LOG_LEVEL_COLORS[log.level]}`,
              background: log.level === 'WARN' ? 'rgba(250, 140, 22, 0.1)' :
                         log.level === 'ERROR' ? 'rgba(255, 77, 79, 0.1)' : 'transparent',
              cursor: log.l2Code ? 'pointer' : 'default',
            }}
            onClick={() => log.l2Code && log.l3Code && onSelectL2(log.l2Code, log.l3Code)}
          >
            <Space size={8}>
              <Text style={{ color: '#888', fontSize: 10 }}>{log.timestamp}</Text>
              <Text style={{ color: LOG_LEVEL_COLORS[log.level], fontSize: 11 }}>[{log.level}]</Text>
              {log.l3Code && (
                <Text style={{ color: '#1890ff', fontSize: 11 }}>{log.l3Code}</Text>
              )}
              {log.l2Code && (
                <Text style={{ color: '#52c41a', fontSize: 11 }}>{log.l2Name || log.l2Code}</Text>
              )}
              <Text style={{ color: '#ccc', fontSize: 11 }}>{log.message}</Text>
              {log.duration !== undefined && (
                <Text style={{ color: '#888', fontSize: 11 }}>{log.duration}ms</Text>
              )}
            </Space>
            {log.details && (
              <div style={{ marginLeft: 16, marginTop: 4, color: '#888' }}>
                {log.details}
              </div>
            )}
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </div>
  );

  const renderIOContent = () => {
    if (!selectedL2Execution) {
      return (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Empty description="点击左侧日志或画布节点查看详情" />
        </div>
      );
    }

    return (
      <div style={{ padding: '0 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
          <Space>
            <Text strong>{selectedL2Execution.l3Name}</Text>
            <Text type="secondary">›</Text>
            <Text>{selectedL2Execution.l2Name}</Text>
          </Space>
          <div style={{ marginTop: 8 }}>
            <Space size={16}>
              <Text type="secondary">状态:</Text>
              <Tag color={STATUS_COLORS[selectedL2Execution.status]}>
                {selectedL2Execution.status}
              </Tag>
              {selectedL2Execution.duration && (
                <>
                  <Text type="secondary">耗时:</Text>
                  <Text>{selectedL2Execution.duration}ms</Text>
                </>
              )}
              {selectedL2Execution.timestamp && (
                <>
                  <Text type="secondary">时间:</Text>
                  <Text>{selectedL2Execution.timestamp}</Text>
                </>
              )}
            </Space>
          </div>
        </div>

        {/* Input/Output Split */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>INPUT</Text>
            <div style={{
              background: '#1e1e1e',
              borderRadius: 4,
              padding: 12,
              maxHeight: height - 150,
              overflow: 'auto',
            }}>
              {selectedL2Execution.input ? (
                <pre style={{ color: '#ccc', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(selectedL2Execution.input, null, 2)}
                </pre>
              ) : (
                <Text type="secondary">⏳ 等待执行</Text>
              )}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>OUTPUT</Text>
            <div style={{
              background: '#1e1e1e',
              borderRadius: 4,
              padding: 12,
              maxHeight: height - 150,
              overflow: 'auto',
            }}>
              {selectedL2Execution.output ? (
                <pre style={{ color: '#ccc', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(selectedL2Execution.output, null, 2)}
                </pre>
              ) : (
                <Text type="secondary">⏳ 等待执行</Text>
              )}
            </div>
          </div>
        </div>

        {/* Credential Notice */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbe6', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            🔒 Credential 字段永久脱敏，调试模式不展示明文
          </Text>
        </div>
      </div>
    );
  };

  const renderContextContent = () => {
    const getChangeColor = (source: string, isCurrent: boolean) => {
      if (source === 'spi.request') return '#52c41a'; // green - initial input
      if (source === 'initial') return '#999'; // gray - no change
      return isCurrent ? '#fa8c16' : '#fff'; // yellow - changed
    };

    return (
      <div style={{ padding: '0 16px' }}>
        {/* Controls */}
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Text type="secondary">多断点 Diff:</Text>
            <Tag
              color={showContextDiff ? 'blue' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowContextDiff(!showContextDiff)}
            >
              对比上一断点
            </Tag>
          </Space>
        </div>

        {/* Context Changes */}
        <div style={{
          maxHeight: height - 80,
          overflow: 'auto',
        }}>
          {contextChanges.map(change => (
            <div key={change.key} style={{ marginBottom: 8, borderLeft: '2px solid #fa8c16', paddingLeft: 8 }}>
              <Space>
                <Text strong>{change.key}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {change.changes.length === 0 ? '初始（无值）' : ''}
                </Text>
              </Space>
              {change.changes.map((c, idx) => (
                <div key={idx} style={{
                  marginLeft: 16,
                  marginTop: 4,
                  padding: '2px 8px',
                  background: c.isCurrent ? 'rgba(250, 140, 22, 0.1)' : 'transparent',
                  borderRadius: 2,
                }}>
                  <Space size={8}>
                    {c.source === 'initial' ? (
                      <Text type="secondary" style={{ fontSize: 11 }}>初始</Text>
                    ) : (
                      <Tag color="orange" style={{ fontSize: 10 }}>{c.source}</Tag>
                    )}
                    <Text style={{
                      color: getChangeColor(c.source, c.isCurrent || false),
                      fontSize: 11,
                      textDecoration: idx < change.changes.length - 1 && change.changes.length > 1 ? 'line-through' : 'none',
                    }}>
                      {JSON.stringify(c.value)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{c.timestamp}</Text>
                    {c.isCurrent && <Tag color="orange" style={{ fontSize: 9 }}>当前值</Tag>}
                  </Space>
                </div>
              ))}
            </div>
          ))}
          {contextChanges.length === 0 && (
            <Empty description="暂无 Context 变化" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </div>
    );
  };

  const renderTraceContent = () => (
    <div style={{ padding: '0 16px' }}>
      <div style={{
        maxHeight: height - 80,
        overflow: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <th style={{ textAlign: 'left', padding: '8px 4px' }}>节点</th>
              <th style={{ width: 80, textAlign: 'right', padding: '8px 4px' }}>耗时</th>
              <th style={{ width: 80, textAlign: 'center', padding: '8px 4px' }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {traceNodes.map(node => (
              <>
                <tr
                  key={node.l3Code}
                  style={{ background: '#fafafa', cursor: 'pointer' }}
                  onClick={() => {/* toggle expand */}}
                >
                  <td style={{ padding: '8px 4px' }}>
                    <Space>
                      <Text style={{ color: '#1890ff' }}>▶</Text>
                      <Text strong>{node.l3Code}</Text>
                      <Text type="secondary">{node.l3Name}</Text>
                    </Space>
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                    {node.totalDuration ? `${node.totalDuration}ms` : '—'}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                    <Tag color={STATUS_COLORS[node.status]}>{node.status}</Tag>
                  </td>
                </tr>
                {node.l2Nodes.map(l2 => (
                  <tr
                    key={`${node.l3Code}-${l2.l2Code}`}
                    style={{
                      background: l2.status === 'current' ? '#e6f7ff' : 'transparent',
                      cursor: 'pointer',
                      borderLeft: '2px solid',
                      borderLeftColor: l2.status === 'current' ? '#1890ff' : 'transparent',
                    }}
                    onClick={() => onSelectL2(l2.l2Code, node.l3Code)}
                  >
                    <td style={{ padding: '4px 4px 4px 32px' }}>
                      <Space>
                        {l2.status === 'current' && <Text style={{ color: '#1890ff' }}>●</Text>}
                        <Text type="secondary">{l2.l2Code}</Text>
                        <Text>{l2.l2Name}</Text>
                      </Space>
                    </td>
                    <td style={{ padding: '4px 4px', textAlign: 'right' }}>
                      {l2.duration !== undefined ? `${l2.duration}ms` : '—'}
                    </td>
                    <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                      <Tag color={STATUS_COLORS[l2.status]} style={{ fontSize: 10 }}>
                        {l2.status}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {traceNodes.length === 0 && (
          <Empty description="暂无调用链数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </div>
  );

  const tabItems = [
    {
      key: 'logs',
      label: '运行日志',
      children: renderLogContent(),
    },
    {
      key: 'io',
      label: '出入参详情',
      children: renderIOContent(),
    },
    {
      key: 'context',
      label: 'Context 变化轨迹',
      children: renderContextContent(),
    },
    {
      key: 'trace',
      label: '调用链 Trace',
      children: renderTraceContent(),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <Text strong>调试信息</Text>
        </Space>
      }
      placement="bottom"
      height={height}
      open={visible}
      onClose={onClose}
      mask={false}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column' },
        wrapper: { height: 'auto' },
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ flex: 1 }}
        tabBarStyle={{ marginBottom: 0, paddingLeft: 16 }}
      />
    </Drawer>
  );
}
