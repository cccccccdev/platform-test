export function getDemoReturnUrl(searchParams: URLSearchParams, businessType: string): string | null {
  const kind = searchParams.get('demoFocusKind');
  const name = searchParams.get('demoFocusName');
  const showAllActions = searchParams.get('demoActionView') === 'all';
  if (((kind !== 'service' && kind !== 'ability') || !name) && !showAllActions) return null;
  const next = new URLSearchParams({ bt: businessType });
  if (showAllActions) next.set('actionView', 'all');
  if ((kind === 'service' || kind === 'ability') && name) {
    next.set('focusKind', kind);
    next.set('focusName', name);
  }
  return `/basic-info/demo?${next.toString()}`;
}

export function demoFocusQuery(kind: 'service' | 'ability', name: string, actionView?: 'all') {
  return { demoFocusKind: kind, demoFocusName: name, ...(actionView ? { demoActionView: actionView } : {}) };
}
