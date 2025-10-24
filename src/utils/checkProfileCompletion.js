// utils/checkProfileCompletion.js
export function isProfileIncomplete(profile) {
  if (!profile) return true;
  const requiredFields = ["username", "college", "branch", "year"];
  return requiredFields.some(field => !profile[field] || profile[field].trim() === "");
}
