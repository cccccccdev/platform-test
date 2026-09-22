import { create } from 'zustand';
import {
  initialServiceRecords,
  type ServiceActionRecord,
  type ServiceRecord,
  type ServiceRunModel,
} from './serviceReferenceData';
import { useCapabilityDataStore } from './capabilityDataStore';

function cloneInitialRecords(): Record<string, ServiceRecord[]> {
  return Object.fromEntries(Object.entries(initialServiceRecords).map(([businessType, services]) => [
    businessType,
    services.map((service) => ({
      ...service,
      actions: service.actions.map((serviceAction) => ({ ...serviceAction })),
      capabilityReferences: service.capabilityReferences?.map((reference) => ({ ...reference })),
    })),
  ]));
}

interface ServiceState {
  records: Record<string, ServiceRecord[]>;
  addService: (businessType: string, service: ServiceRecord) => void;
  addActions: (businessType: string, serviceKey: string, actions: ServiceActionRecord[]) => void;
  setActionModel: (businessType: string, serviceKey: string, actionKey: string, model: ServiceRunModel) => void;
  connectAbility: (businessType: string, serviceName: string, ability: string) => void;
  addConnection: (businessType: string, serviceName: string, abilityName: string) => 'added' | 'duplicate' | 'invalid';
  removeBusinessType: (businessType: string) => void;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  records: cloneInitialRecords(),
  addService: (businessType, service) => set((state) => ({
    records: { ...state.records, [businessType]: [...(state.records[businessType] || []), service] },
  })),
  addActions: (businessType, serviceKey, actions) => set((state) => ({
    records: {
      ...state.records,
      [businessType]: (state.records[businessType] || []).map((service) => service.key === serviceKey
        ? { ...service, actions: [...service.actions, ...actions] }
        : service),
    },
  })),
  setActionModel: (businessType, serviceKey, actionKey, model) => set((state) => ({
    records: {
      ...state.records,
      [businessType]: (state.records[businessType] || []).map((service) => service.key === serviceKey
        ? {
          ...service,
          actions: service.actions.map((serviceAction) => serviceAction.key === actionKey && !serviceAction.model
            ? { ...serviceAction, model }
            : serviceAction),
        }
        : service),
    },
  })),
  connectAbility: (businessType, serviceName, ability) => set((state) => ({
    records: {
      ...state.records,
      [businessType]: (state.records[businessType] || []).map((service) => {
        if (service.name !== serviceName || service.capabilityReferences?.some((reference) => reference.ability === ability)) return service;
        return {
          ...service,
          capabilityReferences: [...(service.capabilityReferences || []), { ability, direction: 'service-to-ability' }],
        };
      }),
    },
  })),
  addConnection: (businessType, serviceName, abilityName) => {
    const service = (get().records[businessType] || []).find((item) => item.name === serviceName);
    const ability = useCapabilityDataStore.getState().data.find((item) => item.name === businessType)?.abilities.find((item) => item.name === abilityName);
    if (!service || !ability) return 'invalid';
    const reference = service.capabilityReferences?.find((item) => item.ability === abilityName);
    if (reference) return 'duplicate';
    set((state) => ({
      records: {
        ...state.records,
        [businessType]: (state.records[businessType] || []).map((item) => item.name !== serviceName ? item : {
          ...item,
          capabilityReferences: [...(item.capabilityReferences || []), { ability: abilityName, direction: 'service-to-ability' }],
        }),
      },
    }));
    return 'added';
  },
  removeBusinessType: (businessType) => set((state) => {
    const records = { ...state.records };
    delete records[businessType];
    return { records };
  }),
}));
