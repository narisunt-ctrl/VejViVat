import { CurrentMedication } from '../types/patient';
import { HerbDrugInteraction, MatchedInteractionResult } from '../types/hdi';
import interactionsData from '../../data/hdi/herb-drug-interactions.json';
import { medplantScreeningRules } from '../domain/medplant';

const ALL_INTERACTIONS: HerbDrugInteraction[] = interactionsData as HerbDrugInteraction[];
// The project's reviewed table first, then moderate/high cautions imported from the medplant database (Mahidol)
// for pairs the table does not cover; imported rules carry source_db 'MEDPLANT' and a link to the article.
const SCREENING_RULES: HerbDrugInteraction[] = [...ALL_INTERACTIONS, ...medplantScreeningRules(ALL_INTERACTIONS)];

export function checkHerbDrugInteractions(
  activeMeds: CurrentMedication[],
  herbCodeOrName: string,
  herbThaiName?: string
): MatchedInteractionResult[] {
  if (!activeMeds || activeMeds.length === 0 || !herbCodeOrName) {
    return [];
  }

  const queryHerb = (herbThaiName || herbCodeOrName).toLowerCase().trim();
  const matchedList: MatchedInteractionResult[] = [];

  for (const convDrug of activeMeds) {
    const drugName = convDrug.generic_name.toLowerCase();
    const drugId = convDrug.drug_id.toLowerCase();

    for (const rule of SCREENING_RULES) {
      // 1. Check if conventional drug matches
      const ruleDrugName = rule.drug_generic_name.toLowerCase();
      const ruleDrugId = rule.drug_id.toLowerCase();
      const isDrugMatch = drugName.includes(ruleDrugName) || ruleDrugName.includes(drugName) || drugId === ruleDrugId;

      if (!isDrugMatch) continue;

      // 2. Check if herb matches (either 24-digit code or Thai name or generic name)
      const ruleHerbThai = rule.herb_thai_name.toLowerCase();
      const ruleHerbCode = rule.herb_code_24;
      const ruleHerbGen = rule.herb_generic_name.toLowerCase();

      const isHerbMatch =
        queryHerb.includes(ruleHerbThai) ||
        ruleHerbThai.includes(queryHerb) ||
        herbCodeOrName.includes(ruleHerbCode) ||
        queryHerb.includes(ruleHerbGen);

      if (isHerbMatch) {
        matchedList.push({
          interaction: rule,
          herb_name: rule.herb_thai_name,
          drug_name: convDrug.generic_name,
          patient_active_dose: `${convDrug.strength_mg} mg (${convDrug.timing})`,
        });
      }
    }
  }

  // Remove duplicate interaction IDs if any
  const uniqueMatched = matchedList.filter(
    (item, index, self) => index === self.findIndex((t) => t.interaction.interaction_id === item.interaction.interaction_id)
  );

  return uniqueMatched;
}

export function getAllInteractionsDatabase(): HerbDrugInteraction[] {
  return ALL_INTERACTIONS;
}

/** Rules used for screening: the project table plus imported medplant cautions */
export function getScreeningRules(): HerbDrugInteraction[] {
  return SCREENING_RULES;
}
