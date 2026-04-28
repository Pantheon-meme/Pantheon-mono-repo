const minutesPerDay = 24 * 60;

export class GameClock {
  private localStartedAtSeconds: number;

  constructor(
    public day = 1,
    public minuteOfDay = 0,
    public realSecondsPerGameDay = 300,
    public worldStartedAtSeconds = Math.floor(Date.now() / 1000),
  ) {
    this.localStartedAtSeconds = this.worldStartedAtSeconds;
  }

  get normalizedDayTime(): number {
    return Math.floor(this.minuteOfDay) / minutesPerDay;
  }

  get hour(): number {
    return Math.floor(this.minuteOfDay / 60);
  }

  get minute(): number {
    return Math.floor(this.minuteOfDay) % 60;
  }

  sync(nowSeconds = Date.now() / 1000): void {
    const elapsedSeconds = Math.max(0, nowSeconds - this.localStartedAtSeconds);
    const totalDays = elapsedSeconds / this.realSecondsPerGameDay;
    const elapsedDays = Math.floor(totalDays);
    const dayProgress = totalDays - elapsedDays;

    this.day = elapsedDays + 1;
    this.minuteOfDay = dayProgress * minutesPerDay;
  }

  configure(worldStartedAtSeconds: number, realSecondsPerGameDay: number): void {
    this.worldStartedAtSeconds = worldStartedAtSeconds;
    this.realSecondsPerGameDay = realSecondsPerGameDay;
    this.localStartedAtSeconds = worldStartedAtSeconds;
    this.sync();
  }
}
