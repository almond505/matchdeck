import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("Set the Supabase values in .env.local before running this check.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const realtime = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function roomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `${Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * letters.length)]).join("")}${Math.floor(Math.random() * 9) + 1}`;
}

function waitForSubscription(channel: ReturnType<typeof realtime.channel>) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime subscription timed out.")), 10_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(`Realtime subscription failed: ${status}.`));
      }
    });
  });
}

async function verify() {
  const { data: room, error: createError } = await admin
    .from("rooms")
    .insert({ host_session_id: randomUUID(), room_code: roomCode() })
    .select("id, room_code")
    .single();
  if (createError || !room) throw new Error(createError?.message ?? "Could not create verification room.");

  let channel: ReturnType<typeof realtime.channel> | undefined;
  try {
    const { data: persisted, error: readError } = await admin
      .from("rooms")
      .select("id, room_code")
      .eq("id", room.id)
      .single();
    if (readError || persisted?.room_code !== room.room_code) {
      throw new Error(readError?.message ?? "Persisted room did not match the created room.");
    }

    let resolveEvent: (() => void) | undefined;
    const eventReceived = new Promise<void>((resolve, reject) => {
      resolveEvent = resolve;
      setTimeout(() => reject(new Error("Realtime change event timed out.")), 10_000);
    });
    channel = realtime
      .channel(`matchdeck-verify-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_events", filter: `room_id=eq.${room.id}` },
        () => resolveEvent?.(),
      );
    await waitForSubscription(channel);

    const { error: updateError } = await admin
      .from("rooms")
      .update({ prompt: "Realtime verification" })
      .eq("id", room.id);
    if (updateError) throw new Error(updateError.message);
    await eventReceived;

    const sessionId = randomUUID();
    const attempts = await Promise.all(
      Array.from({ length: 13 }, () => admin.rpc("consume_card_submission", { p_room_id: room.id, p_session_id: sessionId })),
    );
    const accepted = attempts.filter(({ error }) => !error).length;
    const rejected = attempts.filter(({ error }) => error?.code === "P0001").length;
    if (accepted !== 12 || rejected !== 1) {
      throw new Error(`Expected 12 accepted and 1 rate-limited submission; received ${accepted} and ${rejected}.`);
    }

    console.log("Supabase persistence, Realtime, and concurrent submission limits verified.");
  } finally {
    if (channel) await realtime.removeChannel(channel);
    await admin.from("rooms").delete().eq("id", room.id);
  }
}

verify().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Supabase verification failed.");
  process.exitCode = 1;
});
