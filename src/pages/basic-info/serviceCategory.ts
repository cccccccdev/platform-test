// Placeholder categories shared by Service and Capability, with the API / SPI
// Request templates seeded from them. Values are placeholders until the order
// center confirms the real enum.
import type { SpiFieldNode } from './capability/spiSchemaModel';

export const SERVICE_CATEGORY_OPTIONS = ['category1', 'category2', 'category3', 'category4'] as const;

export type ServiceCategory = typeof SERVICE_CATEGORY_OPTIONS[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  category1: 'Category 1',
  category2: 'Category 2',
  category3: 'Category 3',
  category4: 'Category 4',
};

interface CategoryTemplateChild {
  name: string;
  type: string;
  description: string;
}

interface CategoryTemplateDefinition {
  templateName: string;
  description: string;
  children: CategoryTemplateChild[];
}

export const CATEGORY_TEMPLATES: Record<ServiceCategory, CategoryTemplateDefinition> = {
  category1: {
    templateName: 'category1Template',
    description: 'Category 1 placeholder template',
    children: [{ name: 'field1', type: 'String', description: 'Category 1 placeholder field' }],
  },
  category2: {
    templateName: 'category2Template',
    description: 'Category 2 placeholder template',
    children: [{ name: 'field1', type: 'String', description: 'Category 2 placeholder field' }],
  },
  category3: {
    templateName: 'category3Template',
    description: 'Category 3 placeholder template',
    children: [{ name: 'field1', type: 'String', description: 'Category 3 placeholder field' }],
  },
  category4: {
    templateName: 'category4Template',
    description: 'Category 4 placeholder template',
    children: [{ name: 'field1', type: 'String', description: 'Category 4 placeholder field' }],
  },
};

export const categoryTemplatePath = (category: ServiceCategory): string =>
  `extraRequest.${CATEGORY_TEMPLATES[category].templateName}`;

export function buildCategoryTemplateNode(category: ServiceCategory | undefined): SpiFieldNode | null {
  if (!category) return null;
  const definition = CATEGORY_TEMPLATES[category];
  const rootId = categoryTemplatePath(category);
  return {
    id: rootId,
    name: definition.templateName,
    type: 'Object',
    description: definition.description,
    required: false,
    extension: false,
    children: definition.children.map((child) => ({
      id: `${rootId}.${child.name}`,
      name: child.name,
      type: child.type,
      description: child.description,
      required: false,
      extension: false,
      effectTag: 'EFFECT_ON_BIDIRECTIONAL',
      children: [],
    })),
  };
}
