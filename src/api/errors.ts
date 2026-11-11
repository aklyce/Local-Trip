// Shared error types for the API modules.

/** A service can't run because configuration (e.g. an API key) is missing. Shown as a neutral state, not a failure. */
export class ConfigError extends Error {
  name = 'ConfigError'
}
