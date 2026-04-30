const mudActionDurations: Record<string, number> = {
  dig: 2,
  forage: 3,
  harvest: 2,
  plant: 2,
  sleep: 6,
};

export function getMudActionDurationSeconds(action: string): number {
  return mudActionDurations[action] ?? 1.4;
}
