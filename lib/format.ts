import { differenceInYears } from "date-fns";

export function getAge(dateOfBirth: Date): number {
  return differenceInYears(new Date(), dateOfBirth);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}
