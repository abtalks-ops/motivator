export { detectDevice, recommend, type DeviceInfo, type Recommendation } from './device';
export { MODELS, type ModelEntry } from './models';
export { llm, LlmService, type LlmState, type LlmStatus } from './service';
export { errorText, explainError, LlmError, logLlmError, type ExplainedError } from './errors';
export { useLlmState } from './useLlmState';
export type * from './types';
