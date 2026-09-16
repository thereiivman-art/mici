// Suggère la zone de prise suivante en alternant gauche/droite, pour aider à
// faire tourner les points d'injection. Reste une simple suggestion
// pré-remplie : l'utilisateur peut toujours la changer.

const SITE_PAIRS: [string, string][] = [
  ["Cuisse gauche", "Cuisse droite"],
  ["Bras gauche", "Bras droit"],
  ["Fessier gauche", "Fessier droit"],
];

export function nextInjectionSite(lastSite: string): string {
  const trimmed = lastSite.trim();
  if (!trimmed) return "";

  for (const [left, right] of SITE_PAIRS) {
    if (trimmed.toLowerCase() === left.toLowerCase()) return right;
    if (trimmed.toLowerCase() === right.toLowerCase()) return left;
  }

  // Repli pour une saisie libre ne correspondant pas exactement aux suggestions.
  if (/gauche/i.test(trimmed)) return trimmed.replace(/gauche/i, "droite");
  if (/droite?/i.test(trimmed)) return trimmed.replace(/droite?/i, "gauche");

  // Aucun indicateur gauche/droite (ex. "Ventre") : rien à alterner.
  return trimmed;
}
