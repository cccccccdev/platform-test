import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Input, Select, Typography, message, Modal, Form, Switch, Radio } from 'antd';
import { ArrowLeftOutlined, SendOutlined, PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, SearchOutlined, SettingOutlined, CloseOutlined, StarOutlined, StarFilled, EyeOutlined } from '@ant-design/icons';

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
  createdBy?: string; // Creator of this scene
}

interface SceneVariable {
  key: string;
  initialValue: string;
  currentValue: string;
  isSecret: boolean;
}

interface DebugCredential {
  id: string;
  name: string;
  value: string;
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
type RequestTabType = 'params' | 'body' | 'headers' | 'auth' | 'requestSecurity' | 'responseSecurity' | 'preScript';

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
  operator?: string; // Who sent this request
  markedBy?: string; // Who marked this as starred
  markedAt?: string; // When it was marked
}

const requestTabs: RequestTabType[] = ['params', 'body', 'headers', 'auth', 'requestSecurity', 'responseSecurity', 'preScript'];

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
      },
      createdBy: '张三',
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
      },
      createdBy: '李四',
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
      },
      createdBy: '王五',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tc_1');

  // Scene variables (independent - no auto-loaded Channel variables)
  const [sceneVariables, setSceneVariables] = useState<SceneVariable[]>([
    { key: 'baseUrl', initialValue: 'https://api.paystack.co', currentValue: 'https://api.paystack.co', isSecret: false },
  ]);

  // Scene variable modal
  const [showSceneVarModal, setShowSceneVarModal] = useState(false);

  // Debug Credentials (independent - not coupled with Channel Credential)
  const [debugCredentials, setDebugCredentials] = useState<DebugCredential[]>([
    { id: 'cred_1', name: 'merchantPrivateKey', value: '' },
    { id: 'cred_2', name: 'merchantPublicKey', value: '' },
    { id: 'cred_3', name: 'aesKey', value: '' },
    { id: 'cred_4', name: 'aesIv', value: '' },
  ]);

  // Debug Credentials modal
  const [showDebugCredModal, setShowDebugCredModal] = useState(false);
  const [viewingCredId, setViewingCredId] = useState<string | null>(null);
  const [viewingCredValue, setViewingCredValue] = useState<string | null>(null);

  // Search
  const [searchText, setSearchText] = useState('');

  // Request state
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [method, setMethod] = useState(activeTab?.method || 'POST');
  const [url, setUrl] = useState(activeTab?.request.url || '');
  const [activeRequestTab, setActiveRequestTab] = useState<RequestTabType>('params');
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { key: 'Content-Type', value: 'application/json', description: 'Auto-generated based on body format', enabled: true, isAuto: true, autoType: 'content-type' },
    { key: 'X-Request-Id', value: '{{traceId}}', description: '', enabled: true, isAuto: false },
    { key: 'X-Paystack-Signature', value: '{{sign}}', description: 'Auto-inserted after signature configuration', enabled: true, isAuto: false, autoType: 'signature' },
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

  // Signing Scheme state
  const [signingSchemeEnabled, setSigningSchemeEnabled] = useState(false);

  // Signature Verification Scheme state
  const [verifySchemeEnabled, setVerifySchemeEnabled] = useState(false);

  // Encryption Protocal state
  const [encryptProtocalEnabled, setEncryptProtocalEnabled] = useState(false);

  // Decryption Protocal state
  const [decryptProtocalEnabled, setDecryptProtocalEnabled] = useState(false);

  // Signing detailed config
  const [signingSchemeId, setSigningSchemeId] = useState<string | null>(null);
  const [signingSourceSection, setSigningSourceSection] = useState<string | null>(null);
  const [signingSourceFieldMode, setSigningSourceFieldMode] = useState<'all' | 'select'>('all');
  const [signingSourceFields, setSigningSourceFields] = useState<string[]>([]);
  const [signingDestSection, setSigningDestSection] = useState<string | null>(null);
  const [signingDestField, setSigningDestField] = useState<string | null>(null);
  const [signingSecretKeyRef, setSigningSecretKeyRef] = useState('');
  const [signingSecretKeySource, setSigningSecretKeySource] = useState<'manual' | 'debugCredential' | 'sceneVariable'>('debugCredential');
  const [signingConvertStringScript, setSigningConvertStringScript] = useState('');
  const [signingBase64Encode, setSigningBase64Encode] = useState(false);

  // Verification detailed config
  const [verifySchemeId, setVerifySchemeId] = useState<string | null>(null);
  const [verifySourceSection, setVerifySourceSection] = useState<string | null>(null);
  const [verifySourceField, setVerifySourceField] = useState<string | null>(null);
  const [verifyDestFieldMode, setVerifyDestFieldMode] = useState<'all' | 'select'>('all');
  const [verifyDestFields, setVerifyDestFields] = useState<string[]>([]);
  const [verifySecretKeyRef, setVerifySecretKeyRef] = useState('');
  const [verifySecretKeySource, setVerifySecretKeySource] = useState<'manual' | 'debugCredential' | 'sceneVariable'>('debugCredential');
  const [verifyBase64Decode, setVerifyBase64Decode] = useState(false);

  // Encryption detailed config
  const [encryptSchemeId, setEncryptSchemeId] = useState<string | null>(null);
  const [encryptSourceSection, setEncryptSourceSection] = useState<string | null>(null);
  const [encryptSourceFieldMode, setEncryptSourceFieldMode] = useState<'all' | 'select'>('all');
  const [encryptSourceFields, setEncryptSourceFields] = useState<string[]>([]);
  const [encryptDestSection, setEncryptDestSection] = useState<string | null>(null);
  const [encryptDestField, setEncryptDestField] = useState<string | null>(null);
  const [encryptSecretKeyRef, setEncryptSecretKeyRef] = useState('');
  const [encryptSecretKeySource, setEncryptSecretKeySource] = useState<'manual' | 'debugCredential' | 'sceneVariable'>('debugCredential');
  const [encryptIvRef, setEncryptIvRef] = useState('');
  const [encryptIvSource, setEncryptIvSource] = useState<'manual' | 'debugCredential' | 'sceneVariable'>('debugCredential');
  const [encryptBase64Encode, setEncryptBase64Encode] = useState(false);

  // Decryption detailed config
  const [decryptSchemeId, setDecryptSchemeId] = useState<string | null>(null);
  const [decryptSourceSection, setDecryptSourceSection] = useState<string | null>(null);
  const [decryptSourceField, setDecryptSourceField] = useState<string | null>(null);
  const [decryptDestFieldMode, setDecryptDestFieldMode] = useState<'all' | 'select'>('all');
  const [decryptDestFields, setDecryptDestFields] = useState<string[]>([]);
  const [decryptSecretKeyRef, setDecryptSecretKeyRef] = useState('');
  const [decryptSecretKeySource, setDecryptSecretKeySource] = useState<'manual' | 'debugCredential' | 'sceneVariable'>('debugCredential');
  const [decryptIvRef, setDecryptIvRef] = useState('');
  const [decryptIvSource, setDecryptIvSource] = useState<'manual' | 'debugCredential' | 'sceneVariable'>('debugCredential');
  const [decryptBase64Decode, setDecryptBase64Decode] = useState(false);

  // Response Field Mapping
  const [responseFieldMappings, setResponseFieldMappings] = useState<{ fieldName: string; jsonPath: string; alias: string }[]>([
    { fieldName: 'status', jsonPath: '$.result.status', alias: '交易状态' },
    { fieldName: 'orderId', jsonPath: '$.result.orderId', alias: '订单号' },
  ]);

  // Pre-request script state
  const [preScript, setPreScript] = useState(`// Auto-generate traceId
pm.variables.set("traceId", pm.utils.uuid());

// Auto-generate timestamp
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
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // History filter: 'all' | 'starred' | 'unstarred'
  const [historyFilter, setHistoryFilter] = useState<'all' | 'starred' | 'unstarred'>('all');

  // History sessions (persisted to localStorage)
  const [historySessions, setHistorySessions] = useState<HistorySession[]>(() => {
    try {
      const saved = localStorage.getItem('apiDebug_history_' + (channelCode || 'default'));
      if (saved) return JSON.parse(saved);
    } catch {}

    // Mock data for testing "Import from Debug record" feature
    const mockSessions: HistorySession[] = [
      {
        id: 'mock_1',
        name: 'charge success scenario',
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
        name: 'verify query order',
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
        name: 'refund',
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

  // Rename modal
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingTab, setRenamingTab] = useState<RequestTab | null>(null);
  const [newTabName, setNewTabName] = useState('');

  // New Scene modal
  const [isNewSceneModalOpen, setIsNewSceneModalOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  // Track if double-click is pending to avoid single-click action
  const [pendingDoubleClick, setPendingDoubleClick] = useState<string | null>(null);

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

  // Restore session to current tab
  const restoreSession = (session: HistorySession) => {
    setMethod(session.method as any);
    setUrl(session.url);
    setHeaders(session.headers.map(h => ({ key: h.key, value: h.value, description: '', enabled: true, isAuto: false })));
    setBody(session.body);
    setRequestName(session.name);
    setHasUnsavedChanges(true);
    message.success('Restored to current Tab');
  };

  // Copy history as new scene
  const copyAsScene = (session: HistorySession) => {
    const newTab: RequestTab = {
      id: 'tc_' + Date.now(),
      name: session.name + '_copy',
      method: session.method as any,
      status: 'none',
      request: { url: session.url, headers: session.headers, body: session.body },
      createdBy: 'User'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    message.success('已复制为场景');
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
          note = 'uuid generation';
        } else if (valueExpr.includes('Date.now()')) {
          computedValue = Date.now().toString();
          note = 'timestamp';
        } else if (valueExpr.includes('pm.utils.timestamp()')) {
          computedValue = Date.now().toString();
          note = 'timestamp';
        } else if (valueExpr.includes('pm.utils.md5(')) {
          note = 'MD5 hash';
          computedValue = '(md5 hash)';
        } else if (valueExpr.includes('pm.utils.sha256(')) {
          note = 'SHA256 hash';
          computedValue = '(sha256 hash)';
        } else if (valueExpr.includes('pm.utils.base64(')) {
          note = 'Base64 encoding';
          computedValue = '(base64 encoded)';
        } else if (valueExpr.includes('pm.variables.get("')) {
          continue;
        } else if (valueExpr.startsWith('"') || valueExpr.startsWith("'")) {
          computedValue = valueExpr.slice(1, -1);
        }
        outputs.push({ variable: varName, value: computedValue, note });
      }
      return { success: true, message: 'Execution successful', outputs };
    } catch (error: any) {
      return { success: false, message: 'Execution failed: ' + error.message };
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
      message.warning('Auto-generated headers cannot be deleted, please disable the row');
      return;
    }
    setHeaders(headers.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
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
      setJsonParseError('JSON format is incorrect, cannot sync to form mode');
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
      setJsonParseError('JSON format is incorrect');
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
            <Input placeholder="Field name" value={field.key} onChange={(e) => updateBodyField(field.id, 'key', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: field.enabled ? '#fff' : '#f5f5f5', width: 120 }} />
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
              <Input placeholder="Value" value={field.value} onChange={(e) => updateBodyField(field.id, 'value', e.target.value)} bordered={false} style={{ fontSize: 12, padding: '2px 0', background: field.enabled ? '#fff' : '#f5f5f5', color: field.value.includes('{{') && field.value.includes('}}') ? '#fa8c16' : '#000' }} />
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

  // Create new tab - open modal
  const createNewTab = () => {
    setNewSceneName('');
    setIsNewSceneModalOpen(true);
  };

  // Confirm create new scene
  const handleCreateNewScene = () => {
    const name = newSceneName.trim() || 'new_scene';
    const newTab: RequestTab = {
      id: 'tc_' + Date.now(),
      name: name,
      method: 'POST',
      status: 'none',
      request: { url: '', headers: [{ key: 'Content-Type', value: 'application/json' }], body: '' },
      createdBy: 'User'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setActiveRequestTab('params');
    setIsNewSceneModalOpen(false);
    setNewSceneName('');
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
    message.success('Copied');
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
      message.success('Renamed');
    }
  };

  // Save current Request Builder config as scene
  const handleSaveScene = () => {
    if (!requestName.trim()) {
      message.warning('请输入场景名称');
      return;
    }
    const newTab: RequestTab = {
      id: 'tc_' + Date.now(),
      name: requestName.trim(),
      method,
      status: 'none',
      request: { url, headers: headers.filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: h.value })), body },
      createdBy: 'User'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    message.success('场景已保存');
  };

  // Load scene config into Request Builder
  const loadScene = (tab: RequestTab) => {
    setMethod(tab.method);
    setUrl(tab.request.url);
    setHeaders(tab.request.headers.map(h => ({ key: h.key, value: h.value, description: '', enabled: true, isAuto: false })));
    setBody(tab.request.body);
    setRequestName(tab.name);
    setActiveTabId(tab.id);
    setHasUnsavedChanges(false);
    message.success('场景已加载');
  };

  // Send request with full execution flow
  const handleSend = async () => {
    if (!url) {
      message.warning('Please enter the request URL');
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
      message.warning('Variable(s) ' + undefinedInRequest.join(', ') + ' are undefined, will be replaced with empty string');
    } else {
      setUndefinedVars([]);
    }

    // Step 1: Execute Pre-request Script
    const scriptStart = Date.now();
    setRequestStatus('Executing Pre-request Script...');
    await new Promise(resolve => window.setTimeout(resolve, 100));

    const scriptExecResult = executePreScript(preScript);
    const scriptDuration = Date.now() - scriptStart;
    if (scriptExecResult.success && scriptExecResult.outputs) {
      const scriptDetails = scriptExecResult.outputs.map(out => ({ key: out.variable, value: out.value }));
      addDebugLog('Pre-request Script Execution', 'success', scriptDuration, scriptDetails);
      scriptExecResult.outputs.forEach(output => {
        console.log('Script set ' + output.variable + ' = ' + output.value);
      });
    } else if (scriptExecResult.message) {
      addDebugLog('Pre-request Script Execution', 'error', scriptDuration, [{ key: 'Error', value: scriptExecResult.message }]);
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
    addDebugLog('Variable Replacement', 'success', Date.now() - varStart, varReplacementDetails);

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
    if (signingSchemeEnabled) {
      setRequestStatus('Calculating signature...');
      await new Promise(resolve => window.setTimeout(resolve, 50));
      addDebugLog('Signing scheme', 'success', Date.now() - sigStart, [
        { key: 'Scheme ID', value: signingSchemeId || 'Not selected' },
        { key: 'Source Section', value: signingSourceSection || 'Not selected' },
        { key: 'Source Fields', value: signingSourceFieldMode === 'all' ? 'All Fields' : signingSourceFields.join(', ') },
        { key: 'Dest Section', value: signingDestSection || 'Not selected' },
        { key: 'Dest Field', value: signingDestField || 'Not selected' },
      ]);
      setRequestStatus(null);
    }

    // Step 5: Send HTTP request
    setRequestStatus('Requesting ' + method + ' ' + fullUrl + ' ...');
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
      addDebugLog('HTTP Send', 'success', duration, [
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
      const sessionName = requestName || 'Unnamed';
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
        operator: 'User',
      });

      setRequestStatus(null);
      message.success('Request completed (' + duration + 'ms)');
    } catch (error: any) {
      window.clearInterval(timerInterval);
      const duration = Date.now() - startTime;
      const now = new Date();
      const timestamp = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

      addDebugLog('HTTP Send', 'error', duration, [
        { key: method, value: url },
        { key: 'Error', value: error.name === 'AbortError' ? 'Request timeout' : error.message },
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
      const errorSessionName = requestName || 'Unnamed';
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
        operator: 'User',
      });

      setRequestStatus(null);
      message.error(error.name === 'AbortError' ? 'Request timeout' : 'Request failed');
    } finally {
      setIsRequesting(false);
      setIsResponseLoading(false);
    }
  };

  // Cancel request
  const handleCancel = () => {
    setIsRequesting(false);
    setRequestStatus(null);
    message.info('Request cancelled');
  };

  const handleBack = () => {
    navigate('/channel-integration');
  };

  // Import from cURL
  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        message.warning('Clipboard is empty');
        return;
      }
      const parsed = parseCurlCommand(text);
      if (parsed) {
        const newTab: RequestTab = {
          id: `tc_${Date.now()}`,
          name: parsed.name || 'Imported Request',
          method: parsed.method,
          status: 'none',
          request: {
            url: parsed.url,
            headers: parsed.headers,
            body: parsed.body,
          },
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
        setUrl(parsed.url);
        setMethod(parsed.method);
        setHeaders(parsed.headers.length > 0 ? parsed.headers : [{ key: 'Content-Type', value: 'application/json', description: '', enabled: true, isAuto: false }]);
        setBody(parsed.body || '');
        setActiveRequestTab('params');
        setQueryParams([{ key: '', value: '', description: '', enabled: true }]);
        setPathParams([]);
        message.success('cURL import successful');
      } else {
        message.error('Invalid cURL command');
      }
    } catch (err) {
      message.error('Failed to read clipboard, please ensure clipboard permissions are granted');
    }
  };

  // Parse cURL command
  const parseCurlCommand = (curlCommand: string): { method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; url: string; headers: { key: string; value: string; description: string; enabled: boolean; isAuto: boolean }[]; body: string; name: string } | null => {
    try {
      const trimmed = curlCommand.trim();
      if (!trimmed.toLowerCase().startsWith('curl ')) {
        return null;
      }

      const result: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; url: string; headers: { key: string; value: string; description: string; enabled: boolean; isAuto: boolean }[]; body: string; name: string } = {
        method: 'GET',
        url: '',
        headers: [],
        body: '',
        name: '',
      };

      // Extract URL
      const urlMatch = trimmed.match(/-X\s+(\w+)\s+/i) || trimmed.match(/--request\s+(\w+)\s+/i);

      // Simple URL extraction
      const httpsMatch = trimmed.match(/https?:\/\/[^\s'"]+/i);
      if (httpsMatch) {
        result.url = httpsMatch[0];
      }

      if (urlMatch) {
        result.method = urlMatch[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      } else if (trimmed.includes('-X POST') || trimmed.includes('--request POST')) {
        result.method = 'POST';
      } else if (trimmed.includes('-X PUT') || trimmed.includes('--request PUT')) {
        result.method = 'PUT';
      } else if (trimmed.includes('-X DELETE') || trimmed.includes('--request DELETE')) {
        result.method = 'DELETE';
      } else if (trimmed.includes('-X PATCH') || trimmed.includes('--request PATCH')) {
        result.method = 'PATCH';
      }

      result.url = url;

      // Extract headers
      const headerMatches = trimmed.matchAll(/-H\s+['"]([^'"]+)['"]/gi);
      for (const match of headerMatches) {
        const colonIndex = match[1].indexOf(':');
        if (colonIndex > 0) {
          result.headers.push({
            key: match[1].substring(0, colonIndex).trim(),
            value: match[1].substring(colonIndex + 1).trim(),
            description: '',
            enabled: true,
            isAuto: false,
          });
        }
      }

      // Extract body
      const dataMatch = trimmed.match(/-d\s+['"](.+?)['"]/s) || trimmed.match(/--data\s+['"](.+?)['"]/s);
      if (dataMatch) {
        result.body = dataMatch[1];
        if (result.method === 'GET') result.method = 'POST';
      }

      // Generate name from URL path
      const pathMatch = result.url.match(/https?:\/\/[^\/]+\/(.+)/);
      if (pathMatch) {
        result.name = pathMatch[1].split('?')[0].split('/').filter(Boolean).pop() || 'Imported Request';
      } else {
        result.name = 'Imported Request';
      }

      return result;
    } catch (err) {
      return null;
    }
  };

  // Render context menu
  const renderContextMenu = (tab: RequestTab) => (
    <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '4px 0', minWidth: 150 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { closeTab(tab.id); setContextMenuTab(null); }}>
        <CloseOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>Close</span>
      </div>
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { closeOtherTabs(tab.id); setContextMenuTab(null); }}>
        <DeleteOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>Close all others</span>
      </div>
      <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { duplicateTab(tab); setContextMenuTab(null); }}>
        <CopyOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>Duplicate request</span>
      </div>
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => { openRenameModal(tab); setContextMenuTab(null); }}>
        <EditOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>Rename</span>
      </div>
      <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
      <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#ff4d4f' }} onClick={() => { closeTab(tab.id); setContextMenuTab(null); }}>
        <DeleteOutlined style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12 }}>Delete Scene</span>
      </div>
    </div>
  );

  // Secret Key Input - Three-in-one selection (Manual / Debug Credentials / Scene Variables)
  const renderSecretKeyInput = (
    source: 'manual' | 'debugCredential' | 'sceneVariable',
    setSource: (v: 'manual' | 'debugCredential' | 'sceneVariable') => void,
    value: string,
    setValue: (v: string) => void
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSourceChange = (e: any) => {
      setSource(e.target.value as 'manual' | 'debugCredential' | 'sceneVariable');
      setHasUnsavedChanges(true);
    };

    return (
      <div>
        <Radio.Group
          value={source}
          onChange={handleSourceChange}
          style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <Radio value="manual" style={{ fontSize: 11 }}>
            <Text style={{ fontSize: 11 }}>Manual Input</Text>
          </Radio>
          <Radio value="debugCredential" style={{ fontSize: 11 }}>
            <Text style={{ fontSize: 11 }}>From Debug Credentials</Text>
          </Radio>
          <Radio value="sceneVariable" style={{ fontSize: 11 }}>
            <Text style={{ fontSize: 11 }}>From Scene Variables</Text>
          </Radio>
        </Radio.Group>

        {source === 'manual' && (
          <Input
            placeholder="Enter secret key manually"
            value={value}
            onChange={(e) => { setValue(e.target.value); setHasUnsavedChanges(true); }}
            type="password"
            style={{ width: '100%' }}
          />
        )}

        {source === 'debugCredential' && (
          <Select
            placeholder="Select from Debug Credentials"
            value={value || undefined}
            onChange={(v) => { setValue(v ? `{{credential.${v}}}` : ''); setHasUnsavedChanges(true); }}
            style={{ width: '100%' }}
            allowClear
          >
            {debugCredentials.filter(c => c.value).map(c => (
              <Select.Option key={c.id} value={c.name}>
                {`{{credential.${c.name}}}`}
              </Select.Option>
            ))}
          </Select>
        )}

        {source === 'sceneVariable' && (
          <Select
            placeholder="Select from Scene Variables"
            value={value || undefined}
            onChange={(v) => { setValue(v ? `{{variable.${v}}}` : ''); setHasUnsavedChanges(true); }}
            style={{ width: '100%' }}
            allowClear
          >
            {sceneVariables.filter(v => v.currentValue).map(v => (
              <Select.Option key={v.key} value={v.key}>
                {`{{variable.${v.key}}}`}
              </Select.Option>
            ))}
          </Select>
        )}

        {source === 'manual' && (
          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
            ⚠️ Manual input will not be saved to Debug Credentials
          </Text>
        )}
      </div>
    );
  };

  // Scene Variable Management Modal
  const renderSceneVarModal = () => (
    <Modal
      title="Scene Variable Management"
      open={showSceneVarModal}
      onCancel={() => setShowSceneVarModal(false)}
      footer={[
        <Button key="cancel" onClick={() => setShowSceneVarModal(false)}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={() => setShowSceneVarModal(false)}>Submit</Button>,
      ]}
      width={600}
    >
      <div style={{ padding: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text type="secondary">Manage scene variables used in requests</Text>
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => {
            const newVar = { key: `var_${Date.now()}`, initialValue: '', currentValue: '', isSecret: false };
            setSceneVariables(prev => [...prev, newVar]);
          }}>Add Variable</Button>
        </div>
        {sceneVariables.map((v, idx) => (
          <div key={v.key} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Input
              placeholder="Key"
              value={v.key}
              onChange={(e) => {
                const newVars = [...sceneVariables];
                newVars[idx].key = e.target.value;
                setSceneVariables(newVars);
              }}
              style={{ width: 140 }}
              disabled={idx < 4}
            />
            <Input
              placeholder="Value"
              value={v.currentValue}
              onChange={(e) => {
                const newVars = [...sceneVariables];
                newVars[idx].currentValue = e.target.value;
                newVars[idx].initialValue = e.target.value;
                setSceneVariables(newVars);
              }}
              style={{ flex: 1 }}
            />
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                if (idx >= 4) {
                  setSceneVariables(prev => prev.filter((_, i) => i !== idx));
                }
              }}
              disabled={idx < 4}
              danger
            />
          </div>
        ))}
      </div>
    </Modal>
  );

  // Debug Credentials Management Modal
  const renderDebugCredModal = () => (
    <Modal
      title="Debug Credentials Management"
      open={showDebugCredModal}
      onCancel={() => setShowDebugCredModal(false)}
      footer={[
        <Button key="cancel" onClick={() => setShowDebugCredModal(false)}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={() => setShowDebugCredModal(false)}>Submit</Button>,
      ]}
      width={600}
    >
      <div style={{ padding: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text type="secondary">Manage credentials for Debug requests (independent from Channel Credential)</Text>
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => {
            const newCred = { id: `cred_${Date.now()}`, name: `credential_${Date.now()}`, value: '' };
            setDebugCredentials(prev => [...prev, newCred]);
          }}>Add Credential</Button>
        </div>
        {debugCredentials.map((c, idx) => (
          <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Input
              placeholder="Name"
              value={c.name}
              onChange={(e) => {
                const newCreds = [...debugCredentials];
                newCreds[idx].name = e.target.value;
                setDebugCredentials(newCreds);
              }}
              style={{ width: 160 }}
              disabled={idx < 4}
            />
            <Input
              placeholder="Value (will be masked after save)"
              value={viewingCredId === c.id ? (viewingCredValue || '') : c.value}
              type={viewingCredId === c.id ? 'text' : 'password'}
              onChange={(e) => {
                const newCreds = [...debugCredentials];
                newCreds[idx].value = e.target.value;
                setDebugCredentials(newCreds);
              }}
              style={{ flex: 1 }}
              disabled={idx < 4}
            />
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setViewingCredId(c.id);
                setViewingCredValue(c.value);
                setTimeout(() => { setViewingCredId(null); setViewingCredValue(null); }, 5000);
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                if (idx >= 4) {
                  setDebugCredentials(prev => prev.filter((_, i) => i !== idx));
                }
              }}
              disabled={idx < 4}
              danger
            />
          </div>
        ))}
      </div>
    </Modal>
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
            <Button icon={<CopyOutlined />} size="small" onClick={handleImportFromClipboard}>Import cURL</Button>
          </Space>
        </div>
      </Card>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingBottom: isHistoryExpanded ? 190 : 32 }}>
        {/* Left Panel */}
        <div style={{ width: 220, borderRight: '1px solid #f0f0f0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Input placeholder="Search scenes" prefix={<SearchOutlined style={{ color: '#999' }} />} value={searchText} onChange={(e) => setSearchText(e.target.value)} size="small" allowClear />
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 12 }}>Scenes</Text>
              <Button type="text" size="small" icon={<PlusOutlined />} onClick={createNewTab}>New Scene</Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {filteredTabs.length === 0 ? (
                <div style={{ padding: 12 }}><Text type="secondary" style={{ fontSize: 11 }}>No scenes</Text></div>
              ) : (
                filteredTabs.map(tab => (
                  <div key={tab.id} onClick={() => {
                  if (pendingDoubleClick === tab.id) {
                    setPendingDoubleClick(null);
                    return;
                  }
                  loadScene(tab);
                }} onDoubleClick={(e) => {
                  e.stopPropagation();
                  setPendingDoubleClick(tab.id);
                  setTimeout(() => setPendingDoubleClick(null), 300);
                  openRenameModal(tab);
                }} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer', background: activeTabId === tab.id ? '#e6f7ff' : 'transparent', borderBottom: '1px solid #f5f5f5', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusDotColor(tab), flexShrink: 0 }} />
                    <Tag style={{ fontSize: 9, padding: '0 2px', margin: 0, background: getMethodColor(tab.method), border: 'none', color: '#fff' }}>{tab.method}</Tag>
                    <Text ellipsis style={{ flex: 1, fontSize: 12 }}>{tab.name}</Text>
                    {tab.createdBy && <Text style={{ fontSize: 9, color: '#999', flexShrink: 0 }}>{tab.createdBy}</Text>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Debug Credentials Section - Independent from Channel Credential */}
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Space>
                <Text strong style={{ fontSize: 12 }}>🔒 Debug Credentials</Text>
              </Space>
              <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => setShowDebugCredModal(true)}>Manage</Button>
            </div>
            <div style={{ padding: '4px 12px', maxHeight: 80, overflow: 'auto' }}>
              {debugCredentials.filter(c => c.value).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', fontSize: 11, gap: 4 }}>
                  <Text style={{ width: 70, color: '#666', flexShrink: 0 }}>{c.name}</Text>
                  <Text ellipsis style={{ flex: 1, color: '#999', fontFamily: 'Monospace' }}>••••••••</Text>
                  <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setViewingCredId(c.id); setViewingCredValue(c.value); setTimeout(() => { setViewingCredId(null); setViewingCredValue(null); }, 5000); }} />
                </div>
              ))}
              {debugCredentials.filter(c => c.value).length === 0 && (
                <Text type="secondary" style={{ fontSize: 10 }}>No credentials configured</Text>
              )}
            </div>
          </div>

          {/* Scene Variables Section - Independent from Channel Variables */}
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 12 }}>Scene Variables</Text>
              <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => setShowSceneVarModal(true)}>Manage</Button>
            </div>
            <div style={{ padding: '4px 12px', maxHeight: 100, overflow: 'auto' }}>
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
              <Button danger onClick={handleCancel} style={{ width: 80 }}>⏹ Cancel</Button>
            ) : (
              <Button type="primary" icon={<SendOutlined />} onClick={handleSend} style={{ width: 80 }}>▶ Send</Button>
            )}
          </div>

          {/* Interface Name Row */}
          <div style={{ height: 32, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>场景名称:</Text>
            <Input placeholder="输入场景名称" value={requestName} onChange={(e) => { setRequestName(e.target.value); setHasUnsavedChanges(true); }} bordered={false} style={{ flex: 1, fontSize: 12 }} />
            <Button size="small" type="primary" onClick={handleSaveScene} disabled={!requestName.trim()}>保存场景</Button>
          </div>

          {/* Request Content Tabs */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
              {requestTabs.map(key => (
                <div key={key} onClick={() => setActiveRequestTab(key)} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: activeRequestTab === key ? '2px solid #1890ff' : '2px solid transparent', color: activeRequestTab === key ? '#1890ff' : '#666', fontSize: 12 }}>
                  {key === 'params' ? 'Params' : key === 'body' ? 'Body' : key === 'headers' ? 'Headers' : key === 'auth' ? 'Auth' : key === 'requestSecurity' ? '🔐 Request Security' : key === 'responseSecurity' ? '🔓 Response Security' : key === 'preScript' ? 'Pre-request Script' : key}
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
                          <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Enable</th>
                          <th style={{ width: 180, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Key</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Description</th>
                          <th style={{ width: 60, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Operation</th>
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
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>Path parameters are automatically identified from :param in URL, please fill in the corresponding values</Text>
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
                        <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Enable</th>
                        <th style={{ width: 180, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Key</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Description</th>
                        <th style={{ width: 60, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Operation</th>
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
                  <Button type="link" size="small" onClick={addHeader} style={{ marginTop: 8, padding: 0, fontSize: 11 }}>+ Add Header</Button>
                  {headers.filter(h => h.isAuto).length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>Auto-generate</Text>
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
                          <Button size="small" type={rawViewMode === 'form' ? 'primary' : 'default'} onClick={() => { if (rawViewMode === 'raw' && jsonParseError) { Modal.warning({ title: 'JSON format is incorrect, cannot sync to Form Mode' }); return; } setRawViewMode('form'); }}>Form Mode</Button>
                          <Button size="small" type={rawViewMode === 'raw' ? 'primary' : 'default'} onClick={() => { setRawViewMode('raw'); syncFormToRawJson(); }}>Raw JSON</Button>
                        </div>
                      </>
                    )}
                  </div>

                  {bodyType === 'raw' && rawFormat === 'json' && (
                    <>
                      {rawViewMode === 'form' ? (
                        <div>
                          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>JSON Form</Text>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#fafafa' }}>
                                <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Enable</th>
                                <th style={{ width: 160, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Field Name</th>
                                <th style={{ width: 100, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Type</th>
                                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                                <th style={{ width: 80, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Operation</th>
                              </tr>
                            </thead>
                            <tbody>{bodyFields.map(field => renderBodyFieldRow(field, 0))}</tbody>
                          </table>
                          <Button type="link" size="small" onClick={() => addBodyField()} style={{ marginTop: 8, padding: 0, fontSize: 11 }}>+ Add Field</Button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><Button size="small" onClick={formatJson}>Format</Button></div>
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
                            <th style={{ width: 40, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Enable</th>
                            <th style={{ width: 180, padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Key</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Value</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#666' }}>Description</th>
                            <th style={{ width: 60, padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#666' }}>Operation</th>
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
                              <Button type="link" size="small" onClick={(e) => { e.preventDefault(); setBinaryFile(null); }}>Remove</Button>
                            </div>
                          ) : (
                            <Text type="secondary" style={{ fontSize: 12 }}>Click to upload or drag file here</Text>
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
                    <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Auth Type</Text>
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
                      <Text type="secondary" style={{ fontSize: 11 }}>Will auto-add Authorization: Bearer {bearerToken || '{token}'} to Headers</Text>
                    </div>
                  )}
                  {authType === 'apiKey' && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Key Name</Text>
                        <Input placeholder="X-API-Key" value={apiKeyName} onChange={(e) => { setApiKeyName(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 300, color: apiKeyName.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Key Value</Text>
                        <Input placeholder="API Key value" value={apiKeyValue} onChange={(e) => { setApiKeyValue(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 400, color: apiKeyValue.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <div>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Add Location</Text>
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
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Username</Text>
                        <Input placeholder="Username" value={basicUsername} onChange={(e) => { setBasicUsername(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 300 }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Password</Text>
                        <Input placeholder="Password" value={basicPassword} onChange={(e) => { setBasicPassword(e.target.value); setHasUnsavedChanges(true); }} type="password" style={{ width: 300, color: basicPassword.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>Will auto-add Authorization: Basic {'{base64(username:password)}'} to Headers</Text>
                    </div>
                  )}
                  {authType === 'oauth2' && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Access Token</Text>
                        <Input placeholder="Access Token" value={oauth2Token} onChange={(e) => { setOauth2Token(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 400, color: oauth2Token.includes('{{') ? '#fa8c16' : '#000' }} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Token Prefix</Text>
                        <Input placeholder="Bearer" value={oauth2Prefix} onChange={(e) => { setOauth2Prefix(e.target.value); setHasUnsavedChanges(true); }} style={{ width: 150 }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>Will auto-add Authorization: {oauth2Prefix || 'Bearer'} {'{accessToken}'} to Headers</Text>
                    </div>
                  )}
                  {authType === 'none' && <Text type="secondary" style={{ fontSize: 12 }}>No authentication info added</Text>}
                </div>
              )}

              {activeRequestTab === 'requestSecurity' && (
                <div style={{ maxHeight: 600, overflow: 'auto' }}>
                  {/* Signing Section */}
                  <div style={{ marginBottom: 20, border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <Text strong style={{ fontSize: 13 }}>Signing</Text>
                        <Tag color="blue">加签</Tag>
                      </Space>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>Enable</Text>
                        <Switch size="small" checked={signingSchemeEnabled} onChange={(checked) => { setSigningSchemeEnabled(checked); setHasUnsavedChanges(true); }} />
                      </Space>
                    </div>
                    <div style={{ opacity: signingSchemeEnabled ? 1 : 0.5, pointerEvents: signingSchemeEnabled ? 'auto' : 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Signing Algorithm <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          <Select
                            placeholder="Select algorithm"
                            value={signingSchemeId}
                            onChange={(v) => { setSigningSchemeId(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="SHA256">SHA256</Select.Option>
                            <Select.Option value="SHA256WithRSA">SHA256 with RSA</Select.Option>
                            <Select.Option value="SHA512">SHA512</Select.Option>
                            <Select.Option value="SHA512WithRSA">SHA512 with RSA</Select.Option>
                            <Select.Option value="MD5">MD5</Select.Option>
                            <Select.Option value="HMAC">HMAC</Select.Option>
                          </Select>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Secret Key <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          {renderSecretKeyInput(
                            signingSecretKeySource,
                            setSigningSecretKeySource,
                            signingSecretKeyRef,
                            setSigningSecretKeyRef
                          )}
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Signing Source Fields <span style={{ color: '#ff4d4f' }}>*</span></Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Select
                            placeholder="Select section"
                            value={signingSourceSection}
                            onChange={(v) => { setSigningSourceSection(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="body">Request Body</Select.Option>
                            <Select.Option value="header">Request Header</Select.Option>
                            <Select.Option value="params">Query Params</Select.Option>
                          </Select>
                          <Select
                            placeholder="Field selection mode"
                            value={signingSourceFieldMode}
                            onChange={(v) => { setSigningSourceFieldMode(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="all">Select All Fields</Select.Option>
                            <Select.Option value="select">Choose Fields to Select</Select.Option>
                          </Select>
                        </div>
                        {signingSourceSection && signingSourceFieldMode === 'select' && (
                          <div style={{ marginTop: 8, padding: 12, background: '#fafafa', borderRadius: 4, maxHeight: 120, overflow: 'auto' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {(signingSourceSection === 'body' ? ['amount', 'currency', 'reference', 'customer', 'email', 'metadata'] :
                                signingSourceSection === 'header' ? ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Timestamp'] :
                                ['amount', 'currency', 'reference']).map(field => (
                                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Switch size="small" checked={signingSourceFields.includes(field)} onChange={(checked) => {
                                    if (checked) {
                                      setSigningSourceFields([...signingSourceFields, field]);
                                    } else {
                                      setSigningSourceFields(signingSourceFields.filter(f => f !== field));
                                    }
                                    setHasUnsavedChanges(true);
                                  }} />
                                  <Text style={{ fontSize: 11 }}>{field}</Text>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Convert String (Groovy Script)</Text>
                        <Input.TextArea
                          placeholder="fields.sort { it.name }.collect { &quot;${it.name}=${it.value}&quot; }.join(&quot;&&quot;)"
                          value={signingConvertStringScript}
                          onChange={(e) => { setSigningConvertStringScript(e.target.value); setHasUnsavedChanges(true); }}
                          rows={2}
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>Base64 Encode</Text>
                          <Switch size="small" checked={signingBase64Encode} onChange={(checked) => { setSigningBase64Encode(checked); setHasUnsavedChanges(true); }} />
                        </Space>
                      </div>

                      <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Signing Destination</Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Select
                            placeholder="Select area"
                            value={signingDestSection}
                            onChange={(v) => { setSigningDestSection(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="header">Request Header</Select.Option>
                            <Select.Option value="body">Request Body</Select.Option>
                          </Select>
                          <Select
                            placeholder="Select field"
                            value={signingDestField}
                            onChange={(v) => { setSigningDestField(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="X-Signature">X-Signature</Select.Option>
                            <Select.Option value="signature">signature</Select.Option>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Encryption Section */}
                  <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <Text strong style={{ fontSize: 13 }}>Encryption</Text>
                        <Tag color="purple">加密</Tag>
                      </Space>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>Enable</Text>
                        <Switch size="small" checked={encryptProtocalEnabled} onChange={(checked) => { setEncryptProtocalEnabled(checked); setHasUnsavedChanges(true); }} />
                      </Space>
                    </div>
                    <div style={{ opacity: encryptProtocalEnabled ? 1 : 0.5, pointerEvents: encryptProtocalEnabled ? 'auto' : 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Encryption Algorithm <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          <Select
                            placeholder="Select algorithm"
                            value={encryptSchemeId}
                            onChange={(v) => { setEncryptSchemeId(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="AES_CBC">AES with CBC</Select.Option>
                            <Select.Option value="AES_ECB">AES with ECB</Select.Option>
                            <Select.Option value="RSA">RSA</Select.Option>
                          </Select>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Secret Key <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          {renderSecretKeyInput(
                            encryptSecretKeySource,
                            setEncryptSecretKeySource,
                            encryptSecretKeyRef,
                            setEncryptSecretKeyRef
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Initialization Vector (IV)</Text>
                          {renderSecretKeyInput(
                            encryptIvSource,
                            setEncryptIvSource,
                            encryptIvRef,
                            setEncryptIvRef
                          )}
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Base64 Encode</Text>
                          <Switch size="small" checked={encryptBase64Encode} onChange={(checked) => { setEncryptBase64Encode(checked); setHasUnsavedChanges(true); }} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Encryption Source Fields <span style={{ color: '#ff4d4f' }}>*</span></Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Select
                            placeholder="Select section"
                            value={encryptSourceSection}
                            onChange={(v) => { setEncryptSourceSection(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="body">Request Body</Select.Option>
                            <Select.Option value="header">Request Header</Select.Option>
                          </Select>
                          <Select
                            placeholder="Field selection mode"
                            value={encryptSourceFieldMode}
                            onChange={(v) => { setEncryptSourceFieldMode(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="all">Select All Fields</Select.Option>
                            <Select.Option value="select">Choose Fields to Select</Select.Option>
                          </Select>
                        </div>
                        {encryptSourceSection && encryptSourceFieldMode === 'select' && (
                          <div style={{ marginTop: 8, padding: 12, background: '#fafafa', borderRadius: 4, maxHeight: 100, overflow: 'auto' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {['accountNumber', 'cardNumber', 'cvv', 'pin'].map(field => (
                                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Switch size="small" checked={encryptSourceFields.includes(field)} onChange={(checked) => {
                                    if (checked) {
                                      setEncryptSourceFields([...encryptSourceFields, field]);
                                    } else {
                                      setEncryptSourceFields(encryptSourceFields.filter(f => f !== field));
                                    }
                                    setHasUnsavedChanges(true);
                                  }} />
                                  <Text style={{ fontSize: 11 }}>{field}</Text>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Encrypted Destination</Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Select
                            placeholder="Select area"
                            value={encryptDestSection}
                            onChange={(v) => { setEncryptDestSection(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="header">Request Header</Select.Option>
                            <Select.Option value="body">Request Body</Select.Option>
                          </Select>
                          <Select
                            placeholder="Select field"
                            value={encryptDestField}
                            onChange={(v) => { setEncryptDestField(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="encryptedData">encryptedData</Select.Option>
                            <Select.Option value="X-Encrypted-Data">X-Encrypted-Data</Select.Option>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeRequestTab === 'responseSecurity' && (
                <div style={{ maxHeight: 600, overflow: 'auto' }}>
                  {/* Signature Verification Section */}
                  <div style={{ marginBottom: 20, border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <Text strong style={{ fontSize: 13 }}>Signature Verification</Text>
                        <Tag color="green">验签</Tag>
                      </Space>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>Enable</Text>
                        <Switch size="small" checked={verifySchemeEnabled} onChange={(checked) => { setVerifySchemeEnabled(checked); setHasUnsavedChanges(true); }} />
                      </Space>
                    </div>
                    <div style={{ opacity: verifySchemeEnabled ? 1 : 0.5, pointerEvents: verifySchemeEnabled ? 'auto' : 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Verification Algorithm <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          <Select
                            placeholder="Select algorithm"
                            value={verifySchemeId}
                            onChange={(v) => { setVerifySchemeId(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="SHA256">SHA256</Select.Option>
                            <Select.Option value="SHA256WithRSA">SHA256 with RSA</Select.Option>
                            <Select.Option value="SHA512">SHA512</Select.Option>
                            <Select.Option value="HMAC">HMAC</Select.Option>
                          </Select>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Secret Key <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          {renderSecretKeyInput(
                            verifySecretKeySource,
                            setVerifySecretKeySource,
                            verifySecretKeyRef,
                            setVerifySecretKeyRef
                          )}
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Response Signature Field <span style={{ color: '#ff4d4f' }}>*</span></Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Select
                            placeholder="Select area"
                            value={verifySourceSection}
                            onChange={(v) => { setVerifySourceSection(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="header">Response Header</Select.Option>
                            <Select.Option value="body">Response Body</Select.Option>
                          </Select>
                          <Select
                            placeholder="Select field"
                            value={verifySourceField}
                            onChange={(v) => { setVerifySourceField(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="X-Signature">X-Signature</Select.Option>
                            <Select.Option value="signature">signature</Select.Option>
                          </Select>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Verification Source Fields</Text>
                        <Select
                          placeholder="Field selection mode"
                          value={verifyDestFieldMode}
                          onChange={(v) => { setVerifyDestFieldMode(v); setHasUnsavedChanges(true); }}
                          style={{ width: '100%' }}
                        >
                          <Select.Option value="all">Select All Fields</Select.Option>
                          <Select.Option value="select">Choose Fields to Select</Select.Option>
                        </Select>
                        {verifyDestFieldMode === 'select' && (
                          <div style={{ marginTop: 8, padding: 12, background: '#fafafa', borderRadius: 4, maxHeight: 80, overflow: 'auto' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {['verifyResult', 'isValid', 'validationStatus'].map(field => (
                                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Switch size="small" checked={verifyDestFields.includes(field)} onChange={(checked) => {
                                    if (checked) {
                                      setVerifyDestFields([...verifyDestFields, field]);
                                    } else {
                                      setVerifyDestFields(verifyDestFields.filter(f => f !== field));
                                    }
                                    setHasUnsavedChanges(true);
                                  }} />
                                  <Text style={{ fontSize: 11 }}>{field}</Text>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>Base64 Decode First</Text>
                          <Switch size="small" checked={verifyBase64Decode} onChange={(checked) => { setVerifyBase64Decode(checked); setHasUnsavedChanges(true); }} />
                        </Space>
                      </div>
                    </div>
                  </div>

                  {/* Decryption Section */}
                  <div style={{ marginBottom: 20, border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <Text strong style={{ fontSize: 13 }}>Decryption</Text>
                        <Tag color="orange">解密</Tag>
                      </Space>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>Enable</Text>
                        <Switch size="small" checked={decryptProtocalEnabled} onChange={(checked) => { setDecryptProtocalEnabled(checked); setHasUnsavedChanges(true); }} />
                      </Space>
                    </div>
                    <div style={{ opacity: decryptProtocalEnabled ? 1 : 0.5, pointerEvents: decryptProtocalEnabled ? 'auto' : 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Decryption Algorithm <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          <Select
                            placeholder="Select algorithm"
                            value={decryptSchemeId}
                            onChange={(v) => { setDecryptSchemeId(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="AES_CBC">AES with CBC</Select.Option>
                            <Select.Option value="AES_ECB">AES with ECB</Select.Option>
                            <Select.Option value="RSA">RSA</Select.Option>
                          </Select>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Secret Key <span style={{ color: '#ff4d4f' }}>*</span></Text>
                          {renderSecretKeyInput(
                            decryptSecretKeySource,
                            setDecryptSecretKeySource,
                            decryptSecretKeyRef,
                            setDecryptSecretKeyRef
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Initialization Vector (IV)</Text>
                          {renderSecretKeyInput(
                            decryptIvSource,
                            setDecryptIvSource,
                            decryptIvRef,
                            setDecryptIvRef
                          )}
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Base64 Decode First</Text>
                          <Switch size="small" checked={decryptBase64Decode} onChange={(checked) => { setDecryptBase64Decode(checked); setHasUnsavedChanges(true); }} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Response Encrypted Field <span style={{ color: '#ff4d4f' }}>*</span></Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Select
                            placeholder="Select area"
                            value={decryptSourceSection}
                            onChange={(v) => { setDecryptSourceSection(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="body">Response Body</Select.Option>
                            <Select.Option value="header">Response Header</Select.Option>
                          </Select>
                          <Select
                            placeholder="Select field"
                            value={decryptSourceField}
                            onChange={(v) => { setDecryptSourceField(v); setHasUnsavedChanges(true); }}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            <Select.Option value="encryptedData">encryptedData</Select.Option>
                            <Select.Option value="data">data</Select.Option>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Decrypted Destination Fields</Text>
                        <Select
                          placeholder="Field selection mode"
                          value={decryptDestFieldMode}
                          onChange={(v) => { setDecryptDestFieldMode(v); setHasUnsavedChanges(true); }}
                          style={{ width: '100%' }}
                        >
                          <Select.Option value="all">Select All Fields</Select.Option>
                          <Select.Option value="select">Choose Fields to Select</Select.Option>
                        </Select>
                        {decryptDestFieldMode === 'select' && (
                          <div style={{ marginTop: 8, padding: 12, background: '#fafafa', borderRadius: 4, maxHeight: 80, overflow: 'auto' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {['accountNumber', 'balance', 'transactionStatus', 'merchantName'].map(field => (
                                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Switch size="small" checked={decryptDestFields.includes(field)} onChange={(checked) => {
                                    if (checked) {
                                      setDecryptDestFields([...decryptDestFields, field]);
                                    } else {
                                      setDecryptDestFields(decryptDestFields.filter(f => f !== field));
                                    }
                                    setHasUnsavedChanges(true);
                                  }} />
                                  <Text style={{ fontSize: 11 }}>{field}</Text>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Response Field Mapping Section */}
                  <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <Text strong style={{ fontSize: 13 }}>Response Field Mapping</Text>
                        <Tag color="cyan">字段提取</Tag>
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
                      从原始响应(验签/解密后)中提取关键字段，供调试日志展示
                    </Text>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#666', fontWeight: 400 }}>Field Name</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#666', fontWeight: 400 }}>JSONPath / XPath</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#666', fontWeight: 400 }}>Alias</th>
                          <th style={{ width: 60 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {responseFieldMappings.map((mapping, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <Input
                                placeholder="fieldName"
                                value={mapping.fieldName}
                                onChange={(e) => { const newMappings = [...responseFieldMappings]; newMappings[idx].fieldName = e.target.value; setResponseFieldMappings(newMappings); setHasUnsavedChanges(true); }}
                                style={{ fontSize: 11 }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <Input
                                placeholder="$.result.status"
                                value={mapping.jsonPath}
                                onChange={(e) => { const newMappings = [...responseFieldMappings]; newMappings[idx].jsonPath = e.target.value; setResponseFieldMappings(newMappings); setHasUnsavedChanges(true); }}
                                style={{ fontSize: 11 }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <Input
                                placeholder="交易状态"
                                value={mapping.alias}
                                onChange={(e) => { const newMappings = [...responseFieldMappings]; newMappings[idx].alias = e.target.value; setResponseFieldMappings(newMappings); setHasUnsavedChanges(true); }}
                                style={{ fontSize: 11 }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => { const newMappings = responseFieldMappings.filter((_, i) => i !== idx); setResponseFieldMappings(newMappings); setHasUnsavedChanges(true); }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => { setResponseFieldMappings([...responseFieldMappings, { fieldName: '', jsonPath: '', alias: '' }]); setHasUnsavedChanges(true); }} style={{ marginTop: 8 }}>
                      添加字段
                    </Button>
                  </div>
                </div>
              )}

              {activeRequestTab === 'preScript' && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 16 }}>Pre-request Script auto-executes before each Send click to dynamically generate variable values.</Text>
                  <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #d9d9d9' }}>
                      <Text strong style={{ fontSize: 12 }}>JavaScript</Text>
                      <Button size="small" onClick={() => { setPreScript(''); setScriptResult(null); }}>Clear</Button>
                    </div>
                    <TextArea value={preScript} onChange={(e) => { setPreScript(e.target.value); setHasUnsavedChanges(true); }} rows={10} style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: 12, border: 'none', borderRadius: 0 }} placeholder="// Write Pre-request Script here..." />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div onClick={() => setShowBuiltinFunctions(!showBuiltinFunctions)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}>
                      <Text style={{ fontSize: 12, color: '#666' }}>{showBuiltinFunctions ? '▼' : '▶'} Built-in Function Reference</Text>
                    </div>
                    {showBuiltinFunctions && (
                      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'Monaco, Consolas, monospace', fontSize: 11 }}>
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 11 }}>Variable Operations:</Text>
                          <div style={{ marginTop: 4, paddingLeft: 12 }}>
                            <div>pm.variables.set("key", "value")    Set scene variable</div>
                            <div>pm.variables.get("key")             Get scene variable current value</div>
                          </div>
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 11 }}>Utility Functions:</Text>
                          <div style={{ marginTop: 4, paddingLeft: 12 }}>
                            <div>pm.utils.uuid()                     Generate UUID (lowercase without hyphens)</div>
                            <div>pm.utils.timestamp()                Current Unix millisecond timestamp (string)</div>
                            <div>pm.utils.md5(str)                   MD5 hash (lowercase hex)</div>
                            <div>pm.utils.sha256(str)                SHA256 hash (lowercase hex)</div>
                            <div>pm.utils.base64(str)                Base64 encoding</div>
                            <div>pm.utils.base64Decode(str)          Base64 decoding</div>
                            <div>pm.utils.hmacSha256(str, key)       HMAC-SHA256 (lowercase hex)</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {scriptResult && (
                    <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontFamily: 'Monaco, Consolas, monospace' }}>
                      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Execution Result</Text>
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
                  <Button size="small" onClick={() => { const result = executePreScript(preScript); setScriptResult(result); }} style={{ marginTop: 12 }}>Test Execute</Button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div style={{ height: 52, borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', gap: 16 }}>
            <Space size="middle">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>Timeout</Text>
                <Input type="number" value={timeout} onChange={(e) => setRequestTimeout(Number(e.target.value))} style={{ width: 80 }} size="small" min={100} max={300000} />
                <Text style={{ fontSize: 12, color: '#666' }}>ms</Text>
              </div>
              {requestStatus && <Text type="secondary" style={{ fontSize: 11 }}>{requestStatus}</Text>}
              {undefinedVars.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff7e6', padding: '4px 12px', borderRadius: 4, border: '1px solid #ffd591' }}>
                  <Text style={{ fontSize: 11, color: '#fa8c16' }}>⚠ Undefined variables: {undefinedVars.join(', ')}, will be replaced with empty string after sending</Text>
                  <Button type="link" size="small" onClick={() => setUndefinedVars([])} style={{ fontSize: 11, padding: 0, height: 'auto' }}>Ignore and Continue</Button>
                </div>
              )}
            </Space>
            <Space size="middle">
              <Button onClick={() => setIsSaveSessionModalOpen(true)}>Save Session</Button>
              {isRequesting ? (
                <Button danger onClick={handleCancel} style={{ width: 100 }}>⏹ Cancel</Button>
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
              <Text style={{ fontSize: 13, color: '#666' }}>Requesting {method} {url}...</Text>
              <Text style={{ fontSize: 12, color: '#999' }}>Elapsed {elapsedTime}ms</Text>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Response State: Empty (no request sent yet) */}
          {!isResponseLoading && !response && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 48, color: '#d9d9d9' }}>↔</div>
              <Text type="secondary" style={{ fontSize: 13 }}>Response will be displayed here after sending request</Text>
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
                <div style={{ flex: 1 }} />
                <Button size="small" icon={<StarFilled style={{ color: '#fa8c16' }} />} onClick={() => {
                  const session = historySessions.find(s => s.id === activeHistoryId);
                  const name = session?.name || `${activeTab?.name || 'request'}-${Date.now()}`;
                  const newSession: HistorySession = {
                    id: `hs_${Date.now()}`,
                    name: name,
                    method: method,
                    url: url,
                    headers: headers.filter(h => h.enabled && h.key),
                    body: body,
                    responseBody: response?.body || '',
                    status: response?.status || 0,
                    statusText: response?.statusText || '',
                    duration: response?.duration || 0,
                    timestamp: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    isSaved: true,
                  };
                  setHistorySessions(prev => [newSession, ...prev.filter(s => s.id !== activeHistoryId)]);
                  message.success('Saved to history', 2);
                }}>Save Record</Button>
                <Button size="small" onClick={() => setIsHistoryExpanded(true)}>View History</Button>
              </div>

              {/* Tab Bar */}
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', padding: '0 16px' }}>
                <div onClick={() => setResponseTab('body')} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: responseTab === 'body' ? '2px solid #1890ff' : '2px solid transparent', color: responseTab === 'body' ? '#1890ff' : '#666', fontSize: 12 }}>Body</div>
                <div onClick={() => setResponseTab('headers')} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: responseTab === 'headers' ? '2px solid #1890ff' : '2px solid transparent', color: responseTab === 'headers' ? '#1890ff' : '#666', fontSize: 12 }}>Headers</div>
                <div onClick={() => setResponseTab('debugLog')} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: responseTab === 'debugLog' ? '2px solid #1890ff' : '2px solid transparent', color: responseTab === 'debugLog' ? '#1890ff' : '#666', fontSize: 12 }}>Debug Log</div>
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Body Tab */}
                {responseTab === 'body' && (
                  <div style={{ padding: 16 }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Format</Text>
                      <Select value="json" size="small" style={{ width: 80 }}>
                        <Select.Option value="json">JSON</Select.Option>
                      </Select>
                      <Button.Group size="small">
                        <Button onClick={() => setBodyViewMode('pretty')} type={bodyViewMode === 'pretty' ? 'primary' : 'default'}>Pretty</Button>
                        <Button onClick={() => setBodyViewMode('raw')} type={bodyViewMode === 'raw' ? 'primary' : 'default'}>Raw</Button>
                      </Button.Group>
                      <Button size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(response.body || ''); message.success('Copied'); }}>Copy</Button>
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
                        <Text type="secondary" style={{ fontSize: 12 }}>No Debug Log</Text>
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
      <Modal title="重命名场景" open={isRenameModalOpen} onOk={handleRename} onCancel={() => setIsRenameModalOpen(false)}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="场景名称"><Input value={newTabName} onChange={(e) => setNewTabName(e.target.value)} placeholder="请输入场景名称" /></Form.Item>
        </Form>
      </Modal>

      {/* New Scene Modal */}
      <Modal title="新建场景" open={isNewSceneModalOpen} onOk={handleCreateNewScene} onCancel={() => setIsNewSceneModalOpen(false)}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="场景名称"><Input value={newSceneName} onChange={(e) => setNewSceneName(e.target.value)} placeholder="请输入场景名称，如：支付-异常金额" /></Form.Item>
        </Form>
      </Modal>

      {/* Save Session Modal */}
      <Modal title="Save Session" open={isSaveSessionModalOpen} onOk={() => {
        addHistorySession({
          name: sessionName || 'Unnamed',
          method,
          url,
          headers: headers.filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: h.value })),
          body,
          responseBody: '',
          status: 0,
          statusText: '',
          duration: 0,
          isSaved: true,
          operator: 'User',
        });
        message.success('Session Saved');
        setIsSaveSessionModalOpen(false);
        setSessionName('');
      }} onCancel={() => { setIsSaveSessionModalOpen(false); setSessionName(''); }}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Remark Name"><Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="e.g., charge success scenario" /></Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>After saving, this Session can be imported when configuring HTTP Request node in scene editing page</Text>
        </Form>
      </Modal>

      {/* History Session Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e8e8', zIndex: 100, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
        {/* Collapsed Title Bar */}
        <div onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', cursor: 'pointer', background: '#fafafa' }}>
          <Space size="middle">
            <span style={{ fontSize: 12, color: '#666' }}>{isHistoryExpanded ? '▼' : '▲'} 请求历史（团队共享，不可删除）</span>
           <span style={{ fontSize: 11, color: '#999' }}>（total {historySessions.length}）</span>
          </Space>
          <Space size="middle">
            <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); setHistoryFilter('all'); }} style={{ fontSize: 11, padding: 0, height: 'auto', color: historyFilter === 'all' ? '#1890ff' : '#999' }}>全部</Button>
            <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); setHistoryFilter('starred'); }} style={{ fontSize: 11, padding: 0, height: 'auto', color: historyFilter === 'starred' ? '#fa8c16' : '#999' }}>⭐已标记</Button>
            <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); setHistoryFilter('unstarred'); }} style={{ fontSize: 11, padding: 0, height: 'auto', color: historyFilter === 'unstarred' ? '#666' : '#999' }}>未标记</Button>
          </Space>
        </div>

        {/* Expanded Content */}
        {isHistoryExpanded && (
          <div style={{ height: 160, overflowX: 'auto', overflowY: 'auto', padding: '10px 16px', display: 'flex', gap: 12 }}>
            {historySessions.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#999', fontSize: 12 }}>No history</div>
            ) : (
              historySessions
                .filter(s => historyFilter === 'all' ? true : historyFilter === 'starred' ? s.isSaved : !s.isSaved)
                .sort((a, b) => {
                  if (a.isSaved && !b.isSaved) return -1;
                  if (!a.isSaved && b.isSaved) return 1;
                  return 0;
                })
                .map(session => {
                const isSuccess = session.status >= 200 && session.status < 300;
                const pathMatch = session.url.match(/https?:\/\/[^\/]+(\/[^\?]*)/);
                const path = pathMatch ? pathMatch[1] : session.url;
                const isActive = session.id === activeHistoryId;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveHistoryId(session.id);
                      setResponse(session.responseBody ? {
                        status: session.status,
                        statusText: session.statusText,
                        duration: session.duration,
                        timestamp: session.timestamp,
                        headers: session.headers?.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}) || {},
                        body: session.responseBody,
                      } : null);
                      message.info('History loaded, click "Restore" to fill request to current Tab');
                    }}
                    style={{ minWidth: 220, maxWidth: 220, height: 110, border: '1px solid #e8e8e8', borderRadius: 6, padding: 10, background: '#fff', position: 'relative', flexShrink: 0, cursor: 'pointer', borderColor: isActive ? '#1890ff' : '#e8e8e8', overflow: 'hidden' }}
                                   >
                    {/* Star button */}
                    <Button type="text" size="small" icon={session.isSaved ? <StarFilled style={{ color: '#fa8c16' }} /> : <StarOutlined style={{ color: '#999' }} />} onClick={(e) => {
                      e.stopPropagation();
                      if (session.isSaved) {
                        Modal.confirm({
                          title: '取消标记确认',
                          content: session.markedBy ? `此记录由 ${session.markedBy} 标记，取消标记将影响团队共识交付物确认。是否继续？` : '确定要取消标记吗？',
                          okText: '确认取消',
                          cancelText: '保留标记',
                          onOk: () => {
                            setHistorySessions(prev => prev.map(s => s.id === session.id ? { ...s, isSaved: false, markedBy: undefined, markedAt: undefined } : s));
                          }
                        });
                      } else {
                        const now = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0');
                        setHistorySessions(prev => prev.map(s => s.id === session.id ? { ...s, isSaved: true, markedBy: 'User', markedAt: now } : s));
                      }
                    }} style={{ position: 'absolute', top: 2, left: 2, fontSize: 9, padding: 0, width: 16, height: 16 }} />
                    {/* Status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, paddingLeft: 18 }}>
                      <span style={{ fontSize: 9 }}>{isSuccess ? '🟢' : '🔴'}</span>
                      <Text strong style={{ fontSize: 11 }} ellipsis>{session.name}</Text>
                    </div>
                    {/* Method, path */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Tag style={{ fontSize: 8, padding: '0 2px', margin: 0, background: getMethodColor(session.method), border: 'none', color: '#fff' }}>{session.method}</Tag>
                      <Text style={{ fontSize: 10, color: '#666' }} ellipsis>{path}</Text>
                    </div>
                    {/* Status and duration */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      {session.status > 0 && (
                        <>
                          <span style={{ fontSize: 9, color: isSuccess ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>{session.status}</span>
                          <span style={{ fontSize: 9, color: '#999' }}>{session.duration}ms</span>
                        </>
                      )}
                      {session.status === 0 && (
                        <span style={{ fontSize: 9, color: '#999' }}>{session.statusText || 'Not sent'}</span>
                      )}
                    </div>
                    {/* Timestamp */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <Text type="secondary" style={{ fontSize: 9 }}>{session.timestamp}</Text>
                      {session.operator && <Text type="secondary" style={{ fontSize: 9 }}>by {session.operator}</Text>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); restoreSession(session); }} style={{ fontSize: 9, padding: 0, height: 'auto' }}>重新发送</Button>
                      <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); copyAsScene(session); }} style={{ fontSize: 9, padding: 0, height: 'auto' }}>复制为场景</Button>
                      <Button type="link" size="small" onClick={(e) => {
                        e.stopPropagation();
                        const exportData = {
                          name: session.name,
                          method: session.method,
                          url: session.url,
                          headers: session.headers || [],
                          body: session.body || '',
                          timestamp: session.timestamp,
                        };
                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `api_debug_${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        message.success('Export Successful');
                      }} style={{ fontSize: 9, padding: 0, height: 'auto' }}>导出</Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Scene Variable Modal */}
      {renderSceneVarModal()}

      {/* Debug Credentials Modal */}
      {renderDebugCredModal()}
    </div>
  );
}
