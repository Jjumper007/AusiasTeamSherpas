const DEFAULT_PORT = 3001

/** The API's port from `API_PORT`, 3001 by default. Shared by the normal and the live server. */
export const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? DEFAULT_PORT)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`API_PORT must be a port number, got "${value}"`)
  return port
}
