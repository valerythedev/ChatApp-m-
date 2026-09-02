/** Text “emoticon” reactions (not Unicode emoji). */
export const MESSAGE_REACTION_SYMBOLS = [":)", ":(", ":O", ":P", "D:", ":|", ":D", ":/", ":3", "xD"] as const;

export type MessageReactionSymbol = (typeof MESSAGE_REACTION_SYMBOLS)[number];

export const MESSAGE_REACTION_SET = new Set<string>(MESSAGE_REACTION_SYMBOLS);

export function isAllowedReactionSymbol(s: string): boolean {
  return MESSAGE_REACTION_SET.has(s);
}
