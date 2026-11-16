export const EVENT_CATEGORIES = [
  "Tree Plantation",
  "Cleanup",
  "Blood Donation",
  "Food Distribution",
  "Winter Donation",
  "Community Support",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
