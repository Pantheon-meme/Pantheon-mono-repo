const mudActionDurations: Record<string, number> = {
  dig: 2,
  forage: 3,
  harvest: 2,
  plant: 2,
  sleep: 6,
  tend: 2,
  water: 2,
};

export function getMudActionDurationSeconds(action: string): number {
  return mudActionDurations[action] ?? 1.4;
}
