import type { Hex } from "viem";

export type PlayableCharacter = {
  id: string;
  name: string;
  description: string;
  walletLabel: string;
  spriteId: string;
  privateKey: Hex;
};

export const playableCharacters: PlayableCharacter[] = [
  {
    id: "player",
    name: "Player 1",
    description: "Original field wanderer",
    walletLabel: "Anvil wallet 1",
    spriteId: "player",
    privateKey: readPrivateKey(
      import.meta.env.VITE_MUD_PRIVATE_KEY_PLAYER1 ??
        import.meta.env.VITE_MUD_PRIVATE_KEY,
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    ),
  },
  {
    id: "player2",
    name: "Player 2",
    description: "Desert gardener-explorer",
    walletLabel: "Anvil wallet 2",
    spriteId: "player2",
    privateKey: readPrivateKey(
      import.meta.env.VITE_MUD_PRIVATE_KEY_PLAYER2,
      "0x59c6995e998f97a5a0044966f094538d9d5068d62e86dae004fc148f5324e096",
    ),
  },
  {
    id: "player3",
    name: "Player 3",
    description: "Open-faced unicorn suit",
    walletLabel: "Anvil wallet 3",
    spriteId: "player3",
    privateKey: readPrivateKey(
      import.meta.env.VITE_MUD_PRIVATE_KEY_PLAYER3,
      "0x5de4111a56f3fcb4cddcc7a34069a1bd9f94858f956c97b81b9e90e6a63b68e",
    ),
  },
  {
    id: "player4",
    name: "Player 4",
    description: "Cat-eared night heroine",
    walletLabel: "Anvil wallet 4",
    spriteId: "player4",
    privateKey: readPrivateKey(
      import.meta.env.VITE_MUD_PRIVATE_KEY_PLAYER4,
      "0x7c8521182943f1d7e1a156689306c746e5cf63dc1f13ed46ee5c6dddc7c5e2b6",
    ),
  },
  {
    id: "player5",
    name: "Player 5",
    description: "Rose-gold mythic gardener",
    walletLabel: "Anvil wallet 5",
    spriteId: "player5",
    privateKey: readPrivateKey(
      import.meta.env.VITE_MUD_PRIVATE_KEY_PLAYER5,
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    ),
  },
];

export function getPlayableCharacter(
  id: string | undefined,
): PlayableCharacter {
  return (
    playableCharacters.find((character) => character.id === id) ??
    playableCharacters[0]
  );
}

function readPrivateKey(value: string | undefined, fallback: Hex): Hex {
  return isPrivateKey(value) ? value : fallback;
}

function isPrivateKey(value: string | undefined): value is Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(value ?? "");
}
