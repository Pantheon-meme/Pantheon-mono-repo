import Phaser from "phaser";
import {
  objectSpriteAssets,
  type ObjectSpriteAsset,
} from "../assets/object-sprites/ObjectSpriteAssets";
import {
  playableCharacters,
  type PlayableCharacter,
} from "../game/player/PlayableCharacters";
import { playerSpriteTextureKey } from "../game/player/PlayerSpriteAssets";

export type CharacterSelectionSceneData = {
  character: PlayableCharacter;
};

const playerSpriteAssets: Record<string, ObjectSpriteAsset> =
  objectSpriteAssets;

export class CharacterSelectScene extends Phaser.Scene {
  private overlay?: HTMLDivElement;
  private keydownListener?: (event: KeyboardEvent) => void;

  constructor() {
    super("character-select");
  }

  preload(): void {
    for (const character of playableCharacters) {
      const asset = playerSpriteAssets[character.spriteId];
      const textureKey = playerSpriteTextureKey(character.spriteId);

      if (!asset || this.textures.exists(textureKey)) {
        continue;
      }

      this.load.spritesheet(textureKey, asset.imageUrl, {
        frameWidth: asset.manifest.cellSize,
        frameHeight: asset.manifest.cellSize,
      });
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#11181d");
    this.createDomSelector();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyDomSelector();
    });
  }

  private createDomSelector(): void {
    this.destroyDomSelector();

    const parent = document.getElementById("game");

    if (!parent) {
      throw new Error("Game parent element is unavailable.");
    }

    const overlay = document.createElement("div");
    overlay.className = "character-select-overlay";

    const panel = document.createElement("div");
    panel.className = "character-select-panel";

    const title = document.createElement("h1");
    title.textContent = "Choose Your Player";

    const subtitle = document.createElement("p");
    subtitle.className = "character-select-subtitle";
    subtitle.textContent = "Each character uses a different Anvil wallet";

    const grid = document.createElement("div");
    grid.className = "character-select-grid";

    playableCharacters.forEach((character, index) => {
      grid.appendChild(this.createCharacterCard(character, index));
    });

    const footer = document.createElement("p");
    footer.className = "character-select-footer";
    footer.textContent = "1, 2, 3, 4, and 5 also select";

    panel.append(title, subtitle, grid, footer);
    overlay.append(panel);
    parent.append(overlay);

    this.keydownListener = (event: KeyboardEvent): void => {
      const index = Number.parseInt(event.key, 10) - 1;
      const character = playableCharacters[index];

      if (!character) {
        return;
      }

      this.selectCharacter(character);
    };
    window.addEventListener("keydown", this.keydownListener);
    this.overlay = overlay;
  }

  private createCharacterCard(
    character: PlayableCharacter,
    index: number,
  ): HTMLButtonElement {
    const spriteAsset = playerSpriteAssets[character.spriteId];

    const card = document.createElement("button");
    card.className = "character-select-card";
    card.type = "button";
    card.addEventListener("click", () => {
      this.selectCharacter(character);
    });

    const shortcut = document.createElement("span");
    shortcut.className = "character-select-shortcut";
    shortcut.textContent = `${index + 1}`;

    const preview = document.createElement("span");
    preview.className = "character-select-preview";

    if (spriteAsset) {
      preview.style.backgroundImage = `url("${spriteAsset.imageUrl}")`;
    }

    const name = document.createElement("strong");
    name.textContent = character.name;

    const description = document.createElement("span");
    description.className = "character-select-description";
    description.textContent = character.description;

    const wallet = document.createElement("span");
    wallet.className = "character-select-wallet";
    wallet.textContent = character.walletLabel;

    const action = document.createElement("span");
    action.className = "character-select-action";
    action.textContent = "Play";

    card.append(shortcut, preview, name, description, wallet, action);

    return card;
  }

  private selectCharacter(character: PlayableCharacter): void {
    this.destroyDomSelector();
    this.scene.start("initial-loading", { character });
  }

  private destroyDomSelector(): void {
    this.overlay?.remove();
    this.overlay = undefined;

    if (this.keydownListener) {
      window.removeEventListener("keydown", this.keydownListener);
      this.keydownListener = undefined;
    }
  }
}
