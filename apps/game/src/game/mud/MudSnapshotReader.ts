import type { Hex, PublicClient } from "viem";
import {
  addressToBytes32,
  decodeBoolStaticField,
  decodeBytes32String,
  decodeDynamicString,
  decodeInt32StaticField,
  decodeUint32StaticField,
  decodeUint64StaticField,
  decodeUint256StaticField,
  stringToBytes32,
} from "./MudCodec";
import {
  actionLogActionFieldIndex,
  actionLogFieldLayout,
  actionLogMessageFieldIndex,
  actionLogTableId,
  actionLogUpdatedAtFieldIndex,
  cucBalanceBalanceFieldIndex,
  cucBalanceFieldLayout,
  cucBalanceTableId,
  bankItemInventoryFieldLayout,
  bankItemInventoryQuantityFieldIndex,
  bankItemInventoryTableId,
  bankItemPriceBuyMaxQuantityFieldIndex,
  bankItemPriceBuyPriceFieldIndex,
  bankItemPriceEpochFieldIndex,
  bankItemPriceExistsFieldIndex,
  bankItemPriceFieldLayout,
  bankItemPriceSellMaxQuantityFieldIndex,
  bankItemPriceSellPriceFieldIndex,
  bankItemPriceTableId,
  bankItemPriceValidUntilFieldIndex,
  pendingActionActionFieldIndex,
  pendingActionExistsFieldIndex,
  pendingActionFieldLayout,
  pendingActionReadyAtFieldIndex,
  pendingActionTableId,
  pendingActionValueFieldIndex,
  playerEnergyFieldIndex,
  playerExistsFieldIndex,
  playerLastMoveAtFieldIndex,
  playerMaxEnergyFieldIndex,
  playerMoveSpeedFieldIndex,
  playerStateFieldLayout,
  playerStateTableId,
  playerXFieldIndex,
  playerYFieldIndex,
  worldTimeDayLengthFieldIndex,
  worldTimeFieldLayout,
  worldTimeKey,
  worldTimeStartedAtFieldIndex,
  worldTimeTableId,
} from "./MudTableIds";
import { pantheonWorldAbi } from "./MudWorldAbi";
import { MudWorldStateReader } from "./MudWorldStateReader";
import type {
  ActionLogSnapshot,
  BankItemQuoteSnapshot,
  ConfirmedForage,
  ConfirmedHarvest,
  PendingActionSnapshot,
  PlayerEnergy,
  PlayerInventorySnapshot,
  PlayerPresenceSnapshot,
  PlayerSnapshot,
  WorldObjectSnapshot,
  WorldStateReadBounds,
  WorldTimeConfig,
} from "./MudWorldTypes";

export class MudSnapshotReader {
  private readonly worldStateReader: MudWorldStateReader;
  private readonly cachedWorldObjects: WorldObjectSnapshot[] = [];
  private cachedWorldObjectCount = 0;

  constructor(
    private readonly publicClient: PublicClient,
    private readonly worldAddress: Hex,
    private readonly playerAddress: Hex,
  ) {
    this.worldStateReader = new MudWorldStateReader(publicClient, worldAddress);
  }

  async readWorldTime(): Promise<WorldTimeConfig | undefined> {
    try {
      const keyTuple = [worldTimeKey as Hex];
      const [startedAtBlob, dayLengthBlob] = await Promise.all([
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            worldTimeTableId,
            keyTuple,
            worldTimeStartedAtFieldIndex,
            worldTimeFieldLayout,
          ],
        }),
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            worldTimeTableId,
            keyTuple,
            worldTimeDayLengthFieldIndex,
            worldTimeFieldLayout,
          ],
        }),
      ]);

      const startedAt = decodeUint64StaticField(startedAtBlob);
      const dayLength = decodeUint64StaticField(dayLengthBlob);

      if (startedAt <= 0 || dayLength <= 0) {
        return undefined;
      }

      return { startedAt, dayLength };
    } catch {
      return undefined;
    }
  }

  async readPlayerSnapshot(
    worldStateBounds?: WorldStateReadBounds,
  ): Promise<PlayerSnapshot | undefined> {
    try {
      const keyTuple = [addressToBytes32(this.playerAddress)];
      const [
        xBlob,
        yBlob,
        energyBlob,
        maxEnergyBlob,
        lastMoveAtBlob,
        moveSpeedBlob,
        existsBlob,
      ] = await Promise.all([
        this.readPlayerStaticField(keyTuple, playerXFieldIndex),
        this.readPlayerStaticField(keyTuple, playerYFieldIndex),
        this.readPlayerStaticField(keyTuple, playerEnergyFieldIndex),
        this.readPlayerStaticField(keyTuple, playerMaxEnergyFieldIndex),
        this.readPlayerStaticField(keyTuple, playerLastMoveAtFieldIndex),
        this.readPlayerStaticField(keyTuple, playerMoveSpeedFieldIndex),
        this.readPlayerStaticField(keyTuple, playerExistsFieldIndex),
      ]);

      const exists = decodeBoolStaticField(existsBlob);

      if (!exists) {
        return undefined;
      }

      const x = decodeInt32StaticField(xBlob);
      const y = decodeInt32StaticField(yBlob);

      return {
        x,
        y,
        energy: decodeUint32StaticField(energyBlob),
        maxEnergy: decodeUint32StaticField(maxEnergyBlob),
        lastMoveAt: decodeUint64StaticField(lastMoveAtBlob),
        moveSpeed: decodeUint32StaticField(moveSpeedBlob),
        exists,
        actionLog: await this.readActionLogAfterConfirmation(keyTuple),
        pendingAction: await this.readPendingActionAfterConfirmationOptional(),
        inventory: await this.readPlayerInventoryAfterConfirmation(),
        cucBalance: await this.readCucBalanceAfterConfirmation(),
        worldObjects: await this.readWorldObjectsAfterConfirmation(),
        worldState: worldStateBounds
          ? await this.worldStateReader.readAfterConfirmation(
              x,
              y,
              worldStateBounds,
            )
          : undefined,
      };
    } catch {
      return undefined;
    }
  }

  async readPlayerPresence(): Promise<PlayerPresenceSnapshot | undefined> {
    try {
      const keyTuple = [addressToBytes32(this.playerAddress)];
      const [
        xBlob,
        yBlob,
        energyBlob,
        maxEnergyBlob,
        lastMoveAtBlob,
        moveSpeedBlob,
        existsBlob,
      ] = await Promise.all([
        this.readPlayerStaticField(keyTuple, playerXFieldIndex),
        this.readPlayerStaticField(keyTuple, playerYFieldIndex),
        this.readPlayerStaticField(keyTuple, playerEnergyFieldIndex),
        this.readPlayerStaticField(keyTuple, playerMaxEnergyFieldIndex),
        this.readPlayerStaticField(keyTuple, playerLastMoveAtFieldIndex),
        this.readPlayerStaticField(keyTuple, playerMoveSpeedFieldIndex),
        this.readPlayerStaticField(keyTuple, playerExistsFieldIndex),
      ]);

      const exists = decodeBoolStaticField(existsBlob);

      if (!exists) {
        return undefined;
      }

      return {
        address: this.playerAddress,
        x: decodeInt32StaticField(xBlob),
        y: decodeInt32StaticField(yBlob),
        energy: decodeUint32StaticField(energyBlob),
        maxEnergy: decodeUint32StaticField(maxEnergyBlob),
        lastMoveAt: decodeUint64StaticField(lastMoveAtBlob),
        moveSpeed: decodeUint32StaticField(moveSpeedBlob),
        exists,
        actionLog: await this.readActionLogAfterConfirmation(keyTuple),
        pendingAction: await this.readPendingActionForKeyTuple(keyTuple),
      };
    } catch {
      return undefined;
    }
  }

  async readPlayerEnergyAfterConfirmation(): Promise<PlayerEnergy | undefined> {
    try {
      return await this.readPlayerEnergy();
    } catch {
      return undefined;
    }
  }

  async readLastForageResultAfterConfirmation(
    fallbackX: number,
    fallbackY: number,
  ): Promise<Omit<ConfirmedForage, "playerEnergy">> {
    try {
      const result = await this.readLastForageResult();

      if (result) {
        return result;
      }
    } catch {
      // Fall through to a no-drop result if the read is temporarily unavailable.
    }

    return { x: fallbackX, y: fallbackY, itemId: "", amount: 0 };
  }

  async readLastHarvestResultAfterConfirmation(
    fallbackX: number,
    fallbackY: number,
  ): Promise<Omit<ConfirmedHarvest, "playerEnergy">> {
    try {
      const result = await this.readLastHarvestResult();

      if (result) {
        return result;
      }
    } catch {
      // Fall through to a no-yield result if the read is temporarily unavailable.
    }

    return {
      x: fallbackX,
      y: fallbackY,
      itemId: "",
      amount: 0,
      rareItemId: "",
      rareAmount: 0,
    };
  }

  async readWorldObjects(): Promise<WorldObjectSnapshot[]> {
    const count = await this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "pantheon__getWorldObjectCount",
      args: [],
    });
    if (count < this.cachedWorldObjectCount) {
      this.cachedWorldObjects.length = 0;
      this.cachedWorldObjectCount = 0;
    }

    for (let index = this.cachedWorldObjectCount + 1; index <= count; index += 1) {
      const [
        objectId,
        x,
        y,
        itemId,
        amount,
        spawnedBy,
        createdAt,
        exists,
      ] = await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__getWorldObject",
        args: [index],
      });

      if (!exists || amount <= 0) {
        continue;
      }

      this.cachedWorldObjects.push({
        objectId,
        x,
        y,
        itemId: decodeBytes32String(itemId),
        amount,
        spawnedBy,
        createdAt: Number(createdAt),
      });
    }

    this.cachedWorldObjectCount = count;

    return [...this.cachedWorldObjects];
  }

  async readBankItemQuotes(
    itemIds: string[],
  ): Promise<BankItemQuoteSnapshot[]> {
    return Promise.all(itemIds.map((itemId) => this.readBankItemQuote(itemId)));
  }

  async readPlayerInventoryAfterConfirmation(): Promise<
    PlayerInventorySnapshot | undefined
  > {
    try {
      return await this.readPlayerInventory();
    } catch {
      return undefined;
    }
  }

  async readBankItemQuotesAfterConfirmation(
    itemIds: string[],
  ): Promise<BankItemQuoteSnapshot[]> {
    try {
      return await this.readBankItemQuotes(itemIds);
    } catch {
      return [];
    }
  }

  async readCucBalanceAfterConfirmation(): Promise<bigint | undefined> {
    try {
      return await this.readCucBalance();
    } catch {
      return undefined;
    }
  }

  private async readBankItemQuote(
    itemId: string,
  ): Promise<BankItemQuoteSnapshot> {
    const keyTuple = [stringToBytes32(itemId)];
    const zero =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
    const [
      buyPriceBlob,
      sellPriceBlob,
      buyMaxQuantityBlob,
      sellMaxQuantityBlob,
      validUntilBlob,
      epochBlob,
      priceExistsBlob,
      inventoryQuantityBlob,
    ] = await Promise.all([
      this.readStaticField(
        bankItemPriceTableId,
        keyTuple,
        bankItemPriceBuyPriceFieldIndex,
        bankItemPriceFieldLayout,
      ).catch(() => zero),
      this.readStaticField(
        bankItemPriceTableId,
        keyTuple,
        bankItemPriceSellPriceFieldIndex,
        bankItemPriceFieldLayout,
      ).catch(() => zero),
      this.readStaticField(
        bankItemPriceTableId,
        keyTuple,
        bankItemPriceBuyMaxQuantityFieldIndex,
        bankItemPriceFieldLayout,
      ).catch(() => zero),
      this.readStaticField(
        bankItemPriceTableId,
        keyTuple,
        bankItemPriceSellMaxQuantityFieldIndex,
        bankItemPriceFieldLayout,
      ).catch(() => zero),
      this.readStaticField(
        bankItemPriceTableId,
        keyTuple,
        bankItemPriceValidUntilFieldIndex,
        bankItemPriceFieldLayout,
      ).catch(() => zero),
      this.readStaticField(
        bankItemPriceTableId,
        keyTuple,
        bankItemPriceEpochFieldIndex,
        bankItemPriceFieldLayout,
      ).catch(() => zero),
      this.readStaticField(
        bankItemPriceTableId,
        keyTuple,
        bankItemPriceExistsFieldIndex,
        bankItemPriceFieldLayout,
      ).catch(() => zero),
      this.readStaticField(
        bankItemInventoryTableId,
        keyTuple,
        bankItemInventoryQuantityFieldIndex,
        bankItemInventoryFieldLayout,
      ).catch(() => zero),
    ]);

    return {
      itemId,
      buyPrice: decodeUint256StaticField(buyPriceBlob),
      sellPrice: decodeUint256StaticField(sellPriceBlob),
      buyMaxQuantity: decodeUint32StaticField(buyMaxQuantityBlob),
      sellMaxQuantity: decodeUint32StaticField(sellMaxQuantityBlob),
      validUntil: decodeUint64StaticField(validUntilBlob),
      epoch: decodeUint32StaticField(epochBlob),
      inventoryQuantity: decodeUint32StaticField(inventoryQuantityBlob),
      priceExists: decodeBoolStaticField(priceExistsBlob),
    };
  }

  async readPendingActionAfterConfirmation(): Promise<PendingActionSnapshot> {
    try {
      const pendingAction = await this.readPendingAction();

      if (pendingAction) {
        return {
          ...pendingAction,
          playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
        };
      }
    } catch {
      // Fall back to the local default when the read is temporarily unavailable.
    }

    return {
      action: "sleep",
      readyAt: Math.floor(Date.now() / 1000) + 6,
      value: 24,
      playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
    };
  }

  private async readPlayerEnergy(): Promise<PlayerEnergy | undefined> {
    const keyTuple = [addressToBytes32(this.playerAddress)];

    const [energyBlob, maxEnergyBlob, updatedAtBlob] = await Promise.all([
      this.readPlayerStaticField(keyTuple, playerEnergyFieldIndex),
      this.readPlayerStaticField(keyTuple, playerMaxEnergyFieldIndex),
      this.publicClient
        .readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            actionLogTableId,
            keyTuple,
            actionLogUpdatedAtFieldIndex,
            actionLogFieldLayout,
          ],
        })
        .catch(() => undefined),
    ]);

    return {
      energy: decodeUint32StaticField(energyBlob),
      maxEnergy: decodeUint32StaticField(maxEnergyBlob),
      updatedAt: updatedAtBlob
        ? decodeUint64StaticField(updatedAtBlob)
        : undefined,
    };
  }

  private async readCucBalance(): Promise<bigint> {
    const balanceBlob = await this.readStaticField(
      cucBalanceTableId,
      [addressToBytes32(this.playerAddress)],
      cucBalanceBalanceFieldIndex,
      cucBalanceFieldLayout,
    );

    return decodeUint256StaticField(balanceBlob);
  }

  private async readStaticField(
    tableId: Hex,
    keyTuple: Hex[],
    fieldIndex: number,
    fieldLayout: Hex,
  ): Promise<Hex> {
    return this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "getStaticField",
      args: [tableId, keyTuple, fieldIndex, fieldLayout],
    });
  }

  private async readPlayerInventory(): Promise<PlayerInventorySnapshot> {
    const [maxWeight, slots, objectIds, objectTypeIds, itemIds, amounts, weights] =
      await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__getPlayerInventory",
        args: [this.playerAddress],
      });
    const inventorySlots = slots.map((slot, index) => ({
      slot,
      objectId: objectIds[index],
      objectTypeId: decodeBytes32String(objectTypeIds[index]),
      itemId: decodeBytes32String(itemIds[index]),
      amount: amounts[index],
      weight: weights[index],
    }));

    return {
      maxWeight,
      usedWeight: inventorySlots.reduce((total, slot) => total + slot.weight, 0),
      slots: inventorySlots,
    };
  }

  private async readActionLogAfterConfirmation(
    keyTuple: Hex[],
  ): Promise<ActionLogSnapshot | undefined> {
    try {
      const [actionBlob, updatedAtBlob, messageBlob] = await Promise.all([
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            actionLogTableId,
            keyTuple,
            actionLogActionFieldIndex,
            actionLogFieldLayout,
          ],
        }),
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            actionLogTableId,
            keyTuple,
            actionLogUpdatedAtFieldIndex,
            actionLogFieldLayout,
          ],
        }),
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getDynamicField",
          args: [actionLogTableId, keyTuple, actionLogMessageFieldIndex],
        }),
      ]);

      return {
        action: decodeBytes32String(actionBlob),
        updatedAt: decodeUint64StaticField(updatedAtBlob),
        message: decodeDynamicString(messageBlob),
      };
    } catch {
      return undefined;
    }
  }

  private async readWorldObjectsAfterConfirmation(): Promise<
    WorldObjectSnapshot[]
  > {
    try {
      return await this.readWorldObjects();
    } catch {
      return [];
    }
  }

  private async readLastForageResult(): Promise<
    Omit<ConfirmedForage, "playerEnergy"> | undefined
  > {
    const [x, y, itemId, amount, exists] = await this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "pantheon__getLastForageResult",
      args: [this.playerAddress],
    });

    if (!exists || amount <= 0) {
      return undefined;
    }

    return {
      x,
      y,
      itemId: decodeBytes32String(itemId),
      amount,
    };
  }

  private async readLastHarvestResult(): Promise<
    Omit<ConfirmedHarvest, "playerEnergy"> | undefined
  > {
    const [x, y, itemId, amount, rareItemId, rareAmount, exists] =
      await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__getLastHarvestResult",
        args: [this.playerAddress],
      });

    if (!exists || amount <= 0) {
      return undefined;
    }

    return {
      x,
      y,
      itemId: decodeBytes32String(itemId),
      amount,
      rareItemId: decodeBytes32String(rareItemId),
      rareAmount,
    };
  }

  private async readPlayerStaticField(
    keyTuple: Hex[],
    fieldIndex: number,
  ): Promise<Hex> {
    return this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "getStaticField",
      args: [
        playerStateTableId,
        keyTuple,
        fieldIndex,
        playerStateFieldLayout,
      ],
    });
  }

  private async readPendingActionAfterConfirmationOptional(): Promise<
    PendingActionSnapshot | undefined
  > {
    try {
      return await this.readPendingAction();
    } catch {
      return undefined;
    }
  }

  private async readPendingAction(): Promise<PendingActionSnapshot | undefined> {
    const keyTuple = [addressToBytes32(this.playerAddress)];

    return this.readPendingActionForKeyTuple(keyTuple);
  }

  private async readPendingActionForKeyTuple(
    keyTuple: Hex[],
  ): Promise<PendingActionSnapshot | undefined> {
    const [actionBlob, readyAtBlob, valueBlob, existsBlob] = await Promise.all([
      this.readPendingActionStaticField(keyTuple, pendingActionActionFieldIndex),
      this.readPendingActionStaticField(keyTuple, pendingActionReadyAtFieldIndex),
      this.readPendingActionStaticField(keyTuple, pendingActionValueFieldIndex),
      this.readPendingActionStaticField(keyTuple, pendingActionExistsFieldIndex),
    ]);

    if (!decodeBoolStaticField(existsBlob)) {
      return undefined;
    }

    return {
      action: decodeBytes32String(actionBlob),
      readyAt: decodeUint64StaticField(readyAtBlob),
      value: decodeUint32StaticField(valueBlob),
    };
  }

  private async readPendingActionStaticField(
    keyTuple: Hex[],
    fieldIndex: number,
  ): Promise<Hex> {
    return this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "getStaticField",
      args: [
        pendingActionTableId,
        keyTuple,
        fieldIndex,
        pendingActionFieldLayout,
      ],
    });
  }
}
