// Live renderers for Q messages that point at state (a plan's agents, a message draft, a CV parse).
// Registered by the area that owns the state; the global thread looks them up by ref.type.
import type { RefRenderer } from './core/types';
const refs = new Map<string, RefRenderer>();
export const registerRef = (type: string, r: RefRenderer) => { refs.set(type, r); };
export const refRenderer = (type: string) => refs.get(type);
