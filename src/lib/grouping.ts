import type { CardGroup, CardWithParticipant } from "@/types";
import { normalizeAnswer } from "./text-normalize";

export const SIMILARITY_THRESHOLD = 0.82;

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

export function similarity(a: string, b: string) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const left = new Set(a.split(" "));
  const right = new Set(b.split(" "));
  const overlap = [...left].filter((token) => right.has(token)).length;
  const tokenScore = overlap / Math.max(left.size, right.size);
  const editScore = 1 - levenshtein(a, b) / Math.max(a.length, b.length);

  return Math.max(tokenScore, editScore);
}

export function groupCards(cards: CardWithParticipant[]): CardGroup[] {
  const groups: CardGroup[] = [];

  for (const card of cards) {
    const label = normalizeAnswer(card.text);
    const group = groups.find((item) => similarity(item.label, label) >= SIMILARITY_THRESHOLD);
    if (group) {
      group.cards.push(card);
      group.isExactMatch &&= group.label === label;
    } else {
      groups.push({ id: label || card.id, label: label || "untitled", cards: [card], isExactMatch: true });
    }
  }

  return groups.sort((a, b) => b.cards.length - a.cards.length || a.label.localeCompare(b.label));
}
