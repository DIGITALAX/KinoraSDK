import { BoolLensCriteria, MetricCriteria } from "src/@types/kinora-sdk";

/**
 * Validates a MetricCriteria object to ensure it contains valid values.
 * A valid MetricCriteria object should have both minValue and maxValue as numbers,
 * an operator of either 'or' or 'and', and minValue should not exceed maxValue.
 *
 * @param criteria - (Optional) The MetricCriteria object to validate. If omitted, the function returns true.
 * @returns A boolean indicating whether the provided MetricCriteria object is valid.
 */
export const isValidMetricCriteria = (criteria?: MetricCriteria): boolean => {
  if (!criteria) return true;
  const { minValue, maxValue, operator } = criteria;
  return (
    typeof minValue === "number" &&
    typeof maxValue === "number" &&
    (operator === "or" || operator === "and") &&
    minValue <= maxValue
  );
};

/**
 * Validates a BoolLensCriteria object to ensure it contains valid values.
 * A valid BoolLensCriteria object should have a boolValue of boolean type,
 * and an operator of either 'or' or 'and'.
 *
 * @param criteria - (Optional) The BoolLensCriteria object to validate. If omitted, the function returns true.
 * @returns A boolean indicating whether the provided BoolLensCriteria object is valid.
 */
export const isValidBoolLensCriteria = (
  criteria?: BoolLensCriteria,
): boolean => {
  if (!criteria) return true;
  const { boolValue, operator } = criteria;
  return (
    typeof boolValue === "boolean" && (operator === "or" || operator === "and")
  );
};
