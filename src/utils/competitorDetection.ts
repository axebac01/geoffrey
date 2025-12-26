import { PromptResult } from "../types";

/**
 * Detects competitor mentions in AI response text
 * Improved version with better name matching and rank detection
 */
export function detectCompetitorMentions(
    answerText: string,
    competitors: string[],
    brandName: string
): Array<{ competitor: string; mentioned: boolean; rankPosition?: number }> {
    const results: Array<{ competitor: string; mentioned: boolean; rankPosition?: number }> = [];
    const lowerAnswer = answerText.toLowerCase();
    const lowerBrandName = brandName.toLowerCase();

    // Normalize competitor names (remove common suffixes for better matching)
    const normalizeName = (name: string): string => {
        return name.toLowerCase()
            .replace(/\s+(inc|llc|ltd|ab|corp|corporation|company|co)\.?$/i, '')
            .trim();
    };

    // Extract potential list items (numbered or bulleted)
    const listPattern = /(?:^|\n)(?:\d+\.|\-|\*|\•)\s*([^\n]+)/gim;
    const listItems: string[] = [];
    let match;
    while ((match = listPattern.exec(answerText)) !== null) {
        listItems.push(match[1].trim());
    }

    for (const competitor of competitors) {
        const normalizedCompetitor = normalizeName(competitor);
        const lowerCompetitor = competitor.toLowerCase();
        let mentioned = false;
        let rankPosition: number | undefined = undefined;

        // Multiple matching strategies for better detection
        // Strategy 1: Exact match (case-insensitive)
        const exactMatch = lowerAnswer.includes(lowerCompetitor);
        
        // Strategy 2: Normalized match (without company suffixes)
        const normalizedMatch = lowerAnswer.includes(normalizedCompetitor);
        
        // Strategy 3: Word boundary match (avoid partial matches)
        const wordBoundaryPattern = new RegExp(`\\b${lowerCompetitor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const wordBoundaryMatch = wordBoundaryPattern.test(answerText);

        mentioned = exactMatch || normalizedMatch || wordBoundaryMatch;

        if (mentioned) {
            // Try to find rank position in list items
            for (let i = 0; i < listItems.length; i++) {
                const listItemLower = listItems[i].toLowerCase();
                if (listItemLower.includes(lowerCompetitor) || 
                    listItemLower.includes(normalizedCompetitor)) {
                    rankPosition = i + 1; // 1-based ranking
                    break;
                }
            }

            // If not in explicit list, try to infer from position relative to brand
            if (!rankPosition) {
                const competitorIndex = Math.min(
                    lowerAnswer.indexOf(lowerCompetitor),
                    lowerAnswer.indexOf(normalizedCompetitor) !== -1 
                        ? lowerAnswer.indexOf(normalizedCompetitor) 
                        : Infinity
                );
                const brandIndex = lowerAnswer.indexOf(lowerBrandName);
                
                if (competitorIndex !== -1 && brandIndex !== -1) {
                    // If competitor appears before brand, it might be ranked higher
                    // But we can't determine exact rank without explicit list
                    // So we leave rankPosition as undefined
                }
            }
        }

        results.push({ competitor, mentioned, rankPosition });
    }

    return results;
}

