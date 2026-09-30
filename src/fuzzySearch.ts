import { Shop } from './types';

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    const c1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const c2 = s2.charCodeAt(j - 1);
      const cost = c1 === c2 ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Normalizes string by:
 * - Converting to lowercase
 * - Stripping dots, periods, commas, apostrophes, hyphens, and other punctuation
 * - Collapsing multiple spaces
 */
export function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[.\-_,'"/\\:;()&+[\]{}|`~?!@#$%^*<>]/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Strips all spaces, dots, and non-alphanumerics into a single contiguous string
 * e.g. "M.R" -> "mr", "M. R." -> "mr", "Star-Tech" -> "startech"
 */
export function compactAlphanumeric(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if token matches target word tolerating 1-2 typos
 */
function tokenMatchesWord(queryToken: string, targetWord: string): { matches: boolean; score: number } {
  if (!queryToken || !targetWord) return { matches: false, score: 0 };

  // Exact match
  if (targetWord === queryToken) {
    return { matches: true, score: 100 };
  }

  // Prefix match
  if (targetWord.startsWith(queryToken)) {
    return { matches: true, score: 85 + Math.min(10, queryToken.length * 2) };
  }

  // Substring match
  if (targetWord.includes(queryToken)) {
    return { matches: true, score: 75 };
  }

  // Levenshtein typo tolerance based on length
  const qLen = queryToken.length;
  const tLen = targetWord.length;

  // If query is short (<= 3 chars), allow at most 1 typo
  // If query is 4+ chars, allow up to 2 typos
  const maxAllowedDistance = qLen <= 3 ? 1 : 2;

  // Fast check: length difference cannot exceed allowed distance
  if (Math.abs(qLen - tLen) > maxAllowedDistance + 1) {
    if (tLen > qLen) {
      let bestSubDist = 999;
      for (let i = 0; i <= tLen - qLen; i++) {
        const sub = targetWord.substring(i, i + qLen);
        const dist = levenshteinDistance(queryToken, sub);
        if (dist < bestSubDist) bestSubDist = dist;
      }
      if (bestSubDist <= maxAllowedDistance) {
        return { matches: true, score: 70 - bestSubDist * 15 };
      }
    }
    return { matches: false, score: 0 };
  }

  const dist = levenshteinDistance(queryToken, targetWord);
  if (dist <= maxAllowedDistance) {
    return { matches: true, score: 80 - dist * 20 };
  }

  return { matches: false, score: 0 };
}

export interface SearchResult {
  shop: Shop;
  score: number;
}

/**
 * Performs fuzzy search on shops across:
 * - Shop Name
 * - Shop Number
 * - Level/Floor
 * - Phone Number
 * 
 * Case-insensitive, punctuation-insensitive (e.g. "M.R" or "M.R." matches "mr" and vice versa)
 * Supports multi-token out-of-order queries (e.g. "world computer" matches "Computer World")
 * Tolerates 1-2 typos (e.g. "computr", "compter")
 */
export function fuzzySearchShops(shops: Shop[], query: string): Shop[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) return shops;

  const normalizedQuery = normalize(cleanQuery);
  const compactQuery = compactAlphanumeric(cleanQuery);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  if (queryTokens.length === 0 && !compactQuery) return shops;

  const scoredResults: SearchResult[] = [];

  // Digits only query for phone or shop number matching
  const queryDigits = cleanQuery.replace(/\D/g, '');

  for (const shop of shops) {
    let totalScore = 0;
    let matchedAnyField = false;

    const nameNorm = normalize(shop.name);
    const nameCompact = compactAlphanumeric(shop.name);

    // Collect all shop numbers (main + any in floor_locations)
    const allShopNumbers: string[] = [shop.shop_number];
    const allFloors: string[] = [shop.floor];

    if (shop.floor_locations && shop.floor_locations.length > 0) {
      for (const loc of shop.floor_locations) {
        if (loc.shop_number && !allShopNumbers.includes(loc.shop_number)) {
          allShopNumbers.push(loc.shop_number);
        }
        if (loc.floor && !allFloors.includes(loc.floor)) {
          allFloors.push(loc.floor);
        }
      }
    }

    const shopNumNorm = normalize(allShopNumbers.join(' '));
    const shopNumCompact = compactAlphanumeric(allShopNumbers.join(' '));

    const floorNorm = normalize(allFloors.join(' '));
    const floorCompact = compactAlphanumeric(allFloors.join(' '));

    const phoneNorm = normalize(shop.phone || '');
    const phoneDigits = (shop.phone || '').replace(/\D/g, '');

    // Product tags & remarks/notes
    const tagsArray = Array.isArray(shop.tags) ? shop.tags : [];
    const tagsNorm = normalize(tagsArray.join(' '));
    const tagsCompact = compactAlphanumeric(tagsArray.join(' '));

    const notesNorm = normalize(shop.notes || '');
    const notesCompact = compactAlphanumeric(shop.notes || '');

    // 1. Direct compact match for acronyms/dots (e.g. "M.R" -> "mr" matches "mr", "M.R", "M R")
    if (compactQuery.length > 0) {
      if (nameCompact === compactQuery) {
        totalScore += 350;
        matchedAnyField = true;
      } else if (nameCompact.includes(compactQuery)) {
        totalScore += 260;
        matchedAnyField = true;
      } else if (compactQuery.includes(nameCompact) && nameCompact.length >= 3) {
        totalScore += 240;
        matchedAnyField = true;
      } else {
        // Also check fuzzy distance on compact strings for merged terms (e.g. "startech" vs "startech" or "starteck")
        if (compactQuery.length >= 4 && nameCompact.length >= 4) {
          const compactDist = levenshteinDistance(compactQuery, nameCompact);
          if (compactDist <= (compactQuery.length <= 6 ? 1 : 2)) {
            totalScore += 230 - compactDist * 30;
            matchedAnyField = true;
          }
        }
      }

      if (shopNumCompact === compactQuery) {
        totalScore += 300;
        matchedAnyField = true;
      } else if (shopNumCompact.includes(compactQuery)) {
        totalScore += 200;
        matchedAnyField = true;
      }

      // Check tags and remarks for compact matches (e.g. "gpu", "cpu", "motherboard", "ram")
      if (tagsCompact.includes(compactQuery)) {
        totalScore += 280;
        matchedAnyField = true;
      } else if (notesCompact.includes(compactQuery)) {
        totalScore += 240;
        matchedAnyField = true;
      }
    }

    // 2. Direct normalized full string match
    if (nameNorm === normalizedQuery) {
      totalScore += 300;
      matchedAnyField = true;
    } else if (nameNorm.includes(normalizedQuery)) {
      totalScore += 180;
      matchedAnyField = true;
    }

    // Direct match inside tags or remarks
    if (tagsNorm.includes(normalizedQuery)) {
      totalScore += 260;
      matchedAnyField = true;
    } else if (notesNorm.includes(normalizedQuery)) {
      totalScore += 220;
      matchedAnyField = true;
    }

    // 3. Shop number exact / prefix match
    if (shopNumNorm === normalizedQuery) {
      totalScore += 250;
      matchedAnyField = true;
    } else if (shopNumNorm.includes(normalizedQuery)) {
      totalScore += 180;
      matchedAnyField = true;
    }

    // 4. Direct phone matching
    if (queryDigits.length >= 3 && phoneDigits.includes(queryDigits)) {
      totalScore += 200;
      matchedAnyField = true;
    }

    // 5. Evaluate individual tokens (handles multi-word, tags, notes, and typos)
    const nameWords = nameNorm.split(' ').filter(Boolean);
    const floorWords = floorNorm.split(' ').filter(Boolean);
    const shopNumWords = shopNumNorm.split(' ').filter(Boolean);
    const tagWords = tagsNorm.split(' ').filter(Boolean);
    const noteWords = notesNorm.split(' ').filter(Boolean);

    let tokenMatchesCount = 0;

    for (const qToken of queryTokens) {
      let bestTokenScore = 0;

      // Also check if qToken is an abbreviation matching initials of nameWords
      // e.g. query "mr" matching "Multi Range"
      if (qToken.length >= 2 && nameWords.length >= qToken.length) {
        const initials = nameWords.map((w) => w[0]).join('');
        if (initials.startsWith(qToken)) {
          bestTokenScore = Math.max(bestTokenScore, 110);
        }
      }

      // Check shop name words
      for (const w of nameWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score > bestTokenScore) {
          bestTokenScore = res.score * 1.5;
        }
      }

      // Check product tags words (high priority for product search like CPU, Motherboard)
      for (const w of tagWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score * 1.4 > bestTokenScore) {
          bestTokenScore = res.score * 1.4;
        }
      }

      // Check notes / remarks words
      for (const w of noteWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score * 1.25 > bestTokenScore) {
          bestTokenScore = res.score * 1.25;
        }
      }

      // Check shop number words
      for (const w of shopNumWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score > bestTokenScore) {
          bestTokenScore = res.score * 1.4;
        }
      }

      // Check floor words
      for (const w of floorWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score > bestTokenScore) {
          bestTokenScore = res.score * 1.0;
        }
      }

      // Check phone
      if (phoneNorm.includes(qToken) || (queryDigits && phoneDigits.includes(qToken))) {
        if (80 > bestTokenScore) {
          bestTokenScore = 80;
        }
      }

      if (bestTokenScore > 0) {
        tokenMatchesCount++;
        totalScore += bestTokenScore;
      }
    }

    // Decision: If multi-token query, ensure either all tokens match or compact query matched
    if (queryTokens.length > 1) {
      if (tokenMatchesCount >= queryTokens.length) {
        scoredResults.push({ shop, score: totalScore + 60 });
      } else if (matchedAnyField && totalScore >= 200) {
        scoredResults.push({ shop, score: totalScore });
      } else if (tokenMatchesCount >= queryTokens.length - 1 && queryTokens.length >= 3) {
        scoredResults.push({ shop, score: totalScore * 0.7 });
      }
    } else {
      // Single token query or acronym (e.g. "mr" or "M.R" or "computr")
      if ((tokenMatchesCount >= 1 || matchedAnyField) && totalScore > 0) {
        scoredResults.push({ shop, score: totalScore });
      }
    }
  }

  // Sort descending by score
  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults.map((r) => r.shop);
}
