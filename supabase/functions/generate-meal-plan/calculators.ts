
export function calculateHarrisBenedict(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityFactor: number
): number {
  let bmr;
  if (gender === 'male') {
    bmr = 66 + (13.7 * weight) + (5 * height) - (6.8 * age);
  } else {
    bmr = 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
  }
  return Math.round(bmr * activityFactor);
}

export function calculateMifflinStJeor(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityFactor: number
): number {
  let bmr;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  return Math.round(bmr * activityFactor);
}

export function calculateMacroDistribution(calories: number, goal: string) {
  let protein, carbs, fats;

  switch (goal) {
    case 'lose':
      protein = Math.round((calories * 0.35) / 4);
      carbs = Math.round((calories * 0.40) / 4);
      fats = Math.round((calories * 0.25) / 9);
      break;
    case 'gain':
      protein = Math.round((calories * 0.30) / 4);
      carbs = Math.round((calories * 0.50) / 4);
      fats = Math.round((calories * 0.20) / 9);
      break;
    default: // maintain
      protein = Math.round((calories * 0.30) / 4);
      carbs = Math.round((calories * 0.45) / 4);
      fats = Math.round((calories * 0.25) / 9);
  }

  return { protein, carbs, fats };
}
