// Testing Types

export interface TestCase {
  id: string;
  name: string;
  flowId: string;
  versionNo: number;
  category: 'Happy Path' | 'Error Path' | 'Boundary' | 'Requery';
  input: Record<string, any>;
  mockStrategy?: string;
  assertions: Assertion[];
  lastResult?: 'PASS' | 'FAIL' | 'PENDING';
  lastExecutedAt?: string;
}

export interface Assertion {
  type: 'SPI_RESPONSE' | 'CONTEXT_FIELD' | 'ORDER_STATUS' | 'EXECUTION_PATH' | 'MQ_MESSAGE';
  field?: string;
  operator?: '==' | '!=' | 'contains' | 'notNull';
  expectedValue?: any;
  atNode?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  flowId: string;
  caseIds: string[];
  executionStrategy: 'SEQUENTIAL' | 'PARALLEL';
  continueOnFailure: boolean;
  coverageThreshold?: number;
  lastResult?: 'PASS' | 'FAIL';
  lastExecutedAt?: string;
}

export interface Trace {
  id: string;
  flowId: string;
  env: string;
  status: 'SUCCESS' | 'FAIL' | 'PENDING';
  startTime: string;
  endTime?: string;
  nodes: TraceNode[];
  contextSnapshots: ContextSnapshot[];
}

export interface TraceNode {
  nodeId: string;
  nodeType: string;
  status: 'SUCCESS' | 'FAIL' | 'SKIP';
  startTime: string;
  endTime?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

export interface ContextSnapshot {
  nodeId: string;
  timestamp: string;
  context: Record<string, any>;
  changes: {
    field: string;
    action: 'ADD' | 'UPDATE' | 'DELETE';
    oldValue?: any;
    newValue?: any;
  }[];
}

export interface TestExecution {
  id: string;
  suiteId?: string;
  caseId?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  results: TestResult[];
  startedAt: string;
  completedAt?: string;
}

export interface TestResult {
  caseId: string;
  result: 'PASS' | 'FAIL';
  duration: number;
  assertions: AssertionResult[];
  path: string[];
}

export interface AssertionResult {
  assertion: Assertion;
  result: 'PASS' | 'FAIL';
  message?: string;
}
