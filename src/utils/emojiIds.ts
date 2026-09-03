const EMOJIS = [
  '🎛',
  '🎚',
  '🎵',
  '🎶',
  '🔊',
  '🔉',
  '🔈',
  '📢',
  '📯',
  '🎹',
  '🎷',
  '🎺',
  '🎸',
  '🥁',
  '🪕',
  '🎻',
  '🪗',
  '🎼',
  '🎧',
  '🎤',
  '🎙',
  '🧪',
  '⚡',
  '✨',
  '🌈',
  '🌀',
  '🔮',
  '🧲',
  '🧩',
  '🛠',
  '🧵',
  '🪄',
  '🧿',
  '🧯',
  '🧠',
  '💡',
  '🔧',
  '🔩',
  '🪛',
  '🧰',
  '🧬',
  '🧫',
  '🛰',
  '🧭',
  '🪐',
  '🌙',
  '☀',
  '⭐',
  '🌟',
  '🌌',
  '🌊',
  '🔥',
  '💧',
  '🍀',
  '🌿',
  '🍂',
  '🪵',
  '🪨',
  '🪶',
  '🦋',
  '🐚',
  '🐝',
  '🐙',
  '🐠',
  '🦑',
  '🦉',
  '🦎',
  '🦜',
  '🦩',
  '🪲',
  '🧊',
  '🧸',
  '🎯',
  '🎲',
  '🎳',
  '🎮',
  '🕹',
  '🧨',
  '🪢',
  '🧷',
  '📀',
  '💿',
  '📼',
  '📻',
  '🎞',
  '🪩',
  '🧮',
  '🧱',
  '🛸',
  '🪞',
];

const pickEmoji = (): string => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export const createEmojiId = (prefix: string, existingIds: Set<string>): string => {
  const unused = EMOJIS.filter((emoji) => !existingIds.has(`${prefix}${emoji}`));
  if (unused.length > 0) {
    const emoji = unused[Math.floor(Math.random() * unused.length)];
    return `${prefix}${emoji}`;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = `${prefix}${pickEmoji()}${pickEmoji()}`;
    if (!existingIds.has(id)) return id;
  }

  let id = `${prefix}${pickEmoji()}${pickEmoji()}${pickEmoji()}`;
  while (existingIds.has(id)) {
    id = `${prefix}${pickEmoji()}${pickEmoji()}${pickEmoji()}`;
  }
  return id;
};
