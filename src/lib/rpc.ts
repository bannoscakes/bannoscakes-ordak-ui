/**
 * Neutral RPC facade.
 * For now, this re-exports the mock RPCs so features can import from a single place.
 * Later we'll switch this to select real vs mock by config.useMocks.
 */
export * from "../mocks/rpc";
