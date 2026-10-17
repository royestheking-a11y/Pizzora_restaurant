import { InventoryItem } from '../context/AppContext';

/**
 * Intelligent Inventory & Menu Stock Linker
 * Resolves present month active stock and eliminates confusion from duplicate past-month entries.
 */

// Format YYYY-MM
export function getDhakaCurrentMonthStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);
}

export function getDhakaTodayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

/**
 * Normalizes product names to a clean canonical key to detect duplicates across months
 * e.g., "Water 500ml", "Kinley Water 500ml", "Water Bottle 500ml" -> "drink:water_500ml"
 */
export function normalizeProductKey(name: string = '', category: string = ''): string {
  const norm = name.toLowerCase().trim();
  const cat = category.toLowerCase().trim();

  // 1. Water
  if (norm.includes('water') || norm.includes('kinley') || norm.includes('mum') || norm.includes('aquafina')) {
    if (norm.includes('1.5') || norm.includes('1500')) return 'drink:water_1500ml';
    return 'drink:water_500ml';
  }

  // 2. Mojo & Soft Drinks
  if (norm.includes('mojo')) return 'drink:mojo';
  if (norm.includes('coca') || norm.includes('coke')) return 'drink:coca_cola';
  if (norm.includes('sprite')) return 'drink:sprite';
  if (norm.includes('fanta')) return 'drink:fanta';
  if (norm.includes('7up') || norm.includes('7 up')) return 'drink:7up';
  if (norm.includes('mountain dew') || norm.includes('dew')) return 'drink:dew';
  if (norm.includes('clemon')) return 'drink:clemon';
  if (norm.includes('speed')) return 'drink:speed';

  // 3. Packaging Boxes
  if (norm.includes('pizza') && norm.includes('box')) {
    if (norm.includes('12') || norm.includes('large')) return 'box:pizza_12';
    if (norm.includes('8') || norm.includes('small')) return 'box:pizza_8';
    return 'box:pizza_10'; // default 10-inch
  }
  if (norm.includes('burger') && (norm.includes('box') || cat.includes('packaging'))) {
    return 'box:burger';
  }
  if ((norm.includes('foil') || norm.includes('wrap')) && cat.includes('packaging')) {
    return 'box:foil';
  }

  // 4. Raw Food Materials
  if (norm.includes('mozzarella') || (norm.includes('cheese') && !norm.includes('burger'))) {
    return 'raw:mozzarella_cheese';
  }
  if (norm.includes('flour') || norm.includes('maida') || norm.includes('dough')) {
    return 'raw:pizza_flour';
  }
  if (norm.includes('chicken') && (cat.includes('raw') || cat.includes('ingredient'))) {
    return 'raw:chicken';
  }
  if (norm.includes('beef') && (cat.includes('raw') || cat.includes('ingredient'))) {
    return 'raw:beef';
  }
  if (norm.includes('sauce') && (norm.includes('pizza') || norm.includes('tomato'))) {
    return 'raw:pizza_sauce';
  }
  if (norm.includes('oil') && (norm.includes('cooking') || norm.includes('soyabean'))) {
    return 'raw:cooking_oil';
  }

  // Fallback: stripped alphanumeric
  return norm.replace(/[^a-z0-9]/g, '');
}

/**
 * Super-intelligent candidate scorer:
 * Evaluates candidates for an item and picks the TRUE active present stock,
 * ignoring older finished duplicates from past months.
 */
export function pickActivePresentItem(
  candidates: InventoryItem[],
  currentMonthStr: string = getDhakaCurrentMonthStr()
): InventoryItem | null {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const scored = candidates.map(item => {
    let score = 0;
    const itemDate = item.lastPurchasedDate || item.addedDate || '';
    const itemMonth = itemDate.slice(0, 7);
    const isThisMonth = itemMonth === currentMonthStr;
    const hasStock = (item.currentStock || 0) > 0;

    // Highest priority: Present month with active stock
    if (isThisMonth && hasStock) score += 2000;
    // Next: Any item with positive stock
    else if (hasStock) score += 1000;
    // Next: Present month item even if currently 0 (just ran out this month)
    else if (isThisMonth) score += 500;

    // Recency timestamp bonus
    if (item.updatedAt) {
      score += new Date(item.updatedAt).getTime() / 1000000000;
    } else if (itemDate) {
      score += new Date(itemDate).getTime() / 1000000000;
    }

    // Larger current stock bonus
    score += Math.min(100, item.currentStock || 0);

    return { item, score, isThisMonth, hasStock };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.item || null;
}

export interface LinkedInventoryResult {
  linkedItem: InventoryItem;
  canonicalKey: string;
  relationType: 'direct' | 'box' | 'raw_material' | 'recipe';
  relationLabel: string;
  presentStock: number;
  unit: string;
  isPresentMonth: boolean;
  stockHealth: 'healthy' | 'low' | 'out';
  archivedDuplicatesCount: number;
}

/**
 * Intelligent Linker for Product Sales & Order Intelligence:
 * Connects any Menu Product (e.g. Water, Mojo, 10" Pizza, Burger) to its
 * active Present Month stock, ignoring older finished duplicates!
 */
export function getLinkedInventoryForMenuItem(
  product: { id?: string; name: string; category?: string; recipe?: any[] },
  inventory: InventoryItem[],
  currentMonthStr: string = getDhakaCurrentMonthStr()
): LinkedInventoryResult | null {
  if (!inventory || inventory.length === 0) return null;

  const prodName = (product.name || '').trim();
  const prodNorm = prodName.toLowerCase();
  const prodCategory = (product.category || '').toLowerCase();
  const canonicalKey = normalizeProductKey(prodName, product.category);

  // 1. Check direct explicit menuItemId link
  if (product.id) {
    const directMatches = inventory.filter(i => i.menuItemId === product.id || i.id === product.id);
    if (directMatches.length > 0) {
      const active = pickActivePresentItem(directMatches, currentMonthStr);
      if (active) {
        return buildResult(active, canonicalKey, 'direct', 'Direct Product Stock', currentMonthStr, directMatches.length - 1);
      }
    }
  }

  // 2. Direct Beverage / Retail match (Water, Mojo, Soft Drinks)
  const isDrink = prodCategory.includes('drink') || prodCategory.includes('water') || prodCategory.includes('beverage') ||
                  prodNorm.includes('water') || prodNorm.includes('mojo') || prodNorm.includes('coke') || prodNorm.includes('coca') ||
                  prodNorm.includes('sprite') || prodNorm.includes('fanta') || prodNorm.includes('7up');

  if (isDrink) {
    const drinkMatches = inventory.filter(i => {
      const iKey = normalizeProductKey(i.name, i.category);
      if (iKey === canonicalKey) return true;
      const iNorm = (i.name || '').toLowerCase();
      if (prodNorm.includes('water') && iNorm.includes('water')) return true;
      if (prodNorm.includes('mojo') && iNorm.includes('mojo')) return true;
      if ((prodNorm.includes('coca') || prodNorm.includes('coke')) && (iNorm.includes('coca') || iNorm.includes('coke'))) return true;
      if (prodNorm.includes('sprite') && iNorm.includes('sprite')) return true;
      return false;
    });

    if (drinkMatches.length > 0) {
      const active = pickActivePresentItem(drinkMatches, currentMonthStr);
      if (active) {
        return buildResult(active, canonicalKey, 'direct', 'Present Month Retail Stock', currentMonthStr, drinkMatches.length - 1);
      }
    }
  }

  // 3. Packaging Box Match (Pizza -> 10" / 12" / 8" Box, Burger -> Burger Box)
  const isPizza = prodCategory.includes('pizza') || prodNorm.includes('pizza');
  const isBurger = prodCategory.includes('burger') || prodNorm.includes('burger');

  if (isPizza) {
    let sizeKey = 'box:pizza_10';
    let sizeLabel = '10" Pizza Box';
    if (prodNorm.includes('12') || prodNorm.includes('large')) {
      sizeKey = 'box:pizza_12';
      sizeLabel = '12" Pizza Box';
    } else if (prodNorm.includes('8') || prodNorm.includes('small')) {
      sizeKey = 'box:pizza_8';
      sizeLabel = '8" Pizza Box';
    }

    const boxMatches = inventory.filter(i => normalizeProductKey(i.name, i.category) === sizeKey || (
      (i.name || '').toLowerCase().includes('pizza') && (i.name || '').toLowerCase().includes('box')
    ));

    if (boxMatches.length > 0) {
      const active = pickActivePresentItem(boxMatches, currentMonthStr);
      if (active) {
        return buildResult(active, sizeKey, 'box', sizeLabel, currentMonthStr, boxMatches.length - 1);
      }
    }
  } else if (isBurger) {
    const burgerMatches = inventory.filter(i => normalizeProductKey(i.name, i.category) === 'box:burger' || (
      (i.name || '').toLowerCase().includes('burger') && (i.name || '').toLowerCase().includes('box')
    ));

    if (burgerMatches.length > 0) {
      const active = pickActivePresentItem(burgerMatches, currentMonthStr);
      if (active) {
        return buildResult(active, 'box:burger', 'box', 'Burger Packaging Box', currentMonthStr, burgerMatches.length - 1);
      }
    }
  }

  // 4. Exact / Fuzzy Name Matching in Catalog
  const exactMatches = inventory.filter(i => {
    const iName = (i.name || '').trim().toLowerCase();
    return iName === prodNorm || normalizeProductKey(i.name, i.category) === canonicalKey;
  });

  if (exactMatches.length > 0) {
    const active = pickActivePresentItem(exactMatches, currentMonthStr);
    if (active) {
      return buildResult(active, canonicalKey, 'direct', 'Present Stock', currentMonthStr, exactMatches.length - 1);
    }
  }

  return null;
}

function buildResult(
  item: InventoryItem,
  canonicalKey: string,
  relationType: 'direct' | 'box' | 'raw_material' | 'recipe',
  relationLabel: string,
  currentMonthStr: string,
  archivedDuplicatesCount: number
): LinkedInventoryResult {
  const stock = item.currentStock || 0;
  const min = item.minStock || 10;
  const itemDate = item.lastPurchasedDate || item.addedDate || '';
  const isPresentMonth = itemDate.slice(0, 7) === currentMonthStr;

  let stockHealth: 'healthy' | 'low' | 'out' = 'healthy';
  if (stock <= 0) stockHealth = 'out';
  else if (stock <= min) stockHealth = 'low';

  return {
    linkedItem: item,
    canonicalKey,
    relationType,
    relationLabel,
    presentStock: stock,
    unit: item.unit || 'Units',
    isPresentMonth,
    stockHealth,
    archivedDuplicatesCount
  };
}

/**
 * Intelligent Catalog Processor:
 * Groups items chronologically and tags duplicates so the Master Catalog table
 * displays a crystal-clear date serial:
 * This Month (Today -> Yesterday -> Oct 15 -> Oct 14...) -> Last Month -> Older Archive.
 */
export interface ProcessedInventoryItem extends InventoryItem {
  canonicalKey: string;
  isPrimaryActive: boolean;
  isStaleFinishedDuplicate: boolean;
  dateSerialGroup: 'Today' | 'Yesterday' | 'This Month' | 'Last Month' | 'Older';
  effectiveDate: string;
  daysAgo: number;
}

export function processInventoryForMasterCatalog(
  items: InventoryItem[],
  currentMonthStr: string = getDhakaCurrentMonthStr(),
  todayStr: string = getDhakaTodayStr()
): {
  processedItems: ProcessedInventoryItem[];
  activePresentItems: ProcessedInventoryItem[];
  duplicatesDetectedCount: number;
} {
  if (!items || items.length === 0) {
    return { processedItems: [], activePresentItems: [], duplicatesDetectedCount: 0 };
  }

  // 1. Group by canonical product key to detect duplicates
  const grouped = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const key = normalizeProductKey(item.name, item.category);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  // 2. Identify the active primary item for each group
  const activeIds = new Set<string>();
  let duplicatesCount = 0;

  for (const [, candidates] of grouped.entries()) {
    if (candidates.length > 1) {
      duplicatesCount += (candidates.length - 1);
    }
    const primary = pickActivePresentItem(candidates, currentMonthStr);
    if (primary) {
      activeIds.add(primary.id);
    }
  }

  // 3. Enrich items with date serial metadata
  const now = new Date(todayStr + 'T00:00:00Z').getTime();
  const lastMonthStr = (() => {
    const [y, m] = currentMonthStr.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1));
    return prev.toISOString().slice(0, 7);
  })();

  const processed: ProcessedInventoryItem[] = items.map(item => {
    const canonicalKey = normalizeProductKey(item.name, item.category);
    const effectiveDate = item.lastPurchasedDate || item.addedDate || todayStr;
    const itemMonth = effectiveDate.slice(0, 7);

    const itemTime = new Date(effectiveDate + 'T00:00:00Z').getTime();
    const diffDays = Math.max(0, Math.round((now - itemTime) / (1000 * 60 * 60 * 24)));

    let dateSerialGroup: 'Today' | 'Yesterday' | 'This Month' | 'Last Month' | 'Older' = 'Older';
    if (effectiveDate === todayStr) {
      dateSerialGroup = 'Today';
    } else if (diffDays === 1) {
      dateSerialGroup = 'Yesterday';
    } else if (itemMonth === currentMonthStr) {
      dateSerialGroup = 'This Month';
    } else if (itemMonth === lastMonthStr) {
      dateSerialGroup = 'Last Month';
    }

    const isPrimaryActive = activeIds.has(item.id);
    const isStaleFinishedDuplicate = !isPrimaryActive && (item.currentStock || 0) <= 0;

    return {
      ...item,
      canonicalKey,
      isPrimaryActive,
      isStaleFinishedDuplicate,
      dateSerialGroup,
      effectiveDate,
      daysAgo: diffDays,
    };
  });

  const activePresentItems = processed.filter(i => i.isPrimaryActive);

  return {
    processedItems: processed,
    activePresentItems,
    duplicatesDetectedCount: duplicatesCount
  };
}
