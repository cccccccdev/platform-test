export interface SpiFieldNode {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
  extension: boolean;
  effectTag?: string;
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
  effectTag?: string;
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
      effectTag: field.effectTag,
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
    const position = (id: string) => { const index = reference.findIndex((node) => node.id === id); return index < 0 ? Number.MAX_SAFE_INTEGER : index; };
    return next.sort((a, b) => position(a.id) - position(b.id));
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

export function validateEffectTags(nodes: SpiFieldNode[]): string | null {
  for (const node of nodes) {
    if (node.type !== 'Object' && node.type !== 'Array' && !node.effectTag) return `Select an Effect Tag for ${node.name || 'the new field'}.`;
    const childError = validateEffectTags(node.children);
    if (childError) return childError;
  }
  return null;
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

export function spiSchemaToMarkdown(nodes: SpiFieldNode[], includeEffectTag = false): string {
  const rows = includeEffectTag
    ? ['| Name | Type | Effect Tag | Description |', '| --- | --- | --- | --- |']
    : ['| Name | Type | Description |', '| --- | --- | --- |'];
  const visit = (items: SpiFieldNode[], depth: number) => {
    items.forEach((node) => {
      const name = `${'&nbsp;'.repeat(depth * 4)}${depth ? '↳ ' : ''}${escapeMarkdownCell(node.name)}`;
      rows.push(includeEffectTag
        ? `| ${name} | ${escapeMarkdownCell(node.type)} | ${escapeMarkdownCell(node.effectTag || '-')} | ${escapeMarkdownCell(node.description || '-')} |`
        : `| ${name} | ${escapeMarkdownCell(node.type)} | ${escapeMarkdownCell(node.description || '-')} |`);
      visit(node.children, depth + 1);
    });
  };
  visit(nodes, 0);
  return `${rows.join('\n')}\n`;
}

export function importJsonToSpiTree(json: unknown, catalog: SpiFieldNode[], current: SpiFieldNode[], customRoot: boolean): SpiFieldNode[] {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('The _order value must be a JSON object.');
  }

  let count = 0;
  const inferType = (value: unknown): string => {
    if (Array.isArray(value)) return 'Array';
    if (value !== null && typeof value === 'object') return 'Object';
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') {
      if (!Number.isInteger(value)) return 'String';
      return value >= -2147483648 && value <= 2147483647 ? 'Integer' : 'Long';
    }
    return 'String';
  };
  const typeMatches = (type: string, value: unknown) => {
    if (value === null) return type !== 'Object' && type !== 'Array';
    if (type === 'Object') return typeof value === 'object' && !Array.isArray(value);
    if (type === 'Array') return Array.isArray(value);
    if (type === 'Boolean') return typeof value === 'boolean';
    if (type === 'Integer') return typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
    if (type === 'Long') return typeof value === 'number' && Number.isInteger(value);
    if (type === 'BigDecimal') return typeof value === 'number' || typeof value === 'string';
    return typeof value === 'string';
  };
  const build = (name: string, value: unknown, template: SpiFieldNode | undefined, previous: SpiFieldNode | undefined, path: string, depth: number): SpiFieldNode => {
    count += 1;
    if (count > 2000 || depth > 24) throw new Error('JSON contains too many or too deeply nested fields.');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid field name: ${path}.`);
    if (template && !typeMatches(template.type, value)) throw new Error(`${path} must match the template type ${template.type}.`);
    const type = template?.type ?? inferType(value);
    const id = template?.id ?? (previous?.extension ? previous.id : `business_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const children = type === 'Object'
      ? buildObject(value as Record<string, unknown>, template?.children ?? [], previous?.children ?? [], !template || name === 'extraRequest' || name === 'extraResponse', path, depth + 1)
      : type === 'Array'
        ? (() => {
          const sample = (value as unknown[])[0];
          const itemTemplate = template?.children.find((child) => child.name === '_items' && !child.extension);
          const itemPrevious = previous?.children.find((child) => child.name === '_items');
          if (sample === undefined) return itemPrevious ? [itemPrevious] : itemTemplate ? [itemTemplate] : [{ id: `${id}_items`, name: '_items', type: 'String', description: '', required: false, extension: true, children: [] }];
          if (Array.isArray(sample)) throw new Error(`${path} contains a nested array, which this editor cannot represent.`);
          const item = build('_items', sample, itemTemplate, itemPrevious, `${path}._items`, depth + 1);
          return [{ ...item, id: itemTemplate?.id ?? itemPrevious?.id ?? `${id}_items` }];
        })()
        : [];
    return {
      ...(template ?? { id, name, type, required: false, extension: true, description: '' }),
      id, name, type, children,
      description: previous?.description ?? template?.description ?? '',
      effectTag: type === 'Object' || type === 'Array' ? undefined : previous?.type === type ? previous.effectTag : template?.effectTag,
    };
  };
  const buildObject = (record: Record<string, unknown>, templates: SpiFieldNode[], previous: SpiFieldNode[], allowCustom: boolean, parentPath: string, depth: number): SpiFieldNode[] =>
    Object.entries(record).map(([name, value]) => {
      const path = parentPath ? `${parentPath}.${name}` : name;
      const template = templates.find((node) => node.name === name && !node.extension);
      if (!template && !allowCustom) throw new Error(`${path} is not a template field. Add new fields under extraRequest or extraResponse.`);
      return build(name, value, template, previous.find((node) => node.name === name), path, depth);
    });

  return buildObject(json as Record<string, unknown>, catalog, current, customRoot, '', 0);
}
