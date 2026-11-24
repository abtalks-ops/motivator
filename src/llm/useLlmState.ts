import { useSyncExternalStore } from 'react';
import { llm, type LlmService, type LlmState } from './service';

export function useLlmState(service: LlmService = llm): LlmState {
  return useSyncExternalStore(service.subscribe, service.getState);
}
