import { Shop } from './types';

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Swap to ensure n <= m to save space if needed
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
 * Cleans string for comparison
 */
function normalize(str: string): string {
  return (str || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ');
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

  // If query is short (e.g., 3 chars), allow at most 1 typo
  // If query is 4+ chars, allow up to 2 typos
  const maxAllowedDistance = qLen <= 4 ? 1 : 2;

  // Fast check: length difference cannot exceed allowed distance
  if (Math.abs(qLen - tLen) > maxAllowedDistance + 1) {
    // If targetWord is longer, check if substring of target matches query with distance
    if (tLen > qLen) {
      // Check prefix or sliding window
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
 * Supports multi-token out-of-order queries (e.g. "world computer" matches "Computer World")
 * Tolerates 1-2 typos (e.g. "computr", "compter")
 */
export function fuzzySearchShops(shops: Shop[], query: string): Shop[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) return shops;

  const normalizedQuery = normalize(cleanQuery);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  if (queryTokens.length === 0) return shops;

  const scoredResults: SearchResult[] = [];

  // Digits only query for phone or shop number matching
  const queryDigits = cleanQuery.replace(/\D/g, '');

  for (const shop of shops) {
    let totalScore = 0;
    let matchedAllTokens = true;

    const nameNorm = normalize(shop.name);
    const shopNumNorm = normalize(shop.shop_number);
    const floorNorm = normalize(shop.floor);
    const phoneNorm = normalize(shop.phone || '');
    const phoneDigits = (shop.phone || '').replace(/\D/g, '');

    const nameWords = nameNorm.split(' ').filter(Boolean);
    const floorWords = floorNorm.split(' ').filter(Boolean);
    const shopNumWords = shopNumNorm.split(' ').filter(Boolean);

    // Direct shop number exact or prefix match boost
    if (shopNumNorm === normalizedQuery) {
      totalScore += 250;
    } else if (shopNumNorm.includes(normalizedQuery)) {
      totalScore += 180;
    }

    // Direct phone matching
    if (queryDigits.length >= 3 && phoneDigits.includes(queryDigits)) {
      totalScore += 200;
    }

    // Direct full name substring/exact match
    if (nameNorm === normalizedQuery) {
      totalScore += 300;
    } else if (nameNorm.includes(normalizedQuery)) {
      totalScore += 150;
    }

    // Evaluate each query token across shop fields
    let tokenMatchesCount = 0;

    for (const qToken of queryTokens) {
      let bestTokenScore = 0;

      // Check shop name words
      for (const w of nameWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score > bestTokenScore) {
          bestTokenScore = res.score * 1.5; // shop name has highest weight
        }
      }

      // Check shop number
      for (const w of shopNumWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score > bestTokenScore) {
          bestTokenScore = res.score * 1.4;
        }
      }

      // Check floor
      for (const w of floorWords) {
        const res = tokenMatchesWord(qToken, w);
        if (res.matches && res.score > bestTokenScore) {
          bestTokenScore = res.score * 1.0;
        }
      }

      // Check phone (sub-match)
      if (phoneNorm.includes(qToken) || (queryDigits && phoneDigits.includes(qToken))) {
        if (80 > bestTokenScore) {
          bestTokenScore = 80;
        }
      }

      if (bestTokenScore > 0) {
        tokenMatchesCount++;
        totalScore += bestTokenScore;
      } else {
        matchedAllTokens = false;
      }
    }

    // Require all or most query tokens to match
    // If multi-word query (e.g. "world computer"), all tokens must match
    if (queryTokens.length > 1) {
      if (tokenMatchesCount >= queryTokens.length) {
        scoredResults.push({ shop, score: totalScore + 50 });
      } else if (tokenMatchesCount >= queryTokens.length - 1 && queryTokens.length >= 3) {
        // For 3+ words, allow 1 missing if score is strong
        scoredResults.push({ shop, score: totalScore * 0.7 });
      }
    } else {
      // Single token query
      if (matchedAllTokens && totalScore > 0) {
        scoredResults.push({ shop, score: totalScore });
      }
    }
  }

  // Sort descending by score
  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults.map((r) => r.shop);
}
