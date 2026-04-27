const minutesPerDay = 24 * 60;

export class GameClock {
  constructor(
    public day = 1,
    public minuteOfDay = 8 * 60,
    public readonly realSecondsPerGameDay = 300,
  ) {}

  get normalizedDayTime(): number {
    return Math.floor(this.minuteOfDay) / minutesPerDay;
  }

  get hour(): number {
    return Math.floor(this.minuteOfDay / 60);
  }

  get minute(): number {
    return Math.floor(this.minuteOfDay) % 60;
  }

  advance(deltaSeconds: number): void {
    const minutesToAdvance =
      (deltaSeconds / this.realSecondsPerGameDay) * minutesPerDay;
    const totalMinutes = this.minuteOfDay + minutesToAdvance;
    const elapsedDays = Math.floor(totalMinutes / minutesPerDay);

    this.day += elapsedDays;
    this.minuteOfDay = totalMinutes % minutesPerDay;
  }
}
