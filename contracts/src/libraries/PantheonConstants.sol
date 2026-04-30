// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

library PantheonConstants {
  uint32 internal constant STARTING_ENERGY = 100;
  uint32 internal constant MOVE_ENERGY_COST = 1;
  uint32 internal constant DIG_ENERGY_COST = 12;
  uint32 internal constant FORAGE_ENERGY_COST = 10;
  uint32 internal constant PLANT_ENERGY_COST = 8;
  uint32 internal constant MOVE_SPEED_SCALE = 1000;
  uint32 internal constant DEFAULT_MOVE_SPEED = 2500;
  uint32 internal constant SLEEP_GRASS_ENERGY_PER_SECOND = 4;
  uint32 internal constant SLEEP_DIRT_ENERGY_PER_SECOND = 7;
  uint32 internal constant SLEEP_ROUGH_ENERGY_PER_SECOND = 2;
  uint64 internal constant SLEEP_DURATION = 6;
  uint64 internal constant DEFAULT_DAY_LENGTH = 300;
  uint8 internal constant FORAGE_MAX_LOOT_SLOTS = 32;
  uint8 internal constant PLANT_STAGE_GROWING = 0;
  uint8 internal constant PLANT_STAGE_HARVESTED = 2;

  bytes32 internal constant ACTION_DIG = bytes32("dig");
  bytes32 internal constant ACTION_FORAGE = bytes32("forage");
  bytes32 internal constant ACTION_HARVEST = bytes32("harvest");
  bytes32 internal constant ACTION_MOVE = bytes32("move");
  bytes32 internal constant ACTION_PLANT = bytes32("plant");
  bytes32 internal constant ACTION_SLEEP = bytes32("sleep");
  bytes32 internal constant ACTION_SPAWN = bytes32("spawn");
  bytes32 internal constant WORLD_OBJECT_COUNTER_ID = bytes32("world_object_count");
  bytes32 internal constant TERRAIN_ADMIN_ID = bytes32("terrainAdmin");
  bytes32 internal constant TERRAIN_DIRT = bytes32("dirt");
  bytes32 internal constant TERRAIN_FOREST_FLOOR = bytes32("forest-floor");
  bytes32 internal constant TERRAIN_GRASS = bytes32("grass");
  bytes32 internal constant TERRAIN_PATH = bytes32("path");
  bytes32 internal constant TERRAIN_PLAIN = bytes32("plain");
  bytes32 internal constant TERRAIN_SAND = bytes32("sand");
  bytes32 internal constant TERRAIN_STONE = bytes32("stone");
  bytes32 internal constant TERRAIN_SWAMP = bytes32("swamp");
  bytes32 internal constant TERRAIN_WATER = bytes32("water");
  bytes32 internal constant WORLD_TIME_ID = bytes32("world");
}
