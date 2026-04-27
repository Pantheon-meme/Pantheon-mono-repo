import sungrainSpriteUrl from "./sungrain/sungrain-sprite-sheet.png?url";
import sungrainSpriteUrl from "./sungrain/sungrain-sprite-sheet.png?url";

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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
                "columnLabel": "idle 1",
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
                "columnLabel": "idle 2",
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
                "columnLabel": "transition 1",
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
                "columnLabel": "transition 2",
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
