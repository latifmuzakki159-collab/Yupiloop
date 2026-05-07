import { LorebookEntry } from "../types";
import { processPrompt } from "./promptUtils";

/**
 * Memindai teks (pesan user + history singkat) terhadap Lorebook.
 * Mengembalikan objek berisi teks gabungan dan metadata entry yang cocok.
 */
export const scanLorebook = (
    textToScan: string, 
    lorebook: LorebookEntry[] | undefined,
    charName: string,
    userName: string
): { loreText: string; matchedEntries: LorebookEntry[] } => {
    if (!lorebook || lorebook.length === 0) return { loreText: "", matchedEntries: [] };

    const matchedEntries: LorebookEntry[] = [];
    const activeLoreTexts: string[] = [];
    const normalizedText = textToScan.toLowerCase();

    lorebook.forEach(info => {
        // Skip if disabled
        if (info.enabled === false) return;

        // 1. Primary Trigger Check
        const primaryKeys = info.keys.filter(k => k.trim() !== "");
        const secondaryKeys = (info.secondaryKeys || []).filter(k => k.trim() !== "");

        let isPrimaryMatch = info.alwaysOn || primaryKeys.length === 0;
        
        if (!isPrimaryMatch) {
            isPrimaryMatch = primaryKeys.some(key => {
                const trimmedKey = key.trim().toLowerCase();
                if (!trimmedKey) return false;
                
                const escapedKey = trimmedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                // If keyword is very short, be strict with word boundaries
                if (trimmedKey.length <= 2) {
                    return new RegExp(`\\b${escapedKey}\\b`, 'i').test(normalizedText);
                }

                // For Indonesian: handle common prefixes (me, di, ber, ter, pe, ke, se) 
                // and suffixes (nya, kan, i, lah, kah, ku, mu)
                const regex = new RegExp(`\\b(?:me|di|ber|ter|pe|ke|se)?${escapedKey}(?:nya|kan|i|lah|kah|ku|mu)?\\b`, 'i');
                return regex.test(normalizedText);
            });
        }

        // 2. Secondary/Selective Check (Logical AND)
        // If secondary keys exist, at least one must also be present in the text
        if (isPrimaryMatch && !info.alwaysOn && secondaryKeys.length > 0) {
            const isSecondaryMatch = secondaryKeys.some(key => {
                const trimmedKey = key.trim().toLowerCase();
                const escapedKey = trimmedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                if (trimmedKey.length <= 2) {
                    return new RegExp(`\\b${escapedKey}\\b`, 'i').test(normalizedText);
                }

                const regex = new RegExp(`\\b(?:me|di|ber|ter|pe|ke|se)?${escapedKey}(?:nya|kan|i|lah|kah|ku|mu)?\\b`, 'i');
                return regex.test(normalizedText);
            });
            
            if (!isSecondaryMatch) {
                isPrimaryMatch = false; // Vetoed by selective logic
            }
        }

        if (isPrimaryMatch) {
            matchedEntries.push(info);
            // Process placeholders inside the lore entry itself
            activeLoreTexts.push(processPrompt(info.entry, charName, userName));
        }
    });

    return {
        loreText: activeLoreTexts.join('\n\n'),
        matchedEntries
    };
};