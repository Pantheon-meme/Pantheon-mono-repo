// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

library PantheonConstants {
  uint32 internal constant STARTING_ENERGY = 100;
  uint32 internal constant MOVE_ENERGY_COST = 1;
  uint32 internal constant DIG_ENERGY_COST = 12;
  uint32 internal constant PLANT_ENERGY_COST = 8;
  uint32 internal constant MOVE_SPEED_SCALE = 1000;
  uint32 internal constant DEFAULT_MOVE_SPEED = 2500;
  uint32 internal constant SLEEP_GRASS_ENERGY_PER_SECOND = 4;
  uint32 internal constant SLEEP_DIRT_ENERGY_PER_SECOND = 7;
  uint64 internal constant SLEEP_DURATION = 6;
  uint8 internal constant PLANT_STAGE_GROWING = 0;
  uint8 internal constant PLANT_STAGE_HARVESTED = 2;

  bytes32 internal constant ACTION_DIG = bytes32("dig");
  bytes32 internal constant ACTION_HARVEST = bytes32("harvest");
  bytes32 internal constant ACTION_MOVE = bytes32("move");
  bytes32 internal constant ACTION_PLANT = bytes32("plant");
  bytes32 internal constant ACTION_SLEEP = bytes32("sleep");
  bytes32 internal constant ACTION_SPAWN = bytes32("spawn");
  bytes32 internal constant TERRAIN_DIRT = bytes32("dirt");
}
