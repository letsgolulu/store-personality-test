export const shopIllustrations: Record<string, string> = Object.fromEntries([
  "night-convenience", "corner-cafe", "indie-bookstore", "rainy-records",
  "weekend-florist", "concept-store", "vintage-shop", "midnight-diner",
  "seaside-grocery", "study-room", "rooftop-bar", "community-bakery",
].map(id => [id, `${import.meta.env.BASE_URL}illustrations/${id}.jpg`]));
