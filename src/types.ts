export type RoomStatus = "waiting" | "writing" | "revealed";

export type Participant = {
  id: string;
  roomId: string;
  sessionId: string;
  displayName: string;
  cardRank: string;
  cardSuit: string;
  joinedAt: string;
};

export type PublicParticipant = Omit<Participant, "sessionId">;

export type Card = {
  id: string;
  roomId: string;
  participantId: string;
  roundNumber: number;
  text: string;
  normalizedText: string;
  createdAt: string;
};

export type Vote = {
  roomId: string;
  participantId: string;
  cardId: string;
  roundNumber: number;
};

export type Room = {
  id: string;
  roomCode: string;
  prompt: string;
  status: RoomStatus;
  hostSessionId: string;
  roundNumber: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  participants: Participant[];
  cards: Card[];
  votes: Vote[];
};

export type RoomView = Omit<Room, "hostSessionId" | "participants" | "votes"> & {
  participants: PublicParticipant[];
  voteCounts: Record<string, number>;
  viewer: { participantId?: string; isHost: boolean; votedCardId?: string };
};

export type CardWithParticipant = Card & {
  participant: PublicParticipant;
};

export type CardGroup = {
  id: string;
  label: string;
  cards: CardWithParticipant[];
  isExactMatch: boolean;
};
