import type { ParsedFoodItem } from './types';
import { toArabicDigits } from './constants';

/**
 * Mock NLP food parser.
 * Recognizes common bodybuilding foods in Arabic/English with quantity detection.
 * Returns per-item macros + electrolytes (sodium, potassium in mg).
 */

interface FoodProfile {
  // canonical Arabic name
  name: string;
  // keywords that match this food (Arabic + English, normalized)
  keywords: string[];
  // macros per 100g (cooked/edible)
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    sodium: number;
    potassium: number;
  };
  // default serving in grams when no quantity is given
  defaultG: number;
}

const FOOD_DB: FoodProfile[] = [
  {
    name: 'صدور فراخ مشوية',
    keywords: ['فراخ', 'دجاج', 'صدور', 'صدر', 'chicken', 'breast', 'فرخة'],
    per100g: { calories: 165, protein: 31, carbs: 0, fats: 3.6, sodium: 74, potassium: 256 },
    defaultG: 200,
  },
  {
    name: 'صدور فراخ مستوية',
    keywords: ['مستوية', 'مستوي', 'مشوية'],
    per100g: { calories: 165, protein: 31, carbs: 0, fats: 3.6, sodium: 74, potassium: 256 },
    defaultG: 200,
  },
  {
    name: 'لحم بقري هبرة',
    keywords: ['لحم', 'بقري', 'هبرة', 'ستيك', 'beef', 'steak'],
    per100g: { calories: 217, protein: 26, carbs: 0, fats: 12, sodium: 64, potassium: 318 },
    defaultG: 150,
  },
  {
    name: 'سمك سلمون',
    keywords: ['سمك', 'سلمون', 'تونة', 'salmon', 'tuna', 'fish'],
    per100g: { calories: 208, protein: 20, carbs: 0, fats: 13, sodium: 59, potassium: 363 },
    defaultG: 150,
  },
  {
    name: 'بيض كامل',
    keywords: ['بيض', 'بيضة', 'egg', 'eggs', 'omelette', 'أومليت'],
    per100g: { calories: 155, protein: 13, carbs: 1.1, fats: 11, sodium: 124, potassium: 126 },
    defaultG: 60,
  },
  {
    name: 'بياض البيض',
    keywords: ['بياض', 'eggwhite', 'egg white', 'whites'],
    per100g: { calories: 52, protein: 11, carbs: 0.7, fats: 0.2, sodium: 166, potassium: 163 },
    defaultG: 100,
  },
  {
    name: 'أرز أبيض مسلوق',
    keywords: ['رز', 'أرز', 'rice', 'مسلوق'],
    per100g: { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, sodium: 1, potassium: 35 },
    defaultG: 150,
  },
  {
    name: 'شوفان',
    keywords: ['شوفان', 'oats', 'oatmeal'],
    per100g: { calories: 389, protein: 16.9, carbs: 66, fats: 6.9, sodium: 2, potassium: 429 },
    defaultG: 50,
  },
  {
    name: 'بطاطا حلوة',
    keywords: ['بطاطا', 'بطاطا حلوة', 'sweet potato', 'potato'],
    per100g: { calories: 86, protein: 1.6, carbs: 20, fats: 0.1, sodium: 55, potassium: 337 },
    defaultG: 200,
  },
  {
    name: 'بروكلي',
    keywords: ['بروكلي', 'broccoli'],
    per100g: { calories: 34, protein: 2.8, carbs: 7, fats: 0.4, sodium: 33, potassium: 316 },
    defaultG: 150,
  },
  {
    name: 'سبانخ',
    keywords: ['سبانخ', 'spinach'],
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, sodium: 79, potassium: 558 },
    defaultG: 100,
  },
  {
    name: 'سلطة خضراء',
    keywords: ['سلطة', 'salad'],
    per100g: { calories: 20, protein: 1.5, carbs: 3, fats: 0.2, sodium: 28, potassium: 230 },
    defaultG: 150,
  },
  {
    name: 'زيت زيتون',
    keywords: ['زيت', 'زيت زيتون', 'olive oil', 'oil'],
    per100g: { calories: 884, protein: 0, carbs: 0, fats: 100, sodium: 2, potassium: 1 },
    defaultG: 10,
  },
  {
    name: 'أفوكادو',
    keywords: ['أفوكادو', 'avocado'],
    per100g: { calories: 160, protein: 2, carbs: 9, fats: 15, sodium: 7, potassium: 485 },
    defaultG: 100,
  },
  {
    name: 'موز',
    keywords: ['موز', 'banana'],
    per100g: { calories: 89, protein: 1.1, carbs: 23, fats: 0.3, sodium: 1, potassium: 358 },
    defaultG: 120,
  },
  {
    name: 'تفاح',
    keywords: ['تفاح', 'apple'],
    per100g: { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, sodium: 1, potassium: 107 },
    defaultG: 150,
  },
  {
    name: 'لبن يوناني',
    keywords: ['لبن', 'يوناني', 'زبادي', 'yogurt', 'greek'],
    per100g: { calories: 59, protein: 10, carbs: 3.6, fats: 0.4, sodium: 36, potassium: 141 },
    defaultG: 150,
  },
  {
    name: 'جبن قريش',
    keywords: ['جبن', 'قريش', 'cottage cheese', 'cheese'],
    per100g: { calories: 98, protein: 11, carbs: 3.4, fats: 4.3, sodium: 364, potassium: 104 },
    defaultG: 100,
  },
  {
    name: 'لحم ديك رومي',
    keywords: ['ديك رومي', 'turkey'],
    per100g: { calories: 135, protein: 30, carbs: 0, fats: 1, sodium: 105, potassium: 280 },
    defaultG: 120,
  },
  {
    name: 'أرز بسمتي',
    keywords: ['بسمتي', 'basmati'],
    per100g: { calories: 121, protein: 2.5, carbs: 25, fats: 0.4, sodium: 1, potassium: 32 },
    defaultG: 150,
  },
  {
    name: 'خبز',
    keywords: ['خبز', 'عيش', 'bread'],
    per100g: { calories: 265, protein: 9, carbs: 49, fats: 3.2, sodium: 491, potassium: 115 },
    defaultG: 60,
  },
  {
    name: 'مكسرات',
    keywords: ['مكسرات', 'لوز', 'جوز', 'nuts', 'almonds'],
    per100g: { calories: 579, protein: 21, carbs: 22, fats: 50, sodium: 1, potassium: 733 },
    defaultG: 30,
  },
  {
    name: 'كرياتين',
    keywords: ['كرياتين', 'creatine'],
    per100g: { calories: 0, protein: 0, carbs: 0, fats: 0, sodium: 0, potassium: 0 },
    defaultG: 5,
  },
  {
    name: 'واي بروتين',
    keywords: ['بروتين', 'واي', 'whey', 'protein shake'],
    per100g: { calories: 400, protein: 80, carbs: 8, fats: 6, sodium: 200, potassium: 150 },
    defaultG: 30,
  },
];

function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652]/g, '') // strip harakat
    .replace(/\u0629/g, '\u0647') // taa marbuta -> haa
    .replace(/\u0623|\u0625|\u0622/g, '\u0627') // alef variants -> alef
    .replace(/\u0649/g, '\u064a') // alef maqsura -> yaa
    .toLowerCase()
    .trim();
}

function parseQuantity(text: string): number | null {
  // Convert Arabic-Indic digits to Latin
  const latin = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  // Match patterns like "200 جرام", "200g", "200 غرام", "200 جم"
  const gMatch = latin.match(/(\d+(?:\.\d+)?)\s*(?:جرام|غرام|جم|g|gm|gram|grams|غ)/);
  if (gMatch) return parseFloat(gMatch[1]);
  // Match "عدد ٣ بيض" or "3 بيضات" or "2 حبة"
  const countMatch = latin.match(/(\d+(?:\.\d+)?)\s*(?:حبة|قطعة|عدد|وحدة|piece|pcs|pieces|x)?/);
  if (countMatch) return parseFloat(countMatch[1]);
  return null;
}

function findFood(text: string): FoodProfile | null {
  const normalized = normalizeArabic(text);
  // Find the food whose keyword appears in the text. Prefer longer keyword matches.
  let best: FoodProfile | null = null;
  let bestScore = 0;
  for (const food of FOOD_DB) {
    for (const kw of food.keywords) {
      const nkw = normalizeArabic(kw);
      if (normalized.includes(nkw)) {
        const score = nkw.length;
        if (score > bestScore) {
          bestScore = score;
          best = food;
        }
      }
    }
  }
  return best;
}

function splitIntoItems(text: string): string[] {
  // Split on common separators: " و ", "،", ",", "+", newlines, "ثم"
  return text
    .split(/\s+و\s+|،|,|\+|\n|ثم|؛|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseFoodText(text: string): ParsedFoodItem[] {
  if (!text.trim()) return [];
  const items = splitIntoItems(text);
  const results: ParsedFoodItem[] = [];

  for (const item of items) {
    const food = findFood(item);
    if (!food) continue;
    const qty = parseQuantity(item) ?? food.defaultG;
    const factor = qty / 100;
    results.push({
      name: food.name,
      qty_g: qty,
      calories: Math.round(food.per100g.calories * factor),
      protein: Math.round(food.per100g.protein * factor * 10) / 10,
      carbs: Math.round(food.per100g.carbs * factor * 10) / 10,
      fats: Math.round(food.per100g.fats * factor * 10) / 10,
      sodium: Math.round(food.per100g.sodium * factor),
      potassium: Math.round(food.per100g.potassium * factor),
    });
  }

  return results;
}

export function aggregateItems(items: ParsedFoodItem[]) {
  return items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: Math.round((acc.protein + i.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + i.carbs) * 10) / 10,
      fats: Math.round((acc.fats + i.fats) * 10) / 10,
      sodium: acc.sodium + i.sodium,
      potassium: acc.potassium + i.potassium,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, sodium: 0, potassium: 0 },
  );
}

export function formatGrams(v: number): string {
  return `${toArabicDigits(v)} جم`;
}
