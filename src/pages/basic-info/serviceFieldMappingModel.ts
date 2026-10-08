import type { SpiFieldNode } from './capability/spiSchemaModel';
import { canDeployField, type DeployEnvironment, type DeployStatus } from './serviceApiLimitModel';

export interface MappingField {
  key: string;
  path: string;
  type: string;
  depth: number;
  extension: boolean;
  leaf: boolean;
}
export interface MappingValue {
  apiPath: string;
  status?: DeployStatus;
  operateTime?: string;
  operator?: string;
}
export interface SavedMapping {
  submitted: boolean;
  fields: Record<string, MappingValue>;
}

export function flattenMappingFields(nodes: SpiFieldNode[], direction: 'request' | 'response', parent = '', depth = 0): MappingField[] {
  return nodes.flatMap((node) => {
    const path = parent ? `${parent}.${node.name}` : node.name;
    return [{
      key: `${direction}:${path}`, path, type: node.type, depth,
      extension: node.extension || parent.startsWith('extraRequest') || parent.startsWith('extraResponse'),
      leaf: node.type !== 'Object' && node.type !== 'Array',
    }, ...flattenMappingFields(node.children || [], direction, path, depth + 1)];
  });
}

export function defaultApiMapping(spi: MappingField, api: MappingField[]): string {
  if (!spi.leaf || spi.extension) return '';
  const exact = api.find((field) => field.leaf && field.path === spi.path && field.type === spi.type);
  if (exact) return exact.path;
  const name = spi.path.split('.').at(-1);
  const matches = api.filter((field) => field.leaf && field.path.split('.').at(-1) === name && field.type === spi.type);
  return matches.length === 1 ? matches[0].path : '';
}

export function submitMapping(
  current: SavedMapping | undefined,
  draft: Record<string, string>,
  keys: string[],
  dirtyKeys: ReadonlySet<string>,
  operateTime: string,
  operator: string,
): SavedMapping {
  const fields = { ...current?.fields };
  for (const key of keys) {
    const previous = current?.fields[key];
    if (!current?.submitted || !previous?.status || dirtyKeys.has(key)) {
      fields[key] = { apiPath: draft[key] || '', status: 'DRAFT', operateTime, operator };
    }
  }
  return { submitted: true, fields };
}

export function deployMapping(
  current: SavedMapping,
  environment: DeployEnvironment,
  selectedKeys: ReadonlySet<string>,
  operateTime: string,
  operator: string,
): SavedMapping {
  const fields = { ...current.fields };
  for (const key of selectedKeys) {
    const previous = fields[key];
    if (previous && canDeployField(previous.status, environment)) {
      fields[key] = { ...previous, status: environment, operateTime, operator };
    }
  }
  return { ...current, fields };
}
