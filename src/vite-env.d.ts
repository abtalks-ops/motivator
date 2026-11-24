/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' swaps the real LLM for a scripted fake, for end-to-end tests only. */
  readonly VITE_FAKE_LLM?: string;
}
