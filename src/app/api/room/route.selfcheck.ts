import assert from "node:assert/strict";
import { GET, POST } from "./route";

async function post(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

async function run() {
  const created = await post({ action: "create", sessionId: "host-redaction" });
  const room = await created.json();

  await post({ action: "join", code: room.roomCode, sessionId: "host-redaction", displayName: "Host" });
  await post({ action: "join", code: room.roomCode, sessionId: "guest-redaction", displayName: "Guest" });
  await post({ action: "patch", code: room.roomCode, sessionId: "host-redaction", patch: { prompt: "Dinner?", status: "writing" } });
  await post({ action: "submit", code: room.roomCode, sessionId: "guest-redaction", text: "Secret pizza" });

  const hidden = await GET(new Request(`http://localhost/api/room?code=${room.roomCode}`));
  const hiddenRoom = await hidden.json();
  assert.equal(hiddenRoom.cards[0].text, "");
  assert.equal(hiddenRoom.cards[0].normalizedText, "");

  await post({ action: "patch", code: room.roomCode, sessionId: "host-redaction", patch: { status: "revealed" } });
  const revealed = await GET(new Request(`http://localhost/api/room?code=${room.roomCode}`));
  const revealedRoom = await revealed.json();
  assert.equal(revealedRoom.cards[0].text, "Secret pizza");

  console.log("room route redaction ok");
}

void run();
