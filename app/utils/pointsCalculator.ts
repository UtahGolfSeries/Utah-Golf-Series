export const POINTS_DISTRIBUTION: Record<number, number> = {
  1: 500, // 1st Place
  2: 300, // 2nd
  3: 190, // 3rd
  4: 135, // 4th
  5: 110, // 5th
  6: 90,  // 6th
  7: 70,  // 7th
  8: 50,  // 8th (Participation floor)
};

export const calculatePoints = (rank: number) => {
  return POINTS_DISTRIBUTION[rank] || 50; // Return 50 if they finished below 8th
};