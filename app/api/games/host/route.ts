import {createHash, timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";

import {isGameType} from "@/lib/games";

export const runtime = "nodejs";

function reply(body: object, status = 200) {
  return Response.json(body, {status, headers: {"Cache-Control": "no-store"}});
}

export async function POST(request: Request) {
  const expected = process.env["HOST_PW"];
  if (!expected) return reply({error: "Hosting is not configured yet."}, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return reply({error: "Invalid request."}, 400);
  }
  if (
    !body ||
    typeof body.password !== "string" ||
    typeof body.displayName !== "string" ||
    body.password.length > 1024 ||
    body.displayName.trim().length < 1 ||
    body.displayName.trim().length > 24
  ) {
    return reply({error: "Enter a display name and host password."}, 400);
  }
  const gameType = body.gameType ?? "chutes-and-ladders";
  if (!isGameType(gameType)) return reply({error: "Choose a supported game."}, 400);
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(body.password), digest(expected))) {
    return reply({error: "Incorrect host password."}, 403);
  }
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply({error: "Start a guest session and try again."}, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) return reply({error: "Hosting is not configured yet."}, 503);
  try {
    const options = {auth: {persistSession: false, autoRefreshToken: false}};
    const authClient = createClient(url, publishableKey, options);
    // Resolve the verified guest identity; never accept a user ID from the browser.
    const {data, error} = await authClient.auth.getUser(token);
    if (error || !data.user) return reply({error: "Your guest session expired. Please try again."}, 401);
    const admin = createClient(url, secretKey, options);
    const result = await admin.rpc("host_game", {
      display_name: body.displayName.trim(),
      host_user_id: data.user.id,
      selected_game: gameType,
    });
    if (result.error) {
      if (result.error.message.includes("Too many rooms"))
        return reply({error: "Too many rooms created. Please use an existing room or try later."}, 429);
      return reply({error: "Could not create the room. Check that the hosting migration has been deployed."}, 503);
    }
    return reply({roomId: result.data});
  } catch {
    return reply({error: "Could not reach the game service. Please try again."}, 503);
  }
}
