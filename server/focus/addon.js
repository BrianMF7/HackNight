/** Questions Yes opens. They are not part of the adult-intake template and are not required for handoff. */
export const depressionAddon = [
  {
    id: "DEP-001",
    label: "Have you had a period like this before?",
    followUp: "Was there an earlier time when low mood or loss of interest lasted most of the day?",
    required: false,
  },
  {
    id: "DEP-002",
    label: "Have there been times when your mood was unusually high or irritable?",
    followUp: "During those times, did you need much less sleep or feel unusually driven?",
    required: false,
  },
];

export function addonFor(focusId) {
  if (focusId === "depression") return depressionAddon;
  return null;
}
