import { groupCards } from "./grouping";
import type { Room } from "@/types";

export function groupRoundCards(room: Room) {
  return groupCards(room.cards
    .filter((card) => card.roundNumber === room.roundNumber)
    .flatMap((card) => {
      const participant = room.participants.find((item) => item.id === card.participantId);
      if (!participant) return [];
      const { sessionId: _, ...publicParticipant } = participant;
      return [{ ...card, participant: publicParticipant }];
    }));
}
