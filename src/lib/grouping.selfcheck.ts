import assert from "node:assert/strict";
import { groupCards, similarity } from "./grouping";
import type { CardWithParticipant } from "@/types";

const participant = {
  id: "p1",
  roomId: "r1",
  sessionId: "s1",
  displayName: "Almond",
  cardRank: "A",
  cardSuit: "♣",
  joinedAt: "",
};

const cards: CardWithParticipant[] = [
  { id: "1", roomId: "r1", participantId: "p1", roundNumber: 1, text: "KFC!!!", normalizedText: "kfc", createdAt: "", participant },
  { id: "2", roomId: "r1", participantId: "p1", roundNumber: 1, text: "ไก่ทอด", normalizedText: "ไก่ทอด", createdAt: "", participant },
  { id: "3", roomId: "r1", participantId: "p1", roundNumber: 1, text: "Sushi", normalizedText: "sushi", createdAt: "", participant },
];

assert.equal(similarity("pizza", "pizzas") > 0.82, true);
assert.equal(groupCards(cards)[0].cards.length, 2);
console.log("grouping ok");
