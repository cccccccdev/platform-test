export interface SpiFieldNode {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
  extension: boolean;
  templatePlaceholder?: boolean;
  children: SpiFieldNode[];
}

export interface FlatSpiField {
  name: string;
  type: string;
  description?: string;
  depth?: number;
  required?: boolean;
  extension?: boolean;
}

export function fieldsToTree(fields: FlatSpiField[]): SpiFieldNode[] {
  const roots: SpiFieldNode[] = [];
  const parents: SpiFieldNode[] = [];
  for (const field of fields) {
    const depth = field.depth || 0;
    const siblings = depth === 0 ? roots : parents[depth - 1]?.children;
    if (!siblings) continue;
    const parentId = depth === 0 ? '' : parents[depth - 1].id;
    const node: SpiFieldNode = {
      id: parentId ? `${parentId}.${field.name}` : field.name,
      name: field.name,
      type: field.type,
      description: field.description || '',
      required: Boolean(field.required),
      extension: Boolean(field.extension),
      children: [],
    };
    siblings.push(node);
    parents[depth] = node;
    parents.length = depth + 1;
  }
  return roots;
}

export function withoutBusinessFields(nodes: SpiFieldNode[]): SpiFieldNode[] {
  return nodes.filter((node) => !node.extension).map((node) => ({ ...node, children: withoutBusinessFields(node.children) }));
}

export function findNode(nodes: SpiFieldNode[], id: string): SpiFieldNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

export function updateNodeTree(nodes: SpiFieldNode[], id: string, update: (node: SpiFieldNode) => SpiFieldNode | null): SpiFieldNode[] {
  return nodes.flatMap((node) => {
    if (node.id === id) {
      const next = update(node);
      return next ? [next] : [];
    }
    return [{ ...node, children: updateNodeTree(node.children, id, update) }];
  });
}

export function insertCatalogNode(nodes: SpiFieldNode[], parentId: string | null, candidate: SpiFieldNode, catalog: SpiFieldNode[]): SpiFieldNode[] {
  const restored = candidate.extension ? candidate : withoutBusinessFields([candidate])[0];
  const insert = (current: SpiFieldNode[], reference: SpiFieldNode[]) => {
    const next = [...current, restored];
    return next.sort((a, b) => reference.findIndex((node) => node.id === a.id) - reference.findIndex((node) => node.id === b.id));
  };
  if (parentId === null) return nodes.some((node) => node.id === candidate.id) ? nodes : insert(nodes, catalog);
  return updateNodeTree(nodes, parentId, (parent) => ({
    ...parent,
    children: parent.children.some((node) => node.id === candidate.id) ? parent.children : insert(parent.children, findNode(catalog, parentId)?.children || []),
  }));
}

export function appendBusinessNode(nodes: SpiFieldNode[], parentId: string | null, name: string, type: string): SpiFieldNode[] {
  const id = `business_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const node: SpiFieldNode = {
    id, name, type, description: '', required: false, extension: true,
    children: type === 'Array' ? [{ id: `${id}_items`, name: '_items', type: 'String', description: '', required: false, extension: true, children: [] }] : [],
  };
  return parentId === null ? [...nodes, node]
    : updateNodeTree(nodes, parentId, (parent) => ({ ...parent, children: [...parent.children, node] }));
}

export function appendTemplatePlaceholder(nodes: SpiFieldNode[], parentId: string | null): SpiFieldNode[] {
  const node: SpiFieldNode = {
    id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '', type: '', description: '', required: false, extension: false,
    templatePlaceholder: true, children: [],
  };
  return parentId === null ? [...nodes, node]
    : updateNodeTree(nodes, parentId, (parent) => ({ ...parent, children: [...parent.children, node] }));
}

export function moveBusinessSibling(nodes: SpiFieldNode[], parentId: string | null, fromId: string, toId: string): SpiFieldNode[] {
  const move = (siblings: SpiFieldNode[]) => {
    const next = [...siblings];
    const from = next.findIndex((node) => node.id === fromId && node.extension);
    const to = next.findIndex((node) => node.id === toId && node.extension);
    if (from < 0 || to < 0 || from === to) return siblings;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };
  return parentId === null ? move(nodes)
    : updateNodeTree(nodes, parentId, (parent) => ({ ...parent, children: move(parent.children) }));
}

export function validateSpiTree(nodes: SpiFieldNode[]): string | null {
  const check = (siblings: SpiFieldNode[], parent: string): string | null => {
    const names = new Set<string>();
    for (const node of siblings) {
      const path = parent ? `${parent}.${node.name}` : node.name;
      if (!node.name.trim() || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(node.name)) return `Invalid field name at ${path || parent || 'root'}.`;
      if (names.has(node.name)) return `Duplicate field name under ${parent || 'root'}: ${node.name}.`;
      names.add(node.name);
      if (!node.type) return `Select a type for ${path}.`;
      const childError = check(node.children, path);
      if (childError) return childError;
    }
    return null;
  };
  return check(nodes, '');
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

export function spiSchemaToMarkdown(nodes: SpiFieldNode[]): string {
  const rows = ['| Name | Type | Description |', '| --- | --- | --- |'];
  const visit = (items: SpiFieldNode[], depth: number) => {
    items.forEach((node) => {
      const name = `${'&nbsp;'.repeat(depth * 4)}${depth ? '↳ ' : ''}${escapeMarkdownCell(node.name)}`;
      rows.push(`| ${name} | ${escapeMarkdownCell(node.type)} | ${escapeMarkdownCell(node.description || '-')} |`);
      visit(node.children, depth + 1);
    });
  };
  visit(nodes, 0);
  return `${rows.join('\n')}\n`;
}
