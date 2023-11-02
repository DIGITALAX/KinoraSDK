import { BoolLensCriteria, MetricCriteria } from "src/@types/kinora-sdk";

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

export const isValidBoolLensCriteria = (
  criteria?: BoolLensCriteria,
): boolean => {
  if (!criteria) return true; 
  const { boolValue, operator } = criteria;
  return (
    typeof boolValue === "boolean" && (operator === "or" || operator === "and")
  );
};
