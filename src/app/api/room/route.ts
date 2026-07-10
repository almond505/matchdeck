import { NextResponse } from "next/server";
import { createRoom, getRoom, joinRoom, patchRoom, submitCard } from "@/lib/store";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return jsonError("Room code missing.", 400);
  const room = getRoom(code);
  return room ? NextResponse.json(room) : jsonError("Room not found.", 404);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "create") return NextResponse.json(createRoom(required(body.sessionId, "Session missing.")));
    if (body.action === "join") return NextResponse.json(joinRoom(required(body.code, "Room code missing."), required(body.sessionId, "Session missing."), required(body.displayName, "Name missing.").slice(0, 32)));
    if (body.action === "patch") return NextResponse.json(patchRoom(required(body.code, "Room code missing."), required(body.sessionId, "Session missing."), body.patch ?? {}));
    if (body.action === "submit") return NextResponse.json(submitCard(required(body.code, "Room code missing."), required(body.sessionId, "Session missing."), required(body.text, "Answer missing.")));
    return jsonError("Unknown action.", 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Something went wrong.", 400);
  }
}

function required(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value.trim();
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
