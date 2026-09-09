import ChannelSharedLines from './ChannelSharedLines';
import { channelLineScopeKey, initialLineReferences, initialSharedLines, useChannelLineStore } from './channelInfoPartyLines';

export default function ChannelInfoLinesPage({ channelCode, cloud, env }: { channelCode: string; cloud: string; env: string }) {
  const scopeKey = channelLineScopeKey(channelCode, cloud, env);
  const storedLines = useChannelLineStore((state) => state.linesByScope[scopeKey]);
  const storedReferences = useChannelLineStore((state) => state.referencesByScope[scopeKey]);
  const setLines = useChannelLineStore((state) => state.setLines);
  const lines = storedLines ?? initialSharedLines(channelCode);
  const references = storedReferences ?? initialLineReferences(channelCode);
  return <ChannelSharedLines lines={lines} references={references} onChange={(next) => setLines(scopeKey, next)} />;
}
