export interface VitalRange {
  label: string;
  unit: string;
  min: number;
  max: number;
}

// Hardcoded normal ranges for demo purposes only — not clinically validated.
export const VITAL_RANGES: Record<string, VitalRange> = {
  "Blood Pressure Systolic": { label: "Systolic BP", unit: "mmHg", min: 90, max: 120 },
  "Blood Pressure Diastolic": { label: "Diastolic BP", unit: "mmHg", min: 60, max: 80 },
  "Heart Rate": { label: "Heart Rate", unit: "bpm", min: 60, max: 100 },
  Temperature: { label: "Temperature", unit: "°F", min: 97.0, max: 99.5 },
  "Respiratory Rate": { label: "Respiratory Rate", unit: "breaths/min", min: 12, max: 20 },
  "Oxygen Saturation": { label: "O2 Saturation", unit: "%", min: 95, max: 100 },
  Glucose: { label: "Glucose", unit: "mg/dL", min: 70, max: 140 },
};

export function isVitalAbnormal(type: string, value: string): boolean {
  const range = VITAL_RANGES[type];
  if (!range) return false;
  const numeric = parseFloat(value);
  if (Number.isNaN(numeric)) return false;
  return numeric < range.min || numeric > range.max;
}

interface DrugAllergyRule {
  drugKeywords: string[];
  allergenKeywords: string[];
  description: string;
}

// Hardcoded, illustrative conflict rules for demo purposes only — not a substitute
// for a real drug-interaction database.
const DRUG_ALLERGY_RULES: DrugAllergyRule[] = [
  {
    drugKeywords: ["penicillin", "amoxicillin", "ampicillin"],
    allergenKeywords: ["penicillin"],
    description: "Penicillin-class antibiotic conflicts with documented penicillin allergy.",
  },
  {
    drugKeywords: ["sulfamethoxazole", "sulfasalazine", "bactrim"],
    allergenKeywords: ["sulfa", "sulfonamide"],
    description: "Sulfonamide-class drug conflicts with documented sulfa allergy.",
  },
  {
    drugKeywords: ["ibuprofen", "naproxen", "aspirin", "nsaid"],
    allergenKeywords: ["nsaid", "aspirin", "ibuprofen"],
    description: "NSAID conflicts with documented NSAID/aspirin allergy.",
  },
  {
    drugKeywords: ["codeine", "morphine", "oxycodone"],
    allergenKeywords: ["opioid", "codeine", "morphine"],
    description: "Opioid conflicts with documented opioid allergy.",
  },
  {
    drugKeywords: ["cephalexin", "ceftriaxone", "cefuroxime"],
    allergenKeywords: ["cephalosporin", "penicillin"],
    description: "Cephalosporin conflicts with documented penicillin/cephalosporin allergy (cross-reactivity).",
  },
];

export interface DrugAllergyConflict {
  allergen: string;
  description: string;
}

export function checkDrugAllergyConflicts(
  drugName: string,
  allergies: { allergen: string }[]
): DrugAllergyConflict[] {
  const drugLower = drugName.toLowerCase();
  const conflicts: DrugAllergyConflict[] = [];

  for (const rule of DRUG_ALLERGY_RULES) {
    const drugMatches = rule.drugKeywords.some((kw) => drugLower.includes(kw));
    if (!drugMatches) continue;

    for (const allergy of allergies) {
      const allergenLower = allergy.allergen.toLowerCase();
      const allergenMatches = rule.allergenKeywords.some((kw) => allergenLower.includes(kw));
      if (allergenMatches) {
        conflicts.push({ allergen: allergy.allergen, description: rule.description });
      }
    }
  }

  return conflicts;
}
