export type RoomStatus = "waiting" | "writing" | "revealed";

export type Participant = {
  id: string;
  roomId: string;
  sessionId: string;
  displayName: string;
  avatar: string;
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
};

export type RoomView = Omit<Room, "hostSessionId" | "participants"> & {
  participants: PublicParticipant[];
  viewer: { participantId?: string; isHost: boolean };
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
