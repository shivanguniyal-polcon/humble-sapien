// Constants shared by the Worker and its tests.
//
// They live here rather than as named exports of monitor-worker.js because a
// Workers module may only export the handler (and Durable Object classes) —
// a named string export is read as an entrypoint and stops the runtime.

export const API_VERSION = 'monitor-api-1';
export const OCR_LIMIT_PER_DAY = 5;
