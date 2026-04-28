import applewoodSpriteUrl from "./applewood/applewood-sprite-sheet.png?url";
import duskmilletSpriteUrl from "./duskmillet/duskmillet-sprite-sheet.png?url";
import emberoakSpriteUrl from "./emberoak/emberoak-sprite-sheet.png?url";
import emberwheatSpriteUrl from "./emberwheat/emberwheat-sprite-sheet.png?url";
import frostbarleySpriteUrl from "./frostbarley/frostbarley-sprite-sheet.png?url";
import frostpineSpriteUrl from "./frostpine/frostpine-sprite-sheet.png?url";
import honeyfigSpriteUrl from "./honeyfig/honeyfig-sprite-sheet.png?url";
import ironbarkSpriteUrl from "./ironbark/ironbark-sprite-sheet.png?url";
import mapleflareSpriteUrl from "./mapleflare/mapleflare-sprite-sheet.png?url";
import moonwillowSpriteUrl from "./moonwillow/moonwillow-sprite-sheet.png?url";
import pinecrestSpriteUrl from "./pinecrest/pinecrest-sprite-sheet.png?url";
import playerSpriteUrl from "./player/player-sprite-sheet.png?url";
import silveroatSpriteUrl from "./silveroat/silveroat-sprite-sheet.png?url";
import starblossomSpriteUrl from "./starblossom/starblossom-sprite-sheet.png?url";
import starryeSpriteUrl from "./starrye/starrye-sprite-sheet.png?url";
import sungrainSpriteUrl from "./sungrain/sungrain-sprite-sheet.png?url";
import willowshadeSpriteUrl from "./willowshade/willowshade-sprite-sheet.png?url";

export type ObjectSpriteCell = {
  stateId: string;
  stateTitle: string;
  columnLabel: string;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ObjectSpriteAsset = {
  imageUrl: string;
  manifest: {
    rows: number;
    columns: number;
    cellSize: number;
    atlasWidth: number;
    atlasHeight: number;
    cells: ObjectSpriteCell[];
  };
};

export const objectSpriteAssets = {
  "applewood": {
    imageUrl: applewoodSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "duskmillet": {
    imageUrl: duskmilletSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "emberoak": {
    imageUrl: emberoakSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "emberwheat": {
    imageUrl: emberwheatSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "frostbarley": {
    imageUrl: frostbarleySpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "frostpine": {
    imageUrl: frostpineSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "honeyfig": {
    imageUrl: honeyfigSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "ironbark": {
    imageUrl: ironbarkSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "mapleflare": {
    imageUrl: mapleflareSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "moonwillow": {
    imageUrl: moonwillowSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "pinecrest": {
    imageUrl: pinecrestSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "player": {
    imageUrl: playerSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "idle_1",
                "stateTitle": "Idle 1",
                "columnLabel": "down",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "idle_1",
                "stateTitle": "Idle 1",
                "columnLabel": "side",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "idle_1",
                "stateTitle": "Idle 1",
                "columnLabel": "up",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "idle_1",
                "stateTitle": "Idle 1",
                "columnLabel": "action",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "idle_2",
                "stateTitle": "Idle 2",
                "columnLabel": "down",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "idle_2",
                "stateTitle": "Idle 2",
                "columnLabel": "side",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "idle_2",
                "stateTitle": "Idle 2",
                "columnLabel": "up",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "idle_2",
                "stateTitle": "Idle 2",
                "columnLabel": "action",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_1",
                "stateTitle": "Move 1",
                "columnLabel": "down",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_1",
                "stateTitle": "Move 1",
                "columnLabel": "side",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_1",
                "stateTitle": "Move 1",
                "columnLabel": "up",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_1",
                "stateTitle": "Move 1",
                "columnLabel": "action",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_2",
                "stateTitle": "Move 2",
                "columnLabel": "down",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_2",
                "stateTitle": "Move 2",
                "columnLabel": "side",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_2",
                "stateTitle": "Move 2",
                "columnLabel": "up",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "move_2",
                "stateTitle": "Move 2",
                "columnLabel": "action",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "silveroat": {
    imageUrl: silveroatSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "starblossom": {
    imageUrl: starblossomSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "starrye": {
    imageUrl: starryeSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "sungrain": {
    imageUrl: sungrainSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
  "willowshade": {
    imageUrl: willowshadeSpriteUrl,
    manifest: {
        "rows": 4,
        "columns": 4,
        "cellSize": 256,
        "atlasWidth": 1024,
        "atlasHeight": 1024,
        "cells": [
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 1",
                "row": 0,
                "column": 0,
                "x": 0,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 2",
                "row": 0,
                "column": 1,
                "x": 256,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 3",
                "row": 0,
                "column": 2,
                "x": 512,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "seed",
                "stateTitle": "Seed",
                "columnLabel": "step 4",
                "row": 0,
                "column": 3,
                "x": 768,
                "y": 0,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 1",
                "row": 1,
                "column": 0,
                "x": 0,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 2",
                "row": 1,
                "column": 1,
                "x": 256,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 3",
                "row": 1,
                "column": 2,
                "x": 512,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "growing",
                "stateTitle": "Growing",
                "columnLabel": "step 4",
                "row": 1,
                "column": 3,
                "x": 768,
                "y": 256,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 1",
                "row": 2,
                "column": 0,
                "x": 0,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 2",
                "row": 2,
                "column": 1,
                "x": 256,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 3",
                "row": 2,
                "column": 2,
                "x": 512,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "grown",
                "stateTitle": "Grown",
                "columnLabel": "step 4",
                "row": 2,
                "column": 3,
                "x": 768,
                "y": 512,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 1",
                "row": 3,
                "column": 0,
                "x": 0,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 2",
                "row": 3,
                "column": 1,
                "x": 256,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 3",
                "row": 3,
                "column": 2,
                "x": 512,
                "y": 768,
                "width": 256,
                "height": 256
            },
            {
                "stateId": "harvested",
                "stateTitle": "Harvested",
                "columnLabel": "step 4",
                "row": 3,
                "column": 3,
                "x": 768,
                "y": 768,
                "width": 256,
                "height": 256
            }
        ]
    },
  },
} satisfies Record<string, ObjectSpriteAsset>;
