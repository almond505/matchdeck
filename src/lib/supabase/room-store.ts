import { normalizeAnswer } from "@/lib/text-normalize";
import { roomCode } from "@/lib/room-code";
import type { Card, Participant, Room, RoomStatus } from "@/types";
import { getSupabaseServerClient } from "./server";

const cardRanks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const cardSuits = ["♣", "♠", "♥", "♦"];

type DbCard = {
  id: string;
  room_id: string;
  participant_id: string;
  round_number: number;
  text: string;
  normalized_text: string;
  created_at: string;
};

type DbParticipant = {
  id: string;
  room_id: string;
  session_id: string;
  display_name: string;
  card_rank: string;
  card_suit: string;
  joined_at: string;
};

type DbRoom = {
  id: string;
  room_code: string;
  prompt: string;
  status: RoomStatus;
  host_session_id: string;
  round_number: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
  participants?: DbParticipant[];
  cards?: DbCard[];
};

export async function createRoom(hostSessionId: string) {
  const client = requiredClient();
  await write(client.rpc("cleanup_expired_rooms"));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = roomCode();
    const { data, error } = await client.from("rooms").insert({ room_code: code, host_session_id: hostSessionId }).select("*, participants(*), cards(*)").single();
    if (!error) return toRoom(data as DbRoom);
    if (error.code !== "23505") unavailable();
  }
  throw new Error("Could not create a fresh room code.");
}

export async function getRoom(code: string) {
  const client = requiredClient();
  const { data, error } = await client.from("rooms").select("*, participants(*), cards(*)").eq("room_code", code.toUpperCase()).maybeSingle();
  if (error) unavailable();
  if (!data) return null;
  const room = toRoom(data as DbRoom);
  if (Date.parse(room.expiresAt) > Date.now()) return room;
  await client.from("rooms").delete().eq("id", room.id);
  return null;
}

export async function joinRoom(code: string, sessionId: string, displayName: string) {
  const client = requiredClient();
  const room = await requiredRoom(code);
  const existing = room.participants.find((participant) => participant.sessionId === sessionId);
  if (existing) {
    await write(client.from("participants").update({ display_name: displayName }).eq("id", existing.id));
  } else {
    if (room.participants.length >= 20) throw new Error("Room is full.");
    await write(client.from("participants").insert({
      room_id: room.id,
      session_id: sessionId,
      display_name: displayName,
      ...participantCard(room.participants.length),
    }));
  }
  await touchRoom(room.id);
  return requiredRoom(code);
}

export async function patchRoom(code: string, sessionId: string, patch: { prompt?: string; status?: RoomStatus; newRound?: boolean }) {
  const client = requiredClient();
  const room = await requiredHost(code, sessionId);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.newRound) Object.assign(update, { prompt: "", round_number: room.roundNumber + 1, status: "waiting" });
  if (typeof patch.prompt === "string") update.prompt = patch.prompt.slice(0, 140);
  if (patch.status) update.status = patch.status;
  await write(client.from("rooms").update(update).eq("id", room.id));
  return requiredRoom(code);
}

export async function submitCard(code: string, sessionId: string, text: string) {
  const client = requiredClient();
  const room = await requiredRoom(code);
  const participant = room.participants.find((item) => item.sessionId === sessionId);
  if (!participant) throw new Error("Join room before submitting.");
  if (room.status !== "writing") throw new Error("Round is not accepting cards.");
  const clean = text.trim().slice(0, 100);
  if (!clean) throw new Error("Write something first.");
  await consumeCardSubmission(room.id, sessionId);
  await write(client.from("cards").insert({
    room_id: room.id,
    participant_id: participant.id,
    round_number: room.roundNumber,
    text: clean,
    normalized_text: normalizeAnswer(clean),
  }));
  await touchRoom(room.id);
  return requiredRoom(code);
}

function requiredClient() {
  const client = getSupabaseServerClient();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

async function requiredRoom(code: string) {
  const room = await getRoom(code);
  if (!room) throw new Error("Room not found.");
  return room;
}

async function requiredHost(code: string, sessionId: string) {
  const room = await requiredRoom(code);
  if (room.hostSessionId !== sessionId) throw new Error("Only host can do that.");
  return room;
}

async function touchRoom(roomId: string) {
  const client = requiredClient();
  await write(client.from("rooms").update({ updated_at: new Date().toISOString() }).eq("id", roomId));
}

async function consumeCardSubmission(roomId: string, sessionId: string) {
  const client = requiredClient();
  const { error } = await client.rpc("consume_card_submission", { p_room_id: roomId, p_session_id: sessionId });
  if (!error) return;
  if (error.code === "P0001") throw new Error("Too many cards too quickly. Try again in a moment.");
  unavailable();
}

async function write(request: PromiseLike<{ error: { code?: string } | null }>) {
  const { error } = await request;
  if (error) unavailable();
}

function unavailable(): never {
  throw new Error("Room storage unavailable.");
}

function participantCard(index: number) {
  return {
    card_rank: cardRanks[index % cardRanks.length],
    card_suit: cardSuits[index % cardSuits.length],
  };
}

function toRoom(row: DbRoom): Room {
  return {
    id: row.id,
    roomCode: row.room_code,
    prompt: row.prompt,
    status: row.status,
    hostSessionId: row.host_session_id,
    roundNumber: row.round_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    participants: (row.participants ?? []).map(toParticipant),
    cards: (row.cards ?? []).map(toCard),
  };
}

function toParticipant(row: DbParticipant): Participant {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    displayName: row.display_name,
    cardRank: row.card_rank,
    cardSuit: row.card_suit,
    joinedAt: row.joined_at,
  };
}

function toCard(row: DbCard): Card {
  return {
    id: row.id,
    roomId: row.room_id,
    participantId: row.participant_id,
    roundNumber: row.round_number,
    text: row.text,
    normalizedText: row.normalized_text,
    createdAt: row.created_at,
  };
}
