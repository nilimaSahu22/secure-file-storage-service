import { differenceInYears } from "date-fns";

export function getAge(dateOfBirth: Date): number {
  return differenceInYears(new Date(), dateOfBirth);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

const NAME_TITLES = new Set(["dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "prof", "prof."]);

export function getInitialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => !NAME_TITLES.has(p.toLowerCase()));
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
