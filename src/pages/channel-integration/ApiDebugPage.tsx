import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Input, Select, Typography, message, Modal, Form } from 'antd';
import { ArrowLeftOutlined, SendOutlined, PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, SearchOutlined, SettingOutlined, CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface RequestTab {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status?: 'success' | 'error' | 'none';
  request: {
    url: string;
    headers: { key: string; value: string }[];
    body: string;
  };
  hasUnsavedChanges?: boolean;
}

interface SceneVariable {
  key: string;
  initialValue: string;
  currentValue: string;
  isSecret: boolean;
}

interface QueryParam {
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

interface PathParam {
  key: string;
  value: string;
  description: string;
}

interface HeaderItem {
  key: string;
  value: string;
  description: string;
  enabled: boolean;
  isAuto?: boolean;
  autoType?: 'content-type' | 'auth' | 'signature';
}

interface BodyField {
  id: string;
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value: string;
  enabled: boolean;
  children?: BodyField[];
  expanded?: boolean;
}

type AuthType = 'none' | 'bearer' | 'apiKey' | 'basic' | 'oauth2';
type ApiKeyLocation = 'header' | 'query';
type BodyType = 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'binary';
type RawFormat = 'json' | 'xml' | 'text';
type RawViewMode = 'form' | 'raw';
type RequestTabType = 'params' | 'body' | 'headers' | 'auth' | 'signature' | 'preScript';
type SignatureAlgorithm = 'HMAC-MD5' | 'HMAC-SHA256' | 'RSA-SHA256';
type SignatureTarget = 'header' | 'body' | 'query';
type SignaturePart = { id: string; value: string };

interface ScriptResult {
  success: boolean;
  message: string;
  outputs?: { variable: string; value: string; note: string }[];
}

interface HistorySession {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  body: string;
  responseBody: string;
  status: number;
  statusText: string;
  duration: number;
  timestamp: string;
  isSaved: boolean;
}

const requestTabs: RequestTabType[] = ['params', 'body', 'headers', 'auth', 'signature', 'preScript'];

export default function ApiDebugPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Tabs state
  const [tabs, setTabs] = useState<RequestTab[]>([
    {
      id: 'tc_1',
      name: 'charge',
      method: 'POST',
      status: 'success',
      request: {
        url: 'https://api.paystack.co/charge',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        body: '{"amount": 10000, "currency": "NGN"}',
      }
    },
    {
      id: 'tc_2',
      name: 'verify',
      method: 'GET',
      status: 'error',
      request: {
        url: 'https://api.paystack.co/verify/:reference',
        headers: [],
        body: '',
      }
    },
    {
      id: 'tc_3',
      name: 'refund',
      method: 'POST',
      status: 'none',
      request: {
        url: 'https://api.paystack.co/refund',
        headers: [],
        body: '{"transaction": "123"}',
      }
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tc_1');

  // Scene variables
  const [sceneVariables] = useState<SceneVariable[]>([
    { key: 'baseUrl', initialValue: 'https://api.paystack.co', currentValue: 'https://api.paystack.co', isSecret: false },
    { key: 'secretKey', initialValue: 'sk_live_xxxxx', currentValue: 'sk_live_xxxxx', isSecret: true },
    { key: 'merchantId', initialValue: 'PALMPAY_NG_001', currentValue: 'PALMPAY_NG_001', isSecret: false },
    { key: 'traceId', initialValue: 'PP20260417001', currentValue: 'PP20260417002', isSecret: false },
  ]);

  // Search
  const [searchText, setSearchText] = useState('');

  // Request state
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [method, setMethod] = useState(activeTab?.method || 'POST');
  const [url, setUrl] = useState(activeTab?.request.url || '');
  const [activeRequestTab, setActiveRequestTab] = useState<RequestTabType>('params');
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { key: 'Content-Type', value: 'application/json', description: '由报文格式自动生成', enabled: true, isAuto: true, autoType: 'content-type' },
    { key: 'X-Request-Id', value: '{{traceId}}', description: '', enabled: true, isAuto: false },
    { key: 'X-Paystack-Signature', value: '{{sign}}', description: '签名配置完成后自动插入', enabled: true, isAuto: false, autoType: 'signature' },
    { key: 'X-Debug-Mode', value: 'true', description: '', enabled: false, isAuto: false },
  ]);
  const [body, setBody] = useState(activeTab?.request.body || '');

  // Auth state
  const [authType, setAuthType] = useState<AuthType>('none');
  const [bearerToken, setBearerToken] = useState('{{secretKey}}');
  const [apiKeyName, setApiKeyName] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('{{apiKey}}');
  const [apiKeyLocation, setApiKeyLocation] = useState<ApiKeyLocation>('header');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('{{password}}');
  const [oauth2Token, setOauth2Token] = useState('{{accessToken}}');
  const [oauth2Prefix, setOauth2Prefix] = useState('Bearer');
  const [, setHasUnsavedChanges] = useState(false);

  // Body Tab state
  const [bodyType, setBodyType] = useState<BodyType>('raw');
  const [rawFormat, setRawFormat] = useState<RawFormat>('json');
  const [rawViewMode, setRawViewMode] = useState<RawViewMode>('form');
  const [bodyFields, setBodyFields] = useState<BodyField[]>([
    { id: '1', key: '', type: 'string', value: '', enabled: true, children: [], expanded: true }
  ]);
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [binaryFile, setBinaryFile] = useState<{ name: string; size: number } | null>(null);

  // Signature config state
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [signatureAlgorithm, setSignatureAlgorithm] = useState<SignatureAlgorithm>('HMAC-SHA256');
  const [signatureParts, setSignatureParts] = useState<SignaturePart[]>([
    { id: '1', value: '{{traceId}}' },
    { id: '2', value: '{{amount}}' },
    { id: '3', value: '{{currency}}' },
  ]);
  const [signatureKey, setSignatureKey] = useState('{{secretKey}}');
  const [signatureTarget, setSignatureTarget] = useState<SignatureTarget>('header');
  const [signatureHeaderName, setSignatureHeaderName] = useState('X-Paystack-Signature');
  const [signatureBodyField, setSignatureBodyField] = useState('');
  const [signatureQueryParam, setSignatureQueryParam] = useState('');

  // Pre-request script state
  const [preScript, setPreScript] = useState(`// 自动生成 traceId
pm.variables.set("traceId", pm.utils.uuid());

// 自动生成时间戳
pm.variables.set("timestamp", Date.now().toString());
`);
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
  const [showBuiltinFunctions, setShowBuiltinFunctions] = useState(false);

  // Bottom bar state
  const [timeout, setRequestTimeout] = useState(5000);
  const [isSaveSessionModalOpen, setIsSaveSessionModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [undefinedVars, setUndefinedVars] = useState<string[]>([]);

  // Response state
  const [response, setResponse] = useState<{
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string;
    duration?: number;
    size?: number;
    timestamp?: string;
  } | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'debugLog'>('body');
  const [bodyViewMode, setBodyViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [responseSize, setResponseSize] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isResponseLoading, setIsResponseLoading] = useState(false);

  // Debug log entries
  const [debugLogs, setDebugLogs] = useState<{
    step: string;
    status: 'success' | 'error';
    duration: number;
    details: { key: string; value: string; masked?: boolean }[];
  }[]>([]);
  const [expandedDebugLogs, setExpandedDebugLogs] = useState<Set<number>>(new Set());
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // History sessions (persisted to localStorage)
  const [historySessions, setHistorySessions] = useState<HistorySession[]>(() => {
    try {
      const saved = localStorage.getItem('apiDebug_history_' + (channelCode || 'default'));
      if (saved) return JSON.parse(saved);
    } catch {}

    // Mock data for testing "从 Debug 记录导入" feature
    const mockSessions: HistorySession[] = [
      {
        id: 'mock_1',
        name: 'charge 成功场景',
        method: 'POST',
        url: 'https://api.paystack.co/charge',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{secretKey}}' },
          { key: 'X-Request-Id', value: '{{traceId}}' },
        ],
        body: JSON.stringify({
          amount: 10000,
          currency: 'NGN',
          reference: '{{reference}}',
          merchantId: '{{merchantId}}',
          email: 'user@example.com',
        }),
        responseBody: JSON.stringify({
          status: true,
          message: 'Charge attempted',
          data: {
            status: 'success',
            reference: 'PS_123456',
            id: 'ch_abcdef123456',
            amount: 10000,
            currency: 'NGN',
          },
        }),
        status: 200,
        statusText: 'OK',
        duration: 324,
        timestamp: '2026-04-17 14:30',
        isSaved: false,
      },
      {
        id: 'mock_2',
        name: 'verify 查单',
        method: 'GET',
        url: 'https://api.paystack.co/verify/{{reference}}',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{secretKey}}' },
        ],
        body: '',
        responseBody: JSON.stringify({
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            reference: 'PS_123456',
            amount: 10000,
            currency: 'NGN',
          },
        }),
        status: 200,
        statusText: 'OK',
        duration: 156,
        timestamp: '2026-04-17 14:10',
        isSaved: false,
      },
      {
        id: 'mock_3',
        name: 'refund 退款',
        method: 'POST',
        url: 'https://api.paystack.co/refund',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{secretKey}}' },
        ],
        body: JSON.stringify({
          transaction: '{{transactionId}}',
          amount: 5000,
          currency: 'NGN',
        }),
        responseBody: JSON.stringify({
          status: true,
          message: 'Refund processed',
          data: {
            status: 'processed',
            id: 'rf_xyz789',
            amount: 5000,
          },
        }),
        status: 200,
        statusText: 'OK',
        duration: 512,
        timestamp: '2026-04-17 13:45',
        isSaved: false,
      },
    ];

    return mockSessions;
  });

  const [requestName, setRequestName] = useState('');
  const [pathParams, setPathParams] = useState<PathParam[]>([]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { key: '', value: '', description: '', enabled: true },
  ]);

  // Environment
  const [environment, setEnvironment] = useState('daily');

  // Rename modal
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingTab, setRenamingTab] = useState<RequestTab | null>(null);
  const [newTabName, setNewTabName] = useState('');

  // Context menu
  const [contextMenuTab, setContextMenuTab] = useState<RequestTab | null>(null);

  // Parse path params from URL
  const parsePathParamsFromUrl = (urlString: string): string[] => {
    const matches = urlString.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    return matches ? matches.map(m => m.slice(1)) : [];
  };

  // Update request state when active tab changes
  useEffect(() => {
    if (activeTab) {
      setMethod(activeTab.method);
      setUrl(activeTab.request.url);
      setHeaders(
        activeTab.request.headers.length > 0
          ? activeTab.request.headers.map(h => ({ key: h.key, value: h.value, description: '', enabled: true, isAuto: false }))
          : [{ key: '', value: '', description: '', enabled: true, isAuto: false }]
      );
      setBody(activeTab.request.body);
      setQueryParams([{ key: '', value: '', description: '', enabled: true }]);
      setRequestName(activeTab.name);
      setHasUnsavedChanges(false);
      const pathKeys = parsePathParamsFromUrl(activeTab.request.url);
      setPathParams(pathKeys.map(key => ({ key, value: '', description: '' })));
    }
  }, [activeTabId]);

  // Update path params when URL changes
  useEffect(() => {
    const pathKeys = parsePathParamsFromUrl(url);
    setPathParams(prev => {
      const newParams = pathKeys.map(key => {
        const existing = prev.find(p => p.key === key);
        return existing || { key, value: '', description: '' };
      });
      return newParams;
    });
  }, [url]);

  // Persist history sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('apiDebug_history_' + (channelCode || 'default'), JSON.stringify(historySessions));
    } catch {}
  }, [historySessions, channelCode]);

  // Add session to history
  const addHistorySession = (session: Omit<HistorySession, 'id' | 'timestamp'>) => {
    const newSession: HistorySession = {
      ...session,
      id: 'hs_' + Date.now(),
      timestamp: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0'),
    };
    setHistorySessions(prev => {
      const updated = [newSession, ...prev];
      // Keep max 50 sessions per scenario
      if (updated.length > 50) {
        return updated.slice(0, 50);
      }
      return updated;
    });
    return newSession.id;
  };

  // Delete session from history
  const deleteHistorySession = (id: string) => {
    setHistorySessions(prev => prev.filter(s => s.id !== id));
  };

  // Clear all history
  const clearAllHistory = () => {
    setHistorySessions([]);
    localStorage.removeItem('apiDebug_history_' + (channelCode || 'default'));
  };

  // Restore session to current tab
  const restoreSession = (session: HistorySession) => {
    setMethod(session.method as any);
    setUrl(session.url);
    setHeaders(session.headers.map(h => ({ key: h.key, value: h.value, description: '', enabled: true, isAuto: false })));
    setBody(session.body);
    setRequestName(session.name);
    setHasUnsavedChanges(true);
    message.success('已恢复到当前 Tab');
  };

  // Filter tabs by search
  const filteredTabs = tabs.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.request.url.toLowerCase().includes(searchText.toLowerCase())
  );

  // Get status dot color
  const getStatusDotColor = (tab: RequestTab) => {
    if (tab.status === 'success') return '#52c41a';
    if (tab.status === 'error') return '#ff4d4f';
    return 'transparent';
  };

  // Get method color
  const getMethodColor = (m: string) => {
    switch (m) {
      case 'GET': return '#52c41a';
      case 'POST': return '#fa8c16';
      case 'PUT': return '#1890ff';
      case 'DELETE': return '#ff4d4f';
      case 'PATCH': return '#722ed1';
      default: return '#999';
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status badge color
  const getStatusBadgeColor = (status?: number): string => {
    if (!status) return '#999';
    if (status >= 200 && status < 300) return '#52c41a';
    if (status >= 300 && status < 400) return '#1890ff';
    if (status >= 400 && status < 500) return '#fa8c16';
    if (status >= 500) return '#ff4d4f';
    return '#999';
  };

  // Syntax highlight JSON for display
  const syntaxHighlightJson = (json: string): React.ReactNode => {
    const lines = json.split('\n');
    return lines.map((line, idx) => {
      let highlighted = line
        .replace(/"([^"]+)":/g, '<span style="color:#92278f;font-weight:500">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span style="color:#3eb549">"$1"</span>')
        .replace(/: (-?\d+\.?\d*)/g, ': <span style="color:#45aae6">$1</span>')
        .replace(/: (true|false)/g, ': <span style="color:#fa8c16">$1</span>')
        .replace(/: (null)/g, ': <span style="color:#fa8c16">$1</span>');
      return <div key={idx} dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }} />;
    });
  };

  // Extract {{variables}} from text
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    return matches ? matches.map(m => m.replace(/\{\{|\}\}/g, '')) : [];
  };

  // Replace {{variables}} with actual values
  const replaceVariables = (text: string): string => {
    return text.replace(/\{\{([^}]+)\}\}/g, (_match, varName) => {
      const found = sceneVariables.find(v => v.key === varName);
      return found ? found.currentValue : '';
    });
  };

  // Find undefined variables in current request
  const findUndefinedVariables = (): string[] => {
    const allVarsNeeded = new Set<string>();
    extractVariables(url).forEach(v => allVarsNeeded.add(v));
    headers.forEach(h => {
      extractVariables(h.key).forEach(v => allVarsNeeded.add(v));
      extractVariables(h.value).forEach(v => allVarsNeeded.add(v));
    });
    if (bodyType !== 'raw') {
      queryParams.forEach(p => {
        extractVariables(p.key).forEach(v => allVarsNeeded.add(v));
        extractVariables(p.value).forEach(v => allVarsNeeded.add(v));
      });
    } else {
      extractVariables(body).forEach(v => allVarsNeeded.add(v));
    }
    return Array.from(allVarsNeeded).filter(
      v => !sceneVariables.some(sv => sv.key === v)
    );
  };

  // Execute pre-script (simulated)
  const executePreScript = (script: string): ScriptResult => {
    const outputs: { variable: string; value: string; note: string }[] = [];
    try {
      const setPattern = /pm\.variables\.set\s*\(\s*["']([^"']+)["']\s*,\s*(.+?)\s*\)/g;
      let match;
      while ((match = setPattern.exec(script)) !== null) {
        const varName = match[1];
        const valueExpr = match[2].trim();
        let computedValue = valueExpr;
        let note = '';
        if (valueExpr.includes('pm.utils.uuid()')) {
          computedValue = 'pp' + (crypto.randomUUID?.()?.replace(/-/g, '').substring(0, 12) || 'xxxxxxxxxxxx');
          note = 'uuid 生成';
        } else if (valueExpr.includes('Date.now()')) {
          computedValue = Date.now().toString();
          note = '时间戳';
        } else if (valueExpr.includes('pm.utils.timestamp()')) {
          computedValue = Date.now().toString();
          note = 'timestamp';
        } else if (valueExpr.includes('pm.utils.md5(')) {
          note = 'MD5 哈希';
          computedValue = '(md5 hash)';
        } else if (valueExpr.includes('pm.utils.sha256(')) {
          note = 'SHA256 哈希';
          computedValue = '(sha256 hash)';
        } else if (valueExpr.includes('pm.utils.base64(')) {
          note = 'Base64 编码';
          computedValue = '(base64 encoded)';
        } else if (valueExpr.includes('pm.variables.get("')) {
          continue;
        } else if (valueExpr.startsWith('"') || valueExpr.startsWith("'")) {
          computedValue = valueExpr.slice(1, -1);
        }
        outputs.push({ variable: varName, value: computedValue, note });
      }
      return { success: true, message: '执行成功', outputs };
    } catch (error: any) {
      return { success: false, message: '执行失败：' + error.message };
    }
  };

  // Query params management
  const updateQueryParam = (index: number, field: keyof QueryParam, val: string | boolean) => {
    const newParams = [...queryParams];
    newParams[index] = { ...newParams[index], [field]: val };
    setQueryParams(newParams);
    setHasUnsavedChanges(true);
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '', description: '', enabled: true }]);
  };

  const removeQueryParam = (index: number) => {
    if (queryParams.length > 1) {
      setQueryParams(queryParams.filter((_, i) => i !== index));
      setHasUnsavedChanges(true);
    }
  };

  // Path params management
  const updatePathParam = (index: number, field: 'value' | 'description', val: string) => {
    const newParams = [...pathParams];
    newParams[index] = { ...newParams[index], [field]: val };
    setPathParams(newParams);
    setHasUnsavedChanges(true);
  };

  // Header management
  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', description: '', enabled: true, isAuto: false }]);
  };

  const updateHeader = (index: number, field: keyof HeaderItem, val: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: val };
    setHeaders(newHeaders);
    setHasUnsavedChanges(true);
  };

  const removeHeader = (index: number) => {
    if (headers[index].isAuto) {
      message.warning('自动生成的 header 无法删除，请禁用该行');
      return;
    }
    setHeaders(headers.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // Signature part management
  const addSignaturePart = () => {
    setSignatureParts([...signatureParts, { id: 'part_' + Date.now(), value: '' }]);
    setHasUnsavedChanges(true);
  };

  const updateSignaturePart = (id: string, value: string) => {
    setSignatureParts(signatureParts.map(p => p.id === id ? { ...p, value } : p));
    setHasUnsavedChanges(true);
  };

  const removeSignaturePart = (id: string) => {
    if (signatureParts.length <= 1) {
      message.warning('至少需要保留一个签名片段');
      return;
    }
    setSignatureParts(signatureParts.filter(p => p.id !== id));
    setHasUnsavedChanges(true);
  };

  const moveSignaturePart = (fromIndex: number, toIndex: number) => {
    const newParts = [...signatureParts];
    const [moved] = newParts.splice(fromIndex, 1);
    newParts.splice(toIndex, 0, moved);
    setSignatureParts(newParts);
    setHasUnsavedChanges(true);
  };

  // Calculate signature preview
  const calculateSignaturePreview = () => {
    const allVarsDefined = signatureParts.every(p => {
      const matches = p.value.match(/\{\{([^}]+)\}\}/g);
      if (!matches) return true;
      return matches.every(varName => {
        const key = varName.replace(/\{\{|\}\}/g, '');
        return sceneVariables.some(v => v.key === key);
      });
    });
    const keyDefined = signatureKey.match(/\{\{([^}]+)\}\}/g)?.every(varName => {
      const key = varName.replace(/\{\{|\}\}/g, '');
      return sceneVariables.some(v => v.key === key);
    }) ?? true;
    const canCalculate = allVarsDefined && keyDefined;
    let rawString = signatureParts.map(p => p.value).join('');
    signatureParts.forEach(p => {
      const matches = p.value.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        matches.forEach(varName => {
          const key = varName.replace(/\{\{|\}\}/g, '');
          const found = sceneVariables.find(v => v.key === key);
          if (found) {
            rawString = rawString.replace(varName, found.currentValue);
          }
        });
      }
    });
    const displayRaw = canCalculate ? rawString : signatureParts.map(p => p.value).join('');
    const displayResult = canCalculate ? 'a3f5b2c1d4e6...' : '••••••••';
    return { raw: displayRaw, result: displayResult, canCalculate };
  };

  // Body field management
  const addBodyField = (parentId?: string) => {
    const newField: BodyField = {
      id: 'field_' + Date.now(),
      key: '',
      type: 'string',
      value: '',
      enabled: true,
      children: [],
      expanded: true
    };
    if (parentId) {
      setBodyFields(fields => {
        const addToParent = (fields: BodyField[]): BodyField[] => {
          return fields.map(f => {
            if (f.id === parentId) {
              return { ...f, children: [...(f.children || []), newField], expanded: true };
            }
            if (f.children) {
              return { ...f, children: addToParent(f.children) };
            }
            return f;
          });
        };
        return addToParent(fields);
      });
    } else {
      setBodyFields([...bodyFields, newField]);
    }
    setHasUnsavedChanges(true);
  };

  const updateBodyField = (id: string, field: keyof BodyField, value: any) => {
    setBodyFields(fields => {
      const update = (fields: BodyField[]): BodyField[] => {
        return fields.map(f => {
          if (f.id === id) {
            return { ...f, [field]: value };
          }
          if (f.children) {
            return { ...f, children: update(f.children) };
          }
          return f;
        });
      };
      return update(fields);
    });
    setHasUnsavedChanges(true);
    if (field === 'key' || field === 'value' || field === 'type' || field === 'enabled' || field === 'children') {
      syncFormToRawJson();
    }
  };

  const removeBodyField = (id: string) => {
    setBodyFields(fields => {
      const remove = (fields: BodyField[]): BodyField[] => {
        return fields.filter(f => {
          if (f.id === id) return false;
          if (f.children) f.children = remove(f.children);
          return true;
        });
      };
      return remove(fields);
    });
    setHasUnsavedChanges(true);
    syncFormToRawJson();
  };

  const toggleBodyFieldExpanded = (id: string) => {
    setBodyFields(fields => {
      const toggle = (fields: BodyField[]): BodyField[] => {
        return fields.map(f => {
          if (f.id === id) {
            return { ...f, expanded: !f.expanded };
          }
          if (f.children) {
            return { ...f, children: toggle(f.children) };
          }
          return f;
        });
      };
      return toggle(fields);
    });
  };

  // Sync form to raw JSON
  const syncFormToRawJson = () => {
    const buildJson = (fields: BodyField[]): any => {
      const obj: Record<string, any> = {};
      fields.forEach(f => {
        if (!f.enabled || !f.key) return;
        let value: any;
        switch (f.type) {
          case 'number':
            value = f.value ? Number(f.value) : 0;
            break;
          case 'boolean':
            value = f.value === 'true' || f.value === '1';
            break;
          case 'array':
            value = f.children ? buildJson(f.children) : [];
            break;
          case 'object':
            value = f.children ? buildJson(f.children) : {};
            break;
          default:
            value = f.value;
        }
        obj[f.key] = value;
      });
      return obj;
    };
    try {
      const json = buildJson(bodyFields);
      setRawJsonText(JSON.stringify(json, null, 2));
      setJsonParseError(null);
    } catch (e) {
      // Ignore
    }
  };

  // Sync raw JSON to form
  const syncRawJsonToForm = (jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText);
      const buildFields = (obj: Record<string, any>): BodyField[] => {
        return Object.entries(obj).map(([key, value]) => {
          let type: BodyField['type'] = 'string';
          let children: BodyField[] | undefined;
          let displayValue = String(value);
          if (Array.isArray(value)) {
            type = 'array';
            children = value.length > 0 && typeof value[0] === 'object'
              ? buildFields(value[0] as Record<string, any>)
              : [{ id: 'temp_' + Date.now(), key: '0', type: 'string', value: String(value[0]), enabled: true, children: [] }];
          } else if (value !== null && typeof value === 'object') {
            type = 'object';
            children = buildFields(value as Record<string, any>);
          } else if (typeof value === 'number') {
            type = 'number';
            displayValue = String(value);
          } else if (typeof value === 'boolean') {
            type = 'boolean';
            displayValue = String(value);
          }
          return {
            id: 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            key,
            type,
            value: displayValue,
            enabled: true,
            children,
            expanded: true
          };
        });
      };
      if (typeof parsed === 'object' && parsed !== null) {
        setBodyFields(buildFields(parsed));
      }
      setJsonParseError(null);
      return true;
    } catch (e) {
      setJsonParseError('JSON 格式有误，无法同步到表单模式');
      return false;
    }
  };

  // Format JSON
  const formatJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
      setJsonParseError(null);
    } catch (e) {
      setJsonParseError('JSON 格式有误');
    }
  };

  // Render body field row (recursive)
  const renderBodyFieldRow = (field: BodyField, depth: number): React.ReactNode => {
    const hasChildren = field.type === 'object' || field.type === 'array';
    const leftPadding = depth * 24;
    return (
      <>
        <tr style={{ background: field.enabled ? '#fff' : '#f5f5f5' }}>
          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
            <input type="checkbox" checked={field.enabled} onChange={(e) => updateBodyField(field.id, 'enabled', e.target.checked)} style={{ cursor: 'pointer' }} />
          </td>
          <td style={{ padding: '4px 4px', paddingLeft: 8 + leftPadding }}>
            {hasChildren && (
              <span onClick={() => toggleBodyFieldExpanded(field.id)} style={{ cursor: 'pointer', marginRight: 4, fontSize: 10 }}>
                {field.expanded ? '▼' : '▶'}
              </span>
            )}
            <Input placeholder="字段名" value={field.key} onChange={(e) => updateBodyField(field.id, 'key', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: field.enabled ? '#fff' : '#f5f5f5', width: 120 }} />
          </td>
          <td style={{ padding: '4px 8px' }}>
            <Select value={field.type} onChange={(v) => updateBodyField(field.id, 'type', v)} style={{ width: 80, fontSize: 11 }} size="small">
              <Select.Option value="string">String</Select.Option>
              <Select.Option value="number">Number</Select.Option>
              <Select.Option value="boolean">Boolean</Select.Option>
              <Select.Option value="object">Object</Select.Option>
              <Select.Option value="array">Array</Select.Option>
            </Select>
          </td>
          <td style={{ padding: '4px 8px' }}>
            {hasChildren ? (
              <Text type="secondary" style={{ fontSize: 11 }}>{field.type === 'array' ? 'Array' : 'Object'}</Text>
            ) : (
              <Input placeholder="值" value={field.value} onChange={(e) => updateBodyField(field.id, 'value', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: field.enabled ? '#fff' : '#f5f5f5', color: field.value.includes('{{') && field.value.includes('}}') ? '#fa8c16' : '#000' }} />
            )}
          </td>
          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
            <Space size={4}>
              {hasChildren && <Button type="text" size="small" onClick={() => addBodyField(field.id)} style={{ fontSize: 11, padding: '0 4px' }}>+</Button>}
              <Button type="text" danger size="small" onClick={() => removeBodyField(field.id)} style={{ fontSize: 11, padding: '0 4px' }}>🗑</Button>
            </Space>
          </td>
        </tr>
        {hasChildren && field.expanded && field.children?.map(child => renderBodyFieldRow(child, depth + 1))}
      </>
    );
  };

  // Create new tab
  const createNewTab = () => {
    const newTab: RequestTab = {
      id: 'tc_' + Date.now(),
      name: 'new_request',
      method: 'POST',
      status: 'none',
      request: { url: '', headers: [{ key: 'Content-Type', value: 'application/json' }], body: '' }
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setActiveRequestTab('params');
  };

  // Close tab
  const closeTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      if (tabIndex > 0) setActiveTabId(newTabs[tabIndex - 1].id);
      else if (newTabs.length > 0) setActiveTabId(newTabs[0].id);
    }
  };

  // Close other tabs
  const closeOtherTabs = (tabId: string) => {
    setTabs(tabs.filter(t => t.id === tabId));
    setActiveTabId(tabId);
  };

  // Duplicate tab
  const duplicateTab = (tab: RequestTab) => {
    const newTab: RequestTab = { ...tab, id: 'tc_' + Date.now(), name: tab.name + '_copy', status: 'none', hasUnsavedChanges: true };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    message.success('已复制');
  };

  // Open rename modal
  const openRenameModal = (tab: RequestTab) => {
    setRenamingTab(tab);
    setNewTabName(tab.name);
    setIsRenameModalOpen(true);
  };

  // Rename tab
  const handleRename = () => {
    if (renamingTab && newTabName.trim()) {
      setTabs(tabs.map(t => t.id === renamingTab.id ? { ...t, name: newTabName.trim() } : t));
      setIsRenameModalOpen(false);
      message.success('已重命名');
    }
  };

  // Send request with full execution flow
  const handleSend = async () => {
    if (!url) {
      message.warning('请输入请求地址');
      return;
    }

    // Reset debug logs
    const logs: typeof debugLogs = [];
    const addDebugLog = (step: string, status: 'success' | 'error', duration: number, details: { key: string; value: string; masked?: boolean }[]) => {
      logs.push({ step, status, duration, details });
    };

    // Start loading state
    setIsResponseLoading(true);
    setResponse(null);
    setResponseTab('body');
    setBodyViewMode('pretty');
    setElapsedTime(0);
    const timerInterval = window.setInterval(() => {
      setElapsedTime(prev => prev + 100);
    }, 100);

    // Check undefined variables
    const undefinedInRequest = findUndefinedVariables();
    if (undefinedInRequest.length > 0) {
      setUndefinedVars(undefinedInRequest);
      message.warning('变量 ' + undefinedInRequest.join(', ') + ' 未定义，已以空字符串替代');
    } else {
      setUndefinedVars([]);
    }

    // Step 1: Execute Pre-request Script
    const scriptStart = Date.now();
    setRequestStatus('正在执行 Pre-request Script...');
    await new Promise(resolve => window.setTimeout(resolve, 100));

    const scriptExecResult = executePreScript(preScript);
    const scriptDuration = Date.now() - scriptStart;
    if (scriptExecResult.success && scriptExecResult.outputs) {
      const scriptDetails = scriptExecResult.outputs.map(out => ({ key: out.variable, value: out.value }));
      addDebugLog('Pre-request Script 执行', 'success', scriptDuration, scriptDetails);
      scriptExecResult.outputs.forEach(output => {
        console.log('Script set ' + output.variable + ' = ' + output.value);
      });
    } else if (scriptExecResult.message) {
      addDebugLog('Pre-request Script 执行', 'error', scriptDuration, [{ key: '错误', value: scriptExecResult.message }]);
    }
    setRequestStatus(null);

    // Step 2: Variable replacement
    const varStart = Date.now();
    const replacedUrl = replaceVariables(url);
    const varReplacementDetails: { key: string; value: string; masked?: boolean }[] = [];
    const urlVars = extractVariables(url);
    urlVars.forEach(v => {
      const variable = sceneVariables.find(sv => sv.key === v);
      if (variable) {
        varReplacementDetails.push({ key: '{{' + v + '}}', value: variable.currentValue, masked: variable.isSecret });
      }
    });
    addDebugLog('变量替换', 'success', Date.now() - varStart, varReplacementDetails);

    // Step 3: Build URL with query params
    let fullUrl = replacedUrl;
    const enabledQueryParams = queryParams.filter(p => p.enabled && p.key);
    if (enabledQueryParams.length > 0) {
      const queryString = enabledQueryParams
        .map(p => encodeURIComponent(replaceVariables(p.key)) + '=' + encodeURIComponent(replaceVariables(p.value)))
        .join('&');
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl = fullUrl + separator + queryString;
    }

    pathParams.forEach(p => {
      if (p.value) {
        fullUrl = fullUrl.replace(':' + p.key, replaceVariables(p.value));
      }
    });

    // Step 4: Calculate signature if enabled
    const sigStart = Date.now();
    if (signatureEnabled) {
      setRequestStatus('正在计算签名...');
      await new Promise(resolve => window.setTimeout(resolve, 50));
      addDebugLog('签名串拼接', 'success', Date.now() - sigStart, [
        { key: '拼接规则', value: signatureParts.map(p => p.value).join(' + ') },
        { key: '签名原文', value: signatureParts.map(p => replaceVariables(p.value)).join('') },
        { key: signatureAlgorithm, value: '已计算' },
        { key: '写入 Header', value: signatureHeaderName },
      ]);
      setRequestStatus(null);
    }

    // Step 5: Send HTTP request
    setRequestStatus('正在请求 ' + method + ' ' + fullUrl + ' ...');
    const startTime = Date.now();
    setIsRequesting(true);

    try {
      const headersObj: Record<string, string> = {};
      headers.forEach(h => {
        if (h.enabled && h.key && h.value) {
          const key = replaceVariables(h.key);
          const value = replaceVariables(h.value);
          if (key && value) {
            headersObj[key] = value;
          }
        }
      });

      // Auth headers
      if (authType === 'bearer') {
        headersObj['Authorization'] = 'Bearer ' + replaceVariables(bearerToken);
      } else if (authType === 'basic') {
        headersObj['Authorization'] = 'Basic ' + btoa(replaceVariables(basicUsername) + ':' + replaceVariables(basicPassword));
      } else if (authType === 'apiKey' && apiKeyLocation === 'header') {
        headersObj[replaceVariables(apiKeyName)] = replaceVariables(apiKeyValue);
      } else if (authType === 'oauth2') {
        headersObj['Authorization'] = replaceVariables(oauth2Prefix) + ' ' + replaceVariables(oauth2Token);
      }

      let requestBody = body;
      if (bodyType === 'raw') {
        requestBody = replaceVariables(body);
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeout);

      const res = await fetch(fullUrl, {
        method,
        headers: headersObj,
        body: method !== 'GET' ? requestBody : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      window.clearInterval(timerInterval);

      const duration = Date.now() - startTime;
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await res.text();
      const size = new Blob([responseBody]).size;
      const now = new Date();
      const timestamp = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

      // Add HTTP send log
      addDebugLog('HTTP 发送', 'success', duration, [
        { key: method, value: fullUrl },
        { key: '→', value: res.status + ' ' + res.statusText + '  ' + formatBytes(size) },
      ]);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        duration,
        size,
        timestamp,
      });
      setResponseSize(size);
      setDebugLogs(logs);
      setElapsedTime(0);

      setTabs(tabs.map(t => t.id === activeTabId ? { ...t, status: res.status < 400 ? 'success' : 'error' } : t));

      // Add to history sessions
      const sessionName = requestName || '未命名';
      addHistorySession({
        name: sessionName,
        method,
        url: fullUrl,
        headers: Object.entries(headersObj).map(([key, value]) => ({ key, value })),
        body: requestBody || '',
        responseBody: responseBody,
        status: res.status,
        statusText: res.statusText,
        duration,
        isSaved: false,
      });

      setRequestStatus(null);
      message.success('请求完成 (' + duration + 'ms)');
    } catch (error: any) {
      window.clearInterval(timerInterval);
      const duration = Date.now() - startTime;
      const now = new Date();
      const timestamp = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

      addDebugLog('HTTP 发送', 'error', duration, [
        { key: method, value: url },
        { key: '错误', value: error.name === 'AbortError' ? '请求超时' : error.message },
      ]);

      setResponse({
        status: 0,
        statusText: error.name === 'AbortError' ? 'Timeout' : 'Network Error',
        body: error.message,
        duration,
        size: 0,
        timestamp,
      });
      setResponseSize(0);
      setDebugLogs(logs);
      setElapsedTime(0);

      setTabs(tabs.map(t => t.id === activeTabId ? { ...t, status: 'error' } : t));

      // Add to history sessions (error case - use current state values)
      const errorSessionName = requestName || '未命名';
      const errorHeaders = headers.filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: replaceVariables(h.value) }));
      const errorBody = bodyType === 'raw' ? replaceVariables(body) : body;
      addHistorySession({
        name: errorSessionName,
        method,
        url: fullUrl,
        headers: errorHeaders,
        body: errorBody,
        responseBody: '',
        status: 0,
        statusText: error.name === 'AbortError' ? 'Timeout' : 'Network Error',
        duration,
        isSaved: false,
      });

      setRequestStatus(null);
      message.error(error.name === 'AbortError' ? '请求超时' : '请求失败');
    } finally {
      setIsRequesting(false);
      setIsResponseLoading(false);
    }
  };

  // Cancel request
  const handleCancel = () => {
    setIsRequesting(false);
    setRequestStatus(null);
    message.info('请求已取消');
  };

  const handleBack = () => {
    navigate('/channel-integration/' + channelCode + '/scenes');
  };

  // Render context menu
  const renderContextMenu = (tab: RequestTab) => (
    <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '4px 0', minWidth: 150 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { closeTab(tab.id); setContextMenuTab(null); }}>
        <CloseOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>关闭</span>
      </div>
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { closeOtherTabs(tab.id); setContextMenuTab(null); }}>
        <DeleteOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>关闭其他所有</span>
      </div>
      <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { duplicateTab(tab); setContextMenuTab(null); }}>
        <CopyOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>复制请求</span>
      </div>
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { openRenameModal(tab); setContextMenuTab(null); }}>
        <EditOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>重命名</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="small" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>API Debug</span>
            <Tag color="blue">{channelCode}</Tag>
          </Space>
          <Space size="middle">
            <Select value={environment} onChange={setEnvironment} style={{ width: 100 }}>
              <Select.Option value="daily">Daily</Select.Option>
              <Select.Option value="pre">Pre</Select.Option>
              <Select.Option value="prod">Prod</Select.Option>
            </Select>
          </Space>
        </div>
      </Card>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingBottom: isHistoryExpanded ? 152 : 32 }}>
        {/* Left Panel */}
        <div style={{ width: 220, borderRight: '1px solid #f0f0f0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Input placeholder="搜索用例" prefix={<SearchOutlined style={{ color: '#999' }} />} value={searchText} onChange={(e) => setSearchText(e.target.value)} size="small" allowClear />
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 12 }}>场景用例</Text>
              <Button type="text" size="small" icon={<PlusOutlined />} onClick={createNewTab}>新建</Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              {filteredTabs.length === 0 ? (
                <div style={{ padding: 12 }}><Text type="secondary" style={{ fontSize: 11 }}>暂无用例</Text></div>
              ) : (
                filteredTabs.map(tab => (
                  <div key={tab.id} onClick={() => setActiveTabId(tab.id)} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer', background: activeTabId === tab.id ? '#e6f7ff' : 'transparent', borderBottom: '1px solid #f5f5f5', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusDotColor(tab), flexShrink: 0 }} />
                    <Tag style={{ fontSize: 9, padding: '0 2px', margin: 0, background: getMethodColor(tab.method), border: 'none', color: '#fff' }}>{tab.method}</Tag>
                    <Text ellipsis style={{ flex: 1, fontSize: 12 }}>{tab.name}</Text>
                  </div>
                ))
              )}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 12 }}>场景变量</Text>
              <Button type="text" size="small" icon={<SettingOutlined />}>管理</Button>
            </div>
            <div style={{ padding: '4px 12px', maxHeight: 160, overflow: 'auto' }}>
              {sceneVariables.map(v => (
                <div key={v.key} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', fontSize: 11, gap: 4 }}>
                  <Text style={{ width: 60, color: '#666', flexShrink: 0 }}>{v.key}</Text>
                  <Text ellipsis style={{ flex: 1, color: '#999', fontFamily: 'Monospace' }}>{v.isSecret ? '••••••••' : v.currentValue}</Text>
                  {v.currentValue !== v.initialValue && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fa8c16', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle - Request Builder */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #f0f0f0', background: '#fff' }}>
          {/* Request Tab Bar */}
          <div style={{ height: 40, background: '#f5f5f5', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <div ref={tabContainerRef} style={{ display: 'flex', flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map(tab => (
                <div key={tab.id} onClick={() => setActiveTabId(tab.id)} onContextMenu={(e) => { e.preventDefault(); setContextMenuTab(tab); }} style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 40, cursor: 'pointer', background: activeTabId === tab.id ? '#fff' : 'transparent', borderBottom: activeTabId === tab.id ? '2px solid #1890ff' : '2px solid transparent', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: tab.status === 'success' ? '#52c41a' : tab.status === 'error' ? '#ff4d4f' : 'transparent' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '2px', background: getMethodColor(tab.method) }} />
                  <Text style={{ fontSize: 12, maxWidth: 100 }} ellipsis>{tab.name || 'Untitled'}</Text>
                  {tab.hasUnsavedChanges && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fa8c16' }} />}
                  <CloseOutlined style={{ fontSize: 10, color: '#999', marginLeft: 4 }} onClick={(e) => closeTab(tab.id, e)} />
                </div>
              ))}
            </div>
            <Button type="text" icon={<PlusOutlined />} onClick={createNewTab} style={{ height: 40, flexShrink: 0 }} />
          </div>

          {contextMenuTab && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setContextMenuTab(null)} />
              <div style={{ position: 'absolute', top: 50, left: 220, zIndex: 1000 }}>{renderContextMenu(contextMenuTab)}</div>
            </>
          )}

          {/* Request URL Bar */}
          <div style={{ height: 48, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
            <Select value={method} onChange={(v) => { setMethod(v); setHasUnsavedChanges(true); }} style={{ width: 100 }}>
              <Select.Option value="GET"><span style={{ color: getMethodColor('GET'), fontWeight: 600 }}>GET</span></Select.Option>
              <Select.Option value="POST"><span style={{ color: getMethodColor('POST'), fontWeight: 600 }}>POST</span></Select.Option>
              <Select.Option value="PUT"><span style={{ color: getMethodColor('PUT'), fontWeight: 600 }}>PUT</span></Select.Option>
              <Select.Option value="PATCH"><span style={{ color: getMethodColor('PATCH'), fontWeight: 600 }}>PATCH</span></Select.Option>
              <Select.Option value="DELETE"><span style={{ color: getMethodColor('DELETE'), fontWeight: 600 }}>DELETE</span></Select.Option>
            </Select>
            <Input placeholder="https://api.example.com/endpoint" value={url} onChange={(e) => { setUrl(e.target.value); setHasUnsavedChanges(true); }} style={{ flex: 1 }} />
            {isRequesting ? (
              <Button danger onClick={handleCancel} style={{ width: 80 }}>⏹ 取消</Button>
            ) : (
              <Button type="primary" icon={<SendOutlined />} onClick={handleSend} style={{ width: 80 }}>▶ Send</Button>
            )}
          </div>

          {/* Interface Name Row */}
          <div style={{ height: 32, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>接口名称：</Text>
            <Input placeholder="选填，用于保存用例" value={requestName} onChange={(e) => { setRequestName(e.target.value); setHasUnsavedChanges(true); }} bordered={false} style={{ flex: 1, fontSize: 12 }} />
          </div>

          {/* Request Content Tabs */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
              {requestTabs.map(key => (
                <div key={key} onClick={() => setActiveRequestTab(key)} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: activeRequestTab === key ? '2px solid #1890ff' : '2px solid transparent', color: activeRequestTab === key ? '#1890ff' : '#666', fontSize: 12 }}>
                  {key === 'params' ? 'Params' : key === 'body' ? 'Body' : key === 'headers' ? 'Headers' : key === 'auth' ? 'Auth' : key === 'signature' ? '签名配置' : key === 'preScript' ? 'Pre-request Script' : key}
                </div>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {activeRequestTab === 'params' && (
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Query Params</Text>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>启用</th>
                          <th style={{ width: 180, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Key</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Description</th>
                          <th style={{ width: 60, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queryParams.map((param, idx) => (
                          <tr key={idx} style={{ background: param.enabled ? '#fff' : '#f5f5f5' }}>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}><input type="checkbox" checked={param.enabled} onChange={(e) => updateQueryParam(idx, 'enabled', e.target.checked)} style={{ cursor: 'pointer' }} /></td>
                            <td style={{ padding: '4px 8px' }}><Input placeholder="key" value={param.key} onChange={(e) => updateQueryParam(idx, 'key', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: param.enabled ? '#fff' : '#f5f5f5' }} /></td>
                            <td style={{ padding: '4px 8px' }}><Input placeholder="value" value={param.value} onChange={(e) => updateQueryParam(idx, 'value', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: param.enabled ? '#fff' : '#f5f5f5' }} /></td>
                            <td style={{ padding: '4px 8px' }}><Input placeholder="description" value={param.description} onChange={(e) => updateQueryParam(idx, 'description', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: param.enabled ? '#fff' : '#f5f5f5' }} /></td>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}><Button type="text" danger size="small" onClick={() => removeQueryParam(idx)} disabled={queryParams.length === 1} style={{ fontSize: 11 }}>🗑</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button type="link" size="small" onClick={addQueryParam} style={{ marginTop: 8, padding: 0, fontSize: 11 }}>+ Add Query Param</Button>
                  </div>
                  {pathParams.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>Path 参数根据 URL 中的 :param 自动识别，请填写对应值</Text>
                      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Path Params</Text>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ width: 180, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Key</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pathParams.map((param, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '4px 8px' }}><Text code style={{ fontSize: 12 }}>{param.key}</Text></td>
                              <td style={{ padding: '4px 8px' }}><Input placeholder="value" value={param.value} onChange={(e) => updatePathParam(idx, 'value', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0' }} /></td>
                              <td style={{ padding: '4px 8px' }}><Input placeholder="description" value={param.description} onChange={(e) => updatePathParam(idx, 'description', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0' }} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeRequestTab === 'headers' && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>启用</th>
                        <th style={{ width: 180, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Key</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Description</th>
                        <th style={{ width: 60, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headers.filter(h => !h.isAuto).map((header, idx) => {
                        const realIndex = headers.findIndex(h => h.key === header.key);
                        return (
                          <tr key={idx} style={{ background: header.enabled ? '#fff' : '#f5f5f5' }}>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}><input type="checkbox" checked={header.enabled} onChange={(e) => updateHeader(realIndex, 'enabled', e.target.checked)} style={{ cursor: 'pointer' }} /></td>
                            <td style={{ padding: '4px 8px' }}><Input placeholder="Header Name" value={header.key} onChange={(e) => updateHeader(realIndex, 'key', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: header.enabled ? '#fff' : '#f5f5f5' }} /></td>
                            <td style={{ padding: '4px 8px' }}><Input placeholder="Header Value" value={header.value} onChange={(e) => updateHeader(realIndex, 'value', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: header.enabled ? '#fff' : '#f5f5f5', color: header.value.includes('{{') ? '#fa8c16' : '#000' }} /></td>
                            <td style={{ padding: '4px 8px' }}><Input placeholder="description" value={header.description} onChange={(e) => updateHeader(realIndex, 'description', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: header.enabled ? '#fff' : '#f5f5f5' }} /></td>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}><Button type="text" danger size="small" onClick={() => removeHeader(realIndex)} style={{ fontSize: 11 }}>🗑</Button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Button type="link" size="small" onClick={addHeader} style={{ marginTop: 8, padding: 0, fontSize: 11 }}>+ 添加 Header</Button>
                  {headers.filter(h => h.isAuto).length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>自动生成</Text>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {headers.filter(h => h.isAuto).map((header, idx) => {
                            const realIndex = headers.findIndex(h => h.key === header.key && h.autoType === header.autoType);
                            return (
                              <tr key={idx} style={{ background: header.enabled ? '#fafafa' : '#f5f5f5' }}>
                                <td style={{ padding: '4px 8px', textAlign: 'center' }}><input type="checkbox" checked={header.enabled} onChange={(e) => updateHeader(realIndex, 'enabled', e.target.checked)} style={{ cursor: 'pointer' }} disabled={header.autoType === 'content-type'} /></td>
                                <td style={{ padding: '4px 8px' }}><Text style={{ fontSize: 12, color: header.enabled ? '#000' : '#999' }}>{header.key}</Text></td>
                                <td style={{ padding: '4px 8px' }}><Input value={header.value} onChange={(e) => updateHeader(realIndex, 'value', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: 'transparent', color: header.value.includes('{{') ? '#fa8c16' : '#999' }} disabled={header.autoType === 'content-type'} /></td>
                                <td style={{ padding: '4px 8px' }}><Text type="secondary" style={{ fontSize: 11 }}>{header.description}</Text></td>
                                <td style={{ padding: '4px 8px', textAlign: 'center' }}><Button type="text" disabled size="small" style={{ fontSize: 11, color: '#ccc' }}>—</Button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeRequestTab === 'body' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <Space size="middle">
                      {(['raw', 'form-data', 'x-www-form-urlencoded', 'binary'] as BodyType[]).map(type => (
                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                          <input type="radio" name="bodyType" checked={bodyType === type} onChange={() => setBodyType(type)} style={{ cursor: 'pointer' }} />
                          {type === 'form-data' ? 'form-data' : type === 'x-www-form-urlencoded' ? 'x-www-form-urlencoded' : type}
                        </label>
                      ))}
                    </Space>
                    {bodyType === 'raw' && (
                      <>
                        <Select value={rawFormat} onChange={setRawFormat} style={{ width: 100, marginLeft: 16 }} size="small">
                          <Select.Option value="json">JSON</Select.Option>
                          <Select.Option value="xml">XML</Select.Option>
                          <Select.Option value="text">Text</Select.Option>
                        </Select>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <Button size="small" type={rawViewMode === 'form' ? 'primary' : 'default'} onClick={() => { if (rawViewMode === 'raw' && jsonParseError) { Modal.warning({ title: 'JSON 格式有误，无法同步到表单模式' }); return; } setRawViewMode('form'); }}>表单模式</Button>
                          <Button size="small" type={rawViewMode === 'raw' ? 'primary' : 'default'} onClick={() => { setRawViewMode('raw'); syncFormToRawJson(); }}>原始 JSON</Button>
                        </div>
                      </>
                    )}
                  </div>

                  {bodyType === 'raw' && rawFormat === 'json' && (
                    <>
                      {rawViewMode === 'form' ? (
                        <div>
                          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>JSON 表单</Text>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#fafafa' }}>
                                <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>启用</th>
                                <th style={{ width: 160, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>字段名</th>
                                <th style={{ width: 100, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>类型</th>
                                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>值</th>
                                <th style={{ width: 80, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>操作</th>
                              </tr>
                            </thead>
                            <tbody>{bodyFields.map(field => renderBodyFieldRow(field, 0))}</tbody>
                          </table>
                          <Button type="link" size="small" onClick={() => addBodyField()} style={{ marginTop: 8, padding: 0, fontSize: 11 }}>+ Add Field</Button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><Button size="small" onClick={formatJson}>格式化</Button></div>
                          <TextArea rows={16} value={rawJsonText} onChange={(e) => { setRawJsonText(e.target.value); setHasUnsavedChanges(true); window.setTimeout(() => { syncRawJsonToForm(e.target.value); }, 600); }} style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: 12, borderColor: jsonParseError ? '#ff4d4f' : undefined }} placeholder='{\n  "key": "value"\n}' />
                          {jsonParseError && <Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{jsonParseError}</Text>}
                        </div>
                      )}
                    </>
                  )}

                  {bodyType === 'raw' && rawFormat !== 'json' && (
                    <TextArea rows={12} placeholder={rawFormat === 'xml' ? '<xml>...</xml>' : 'Enter text...'} value={body} onChange={(e) => { setBody(e.target.value); setHasUnsavedChanges(true); }} style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: 12 }} />
                  )}

                  {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
                    <div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>启用</th>
                            <th style={{ width: 180, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Key</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Description</th>
                            <th style={{ width: 60, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queryParams.map((param, idx) => (
                            <tr key={idx} style={{ background: param.enabled ? '#fff' : '#f5f5f5' }}>
                              <td style={{ padding: '4px 8px', textAlign: 'center' }}><input type="checkbox" checked={param.enabled} onChange={(e) => updateQueryParam(idx, 'enabled', e.target.checked)} style={{ cursor: 'pointer' }} /></td>
                              <td style={{ padding: '4px 8px' }}><Input placeholder="key" value={param.key} onChange={(e) => updateQueryParam(idx, 'key', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: param.enabled ? '#fff' : '#f5f5f5' }} /></td>
                              <td style={{ padding: '4px 8px' }}><Input placeholder="value" value={param.value} onChange={(e) => updateQueryParam(idx, 'value', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: param.enabled ? '#fff' : '#f5f5f5' }} /></td>
                              <td style={{ padding: '4px 8px' }}><Input placeholder="description" value={param.description} onChange={(e) => updateQueryParam(idx, 'description', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: param.enabled ? '#fff' : '#f5f5f5' }} /></td>
                              <td style={{ padding: '4px 8px', textAlign: 'center' }}><Button type="text" danger size="small" onClick={() => removeQueryParam(idx)} disabled={queryParams.length === 1} style={{ fontSize: 11 }}>🗑</Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <Button type="link" size="small" onClick={addQueryParam} style={{ marginTop: 8, padding: 0, fontSize: 11 }}>+ Add Field</Button>
                    </div>
                  )}

                  {bodyType === 'binary' && (
                    <div>
                      <input type="file" id="binaryFile" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (file) setBinaryFile({ name: file.name, size: file.size }); }} />
                      <label htmlFor="binaryFile">
                        <div style={{ border: '2px dashed #d9d9d9', borderRadius: 4, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa' }} onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#1890ff'; }} onDragLeave={(e) => { e.currentTarget.style.borderColor = '#d9d9d9'; }} onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#d9d9d9'; const file = e.dataTransfer.files?.[0]; if (file) setBinaryFile({ name: file.name, size: file.size }); }}>
                          {binaryFile ? (
                            <div>
                              <Text style={{ fontSize: 14 }}>{binaryFile.name}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 11 }}>{(binaryFile.size / 1024).toFixed(2)} KB</Text>
                              <br />
                              <Button type="link" size="small" onClick={(e) => { e.preventDefault(); setBinaryFile(null); }}>移除</Button>
                            </div>
                          ) : (
                            <Text type="secondary" style={{ fontSize: 12 }}>点击上传或拖拽文件到此处</Text>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {activeRequestTab === 'auth' && (
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>认证类型</Text>
                    <Select value={authType} onChange={(v) => { setAuthType(v); setHasUnsavedChanges(true); }} style={{ width: 200 }}>
                      <Select.Option value="none">None</Select.Option>
                      <Select.Option value="bearer">Bearer Token</Select.Option>
                      <Select.Option value="apiKey">API Key</Select.Option>
                      <Select.Option value="basic">Basic Auth</Select.Option>
                      <Select.Option value="oauth2">OAuth2</Select.Option>
                    </Select>
                  </div>
                  {authType === 'bearer' && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Token</Text>
                        <Input placeholder="Enter token" value={bearerToken} onChange={(e) => { setBearerToken(e.target.value); setHasUnsavedChanges(true); }} addonBefore="Bearer" style={{ width: 400, color: bearerToken.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>将自动添加 Authorization: Bearer {bearerToken || '{token}'} 到 Headers</Text>
                    </div>
                  )}
                  {authType === 'apiKey' && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Key 名称</Text>
                        <Input placeholder="X-API-Key" value={apiKeyName} onChange={(e) => { setApiKeyName(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 300, color: apiKeyName.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Key 值</Text>
                        <Input placeholder="API Key value" value={apiKeyValue} onChange={(e) => { setApiKeyValue(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 400, color: apiKeyValue.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <div>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>添加位置</Text>
                        <Space size="middle">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}><input type="radio" name="apiKeyLocation" checked={apiKeyLocation === 'header'} onChange={() => { setApiKeyLocation('header'); setHasUnsavedChanges(true); }} />Header</label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}><input type="radio" name="apiKeyLocation" checked={apiKeyLocation === 'query'} onChange={() => { setApiKeyLocation('query'); setHasUnsavedChanges(true); }} />Query Param</label>
                        </Space>
                      </div>
                    </div>
                  )}
                  {authType === 'basic' && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>用户名</Text>
                        <Input placeholder="Username" value={basicUsername} onChange={(e) => { setBasicUsername(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 300 }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>密码</Text>
                        <Input placeholder="Password" value={basicPassword} onChange={(e) => { setBasicPassword(e.target.value); setHasUnsavedChanges(true); }} type="password" style={{ width: 300, color: basicPassword.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>将自动添加 Authorization: Basic {'{base64(username:password)}'} 到 Headers</Text>
                    </div>
                  )}
                  {authType === 'oauth2' && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Access Token</Text>
                        <Input placeholder="Access Token" value={oauth2Token} onChange={(e) => { setOauth2Token(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 400, color: oauth2Token.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Token 前缀</Text>
                        <Input placeholder="Bearer" value={oauth2Prefix} onChange={(e) => { setOauth2Prefix(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 150 }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>将自动添加 Authorization: {oauth2Prefix || 'Bearer'} {'{accessToken}'} 到 Headers</Text>
                    </div>
                  )}
                  {authType === 'none' && <Text type="secondary" style={{ fontSize: 12 }}>不添加任何认证信息</Text>}
                </div>
              )}

              {activeRequestTab === 'signature' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <Text strong style={{ fontSize: 12 }}>启用签名</Text>
                    <input type="checkbox" checked={signatureEnabled} onChange={(e) => { setSignatureEnabled(e.target.checked); setHasUnsavedChanges(true); }} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                  </div>
                  <div style={{ opacity: signatureEnabled ? 1 : 0.5, pointerEvents: signatureEnabled ? 'auto' : 'none' }}>
                    <div style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>签名算法</Text>
                      <Select value={signatureAlgorithm} onChange={(v) => { setSignatureAlgorithm(v); setHasUnsavedChanges(true); }} style={{ width: 180 }}>
                        <Select.Option value="HMAC-MD5">HMAC-MD5</Select.Option>
                        <Select.Option value="HMAC-SHA256">HMAC-SHA256</Select.Option>
                        <Select.Option value="RSA-SHA256">RSA-SHA256</Select.Option>
                      </Select>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>签名串组成（按顺序拼接）</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {signatureParts.map((part, idx) => (
                          <div key={part.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11, width: 20 }}>{idx + 1}.</Text>
                            <Input placeholder="输入签名片段" value={part.value} onChange={(e) => updateSignaturePart(part.id, e.target.value)} style={{ flex: 1, color: part.value.includes('{{') ? '#fa8c16' : '#000' }} />
                            <Button type="text" size="small" onClick={() => moveSignaturePart(idx, Math.max(0, idx - 1))} disabled={idx === 0} style={{ fontSize: 12 }}>↑</Button>
                            <Button type="text" size="small" onClick={() => moveSignaturePart(idx, Math.min(signatureParts.length - 1, idx + 1))} disabled={idx === signatureParts.length - 1} style={{ fontSize: 12 }}>↓</Button>
                            <Button type="text" danger size="small" onClick={() => removeSignaturePart(part.id)} style={{ fontSize: 11 }}>🗑</Button>
                          </div>
                        ))}
                      </div>
                      <Button type="link" size="small" onClick={addSignaturePart} style={{ marginTop: 8, padding: 0, fontSize: 11 }}>+ 添加片段</Button>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>签名密钥</Text>
                      <Input placeholder="输入密钥" value={signatureKey} onChange={(e) => { setSignatureKey(e.target.value); setHasUnsavedChanges(true); }} addonBefore="密钥来源" style={{ width: 400, color: signatureKey.includes('{{') ? '#fa8c16' : '#000' }} />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>签名结果写入位置</Text>
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" name="signatureTarget" checked={signatureTarget === 'header'} onChange={() => { setSignatureTarget('header'); setHasUnsavedChanges(true); }} style={{ cursor: 'pointer' }} />
                          <Text style={{ fontSize: 12 }}>Header</Text>
                          <Input placeholder="X-Paystack-Signature" value={signatureHeaderName} onChange={(e) => { setSignatureHeaderName(e.target.value); setHasUnsavedChanges(true); }} disabled={signatureTarget !== 'header'} style={{ width: 200, fontSize: 12 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" name="signatureTarget" checked={signatureTarget === 'body'} onChange={() => { setSignatureTarget('body'); setHasUnsavedChanges(true); }} style={{ cursor: 'pointer' }} />
                          <Text style={{ fontSize: 12 }}>Body 字段</Text>
                          <Input placeholder="目标字段名" value={signatureBodyField} onChange={(e) => { setSignatureBodyField(e.target.value); setHasUnsavedChanges(true); }} disabled={signatureTarget !== 'body'} style={{ width: 200, fontSize: 12 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" name="signatureTarget" checked={signatureTarget === 'query'} onChange={() => { setSignatureTarget('query'); setHasUnsavedChanges(true); }} style={{ cursor: 'pointer' }} />
                          <Text style={{ fontSize: 12 }}>Query Param</Text>
                          <Input placeholder="参数名" value={signatureQueryParam} onChange={(e) => { setSignatureQueryParam(e.target.value); setHasUnsavedChanges(true); }} disabled={signatureTarget !== 'query'} style={{ width: 200, fontSize: 12 }} />
                        </div>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>说明：签名结果同时自动写入场景变量 {'{{sign}}'}</Text>
                    </div>
                    <div style={{ background: '#f5f5f5', borderRadius: 4, padding: 16, fontFamily: 'Monaco, Consolas, monospace' }}>
                      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>签名预览</Text>
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>签名原文：</Text>
                        <div style={{ background: '#fff', padding: 8, borderRadius: 4, marginTop: 4, fontSize: 12, wordBreak: 'break-all' }}>{calculateSignaturePreview().raw || '（请填写签名片段）'}</div>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{signatureAlgorithm} 结果：</Text>
                        <div style={{ background: '#fff', padding: 8, borderRadius: 4, marginTop: 4, fontSize: 12, color: calculateSignaturePreview().canCalculate ? '#52c41a' : '#999' }}>
                          {calculateSignaturePreview().result}
                          {calculateSignaturePreview().canCalculate && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>（已写入变量 &#123;&#123;sign&#125;&#125;）</Text>}
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary" style={{ fontSize: 10 }}>规则：</Text>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: 10, color: '#999' }}>
                          <li>所有片段变量均已赋值时自动计算并展示</li>
                          <li>有变量未赋值时展示占位符原文，不计算</li>
                          <li>密钥变量永久显示 ••••••••，不参与明文展示</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeRequestTab === 'preScript' && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 16 }}>Pre-request Script 在每次点击 Send 前自动执行，用于动态生成变量值。</Text>
                  <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #d9d9d9' }}>
                      <Text strong style={{ fontSize: 12 }}>JavaScript</Text>
                      <Button size="small" onClick={() => { setPreScript(''); setScriptResult(null); }}>清空</Button>
                    </div>
                    <TextArea value={preScript} onChange={(e) => { setPreScript(e.target.value); setHasUnsavedChanges(true); }} rows={10} style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: 12, border: 'none', borderRadius: 0 }} placeholder="// 在此编写 Pre-request Script..." />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div onClick={() => setShowBuiltinFunctions(!showBuiltinFunctions)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}>
                      <Text style={{ fontSize: 12, color: '#666' }}>{showBuiltinFunctions ? '▼' : '▶'} 内置函数参考</Text>
                    </div>
                    {showBuiltinFunctions && (
                      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'Monaco, Consolas, monospace', fontSize: 11 }}>
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 11 }}>变量操作：</Text>
                          <div style={{ marginTop: 4, paddingLeft: 12 }}>
                            <div>pm.variables.set("key", "value")    设置场景变量</div>
                            <div>pm.variables.get("key")             获取场景变量当前值</div>
                          </div>
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 11 }}>工具函数：</Text>
                          <div style={{ marginTop: 4, paddingLeft: 12 }}>
                            <div>pm.utils.uuid()                     生成 UUID（无连字符小写）</div>
                            <div>pm.utils.timestamp()                当前 Unix 毫秒时间戳（字符串）</div>
                            <div>pm.utils.md5(str)                   MD5 哈希（小写十六进制）</div>
                            <div>pm.utils.sha256(str)                SHA256 哈希（小写十六进制）</div>
                            <div>pm.utils.base64(str)                Base64 编码</div>
                            <div>pm.utils.base64Decode(str)          Base64 解码</div>
                            <div>pm.utils.hmacSha256(str, key)       HMAC-SHA256（小写十六进制）</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {scriptResult && (
                    <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'Monaco, Consolas, monospace' }}>
                      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>执行结果</Text>
                      {scriptResult.success ? (
                        <div>
                          {scriptResult.outputs?.map((out, idx) => (
                            <div key={idx} style={{ fontSize: 11, marginBottom: 4 }}>
                              <span style={{ color: '#52c41a' }}>✅</span>
                              <Text style={{ fontSize: 11, marginLeft: 8 }}>{out.variable} = {out.value}</Text>
                              {out.note && <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>（{out.note}）</Text>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#ff4d4f' }}>
                          <span>❌</span>
                          <Text style={{ fontSize: 11, marginLeft: 8, color: '#ff4d4f' }}>{scriptResult.message}</Text>
                        </div>
                      )}
                    </div>
                  )}
                  <Button size="small" onClick={() => { const result = executePreScript(preScript); setScriptResult(result); }} style={{ marginTop: 12 }}>测试执行</Button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div style={{ height: 52, borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', gap: 16 }}>
            <Space size="middle">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>环境</Text>
                <Select value={environment} onChange={setEnvironment} style={{ width: 100 }} size="small">
                  <Select.Option value="daily">Daily</Select.Option>
                  <Select.Option value="pre">Pre</Select.Option>
                  <Select.Option value="prod">Prod</Select.Option>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>超时</Text>
                <Input type="number" value={timeout} onChange={(e) => setRequestTimeout(Number(e.target.value))} style={{ width: 80 }} size="small" min={100} max={300000} />
                <Text style={{ fontSize: 12, color: '#666' }}>ms</Text>
              </div>
              {requestStatus && <Text type="secondary" style={{ fontSize: 11 }}>{requestStatus}</Text>}
              {undefinedVars.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff7e6', padding: '4px 12px', borderRadius: 4, border: '1px solid #ffd591' }}>
                  <Text style={{ fontSize: 11, color: '#fa8c16' }}>⚠ 以下变量未定义：{undefinedVars.join(', ')}，发送后将以空字符串替代</Text>
                  <Button type="link" size="small" onClick={() => setUndefinedVars([])} style={{ fontSize: 11, padding: 0, height: 'auto' }}>忽略继续</Button>
                </div>
              )}
            </Space>
            <Space size="middle">
              <Button onClick={() => setIsSaveSessionModalOpen(true)}>保存 Session</Button>
              {isRequesting ? (
                <Button danger onClick={handleCancel} style={{ width: 100 }}>⏹ 取消</Button>
              ) : (
                <Button type="primary" onClick={handleSend} style={{ width: 100 }}>▶ Send</Button>
              )}
            </Space>
          </div>
        </div>

        {/* Right - Response Panel */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderLeft: '1px solid #f0f0f0' }}>
          {/* Response State: Loading */}
          {isResponseLoading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, border: '3px solid #f0f0f0', borderTopColor: '#1890ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <Text style={{ fontSize: 13, color: '#666' }}>正在请求 {method} {url}...</Text>
              <Text style={{ fontSize: 12, color: '#999' }}>已耗时 {elapsedTime}ms</Text>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Response State: Empty (no request sent yet) */}
          {!isResponseLoading && !response && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 48, color: '#d9d9d9' }}>↔</div>
              <Text type="secondary" style={{ fontSize: 13 }}>发送请求后，响应结果将展示在这里</Text>
            </div>
          )}

          {/* Response State: Has Response */}
          {!isResponseLoading && response && (
            <>
              {/* Status Bar */}
              <div style={{ height: 40, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
                <div style={{ background: getStatusBadgeColor(response.status), color: '#fff', padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                  {response.status} {response.statusText}
                </div>
                <Text style={{ fontSize: 12, color: '#666' }}>{response.duration}ms</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>|</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{formatBytes(responseSize)}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>|</Text>
                <Text style={{ fontSize: 12, color: '#999' }}>{response.timestamp}</Text>
              </div>

              {/* Tab Bar */}
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', padding: '0 16px' }}>
                <div onClick={() => setResponseTab('body')} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: responseTab === 'body' ? '2px solid #1890ff' : '2px solid transparent', color: responseTab === 'body' ? '#1890ff' : '#666', fontSize: 12 }}>Body</div>
                <div onClick={() => setResponseTab('headers')} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: responseTab === 'headers' ? '2px solid #1890ff' : '2px solid transparent', color: responseTab === 'headers' ? '#1890ff' : '#666', fontSize: 12 }}>Headers</div>
                <div onClick={() => setResponseTab('debugLog')} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: responseTab === 'debugLog' ? '2px solid #1890ff' : '2px solid transparent', color: responseTab === 'debugLog' ? '#1890ff' : '#666', fontSize: 12 }}>调试日志</div>
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Body Tab */}
                {responseTab === 'body' && (
                  <div style={{ padding: 16 }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>格式</Text>
                      <Select value="json" size="small" style={{ width: 80 }}>
                        <Select.Option value="json">JSON</Select.Option>
                      </Select>
                      <Button.Group size="small">
                        <Button onClick={() => setBodyViewMode('pretty')} type={bodyViewMode === 'pretty' ? 'primary' : 'default'}>Pretty</Button>
                        <Button onClick={() => setBodyViewMode('raw')} type={bodyViewMode === 'raw' ? 'primary' : 'default'}>Raw</Button>
                      </Button.Group>
                      <Button size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(response.body || ''); message.success('已复制'); }}>复制</Button>
                    </div>

                    {/* Body Content */}
                    <div style={{ background: '#fafafa', borderRadius: 4, overflow: 'auto', maxHeight: 'calc(100vh - 420px)' }}>
                      {bodyViewMode === 'pretty' ? (
                        <pre style={{ margin: 0, padding: 12, fontSize: 12, fontFamily: 'Monaco, Consolas, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {(() => {
                            try {
                              const parsed = JSON.parse(response.body || '{}');
                              return syntaxHighlightJson(JSON.stringify(parsed, null, 2));
                            } catch {
                              return response.body || '';
                            }
                          })()}
                        </pre>
                      ) : (
                        <pre style={{ margin: 0, padding: 12, fontSize: 12, fontFamily: 'Monaco, Consolas, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {response.body || ''}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Headers Tab */}
                {responseTab === 'headers' && (
                  <div style={{ padding: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666', borderBottom: '1px solid #e8e8e8' }}>Key</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666', borderBottom: '1px solid #e8e8e8' }}>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {response.headers && Object.entries(response.headers).map(([key, value]) => (
                          <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, color: '#333' }}>{key}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, color: '#666', fontFamily: 'Monaco, Consolas, monospace', wordBreak: 'break-all' }}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Debug Log Tab */}
                {responseTab === 'debugLog' && (
                  <div style={{ padding: 16 }}>
                    {debugLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 32 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>暂无调试日志</Text>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {debugLogs.map((log, idx) => {
                          const isExpanded = expandedDebugLogs.has(idx);
                          return (
                            <div key={idx} style={{ border: '1px solid #e8e8e8', borderRadius: 4, overflow: 'hidden' }}>
                              <div onClick={() => {
                                const newExpanded = new Set(expandedDebugLogs);
                                if (isExpanded) {
                                  newExpanded.delete(idx);
                                } else {
                                  newExpanded.add(idx);
                                }
                                setExpandedDebugLogs(newExpanded);
                              }} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', background: '#fafafa', gap: 12 }}>
                                <span style={{ fontSize: 12, color: '#666' }}>{isExpanded ? '▼' : '▶'}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>① {log.step}</span>
                                <span style={{ fontSize: 12, color: log.status === 'success' ? '#52c41a' : '#ff4d4f' }}>{log.status === 'success' ? '✅' : '❌'}</span>
                                <span style={{ fontSize: 11, color: '#999' }}>{log.duration}ms</span>
                              </div>
                              {isExpanded && (
                                <div style={{ padding: 12, background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {log.details.map((detail, dIdx) => (
                                    <div key={dIdx} style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                                      <span style={{ color: '#666', minWidth: 100 }}>{detail.key}</span>
                                      <span style={{ color: detail.masked ? '#999' : '#333', fontFamily: 'Monaco, Consolas, monospace' }}>{detail.masked ? '••••••••' : detail.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      <Modal title="重命名用例" open={isRenameModalOpen} onOk={handleRename} onCancel={() => setIsRenameModalOpen(false)}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="用例名称"><Input value={newTabName} onChange={(e) => setNewTabName(e.target.value)} placeholder="请输入用例名称" /></Form.Item>
        </Form>
      </Modal>

      {/* Save Session Modal */}
      <Modal title="保存 Session" open={isSaveSessionModalOpen} onOk={() => {
        addHistorySession({
          name: sessionName || '未命名',
          method,
          url,
          headers: headers.filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: h.value })),
          body,
          responseBody: '',
          status: 0,
          statusText: '',
          duration: 0,
          isSaved: true,
        });
        message.success('Session 已保存');
        setIsSaveSessionModalOpen(false);
        setSessionName('');
      }} onCancel={() => { setIsSaveSessionModalOpen(false); setSessionName(''); }}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="备注名"><Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="如：charge 成功场景" /></Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>保存后可在场景编辑页 HTTP Request 节点配置时导入此 Session</Text>
        </Form>
      </Modal>

      {/* History Session Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e8e8', zIndex: 100, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
        {/* Collapsed Title Bar */}
        <div onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', cursor: 'pointer', background: '#fafafa' }}>
          <Space size="middle">
            <span style={{ fontSize: 12, color: '#666' }}>{isHistoryExpanded ? '▼' : '▲'} 历史 Session（共 {historySessions.length} 条）</span>
          </Space>
          <Space size="middle">
            <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); Modal.confirm({ title: '确认清空', content: '确定要清空所有历史记录吗？', onOk: () => clearAllHistory() }); }} style={{ fontSize: 11, padding: 0, height: 'auto' }}>清空全部</Button>
          </Space>
        </div>

        {/* Expanded Content */}
        {isHistoryExpanded && (
          <div style={{ height: 120, overflowX: 'auto', overflowY: 'hidden', padding: '12px 16px', display: 'flex', gap: 12 }}>
            {historySessions.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#999', fontSize: 12 }}>暂无历史记录</div>
            ) : (
              historySessions.map(session => {
                const isSuccess = session.status >= 200 && session.status < 300;
                const pathMatch = session.url.match(/https?:\/\/[^\/]+(\/[^\?]*)/);
                const path = pathMatch ? pathMatch[1] : session.url;
                return (
                  <div key={session.id} style={{ minWidth: 200, maxWidth: 200, border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, background: '#fff', position: 'relative', flexShrink: 0 }}>
                    {/* Delete button */}
                    <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => {
                      Modal.confirm({ title: '确认删除', content: '确定要删除该条历史记录吗？', onOk: () => deleteHistorySession(session.id) });
                    }} style={{ position: 'absolute', top: 4, right: 4, fontSize: 10, padding: 0, width: 20, height: 20, color: '#999' }} />
                    {/* Status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10 }}>{isSuccess ? '🟢' : '🔴'}</span>
                      <Text strong style={{ fontSize: 12 }} ellipsis>{session.name}</Text>
                    </div>
                    {/* Method, path, status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Tag style={{ fontSize: 9, padding: '0 2px', margin: 0, background: getMethodColor(session.method), border: 'none', color: '#fff' }}>{session.method}</Tag>
                      <Text style={{ fontSize: 11, color: '#666' }} ellipsis>{path}</Text>
                    </div>
                    {/* Status and duration */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {session.status > 0 && (
                        <>
                          <span style={{ fontSize: 10, color: isSuccess ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>{session.status} {session.statusText}</span>
                          <span style={{ fontSize: 10, color: '#999' }}>{session.duration}ms</span>
                        </>
                      )}
                      {session.status === 0 && (
                        <span style={{ fontSize: 10, color: '#999' }}>{session.statusText || '未发送'}</span>
                      )}
                    </div>
                    {/* Timestamp */}
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 10 }}>{session.timestamp}</Text>
                    </div>
                    {/* Restore button */}
                    <Button type="link" size="small" onClick={() => restoreSession(session)} style={{ fontSize: 10, padding: 0, height: 'auto' }}>恢复到当前 Tab</Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
