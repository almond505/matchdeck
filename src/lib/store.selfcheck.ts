import assert from "node:assert/strict";
import { createRoom, joinRoom, patchRoom, submitCard } from "./store";

const room = createRoom("host-unlimited");
joinRoom(room.roomCode, "host-unlimited", "Host");
patchRoom(room.roomCode, "host-unlimited", { prompt: "Dinner?", status: "writing" });
submitCard(room.roomCode, "host-unlimited", "Pizza");
const updated = submitCard(room.roomCode, "host-unlimited", "Sushi");

assert.equal(updated.cards.length, 2);
console.log("store ok");
