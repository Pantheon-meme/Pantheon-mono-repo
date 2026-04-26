export type CheckQuality =
  | "critical-failure"
  | "failure"
  | "partial"
  | "success"
  | "great-success"
  | "critical-success";

export type CheckModifier = {
  id: string;
  label: string;
  value: number;
};

export type CheckRequest = {
  domain: string;
  difficulty: number;
  skill: number;
  modifiers: CheckModifier[];
};

export type CheckResult = {
  domain: string;
  dice: [number, number];
  roll: number;
  total: number;
  difficulty: number;
  margin: number;
  quality: CheckQuality;
  modifiers: CheckModifier[];
};

export function resolveCheck(request: CheckRequest): CheckResult {
  const dice: [number, number] = [rollDie(6), rollDie(6)];
  const roll = dice[0] + dice[1];
  const modifierTotal = request.modifiers.reduce(
    (total, modifier) => total + modifier.value,
    0,
  );
  const total = roll + request.skill + modifierTotal;
  const margin = total - request.difficulty;

  return {
    domain: request.domain,
    dice,
    roll,
    total,
    difficulty: request.difficulty,
    margin,
    quality: getQuality(dice, margin),
    modifiers: request.modifiers,
  };
}

export function checkQualityLabel(quality: CheckQuality): string {
  switch (quality) {
    case "critical-failure":
      return "Critical failure";
    case "failure":
      return "Failure";
    case "partial":
      return "Partial insight";
    case "success":
      return "Success";
    case "great-success":
      return "Great success";
    case "critical-success":
      return "Critical success";
  }
}

function getQuality(dice: [number, number], margin: number): CheckQuality {
  if (dice[0] === 1 && dice[1] === 1) {
    return "critical-failure";
  }

  if (dice[0] === 6 && dice[1] === 6) {
    return "critical-success";
  }

  if (margin < -5) {
    return "failure";
  }

  if (margin < 0) {
    return "partial";
  }

  if (margin >= 8) {
    return "great-success";
  }

  return "success";
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}
