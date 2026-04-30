export class BiomeObject {
  constructor(
    public readonly objectId: string,
    public readonly spriteSheetId: string,
    public readonly row: number,
    public readonly column: number,
    public readonly scale: number,
    public readonly groundOriginY = 0.86,
  ) {}
}
