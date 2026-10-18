export type SpeechInputState = "off" | "starting" | "on" | "stopping";

export interface SpeechInputOptions {
  value: string;
  onChange: (value: string) => void;
  onStatus?: (message: string) => void;
  enabled?: boolean;
  sessionKey?: string;
}

export interface SpeechInput {
  supported: boolean;
  state: SpeechInputState;
  toggle: () => void;
  cancel: () => void;
}
