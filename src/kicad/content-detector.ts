/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Content type detection for KiCAD data.
 *
 * Determines the type of content by examining the actual data rather than
 * relying on file extensions. This enables loading from clipboard, text files,
 * data URLs, and other non-standard sources.
 */

import { tokenize, Token } from "./tokenizer";

/**
 * Detected content types
 */
export type ContentType =
    | "kicad_sch" // Full schematic document
    | "kicad_pcb" // Full PCB document
    | "kicad_pro" // Project settings (JSON)
    | "kicad_wks" // Drawing sheet
    | "kicad_sym" // Symbol library
    | "sch_fragment" // Schematic elements without document wrapper
    | "pcb_fragment" // PCB elements without document wrapper
    | "unknown";

/**
 * Known schematic-level element types that can appear at the root
 * of a kicad_sch document or in a clipboard fragment.
 */
const SCHEMATIC_ELEMENTS = new Set([
    // Wiring
    "wire",
    "bus",
    "bus_entry",
    "bus_alias",
    "junction",
    "no_connect",
    // Labels
    "label",
    "global_label",
    "hierarchical_label",
    "netclass_flag",
    // Symbols and sheets
    "symbol",
    "sheet",
    "lib_symbols",
    // Graphics
    "polyline",
    "rectangle",
    "arc",
    "circle",
    "bezier",
    "text",
    "text_box",
    "textbox",
    "table",
    "image",
]);

/**
 * Known PCB-level element types that can appear at the root
 * of a kicad_pcb document or in a clipboard fragment.
 */
const PCB_ELEMENTS = new Set([
    // Copper
    "segment",
    "via",
    "arc", // Note: context-dependent, also in schematic
    // Zones
    "zone",
    // Footprints
    "footprint",
    "module", // Legacy name for footprint
    // Graphics
    "gr_line",
    "gr_circle",
    "gr_arc",
    "gr_poly",
    "gr_rect",
    "gr_text",
    "gr_text_box",
    "dimension",
    // Groups
    "group",
]);

/**
 * Document root element types
 */
const DOCUMENT_ROOTS: Record<string, ContentType> = {
    kicad_sch: "kicad_sch",
    kicad_pcb: "kicad_pcb",
    kicad_wks: "kicad_wks",
    kicad_symbol_lib: "kicad_sym",
};

/**
 * Detect the type of KiCAD content from raw text.
 *
 * @param content - The raw text content to analyze
 * @returns The detected content type
 */
export function detectContentType(content: string): ContentType {
    const trimmed = content.trim();

    // Empty content
    if (!trimmed) {
        return "unknown";
    }

    // JSON content (project settings)
    if (trimmed.startsWith("{")) {
        return "kicad_pro";
    }

    // S-expression content - tokenize to find the first meaningful element
    try {
        const firstElements = getFirstElements(trimmed, 3);

        if (firstElements.length === 0) {
            return "unknown";
        }

        const firstElement = firstElements[0]!;

        // Check for document root types
        if (firstElement in DOCUMENT_ROOTS) {
            return DOCUMENT_ROOTS[firstElement]!;
        }

        // Check for schematic elements
        if (SCHEMATIC_ELEMENTS.has(firstElement)) {
            return "sch_fragment";
        }

        // Check for PCB elements
        if (PCB_ELEMENTS.has(firstElement)) {
            return "pcb_fragment";
        }

        // Special case: 'arc' appears in both, look for context clues
        if (firstElement === "arc") {
            // If we see layer info, it's PCB; otherwise assume schematic
            if (trimmed.includes("(layer ")) {
                return "pcb_fragment";
            }
            return "sch_fragment";
        }
    } catch {
        // Tokenization failed - not valid S-expression
        return "unknown";
    }

    return "unknown";
}

/**
 * Get the first N element names from the content.
 * This tokenizes just enough to identify the content type.
 */
function getFirstElements(content: string, count: number): string[] {
    const elements: string[] = [];
    let depth = 0;
    let foundFirstAtom = false;

    for (const token of tokenize(content)) {
        if (token.type === Token.OPEN) {
            depth++;
            foundFirstAtom = false;
        } else if (token.type === Token.CLOSE) {
            depth--;
        } else if (
            token.type === Token.ATOM &&
            depth === 1 &&
            !foundFirstAtom
        ) {
            // First atom after opening paren at depth 1 is the element type
            elements.push(token.value);
            foundFirstAtom = true;

            if (elements.length >= count) {
                break;
            }
        }
    }

    return elements;
}

/**
 * Check if content appears to be a KiCAD S-expression format
 */
export function isKicadSExpression(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith("(") && trimmed.endsWith(")");
}

/**
 * Determine if content type represents a fragment (partial document)
 */
export function isFragment(type: ContentType): boolean {
    return type === "sch_fragment" || type === "pcb_fragment";
}

/**
 * Determine if content type represents a full document
 */
export function isFullDocument(type: ContentType): boolean {
    return (
        type === "kicad_sch" ||
        type === "kicad_pcb" ||
        type === "kicad_wks" ||
        type === "kicad_sym"
    );
}
