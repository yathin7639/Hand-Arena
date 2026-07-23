export type CommentaryCategory = "six" | "four" | "wicket" | "dot" | "run" | "thriller" | "welcome";

export const commentaryPhrases: Record<CommentaryCategory, string[]> = {
  welcome: [
    "Welcome to the HandArena stadium! The crowd is electric!",
    "Both captains are out on the pitch. We are ready to begin!",
    "A massive match ahead! Let the hand cricket battle begin!"
  ],
  six: [
    "MASSIVE SIX! That sailed deep into the stands!",
    "Out of the park! What a gigantic shot!",
    "It's a maximum! The batter guessed the bowler perfectly!"
  ],
  four: [
    "Beautiful shot! Pierces the field for four!",
    "Four runs! Splendid placement by the batter!",
    "Races away to the boundary rope! Top-class batting!"
  ],
  wicket: [
    "WICKET! Clean bowled! The crowd goes wild!",
    "OUT! The bowler outsmarts the batter completely!",
    "Wicket down! A huge blow to the batting side!"
  ],
  dot: [
    "Excellent delivery! Batter misses it completely.",
    "Dot ball! Bowler wins this round with absolute precision.",
    "No run. Bowler keeps the pressure building!"
  ],
  run: [
    "Quick single taken! Good rotation of strike.",
    "Two runs added to the scoreboard.",
    "Safe play. Ripping it away for runs."
  ],
  thriller: [
    "LAST BALL THRILLER! Anything can happen here!",
    "Nail-biting finish! The stadium is silent in anticipation!",
    "A absolute blockbuster of a match! What a game!"
  ]
};

export function getRandomCommentary(category: CommentaryCategory): string {
  const list = commentaryPhrases[category];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
