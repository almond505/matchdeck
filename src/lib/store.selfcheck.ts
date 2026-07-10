import assert from "node:assert/strict";
import { createRoom, getRoom, joinRoom, patchRoom, submitCard } from "./store";

const room = createRoom("host-unlimited");
joinRoom(room.roomCode, "host-unlimited", "Host");
patchRoom(room.roomCode, "host-unlimited", { prompt: "Dinner?", status: "writing" });
submitCard(room.roomCode, "host-unlimited", "Pizza");
const updated = submitCard(room.roomCode, "host-unlimited", "Sushi");

assert.equal(updated.cards.length, 2);

const originalNow = Date.now;
try {
  Date.now = () => 0;
  const expired = createRoom("host-expired");
  Date.now = originalNow;
  assert.equal(getRoom(expired.roomCode), null);
} finally {
  Date.now = originalNow;
}

console.log("store ok");
