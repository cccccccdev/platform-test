import ChannelSharedLines from './ChannelSharedLines';
import { channelLineScopeKey, initialSharedLines, useChannelLineStore } from './channelInfoPartyLines';

export default function ChannelInfoLinesPage({ channelCode, cloud, env }: { channelCode: string; cloud: string; env: string }) {
  const scopeKey = channelLineScopeKey(channelCode, cloud, env);
  const storedLines = useChannelLineStore((state) => state.linesByScope[scopeKey]);
  const setLines = useChannelLineStore((state) => state.setLines);
  const lines = storedLines ?? initialSharedLines(channelCode);
  return <ChannelSharedLines lines={lines} onChange={(next) => setLines(scopeKey, next)} />;
}
