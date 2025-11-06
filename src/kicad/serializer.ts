/*
    Copyright (c) 2025 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { List } from "./tokenizer";

/**
 * Converts a parsed List back to S-expression string format with KiCad-style formatting
 */
export function list_to_string(expr: List, formatted: boolean = true): string {
    if (formatted) {
        return serialize_formatted(expr, 0);
    }
    return serialize_value(expr);
}

function serialize_value(value: string | number | List): string {
    if (Array.isArray(value)) {
        // It's a List
        return "(" + value.map(serialize_value).join(" ") + ")";
    } else if (typeof value === "string") {
        // Check if string needs quoting
        if (needs_quoting(value)) {
            return `"${escape_string(value)}"`;
        }
        return value;
    } else if (typeof value === "number") {
        return String(value);
    }
    return String(value);
}

/**
 * Serialize with KiCad-style indentation and line breaks
 */
function serialize_formatted(
    value: string | number | List,
    indent: number,
): string {
    const indent_str = "  ".repeat(indent);

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return "()";
        }

        const head = value[0];

        // Short lists stay on one line
        if (
            value.length <= 3 &&
            !value.slice(1).some((v) => Array.isArray(v))
        ) {
            return (
                "(" +
                value
                    .map((v) =>
                        Array.isArray(v)
                            ? serialize_formatted(v, indent)
                            : serialize_atom(v as string | number),
                    )
                    .join(" ") +
                ")"
            );
        }

        // For longer lists or lists with nested lists, format nicely
        let result =
            "(" +
            (Array.isArray(head)
                ? serialize_formatted(head, indent)
                : serialize_atom(head as string | number));

        for (let i = 1; i < value.length; i++) {
            const item = value[i];
            if (Array.isArray(item)) {
                // Nested list on new line with indent
                result +=
                    "\n" +
                    indent_str +
                    "  " +
                    serialize_formatted(item, indent + 1);
            } else {
                // Simple value on same line
                result += " " + serialize_atom(item as string | number);
            }
        }

        result += ")";
        return result;
    } else {
        return serialize_atom(value);
    }
}

function serialize_atom(value: string | number): string {
    if (typeof value === "string") {
        if (needs_quoting(value)) {
            return `"${escape_string(value)}"`;
        }
        return value;
    } else if (typeof value === "number") {
        return String(value);
    }
    return String(value);
}

function needs_quoting(str: string): boolean {
    // Quote if contains spaces, special characters, or is empty
    if (str.length === 0) {
        return true;
    }

    // Check for whitespace or special characters that require quoting
    const special_chars = /[\s()"]/;
    if (special_chars.test(str)) {
        return true;
    }

    // KiCad keywords and atoms that should NOT be quoted
    const never_quote = new Set([
        // S-expression keywords
        "symbol",
        "lib_symbols",
        "property",
        "at",
        "effects",
        "font",
        "size",
        "justify",
        "fill",
        "stroke",
        "type",
        "width",
        "pts",
        "xy",
        "polyline",
        "pin",
        "pin_numbers",
        "pin_names",
        "offset",
        "number",
        "name",
        "length",
        "uuid",
        "lib_id",
        "unit",
        "instances",
        "project",
        "path",
        "reference",
        "value",
        "footprint",
        "in_bom",
        "on_board",
        "dnp",
        "fields_autoplaced",
        "exclude_from_sim",
        "embedded_fonts",
        // Schematic item keywords
        "wire",
        "junction",
        "no_connect",
        "bus_entry",
        "bus",
        "label",
        "global_label",
        "hierarchical_label",
        "netclass_flag",
        "text_box",
        "diameter",
        "color",
        // Graphical shape keywords
        "rectangle",
        "circle",
        "arc",
        "polyline",
        "text",
        "start",
        "end",
        "mid",
        "center",
        "radius",
        "angle",
        // Symbol attributes
        "power",
        "power_in",
        "power_out",
        // Font/text attributes
        "thickness",
        "bold",
        "italic",
        // Atom values
        "yes",
        "no",
        "hide",
        "left",
        "right",
        "center",
        "top",
        "bottom",
        "none",
        "default",
        "solid",
        "dashed",
        "dotted",
        "background",
        "outline",
        "filled",
        "passive",
        "line",
        "input",
        "output",
        "bidirectional",
        "open_collector",
        "open_emitter",
        "tri_state",
        "unspecified",
        // Angles and special numbers (leave as-is)
        "0",
        "90",
        "180",
        "270",
    ]);

    // Don't quote KiCad keywords
    if (never_quote.has(str)) {
        return false;
    }

    // Quote everything else (property values, references, footprints, etc.)
    return true;
}

function escape_string(str: string): string {
    return str
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
}

/**
 * Serializes multiple items to S-expression format with newlines
 */
export function serialize_items(items: any[]): string {
    const expressions: string[] = [];

    for (const item of items) {
        if (item && item["_raw_expr"]) {
            expressions.push(list_to_string(item["_raw_expr"]));
        }
    }

    return expressions.join("\n");
}
