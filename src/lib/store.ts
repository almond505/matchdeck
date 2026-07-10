import { roomCode } from "./room-code";
import { normalizeAnswer } from "./text-normalize";
import type { Card, Participant, Room, RoomStatus } from "@/types";

const avatars = ["AL", "PX", "MO", "TA", "RA", "SU", "BE"];

type Db = Map<string, Room>;
type CardSubmissionWindow = { count: number; resetsAt: number };

const globalDb = globalThis as typeof globalThis & {
  foldRevealCardWindows?: Map<string, CardSubmissionWindow>;
  foldRevealRooms?: Db;
};
const rooms: Db = (globalDb.foldRevealRooms ??= new Map<string, Room>());
const cardSubmissionWindows = (globalDb.foldRevealCardWindows ??= new Map<string, CardSubmissionWindow>());
const CARD_SUBMISSION_LIMIT = 12;
const CARD_SUBMISSION_WINDOW_MS = 10_000;

function now() {
  return new Date().toISOString();
}

function publicRoom(room: Room): Room {
  return structuredClone(room);
}

export function createRoom(hostSessionId: string) {
  pruneExpiredRooms();
  let code = roomCode();
  for (let i = 0; rooms.has(code) && i < 20; i++) code = roomCode();
  if (rooms.has(code)) throw new Error("Could not create a fresh room code.");

  const createdAt = now();
  const room: Room = {
    id: crypto.randomUUID(),
    roomCode: code,
    prompt: "",
    status: "waiting",
    hostSessionId,
    roundNumber: 1,
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    participants: [],
    cards: [],
  };
  rooms.set(code, room);
  return publicRoom(room);
}

export function getRoom(code: string) {
  pruneExpiredRooms();
  const room = rooms.get(code.toUpperCase());
  return room ? publicRoom(room) : null;
}

export function joinRoom(code: string, sessionId: string, displayName: string) {
  const room = mustRoom(code);
  if (room.participants.length >= 20) throw new Error("Room is full.");
  const existing = room.participants.find((p) => p.sessionId === sessionId);
  if (existing) {
    existing.displayName = displayName;
    return publicRoom(room);
  }
  const joinedAt = now();
  const participant: Participant = {
    id: crypto.randomUUID(),
    roomId: room.id,
    sessionId,
    displayName,
    avatar: avatars[room.participants.length % avatars.length],
    joinedAt,
  };
  room.participants.push(participant);
  room.updatedAt = joinedAt;
  return publicRoom(room);
}

export function patchRoom(code: string, sessionId: string, patch: { prompt?: string; status?: RoomStatus; newRound?: boolean }) {
  const room = mustHost(code, sessionId);
  if (patch.newRound) {
    room.roundNumber += 1;
    room.status = "waiting";
    room.prompt = "";
  }
  if (typeof patch.prompt === "string") room.prompt = patch.prompt.slice(0, 140);
  if (patch.status) room.status = patch.status;
  room.updatedAt = now();
  return publicRoom(room);
}

export function submitCard(code: string, sessionId: string, text: string) {
  const room = mustRoom(code);
  const participant = room.participants.find((p) => p.sessionId === sessionId);
  if (!participant) throw new Error("Join room before submitting.");
  if (room.status !== "writing") throw new Error("Round is not accepting cards.");
  const clean = text.trim().slice(0, 100);
  if (!clean) throw new Error("Write something first.");
  assertCardSubmissionAllowed(room.id, sessionId);

  const card: Card = {
    id: crypto.randomUUID(),
    roomId: room.id,
    participantId: participant.id,
    roundNumber: room.roundNumber,
    text: clean,
    normalizedText: normalizeAnswer(clean),
    createdAt: now(),
  };
  room.cards.push(card);
  room.updatedAt = card.createdAt;
  return publicRoom(room);
}

function mustRoom(code: string) {
  pruneExpiredRooms();
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new Error("Room not found.");
  return room;
}

function pruneExpiredRooms() {
  const currentTime = Date.now();
  for (const [code, room] of rooms) {
    if (Date.parse(room.expiresAt) <= currentTime) rooms.delete(code);
  }
}

function assertCardSubmissionAllowed(roomId: string, sessionId: string) {
  const currentTime = Date.now();
  for (const [key, window] of cardSubmissionWindows) {
    if (window.resetsAt <= currentTime) cardSubmissionWindows.delete(key);
  }

  const key = `${roomId}:${sessionId}`;
  const window = cardSubmissionWindows.get(key);
  if (!window) {
    cardSubmissionWindows.set(key, { count: 1, resetsAt: currentTime + CARD_SUBMISSION_WINDOW_MS });
    return;
  }
  if (window.count >= CARD_SUBMISSION_LIMIT) throw new Error("Too many cards too quickly. Try again in a moment.");
  window.count += 1;
}

function mustHost(code: string, sessionId: string) {
  const room = mustRoom(code);
  if (room.hostSessionId !== sessionId) throw new Error("Only host can do that.");
  return room;
}
