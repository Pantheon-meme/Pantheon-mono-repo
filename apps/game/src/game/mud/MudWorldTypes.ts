export type ConfirmedDig = {
  x: number;
  y: number;
  playerEnergy?: PlayerEnergy;
};

export type ConfirmedForage = {
  x: number;
  y: number;
  itemId: string;
  amount: number;
  playerEnergy?: PlayerEnergy;
};

export type ConfirmedPickupObject = {
  objectId: string;
  inventory?: PlayerInventorySnapshot;
};

export type ConfirmedDropObject = {
  objectId: string;
  x: number;
  y: number;
  inventory?: PlayerInventorySnapshot;
};

export type WorldObjectSnapshot = {
  objectId: string;
  objectTypeId?: string;
  x: number;
  y: number;
  itemId: string;
  amount: number;
  weight?: number;
  grabbable?: boolean;
  usable?: boolean;
  owner?: string;
  inInventory?: boolean;
  spawnedBy: string;
  createdAt: number;
};

export type PlayerInventorySlotSnapshot = {
  slot: number;
  objectId: string;
  objectTypeId: string;
  itemId: string;
  amount: number;
  weight: number;
};

export type PlayerInventorySnapshot = {
  maxWeight: number;
  usedWeight: number;
  slots: PlayerInventorySlotSnapshot[];
};

export type ConfirmedPlant = {
  x: number;
  y: number;
  plantId: string;
  playerEnergy?: PlayerEnergy;
};

export type ConfirmedHarvest = {
  x: number;
  y: number;
  itemId: string;
  amount: number;
  rareItemId: string;
  rareAmount: number;
  playerEnergy?: PlayerEnergy;
};

export type ConfirmedPlantCare = {
  x: number;
  y: number;
  action: "water" | "tend";
  playerEnergy?: PlayerEnergy;
};

export type ConfirmedMove = {
  x: number;
  y: number;
  playerEnergy?: PlayerEnergy;
};

export type MovePathStep = {
  x: number;
  y: number;
};

export type PlayerEnergy = {
  energy: number;
  maxEnergy: number;
  updatedAt?: number;
};

export type PlayerSnapshot = PlayerEnergy & {
  x: number;
  y: number;
  lastMoveAt: number;
  moveSpeed: number;
  exists: boolean;
  actionLog?: ActionLogSnapshot;
  pendingAction?: PendingActionSnapshot;
  inventory?: PlayerInventorySnapshot;
  worldObjects: WorldObjectSnapshot[];
  worldState?: WorldStateSnapshot;
};

export type WorldStateSnapshot = {
  terrain: TerrainStateSnapshot[];
  plants: PlantStateSnapshot[];
};

export type TerrainStateSnapshot = {
  x: number;
  y: number;
  material: string;
  digDepth: number;
};

export type PlantStateSnapshot = {
  x: number;
  y: number;
  plantId: string;
  plantedAt: number;
  stage: number;
  health: number;
  stress: number;
};

export type WorldStateReadBounds = {
  width: number;
  height: number;
  radius: number;
};

export type ActionLogSnapshot = {
  action: string;
  updatedAt: number;
  message: string;
};

export type WorldTimeConfig = {
  startedAt: number;
  dayLength: number;
};

export type PendingActionSnapshot = {
  action: string;
  readyAt: number;
  value: number;
  playerEnergy?: PlayerEnergy;
};

export type MudDigCallbacks = {
  onConfirmed: (dig: ConfirmedDig) => void;
  onRejected: (message: string) => void;
};

export type MudForageCallbacks = {
  onConfirmed: (forage: ConfirmedForage) => void;
  onRejected: (message: string) => void;
};

export type MudPlantCallbacks = {
  onConfirmed: (plant: ConfirmedPlant) => void;
  onRejected: (message: string) => void;
};

export type MudHarvestCallbacks = {
  onConfirmed: (harvest: ConfirmedHarvest) => void;
  onRejected: (message: string) => void;
};

export type MudPlantCareCallbacks = {
  onConfirmed: (care: ConfirmedPlantCare) => void;
  onRejected: (message: string) => void;
};

export type MudMoveCallbacks = {
  onConfirmed: (move: ConfirmedMove) => void;
  onRejected: (message: string) => void;
};

export type MudStartSleepCallbacks = {
  onConfirmed: (action: PendingActionSnapshot) => void;
  onRejected: (message: string) => void;
};

export type MudPickupObjectCallbacks = {
  onConfirmed: (pickup: ConfirmedPickupObject) => void;
  onRejected: (message: string) => void;
};

export type MudDropObjectCallbacks = {
  onConfirmed: (drop: ConfirmedDropObject) => void;
  onRejected: (message: string) => void;
};
