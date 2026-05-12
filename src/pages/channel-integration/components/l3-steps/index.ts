import { default as L3HttpRequestSteps, L3HttpRequestSteps_Config } from './L3HttpRequestSteps';
import { default as L3InternalCallSteps, L3InternalCallSteps_Config } from './L3InternalCallSteps';
import { default as L3GenerateDataSteps, L3GenerateDataSteps_Config } from './L3GenerateDataSteps';
import { default as L3RequerySteps, L3RequerySteps_Config } from './L3RequerySteps';
import { default as L3CallbackParseSteps, L3CallbackParseSteps_Config } from './L3CallbackParseSteps';
import { default as L3SceneInitializerSteps, L3SceneInitializerSteps_Config } from './L3SceneInitializerSteps';
import { default as FieldConverterDrawer } from './FieldConverterDrawer';
import { default as ConditionRouterDrawer } from './ConditionRouterDrawer';
import { default as StateWriterDrawer } from './StateWriterDrawer';
import { default as MqDispatcherDrawer } from './MqDispatcherDrawer';

export { L3HttpRequestSteps_Config } from './L3HttpRequestSteps';
export { L3InternalCallSteps_Config } from './L3InternalCallSteps';
export { L3GenerateDataSteps_Config } from './L3GenerateDataSteps';
export { L3RequerySteps_Config } from './L3RequerySteps';
export { L3CallbackParseSteps_Config } from './L3CallbackParseSteps';
export { L3SceneInitializerSteps_Config } from './L3SceneInitializerSteps';

export { L3HttpRequestSteps };
export { L3InternalCallSteps };
export { L3GenerateDataSteps };
export { L3RequerySteps };
export { L3CallbackParseSteps };
export { L3SceneInitializerSteps };
export { FieldConverterDrawer };
export { ConditionRouterDrawer };
export { StateWriterDrawer };
export { MqDispatcherDrawer };

export const L3_STEP_CONFIGS: Record<string, any> = {
  'L3-01': L3HttpRequestSteps_Config,
  'L3-02': L3InternalCallSteps_Config,
  'L3-05': L3GenerateDataSteps_Config,
  'L3-08': L3RequerySteps_Config,
  'L3-09': L3CallbackParseSteps_Config,
  'L3-11': L3SceneInitializerSteps_Config,
};

export const L3_COMPONENT_MAP: Record<string, any> = {
  'L3-01': L3HttpRequestSteps,
  'L3-02': L3InternalCallSteps,
  'L3-05': L3GenerateDataSteps,
  'L3-08': L3RequerySteps,
  'L3-09': L3CallbackParseSteps,
  'L3-11': L3SceneInitializerSteps,
};
