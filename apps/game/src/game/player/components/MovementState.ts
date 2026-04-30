export class MovementState {
  confirmedTileX?: number;
  confirmedTileY?: number;
  queuedTileX?: number;
  queuedTileY?: number;
  lastConfirmedAtMs = Date.now();
  pending = false;
  wasMoving = false;
}
