import { NextResponse } from "next/server";
import { createRoom, getRoom, joinRoom, patchRoom, submitCard } from "@/lib/store";
import type { Room, RoomStatus, RoomView } from "@/types";

const ROOM_STATUSES: RoomStatus[] = ["waiting", "writing", "revealed"];
const MAX = { card: 100, name: 32, prompt: 140, roomCode: 6, sessionId: 128 };

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  let roomCode: string;
  try {
    roomCode = validRoomCode(code);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Room code invalid.", 400);
  }
  const room = getRoom(roomCode);
  return room ? roomResponse(room, request.headers.get("X-MatchDeck-Session") ?? undefined) : jsonError("Room not found.", 404);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isRecord(body)) throw new Error("Request body must be an object.");
    const sessionId = required(body.sessionId, "Session", MAX.sessionId);
    if (body.action === "create") return roomResponse(createRoom(sessionId), sessionId);
    const roomCode = validRoomCode(body.code);
    if (body.action === "join") return roomResponse(joinRoom(roomCode, sessionId, required(body.displayName, "Name", MAX.name)), sessionId);
    if (body.action === "patch") return roomResponse(patchRoom(roomCode, sessionId, validPatch(body.patch)), sessionId);
    if (body.action === "submit") return roomResponse(submitCard(roomCode, sessionId, required(body.text, "Answer", MAX.card)), sessionId);
    return jsonError("Unknown action.", 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Something went wrong.", 400);
  }
}

function required(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} missing.`);
  const clean = value.trim();
  if (clean.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return clean;
}

function validRoomCode(value: unknown) {
  const code = required(value, "Room code", MAX.roomCode).toUpperCase();
  if (!/^[A-Z]{5}[1-9]$/.test(code)) throw new Error("Room code invalid.");
  return code;
}

function validPatch(value: unknown): { prompt?: string; status?: RoomStatus; newRound?: boolean } {
  if (!isRecord(value)) throw new Error("Room update missing.");
  const patch: { prompt?: string; status?: RoomStatus; newRound?: boolean } = {};
  if ("prompt" in value) {
    if (typeof value.prompt !== "string") throw new Error("Prompt must be text.");
    const prompt = value.prompt.trim();
    if (prompt.length > MAX.prompt) throw new Error(`Prompt must be ${MAX.prompt} characters or fewer.`);
    patch.prompt = prompt;
  }
  if ("status" in value) {
    if (!ROOM_STATUSES.includes(value.status as RoomStatus)) throw new Error("Room status invalid.");
    patch.status = value.status as RoomStatus;
  }
  if ("newRound" in value) {
    if (typeof value.newRound !== "boolean") throw new Error("New round must be true or false.");
    patch.newRound = value.newRound;
  }
  return patch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function roomResponse(room: Room, viewerSessionId?: string) {
  const { hostSessionId, participants, ...publicRoom } = room;
  const viewer = participants.find((participant) => participant.sessionId === viewerSessionId);
  const response: RoomView = {
    ...publicRoom,
    participants: participants.map(({ sessionId: _, ...participant }) => participant),
    cards: room.status === "revealed"
      ? room.cards
      : room.cards.map((card) => ({ ...card, text: "", normalizedText: "" })),
    viewer: { participantId: viewer?.id, isHost: hostSessionId === viewerSessionId },
  };
  return NextResponse.json(response);
}
