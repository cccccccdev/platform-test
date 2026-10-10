import { ReactFlowProvider } from '@xyflow/react';

interface FlowCanvasProps {
  children: React.ReactNode;
}

export function FlowCanvas({ children }: FlowCanvasProps) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
