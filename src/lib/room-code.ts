const WORDS = ["MANGO", "PIZZA", "TOKYO", "MOCHI", "TACO", "RAMEN", "SUNNY", "BENTO"];

export function roomCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${word}${Math.floor(Math.random() * 9) + 1}`;
}
