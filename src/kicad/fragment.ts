/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Fragment wrapping utilities.
 *
 * Wraps partial KiCAD content (clipboard snippets, individual elements, etc.)
 * in minimal valid document structures so they can be parsed and rendered.
 */

/**
 * Generate a random UUID in KiCAD format (lowercase, no dashes grouping)
 */
function generateUUID(): string {
    const hex = "0123456789abcdef";
    let uuid = "";
    for (let i = 0; i < 32; i++) {
        if (i === 8 || i === 12 || i === 16 || i === 20) {
            uuid += "-";
        }
        uuid += hex[Math.floor(Math.random() * 16)];
    }
    return uuid;
}

/**
 * Wrap schematic fragment content in a minimal valid kicad_sch document.
 *
 * @param content - Raw schematic elements (text, wire, symbol, etc.)
 * @param paperSize - Paper size for the synthetic document (default: A4)
 * @returns Complete kicad_sch document string
 */
export function wrapSchematicFragment(
    content: string,
    paperSize: string = "A4",
): string {
    const uuid = generateUUID();

    // KiCAD 8 format version
    const version = 20231120;

    // Check if content already contains lib_symbols - don't add empty one if so
    const hasLibSymbols = content.trim().startsWith("(lib_symbols");
    const libSymbolsLine = hasLibSymbols ? "" : "(lib_symbols)";

    return `(kicad_sch
    (version ${version})
    (generator "kicanvas")
    (generator_version "1.0")
    (uuid "${uuid}")
    (paper "${paperSize}")
    ${libSymbolsLine}
    ${content}
)`;
}

/**
 * Wrap PCB fragment content in a minimal valid kicad_pcb document.
 *
 * @param content - Raw PCB elements (footprint, segment, via, etc.)
 * @param paperSize - Paper size for the synthetic document (default: A4)
 * @returns Complete kicad_pcb document string
 */
export function wrapPCBFragment(
    content: string,
    paperSize: string = "A4",
): string {
    // KiCAD 8 format version
    const version = 20231120;

    // Minimal layer stack for a 2-layer board
    const layers = `(layers
        (0 "F.Cu" signal)
        (31 "B.Cu" signal)
        (32 "B.Adhes" user "B.Adhesive")
        (33 "F.Adhes" user "F.Adhesive")
        (34 "B.Paste" user)
        (35 "F.Paste" user)
        (36 "B.SilkS" user "B.Silkscreen")
        (37 "F.SilkS" user "F.Silkscreen")
        (38 "B.Mask" user)
        (39 "F.Mask" user)
        (40 "Dwgs.User" user "User.Drawings")
        (41 "Cmts.User" user "User.Comments")
        (42 "Eco1.User" user "User.Eco1")
        (43 "Eco2.User" user "User.Eco2")
        (44 "Edge.Cuts" user)
        (45 "Margin" user)
        (46 "B.CrtYd" user "B.Courtyard")
        (47 "F.CrtYd" user "F.Courtyard")
        (48 "B.Fab" user)
        (49 "F.Fab" user)
        (50 "User.1" user)
        (51 "User.2" user)
        (52 "User.3" user)
        (53 "User.4" user)
        (54 "User.5" user)
        (55 "User.6" user)
        (56 "User.7" user)
        (57 "User.8" user)
        (58 "User.9" user)
    )`;

    return `(kicad_pcb
    (version ${version})
    (generator "kicanvas")
    (generator_version "1.0")
    (general
        (thickness 1.6)
    )
    (paper "${paperSize}")
    ${layers}
    (setup
        (pad_to_mask_clearance 0)
    )
    (net 0 "")
    ${content}
)`;
}

/**
 * Options for wrapping fragments
 */
export interface WrapOptions {
    /** Paper size (default: "A4") */
    paperSize?: string;
}

/**
 * Wrap content based on detected fragment type
 */
export function wrapFragment(
    content: string,
    fragmentType: "sch_fragment" | "pcb_fragment",
    options: WrapOptions = {},
): string {
    const { paperSize = "A4" } = options;

    if (fragmentType === "sch_fragment") {
        return wrapSchematicFragment(content, paperSize);
    } else {
        return wrapPCBFragment(content, paperSize);
    }
}
