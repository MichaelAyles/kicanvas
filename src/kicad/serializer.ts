/*
    Copyright (c) 2025 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { List } from "./tokenizer";

/**
 * Converts a parsed List back to S-expression string format
 */
export function list_to_string(expr: List): string {
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

function needs_quoting(str: string): boolean {
    // Quote if contains spaces, special characters, or is empty
    if (str.length === 0) {
        return true;
    }

    // Check for whitespace or special characters that require quoting
    const special_chars = /[\s()"]/;
    return special_chars.test(str);
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
