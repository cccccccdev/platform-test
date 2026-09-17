export function getDemoReturnUrl(searchParams: URLSearchParams, businessType: string): string | null {
  const kind = searchParams.get('demoFocusKind');
  const name = searchParams.get('demoFocusName');
  if ((kind !== 'service' && kind !== 'ability') || !name) return null;
  return `/basic-info/demo?${new URLSearchParams({ bt: businessType, focusKind: kind, focusName: name }).toString()}`;
}

export function demoFocusQuery(kind: 'service' | 'ability', name: string) {
  return { demoFocusKind: kind, demoFocusName: name };
}
