import assert from "node:assert/strict";
import { createRoom, getRoom, joinRoom, patchRoom, submitCard, voteForCard } from "./store";

const room = createRoom("host-unlimited");
joinRoom(room.roomCode, "host-unlimited", "Host");
patchRoom(room.roomCode, "host-unlimited", { prompt: "Dinner?", status: "writing" });
submitCard(room.roomCode, "host-unlimited", "Pizza");
const updated = submitCard(room.roomCode, "host-unlimited", "Sushi");

assert.equal(updated.cards.length, 2);

patchRoom(room.roomCode, "host-unlimited", { status: "revealed" });
assert.equal(voteForCard(room.roomCode, "host-unlimited", updated.cards[0].id).votes[0].cardId, updated.cards[0].id);
assert.equal(voteForCard(room.roomCode, "host-unlimited", updated.cards[1].id).votes[0].cardId, updated.cards[1].id);
assert.throws(() => voteForCard(room.roomCode, "stranger", updated.cards[0].id), /Join room before voting/);
patchRoom(room.roomCode, "host-unlimited", { newRound: true });
assert.throws(() => voteForCard(room.roomCode, "host-unlimited", updated.cards[0].id), /Voting opens after reveal/);

const identityRoom = createRoom("host-identities");
const firstIdentity = joinRoom(identityRoom.roomCode, "host-identities", "First");
const secondIdentity = joinRoom(identityRoom.roomCode, "second-identities", "Second");
assert.equal(firstIdentity.participants[0].cardRank, "A");
assert.equal(firstIdentity.participants[0].cardSuit, "♣");
assert.equal(secondIdentity.participants[1].cardRank, "K");
assert.equal(secondIdentity.participants[1].cardSuit, "♠");

{
  const originalNow = Date.now;
  const rateLimitStart = originalNow();
  try {
    Date.now = () => rateLimitStart;
    const burstRoom = createRoom("host-burst");
    joinRoom(burstRoom.roomCode, "host-burst", "Burst host");
    patchRoom(burstRoom.roomCode, "host-burst", { prompt: "Dinner?", status: "writing" });
    for (let index = 0; index < 12; index += 1) submitCard(burstRoom.roomCode, "host-burst", `Idea ${index}`);
    assert.throws(() => submitCard(burstRoom.roomCode, "host-burst", "One more"), /Too many cards too quickly/);

    Date.now = () => rateLimitStart + 10_001;
    assert.equal(submitCard(burstRoom.roomCode, "host-burst", "Later idea").cards.length, 13);
  } finally {
    Date.now = originalNow;
  }
}

{
  const originalNow = Date.now;
  try {
    Date.now = () => 0;
    const expired = createRoom("host-expired");
    Date.now = originalNow;
    assert.equal(getRoom(expired.roomCode), null);
  } finally {
    Date.now = originalNow;
  }
}

console.log("store ok");
