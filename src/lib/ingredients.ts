import type { Ingredient } from "./types";

/**
 * Ingredient catalog. Recipes reference these keys, and store offers are
 * matched to them by keyword. `basePrice` is a rough regular shelf price
 * (SEK per kg / l / piece) used when no current offer matches.
 */
export const INGREDIENTS: Ingredient[] = [
  // Meat
  { key: "kycklingfile", name: "Kycklingfilé", nameEn: "Chicken breast", unit: "g", kcal: 110, basePrice: 129, keywords: ["kycklingfilé", "kycklingfile", "kycklingbröst"], exclude: ["pålägg", "skivad", "rökt", "lårfilé"], vegetarian: false, category: "meat" },
  { key: "kycklinglarfile", name: "Kycklinglårfilé", nameEn: "Chicken thigh fillet", unit: "g", kcal: 170, basePrice: 119, keywords: ["lårfilé", "kycklinglår"], exclude: ["klubb"], vegetarian: false, category: "meat" },
  { key: "kycklingklubba", name: "Kycklingklubbor", nameEn: "Chicken drumsticks", unit: "g", kcal: 180, basePrice: 59, keywords: ["kycklingklubb", "kycklingben", "kycklingdrumstick"], vegetarian: false, category: "meat" },
  { key: "notfars", name: "Nötfärs", nameEn: "Ground beef", unit: "g", kcal: 230, basePrice: 119, keywords: ["nötfärs"], exclude: ["vego"], vegetarian: false, category: "meat" },
  { key: "blandfars", name: "Blandfärs", nameEn: "Mixed ground meat", unit: "g", kcal: 240, basePrice: 99, keywords: ["blandfärs"], exclude: ["vego"], vegetarian: false, category: "meat" },
  { key: "flaskfile", name: "Fläskfilé", nameEn: "Pork tenderloin", unit: "g", kcal: 140, basePrice: 139, keywords: ["fläskfilé"], vegetarian: false, category: "meat" },
  { key: "flaskkotlett", name: "Fläskkotlett", nameEn: "Pork chops", unit: "g", kcal: 200, basePrice: 89, keywords: ["kotlett"], vegetarian: false, category: "meat" },
  { key: "bacon", name: "Bacon", nameEn: "Bacon", unit: "g", kcal: 400, basePrice: 129, keywords: ["bacon"], exclude: ["chips", "vego"], vegetarian: false, category: "meat" },
  { key: "falukorv", name: "Falukorv", nameEn: "Falu sausage", unit: "g", kcal: 240, basePrice: 59, keywords: ["falukorv"], exclude: ["vego"], vegetarian: false, category: "meat" },

  // Fish
  { key: "laxfile", name: "Laxfilé", nameEn: "Salmon fillet", unit: "g", kcal: 200, basePrice: 229, keywords: ["laxfilé", "laxfile", "lax portion", "laxportion"], exclude: ["rökt", "gravad", "kallrökt", "varmrökt"], vegetarian: false, category: "fish" },
  { key: "torsk", name: "Torskfilé", nameEn: "Cod fillet", unit: "g", kcal: 80, basePrice: 169, keywords: ["torsk", "sej", "alaska pollock", "fiskfilé"], exclude: ["panerad", "rom"], vegetarian: false, category: "fish" },
  { key: "rakor", name: "Räkor (skalade)", nameEn: "Peeled shrimp", unit: "g", kcal: 70, basePrice: 199, keywords: ["räkor", "skalade räkor"], exclude: ["chips", "sallad"], vegetarian: false, category: "fish" },
  { key: "tonfisk", name: "Tonfisk på burk", nameEn: "Canned tuna", unit: "g", kcal: 110, basePrice: 89, keywords: ["tonfisk"], vegetarian: false, category: "fish" },

  // Vegetarian proteins
  { key: "agg", name: "Ägg", nameEn: "Eggs", unit: "st", kcal: 75, basePrice: 3.5, pieceGrams: 60, keywords: ["ägg"], exclude: ["pålägg", "äggnudlar", "äggröra", "påskägg", "chokladägg", "äggpasta"], vegetarian: true, category: "protein-veg" },
  { key: "halloumi", name: "Halloumi", nameEn: "Halloumi", unit: "g", kcal: 320, basePrice: 199, keywords: ["halloumi", "grillost"], vegetarian: true, category: "protein-veg" },
  { key: "tofu", name: "Tofu", nameEn: "Tofu", unit: "g", kcal: 140, basePrice: 79, keywords: ["tofu"], vegetarian: true, category: "protein-veg" },
  { key: "kikartor", name: "Kikärtor (kokta)", nameEn: "Chickpeas (cooked)", unit: "g", kcal: 120, basePrice: 30, keywords: ["kikärt"], vegetarian: true, category: "canned" },
  { key: "linser", name: "Röda linser", nameEn: "Red lentils (dry)", unit: "g", kcal: 340, basePrice: 45, keywords: ["röda linser", "linser"], exclude: ["kokta"], vegetarian: true, category: "carbs" },
  { key: "bonor", name: "Bönor (kokta)", nameEn: "Beans (cooked)", unit: "g", kcal: 110, basePrice: 30, keywords: ["kidneybönor", "vita bönor", "svarta bönor", "bönmix", "bönor"], exclude: ["gröna bönor", "haricots", "kaffebönor", "sojabönor"], vegetarian: true, category: "canned" },
  { key: "vegofars", name: "Vegofärs", nameEn: "Plant-based mince", unit: "g", kcal: 200, basePrice: 119, keywords: ["vegofärs", "sojafärs", "vegetarisk färs", "växtbaserad färs"], vegetarian: true, category: "protein-veg" },

  // Dairy
  { key: "mjolk", name: "Mjölk", nameEn: "Milk", unit: "ml", kcal: 46, basePrice: 14, keywords: ["mellanmjölk", "standardmjölk", "lättmjölk", "mjölk"], exclude: ["choklad", "havre", "kokos", "laktosfri gräddfil", "mjölkchoklad", "pulver"], vegetarian: true, category: "dairy" },
  { key: "gradde", name: "Matlagningsgrädde", nameEn: "Cooking cream", unit: "ml", kcal: 150, basePrice: 45, keywords: ["matlagningsgrädde", "matgrädde", "vispgrädde", "grädde"], exclude: ["gräddfil", "glass", "havre", "kokos", "spray"], vegetarian: true, category: "dairy" },
  { key: "creme_fraiche", name: "Crème fraiche", nameEn: "Crème fraîche", unit: "g", kcal: 170, basePrice: 60, keywords: ["crème fraiche", "creme fraiche", "gräddfil"], vegetarian: true, category: "dairy" },
  { key: "ost", name: "Hårdost (riven)", nameEn: "Hard cheese (grated)", unit: "g", kcal: 380, basePrice: 110, keywords: ["riven ost", "hushållsost", "präst", "grevé", "herrgård", "cheddar", "parmesan", "ost "], exclude: ["ostkaka", "skivad ost", "kvarg", "keso", "färskost", "halloumi", "feta", "mozzarella"], vegetarian: true, category: "dairy" },
  { key: "fetaost", name: "Fetaost", nameEn: "Feta cheese", unit: "g", kcal: 270, basePrice: 130, keywords: ["feta", "salladsost", "vitost"], vegetarian: true, category: "dairy" },
  { key: "mozzarella", name: "Mozzarella", nameEn: "Mozzarella", unit: "g", kcal: 250, basePrice: 110, keywords: ["mozzarella"], vegetarian: true, category: "dairy" },
  { key: "smor", name: "Smör", nameEn: "Butter", unit: "g", kcal: 740, basePrice: 110, keywords: ["smör", "bregott"], exclude: ["jordnöt", "nötsmör"], vegetarian: true, category: "dairy" },
  { key: "yoghurt", name: "Turkisk yoghurt", nameEn: "Greek-style yoghurt", unit: "g", kcal: 100, basePrice: 40, keywords: ["turkisk yoghurt", "grekisk yoghurt", "matlagningsyoghurt", "naturell yoghurt"], vegetarian: true, category: "dairy" },
  { key: "kokosmjolk", name: "Kokosmjölk", nameEn: "Coconut milk", unit: "ml", kcal: 180, basePrice: 40, keywords: ["kokosmjölk", "kokosgrädde"], vegetarian: true, category: "canned" },

  // Carbs
  { key: "pasta", name: "Pasta", nameEn: "Pasta (dry)", unit: "g", kcal: 360, basePrice: 25, keywords: ["spaghetti", "penne", "fusilli", "makaroner", "pasta", "tagliatelle", "rigatoni"], exclude: ["sås", "pastasås", "färsk pasta", "sallad"], vegetarian: true, category: "carbs" },
  { key: "ris", name: "Ris", nameEn: "Rice (dry)", unit: "g", kcal: 350, basePrice: 30, keywords: ["jasminris", "basmatiris", "långkornigt ris", "ris "], exclude: ["riskakor", "risgryn", "risnudlar", "rismjölk", "kokt ris"], vegetarian: true, category: "carbs" },
  { key: "potatis", name: "Potatis", nameEn: "Potatoes", unit: "g", kcal: 75, basePrice: 15, keywords: ["potatis"], exclude: ["sötpotatis", "chips", "mos", "pommes", "klyftor", "gratäng"], vegetarian: true, category: "carbs" },
  { key: "sotpotatis", name: "Sötpotatis", nameEn: "Sweet potato", unit: "g", kcal: 86, basePrice: 30, keywords: ["sötpotatis"], exclude: ["pommes", "chips"], vegetarian: true, category: "carbs" },
  { key: "nudlar", name: "Äggnudlar", nameEn: "Egg noodles (dry)", unit: "g", kcal: 370, basePrice: 50, keywords: ["nudlar", "äggnudlar", "woknudlar"], exclude: ["snabbnudlar", "kopp"], vegetarian: true, category: "carbs" },
  { key: "couscous", name: "Couscous", nameEn: "Couscous (dry)", unit: "g", kcal: 360, basePrice: 40, keywords: ["couscous", "bulgur"], vegetarian: true, category: "carbs" },
  { key: "tortilla", name: "Tortillabröd", nameEn: "Tortillas", unit: "st", kcal: 150, basePrice: 3, pieceGrams: 40, keywords: ["tortilla", "wraps"], exclude: ["chips"], vegetarian: true, category: "carbs" },
  { key: "hamburgerbrod", name: "Hamburgerbröd", nameEn: "Burger buns", unit: "st", kcal: 180, basePrice: 5, pieceGrams: 60, keywords: ["hamburgerbröd", "briochebröd", "burgerbröd"], vegetarian: true, category: "carbs" },

  // Vegetables & fruit
  { key: "lok", name: "Gul lök", nameEn: "Onion", unit: "g", kcal: 40, basePrice: 18, keywords: ["gul lök", "lök "], exclude: ["rödlök", "purjo", "vitlök", "salladslök", "stekt lök", "lökpulver"], vegetarian: true, category: "vegetables" },
  { key: "vitlok", name: "Vitlök", nameEn: "Garlic", unit: "g", kcal: 130, basePrice: 80, keywords: ["vitlök"], exclude: ["dressing", "sås", "baguette"], pantry: true, vegetarian: true, category: "vegetables" },
  { key: "morot", name: "Morötter", nameEn: "Carrots", unit: "g", kcal: 40, basePrice: 15, keywords: ["morot", "morötter"], vegetarian: true, category: "vegetables" },
  { key: "paprika", name: "Paprika", nameEn: "Bell pepper", unit: "g", kcal: 30, basePrice: 45, keywords: ["paprika"], exclude: ["pulver", "chips", "krydda"], vegetarian: true, category: "vegetables" },
  { key: "broccoli", name: "Broccoli", nameEn: "Broccoli", unit: "g", kcal: 35, basePrice: 40, keywords: ["broccoli"], vegetarian: true, category: "vegetables" },
  { key: "blomkal", name: "Blomkål", nameEn: "Cauliflower", unit: "g", kcal: 25, basePrice: 35, keywords: ["blomkål"], vegetarian: true, category: "vegetables" },
  { key: "zucchini", name: "Zucchini", nameEn: "Courgette", unit: "g", kcal: 17, basePrice: 35, keywords: ["zucchini", "squash"], vegetarian: true, category: "vegetables" },
  { key: "tomat", name: "Tomater", nameEn: "Tomatoes", unit: "g", kcal: 18, basePrice: 40, keywords: ["tomat", "körsbärstomat", "kvisttomat"], exclude: ["krossade", "passerade", "puré", "ketchup", "soltorkade", "sås", "burk"], vegetarian: true, category: "vegetables" },
  { key: "gurka", name: "Gurka", nameEn: "Cucumber", unit: "g", kcal: 12, basePrice: 30, keywords: ["gurka"], exclude: ["inlagd", "saltgurka", "smörgåsgurka"], vegetarian: true, category: "vegetables" },
  { key: "sallad", name: "Sallad", nameEn: "Lettuce", unit: "g", kcal: 14, basePrice: 40, keywords: ["isbergssallad", "romansallad", "sallad"], exclude: ["dressing", "pasta", "potatis", "färdig", "kyckling", "räk"], vegetarian: true, category: "vegetables" },
  { key: "spenat", name: "Spenat", nameEn: "Spinach", unit: "g", kcal: 23, basePrice: 50, keywords: ["spenat", "bladspenat"], exclude: ["soppa", "pizza"], vegetarian: true, category: "vegetables" },
  { key: "champinjoner", name: "Champinjoner", nameEn: "Mushrooms", unit: "g", kcal: 22, basePrice: 60, keywords: ["champinjon", "svamp"], exclude: ["sås", "soppa", "pizza"], vegetarian: true, category: "vegetables" },
  { key: "arter", name: "Gröna ärtor (frysta)", nameEn: "Green peas (frozen)", unit: "g", kcal: 80, basePrice: 30, keywords: ["gröna ärtor", "ärtor"], exclude: ["kikärt", "ärtsoppa", "sockerärt"], vegetarian: true, category: "vegetables" },
  { key: "majs", name: "Majs", nameEn: "Sweetcorn", unit: "g", kcal: 90, basePrice: 40, keywords: ["majs"], exclude: ["popcorn", "majskakor", "majsstärkelse", "chips", "tortilla"], vegetarian: true, category: "canned" },
  { key: "avokado", name: "Avokado", nameEn: "Avocado", unit: "st", kcal: 160, basePrice: 10, pieceGrams: 170, keywords: ["avokado"], exclude: ["guacamole", "olja"], vegetarian: true, category: "vegetables" },
  { key: "citron", name: "Citron", nameEn: "Lemon", unit: "st", kcal: 20, basePrice: 5, pieceGrams: 120, keywords: ["citron"], exclude: ["juice", "saft", "dryck", "läsk", "citronpeppar"], vegetarian: true, category: "vegetables" },

  // Canned & sauces
  { key: "krossade_tomater", name: "Krossade tomater", nameEn: "Crushed tomatoes", unit: "g", kcal: 25, basePrice: 25, keywords: ["krossade tomater", "passerade tomater", "tomatpassata", "passata"], vegetarian: true, category: "canned" },
  { key: "tomatpure", name: "Tomatpuré", nameEn: "Tomato paste", unit: "g", kcal: 90, basePrice: 60, keywords: ["tomatpuré", "tomatpure"], vegetarian: true, category: "canned" },
  { key: "pesto", name: "Pesto", nameEn: "Pesto", unit: "g", kcal: 450, basePrice: 150, keywords: ["pesto"], vegetarian: true, category: "canned" },
  { key: "tacosas", name: "Tacosås", nameEn: "Taco sauce", unit: "g", kcal: 40, basePrice: 60, keywords: ["tacosås", "salsa"], vegetarian: true, category: "canned" },

  // Pantry staples
  { key: "olja", name: "Olja", nameEn: "Cooking oil", unit: "ml", kcal: 820, basePrice: 40, keywords: ["rapsolja", "olivolja", "matolja"], pantry: true, vegetarian: true, category: "pantry" },
  { key: "buljong", name: "Buljongtärning", nameEn: "Stock cube", unit: "st", kcal: 10, basePrice: 2, keywords: ["buljong", "fond"], pantry: true, vegetarian: true, category: "pantry" },
  { key: "soja", name: "Japansk soja", nameEn: "Soy sauce", unit: "ml", kcal: 60, basePrice: 60, keywords: ["soja", "soyasås"], exclude: ["sojafärs", "sojabönor", "sojadryck"], pantry: true, vegetarian: true, category: "pantry" },
  { key: "curry", name: "Curry / currypasta", nameEn: "Curry powder or paste", unit: "g", kcal: 325, basePrice: 250, keywords: ["curry"], exclude: ["ketchup"], pantry: true, vegetarian: true, category: "pantry" },
  { key: "tacokrydda", name: "Tacokrydda", nameEn: "Taco seasoning", unit: "g", kcal: 300, basePrice: 250, keywords: ["tacokrydda", "taco spice"], pantry: true, vegetarian: true, category: "pantry" },
];

export const INGREDIENT_KEYS = INGREDIENTS.map((i) => i.key) as [string, ...string[]];

const BY_KEY = new Map(INGREDIENTS.map((i) => [i.key, i]));

export function getIngredient(key: string): Ingredient {
  const ingredient = BY_KEY.get(key);
  if (!ingredient) throw new Error(`Unknown ingredient: ${key}`);
  return ingredient;
}

export function hasIngredient(key: string): boolean {
  return BY_KEY.has(key);
}
