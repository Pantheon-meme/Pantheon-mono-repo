import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { stringToBytes32 } from "./MudCodec";
import {
  defaultPrivateKey,
  defaultRpcUrl,
  defaultWorldAddress,
  pantheonWorldAbi,
} from "./MudWorldAbi";
import { MudSnapshotReader } from "./MudSnapshotReader";
import type {
  MovePathStep,
  MudDigCallbacks,
  MudDropObjectCallbacks,
  MudForageCallbacks,
  MudHarvestCallbacks,
  MudMoveCallbacks,
  MudPickupObjectCallbacks,
  MudPlantCallbacks,
  MudPlantCareCallbacks,
  MudStartSleepCallbacks,
  PlayerSnapshot,
  WorldObjectSnapshot,
  WorldStateReadBounds,
  WorldTimeConfig,
} from "./MudWorldTypes";

export type {
  ActionLogSnapshot,
  ConfirmedDig,
  ConfirmedDropObject,
  ConfirmedForage,
  ConfirmedHarvest,
  ConfirmedMove,
  ConfirmedPickupObject,
  ConfirmedPlant,
  ConfirmedPlantCare,
  MovePathStep,
  MudDigCallbacks,
  MudDropObjectCallbacks,
  MudForageCallbacks,
  MudHarvestCallbacks,
  MudMoveCallbacks,
  MudPickupObjectCallbacks,
  MudPlantCallbacks,
  MudPlantCareCallbacks,
  MudStartSleepCallbacks,
  PendingActionSnapshot,
  PlayerInventorySnapshot,
  PlayerInventorySlotSnapshot,
  PlantStateSnapshot,
  PlayerEnergy,
  PlayerSnapshot,
  TerrainStateSnapshot,
  WorldObjectSnapshot,
  WorldStateReadBounds,
  WorldStateSnapshot,
  WorldTimeConfig,
} from "./MudWorldTypes";

export class MudWorldBridge {
  private readonly publicClient;
  private readonly walletClient;
  private readonly pendingDigs = new Set<string>();
  private readonly pendingForages = new Set<string>();
  private readonly pendingPlants = new Set<string>();
  private readonly pendingHarvests = new Set<string>();
  private readonly pendingCareActions = new Set<string>();
  private readonly pendingPickups = new Set<string>();
  private readonly pendingDrops = new Set<string>();
  private readonly snapshotReader: MudSnapshotReader;
  private pendingMove = false;
  private pendingSleep = false;

  constructor(
    private readonly rpcUrl: string,
    private readonly worldAddress: Hex,
    privateKey: Hex,
  ) {
    this.publicClient = createPublicClient({
      chain: foundry,
      transport: http(this.rpcUrl),
    });
    this.walletClient = createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: foundry,
      transport: http(rpcUrl),
    });
    this.snapshotReader = new MudSnapshotReader(
      this.publicClient,
      this.worldAddress,
      this.walletClient.account.address,
    );
  }

  static fromEnv(): MudWorldBridge {
    return new MudWorldBridge(
      import.meta.env.VITE_MUD_RPC_URL ?? defaultRpcUrl,
      import.meta.env.VITE_MUD_WORLD_ADDRESS ?? defaultWorldAddress,
      import.meta.env.VITE_MUD_PRIVATE_KEY ?? defaultPrivateKey,
    );
  }

  submitDig(x: number, y: number, callbacks: MudDigCallbacks): boolean {
    const key = `${x},${y}`;

    if (this.pendingDigs.has(key)) {
      return false;
    }

    this.pendingDigs.add(key);
    void this.confirmDig(x, y, key, callbacks);

    return true;
  }

  submitForage(x: number, y: number, callbacks: MudForageCallbacks): boolean {
    const key = `${x},${y}`;

    if (this.pendingForages.has(key)) {
      return false;
    }

    this.pendingForages.add(key);
    void this.confirmForage(x, y, key, callbacks);

    return true;
  }

  submitPlant(
    x: number,
    y: number,
    plantId: string,
    callbacks: MudPlantCallbacks,
  ): boolean {
    const key = `${x},${y}`;

    if (this.pendingPlants.has(key)) {
      return false;
    }

    this.pendingPlants.add(key);
    void this.confirmPlant(x, y, plantId, key, callbacks);

    return true;
  }

  submitHarvest(x: number, y: number, callbacks: MudHarvestCallbacks): boolean {
    const key = `${x},${y}`;

    if (this.pendingHarvests.has(key)) {
      return false;
    }

    this.pendingHarvests.add(key);
    void this.confirmHarvest(x, y, key, callbacks);

    return true;
  }

  submitWater(x: number, y: number, callbacks: MudPlantCareCallbacks): boolean {
    return this.submitPlantCare("water", x, y, callbacks);
  }

  submitTend(x: number, y: number, callbacks: MudPlantCareCallbacks): boolean {
    return this.submitPlantCare("tend", x, y, callbacks);
  }

  submitMove(x: number, y: number, callbacks: MudMoveCallbacks): boolean {
    if (this.pendingMove) {
      return false;
    }

    this.pendingMove = true;
    void this.confirmMove(x, y, callbacks);

    return true;
  }

  submitMovePath(path: MovePathStep[], callbacks: MudMoveCallbacks): boolean {
    if (this.pendingMove || path.length === 0) {
      return false;
    }

    this.pendingMove = true;
    void this.confirmMovePath(path, callbacks);

    return true;
  }

  submitSleep(callbacks: MudStartSleepCallbacks): boolean {
    if (this.pendingSleep) {
      return false;
    }

    this.pendingSleep = true;
    void this.confirmSleep(callbacks);

    return true;
  }

  submitPickupObject(
    objectId: Hex,
    callbacks: MudPickupObjectCallbacks,
  ): boolean {
    if (this.pendingPickups.has(objectId)) {
      return false;
    }

    this.pendingPickups.add(objectId);
    void this.confirmPickupObject(objectId, callbacks);

    return true;
  }

  submitDropObject(
    objectId: Hex,
    x: number,
    y: number,
    callbacks: MudDropObjectCallbacks,
  ): boolean {
    if (this.pendingDrops.has(objectId)) {
      return false;
    }

    this.pendingDrops.add(objectId);
    void this.confirmDropObject(objectId, x, y, callbacks);

    return true;
  }

  async readWorldTime(): Promise<WorldTimeConfig | undefined> {
    return this.snapshotReader.readWorldTime();
  }

  async readPlayerSnapshot(
    worldStateBounds?: WorldStateReadBounds,
  ): Promise<PlayerSnapshot | undefined> {
    return this.snapshotReader.readPlayerSnapshot(worldStateBounds);
  }

  async readWorldObjects(): Promise<WorldObjectSnapshot[]> {
    return this.snapshotReader.readWorldObjects();
  }

  private async confirmDig(
    x: number,
    y: number,
    key: string,
    callbacks: MudDigCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__dig",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        x,
        y,
        playerEnergy:
          await this.snapshotReader.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingDigs.delete(key);
    }
  }

  private async confirmPickupObject(
    objectId: Hex,
    callbacks: MudPickupObjectCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__pickupObject",
        args: [objectId],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        objectId,
        inventory:
          await this.snapshotReader.readPlayerInventoryAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingPickups.delete(objectId);
    }
  }

  private async confirmDropObject(
    objectId: Hex,
    x: number,
    y: number,
    callbacks: MudDropObjectCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__dropObject",
        args: [objectId, x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        objectId,
        x,
        y,
        inventory:
          await this.snapshotReader.readPlayerInventoryAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingDrops.delete(objectId);
    }
  }

  private async confirmForage(
    x: number,
    y: number,
    key: string,
    callbacks: MudForageCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__forage",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        ...(await this.snapshotReader.readLastForageResultAfterConfirmation(
          x,
          y,
        )),
        playerEnergy:
          await this.snapshotReader.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingForages.delete(key);
    }
  }

  private async confirmPlant(
    x: number,
    y: number,
    plantId: string,
    key: string,
    callbacks: MudPlantCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__plant",
        args: [x, y, stringToBytes32(plantId)],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        x,
        y,
        plantId,
        playerEnergy:
          await this.snapshotReader.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingPlants.delete(key);
    }
  }

  private async confirmHarvest(
    x: number,
    y: number,
    key: string,
    callbacks: MudHarvestCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__harvest",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        ...(await this.snapshotReader.readLastHarvestResultAfterConfirmation(
          x,
          y,
        )),
        playerEnergy:
          await this.snapshotReader.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingHarvests.delete(key);
    }
  }

  private submitPlantCare(
    action: "water" | "tend",
    x: number,
    y: number,
    callbacks: MudPlantCareCallbacks,
  ): boolean {
    const key = `${action}:${x},${y}`;

    if (this.pendingCareActions.has(key)) {
      return false;
    }

    this.pendingCareActions.add(key);
    void this.confirmPlantCare(action, x, y, key, callbacks);

    return true;
  }

  private async confirmPlantCare(
    action: "water" | "tend",
    x: number,
    y: number,
    key: string,
    callbacks: MudPlantCareCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: action === "water" ? "pantheon__water" : "pantheon__tend",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        x,
        y,
        action,
        playerEnergy:
          await this.snapshotReader.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingCareActions.delete(key);
    }
  }

  private async confirmMove(
    x: number,
    y: number,
    callbacks: MudMoveCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__move",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        x,
        y,
        playerEnergy:
          await this.snapshotReader.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingMove = false;
    }
  }

  private async confirmMovePath(
    path: MovePathStep[],
    callbacks: MudMoveCallbacks,
  ): Promise<void> {
    const target = path[path.length - 1];

    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__movePath",
        args: [path.map((step) => step.x), path.map((step) => step.y)],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        ...target,
        playerEnergy:
          await this.snapshotReader.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingMove = false;
    }
  }

  private async confirmSleep(callbacks: MudStartSleepCallbacks): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__sleep",
        args: [],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed(
        await this.snapshotReader.readPendingActionAfterConfirmation(),
      );
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingSleep = false;
    }
  }
}

function formatMudError(error: unknown): string {
  if (typeof error === "object" && error) {
    const maybeError = error as { shortMessage?: string; message?: string };

    return (
      maybeError.shortMessage ?? maybeError.message ?? "MUD transaction failed"
    );
  }

  return "MUD transaction failed";
}
