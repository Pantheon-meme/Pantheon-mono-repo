/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MUD_RPC_URL?: string;
  readonly VITE_MUD_WORLD_ADDRESS?: `0x${string}`;
  readonly VITE_MUD_PRIVATE_KEY?: `0x${string}`;
  readonly VITE_MUD_PRIVATE_KEY_PLAYER1?: `0x${string}`;
  readonly VITE_MUD_PRIVATE_KEY_PLAYER2?: `0x${string}`;
  readonly VITE_MUD_PRIVATE_KEY_PLAYER3?: `0x${string}`;
  readonly VITE_MUD_PRIVATE_KEY_PLAYER4?: `0x${string}`;
  readonly VITE_MUD_PRIVATE_KEY_PLAYER5?: `0x${string}`;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
