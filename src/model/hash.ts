import type { Graph } from '../types/graph';
import { isModuleKind } from './ports';

// Patches are shared as base64url-encoded JSON in the URL fragment. The format
// is the same one aumlet used, so its share links still open here.

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (value: string): Uint8Array => {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const serializeGraphToHash = (graph: Graph): string =>
  base64UrlEncode(textEncoder.encode(JSON.stringify(graph)));

const isFiniteOrUndefined = (value: unknown) =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value));

const tryParseGraph = (value: string): Graph | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { modules, connections } = parsed as Partial<Graph>;
    if (!Array.isArray(modules) || !Array.isArray(connections)) return null;

    const modulesValid = modules.every(
      (mod) =>
        mod &&
        typeof mod === 'object' &&
        typeof mod.id === 'string' &&
        isModuleKind(mod.kind) &&
        isFiniteOrUndefined(mod.x) &&
        isFiniteOrUndefined(mod.y)
    );
    if (!modulesValid) return null;

    const connectionsValid = connections.every(
      (conn) =>
        conn &&
        typeof conn === 'object' &&
        typeof conn.from?.id === 'string' &&
        typeof conn.from?.port === 'string' &&
        typeof conn.to?.id === 'string' &&
        typeof conn.to?.port === 'string'
    );
    if (!connectionsValid) return null;

    return { modules, connections };
  } catch {
    return null;
  }
};

export const deserializeGraphFromHash = (hash: string): Graph | null => {
  if (!hash) return null;

  try {
    const parsed = tryParseGraph(textDecoder.decode(base64UrlDecode(hash)));
    if (parsed) return parsed;
  } catch {
    // Not base64url; fall through to the legacy URI-encoded format.
  }

  try {
    return tryParseGraph(decodeURIComponent(hash));
  } catch {
    return null;
  }
};
