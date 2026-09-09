const decode = (value?: string) => decodeURIComponent(value || '');

export function parsePartyPath(pathname: string) {
  const marker = '/channel-info/party';
  const tail = pathname.slice(pathname.toLowerCase().indexOf(marker) + marker.length).split('/').filter(Boolean).map(decode);
  const party = tail[0] || '';
  if (!party) return { view: 'list' as const, party, account: '' };
  if (tail[1] === 'credential') return { view: 'credential' as const, party, account: '' };
  if (tail[1] === 'line') return { view: 'line' as const, party, account: '' };
  if (tail[1] === 'portal') return { view: 'portal' as const, party, account: '' };
  if (tail[1] === 'accounts' && !tail[2]) return { view: 'accounts' as const, party, account: '' };
  if (tail[1] === 'accounts' && tail[2] && tail[3] === 'credential') return { view: 'account-credential' as const, party, account: tail[2] };
  if (tail[1] === 'accounts' && tail[2] && tail[3] === 'line') return { view: 'account-line' as const, party, account: tail[2] };
  return { view: 'list' as const, party: '', account: '' };
}

export function channelInfoPartyTitle(pathname: string) {
  const { view } = parsePartyPath(pathname);
  if (view === 'credential' || view === 'account-credential') return 'Credential';
  if (view === 'line' || view === 'account-line') return 'Line';
  if (view === 'accounts') return 'Accounts';
  if (view === 'portal') return 'Portal';
  return 'Party';
}
