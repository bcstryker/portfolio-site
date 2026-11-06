import type {Session, SupabaseClient} from "@supabase/supabase-js";

const pending = new WeakMap<SupabaseClient, Promise<Session>>();
const invalidSessionCodes = new Set([
  "session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used",
  "user_not_found", "bad_jwt", "jwt_expired", "user_session_not_found",
]);
function invalidSession(error: {code?: string; name?: string} | null) {
  return !error || invalidSessionCodes.has(error.code ?? "") || error.name === "AuthSessionMissingError";
}

// Verify cached identities against Auth; a cached JWT may outlive its server-side session.
export function ensureGuestSession(client: SupabaseClient): Promise<Session> {
  const existing = pending.get(client);
  if (existing) return existing;
  const task = recoverSession(client).finally(() => pending.delete(client));
  pending.set(client, task);
  return task;
}

async function recoverSession(client: SupabaseClient): Promise<Session> {
  const cached = await client.auth.getSession();
  if (cached.error && !invalidSession(cached.error)) throw cached.error;
  let reset = Boolean(cached.error);
  if (cached.data.session) {
    const verified = await client.auth.getUser(cached.data.session.access_token);
    if (!verified.error && verified.data.user) return cached.data.session;
    if (!invalidSession(verified.error)) throw verified.error;
    const refreshed = await client.auth.refreshSession();
    if (refreshed.error && !invalidSession(refreshed.error)) throw refreshed.error;
    if (refreshed.data.session) {
      const checked = await client.auth.getUser(refreshed.data.session.access_token);
      if (!checked.error && checked.data.user) return refreshed.data.session;
      if (!invalidSession(checked.error)) throw checked.error;
    }
    reset = true;
  }
  if (reset) {
    // Local scope: do not revoke other browsers' sessions.
    const signedOut = await client.auth.signOut({scope: "local"});
    if (signedOut.error && !invalidSession(signedOut.error)) throw signedOut.error;
  }
  const created = await client.auth.signInAnonymously();
  if (created.error) throw created.error;
  if (!created.data.session) throw new Error("Could not start a guest session. Please try again.");
  return created.data.session;
}
