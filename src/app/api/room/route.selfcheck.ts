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

  const guestView = await GET(new Request(`http://localhost/api/room?code=${room.roomCode}`, {
    headers: { "X-MatchDeck-Session": "guest-redaction" },
  }));
  const guestRoom = await guestView.json();
  const guest = guestRoom.participants.find((participant: { displayName: string }) => participant.displayName === "Guest");
  assert.equal("hostSessionId" in guestRoom, false);
  assert.equal("sessionId" in guest, false);
  assert.equal(guestRoom.viewer.participantId, guest.id);
  assert.equal(guestRoom.viewer.isHost, false);

  await post({ action: "patch", code: room.roomCode, sessionId: "host-redaction", patch: { status: "revealed" } });
  const revealed = await GET(new Request(`http://localhost/api/room?code=${room.roomCode}`));
  const revealedRoom = await revealed.json();
  assert.equal(revealedRoom.cards[0].text, "Secret pizza");

  const oversizedName = await post({ action: "join", code: room.roomCode, sessionId: "guest-validation", displayName: "a".repeat(33) });
  assert.equal(oversizedName.status, 400);

  const invalidStatus = await post({ action: "patch", code: room.roomCode, sessionId: "host-redaction", patch: { status: "dealing" } });
  assert.equal(invalidStatus.status, 400);

  await post({ action: "patch", code: room.roomCode, sessionId: "host-redaction", patch: { status: "writing" } });
  const oversizedAnswer = await post({ action: "submit", code: room.roomCode, sessionId: "guest-redaction", text: "a".repeat(101) });
  assert.equal(oversizedAnswer.status, 400);

  console.log("room route checks ok");
}

void run();
