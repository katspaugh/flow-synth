// Type declarations for AudioWorklet global scope

declare const sampleRate: number;
declare const currentFrame: number;
declare const currentTime: number;

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor
): void;

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

interface AudioWorkletNodeOptions {
  numberOfInputs?: number;
  numberOfOutputs?: number;
  outputChannelCount?: number[];
  parameterData?: Record<string, number>;
  processorOptions?: unknown;
}

// MessagePort and MessageEvent types
interface MessagePort extends EventTarget {
  postMessage(message: unknown): void;
  close(): void;
  start(): void;
  onmessage: ((this: MessagePort, ev: MessageEvent) => unknown) | null;
  onmessageerror: ((this: MessagePort, ev: MessageEvent) => unknown) | null;
}

interface MessageEvent<T = unknown> {
  readonly data: T;
  readonly origin: string;
  readonly lastEventId: string;
  readonly source: MessageEventSource | null;
  readonly ports: ReadonlyArray<MessagePort>;
}

type MessageEventSource = MessagePort;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EventTarget {}
