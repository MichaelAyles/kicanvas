/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Barrier, later } from "../../base/async";
import { Disposables, type IDisposable } from "../../base/disposable";
import { listen } from "../../base/events";
import { no_self_recursion } from "../../base/functions";
import { BBox, Vec2 } from "../../base/math";
import { Color, Polygon, Polyline, Renderer } from "../../graphics";
import {
    KiCanvasLoadEvent,
    KiCanvasMouseMoveEvent,
    KiCanvasSelectEvent,
    type KiCanvasEventMap,
} from "./events";
import { ViewLayerSet } from "./view-layers";
import { Viewport } from "./viewport";

export abstract class Viewer extends EventTarget {
    public renderer: Renderer;
    public viewport: Viewport;
    public layers: ViewLayerSet;
    public mouse_position: Vec2 = new Vec2(0, 0);
    public loaded = new Barrier();

    protected disposables = new Disposables();
    protected setup_finished = new Barrier();

    // Multi-selection model
    #selected_items: Set<any> = new Set();
    #selection_bbox: BBox | null = null;

    // Box selection state
    #box_selection_start: Vec2 | null = null;
    #box_selection_end: Vec2 | null = null;
    #is_box_selecting = false;
    #mouse_down_position: Vec2 | null = null;

    // Legacy single-selection (for backward compatibility)
    #selected: BBox | null;

    constructor(
        public canvas: HTMLCanvasElement,
        protected interactive = true,
    ) {
        super();
    }

    dispose() {
        this.disposables.dispose();
    }

    override addEventListener<K extends keyof KiCanvasEventMap>(
        type: K,
        listener:
            | ((this: Viewer, ev: KiCanvasEventMap[K]) => void)
            | { handleEvent: (ev: KiCanvasEventMap[K]) => void }
            | null,
        options?: boolean | AddEventListenerOptions,
    ): IDisposable;
    override addEventListener(
        type: string,
        listener: EventListener | null,
        options?: boolean | AddEventListenerOptions,
    ): IDisposable {
        super.addEventListener(type, listener, options);
        return {
            dispose: () => {
                this.removeEventListener(type, listener, options);
            },
        };
    }

    protected abstract create_renderer(canvas: HTMLCanvasElement): Renderer;

    async setup() {
        this.renderer = this.disposables.add(this.create_renderer(this.canvas));

        await this.renderer.setup();

        this.viewport = this.disposables.add(
            new Viewport(this.renderer, () => {
                this.on_viewport_change();
            }),
        );

        if (this.interactive) {
            this.viewport.enable_pan_and_zoom(0.5, 190);

            this.disposables.add(
                listen(this.canvas, "mousemove", (e) => {
                    this.on_mouse_change(e);
                    // Always check for box selection when mouse is down
                    if (this.#mouse_down_position) {
                        this.on_box_selection_move(e);
                    }
                }),
            );

            this.disposables.add(
                listen(this.canvas, "panzoom", (e) => {
                    this.on_mouse_change(e as MouseEvent);
                }),
            );

            this.disposables.add(
                listen(this.canvas, "mousedown", (e) => {
                    if (e.button === 0) { // Left button only
                        this.on_mouse_down(e);
                    }
                }),
            );

            this.disposables.add(
                listen(document, "mouseup", (e) => {
                    if (e.button === 0) { // Left button only
                        this.on_mouse_up(e);
                    }
                }),
            );

            // Keyboard events for clipboard
            this.disposables.add(
                listen(document, "keydown", (e) => {
                    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        this.on_copy();
                    } else if (e.key === 'Escape') {
                        this.clear_selection();
                    }
                }),
            );
        }

        this.setup_finished.open();
    }

    protected on_viewport_change() {
        if (this.interactive) {
            this.draw();
        }
    }

    protected on_mouse_change(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const new_position = this.viewport.camera.screen_to_world(
            new Vec2(e.clientX - rect.left, e.clientY - rect.top),
        );

        if (
            this.mouse_position.x != new_position.x ||
            this.mouse_position.y != new_position.y
        ) {
            this.mouse_position.set(new_position);
            this.dispatchEvent(new KiCanvasMouseMoveEvent(this.mouse_position));
        }
    }

    protected on_mouse_down(e: MouseEvent) {
        // Don't start box selection if modifier keys are pressed (for future additive selection)
        if (e.ctrlKey || e.shiftKey) {
            return;
        }

        this.#mouse_down_position = this.mouse_position.copy();
        this.#is_box_selecting = false;
    }

    protected on_box_selection_move(e: MouseEvent) {
        if (!this.#mouse_down_position) {
            return;
        }

        const DRAG_THRESHOLD = 5; // pixels in screen space

        // Calculate screen space distance
        const rect = this.canvas.getBoundingClientRect();
        const screen_current = new Vec2(e.clientX - rect.left, e.clientY - rect.top);
        const screen_start = this.viewport.camera.world_to_screen(this.#mouse_down_position);
        const distance = screen_current.sub(screen_start).magnitude;

        if (distance > DRAG_THRESHOLD) {
            if (!this.#box_selection_start) {
                this.#box_selection_start = this.#mouse_down_position.copy();
                this.#is_box_selecting = true;
            }
            this.#box_selection_end = this.mouse_position.copy();
            later(() => this.paint_selected());
        }
    }

    protected on_mouse_up(e: MouseEvent) {
        if (!this.#mouse_down_position) {
            return;
        }

        const DRAG_THRESHOLD = 5; // pixels in screen space

        // Calculate screen space distance
        const rect = this.canvas.getBoundingClientRect();
        const screen_current = new Vec2(e.clientX - rect.left, e.clientY - rect.top);
        const screen_start = this.viewport.camera.world_to_screen(this.#mouse_down_position);
        const distance = screen_current.sub(screen_start).magnitude;

        if (distance <= DRAG_THRESHOLD) {
            // Click - single item selection
            const items = this.layers.query_point(this.mouse_position);
            this.on_pick(this.mouse_position, items);
        } else if (this.#box_selection_start && this.#box_selection_end) {
            // Box selection - complete the selection
            this.complete_box_selection(this.#box_selection_start, this.#box_selection_end);
        }

        // Reset box selection state
        this.#mouse_down_position = null;
        this.#box_selection_start = null;
        this.#box_selection_end = null;
        this.#is_box_selecting = false;
        later(() => this.paint_selected());
    }

    protected complete_box_selection(start: Vec2, end: Vec2) {
        const selection_bbox = BBox.from_corners(
            start.x,
            start.y,
            end.x,
            end.y,
        );

        const selected_items = new Set<any>();

        // Query ALL layers, not just interactive layers, to capture wires, junctions, labels, etc.
        for (const layer of this.layers.in_order()) {
            // Skip non-visual layers
            if (!layer.visible || !layer.bboxes || layer.bboxes.size === 0) {
                continue;
            }

            for (const [item, bbox] of layer.bboxes.entries()) {
                // Check if bbox is fully or partially contained
                if (selection_bbox.contains(bbox) || selection_bbox.intersects(bbox)) {
                    selected_items.add(item);
                }
            }
        }

        console.log(`Box selection found ${selected_items.size} items`);
        this.select_items(selected_items);
    }

    protected async on_copy() {
        if (this.#selected_items.size === 0) {
            return;
        }

        // Import serializer
        const { list_to_string } = await import("../../kicad/serializer");

        const lib_symbols = new Map(); // lib_id -> lib_symbol definition
        const schematic_items: string[] = [];
        const symbol_instances: any[] = [];

        // First pass: collect items and identify what we need
        for (const item of this.#selected_items) {
            if (!item || !item["_raw_expr"]) continue;

            const expr = item["_raw_expr"];
            if (!Array.isArray(expr) || expr.length === 0) continue;

            const item_type = expr[0];

            // Skip items that are not valid schematic elements
            // (e.g., drawing sheet rectangles, computed elements, etc.)
            const skip_types = ["rect", "rectangle", "image", "bitmap"];
            if (skip_types.includes(item_type)) {
                console.log(`Skipping ${item_type} - not a schematic element`);
                continue;
            }

            const serialized = list_to_string(expr);

            // If this is a placed symbol instance (has lib_id), we need its library definition
            if (item_type === "symbol" && item.lib_id && item.lib_symbol) {
                // Add the library symbol definition if we don't have it yet
                if (!lib_symbols.has(item.lib_id)) {
                    const lib_symbol_expr = item.lib_symbol["_raw_expr"];
                    if (lib_symbol_expr) {
                        lib_symbols.set(item.lib_id, list_to_string(lib_symbol_expr));
                    }
                }

                // Add this symbol instance
                schematic_items.push(serialized);
                symbol_instances.push(item);
            } else {
                // Wire, junction, label, text, etc - add directly
                schematic_items.push(serialized);
            }
        }

        if (lib_symbols.size === 0 && schematic_items.length === 0) {
            console.warn("No serializable items selected");
            return;
        }

        // Build the KiCad clipboard format
        let text = "";

        // 1. Library symbol definitions
        if (lib_symbols.size > 0) {
            text += "(lib_symbols\n";
            text += Array.from(lib_symbols.values())
                .map(s => "  " + s.replace(/\n/g, "\n  "))
                .join("\n");
            text += "\n)\n\n";
        }

        // 2. Schematic items (wires, junctions, placed symbols, etc.)
        text += schematic_items.join("\n");

        // Copy to clipboard as plain text (browsers don't support custom MIME types)
        try {
            await navigator.clipboard.writeText(text);
            console.log(`Copied ${this.#selected_items.size} item(s) to clipboard`);
            console.log(`  - ${lib_symbols.size} library symbol(s)`);
            console.log(`  - ${schematic_items.length} schematic item(s)`);
            console.log(`  - ${symbol_instances.length} symbol instance(s)`);
            console.log("\n=== FULL CLIPBOARD CONTENT ===");
            console.log(text);
            console.log("=== END CLIPBOARD CONTENT ===");
        } catch (err) {
            console.error("Failed to copy to clipboard:", err);
            console.log("Copy this text manually:");
            console.log(text);
        }
    }

    public abstract load(src: any): Promise<void>;

    protected resolve_loaded(value: boolean) {
        if (value) {
            this.loaded.open();
            this.dispatchEvent(new KiCanvasLoadEvent());
        }
    }

    public abstract paint(): void;

    protected on_draw() {
        this.renderer.clear_canvas();

        if (!this.layers) {
            return;
        }

        // Render all layers in display order (back to front)
        let depth = 0.01;
        const camera = this.viewport.camera.matrix;
        const should_dim = this.layers.is_any_layer_highlighted();

        for (const layer of this.layers.in_display_order()) {
            if (layer.visible && layer.graphics) {
                let alpha = layer.opacity;

                if (should_dim && !layer.highlighted) {
                    alpha = 0.25;
                }

                layer.graphics.render(camera, depth, alpha);
                depth += 0.01;
            }
        }
    }

    public draw() {
        if (!this.viewport) {
            return;
        }

        window.requestAnimationFrame(() => {
            this.on_draw();
        });
    }

    protected on_pick(
        mouse: Vec2,
        items: ReturnType<ViewLayerSet["query_point"]>,
    ) {
        let selected = null;

        for (const { bbox } of items) {
            selected = bbox;
            break;
        }

        this.select(selected);
    }

    public select(item: BBox | null) {
        this.selected = item;
    }

    // Legacy single-selection API (backward compatibility)
    public get selected(): BBox | null {
        return this.#selected;
    }

    public set selected(bb: BBox | null) {
        this._set_selected(bb);
    }

    @no_self_recursion
    private _set_selected(bb: BBox | null) {
        const previous = this.#selected;
        this.#selected = bb?.copy() || null;

        // Update multi-selection to match single selection for backward compatibility
        if (bb === null) {
            this.#selected_items.clear();
            this.#selection_bbox = null;
        } else if (bb.context) {
            this.#selected_items.clear();
            this.#selected_items.add(bb.context);
            this.#selection_bbox = bb.copy();
        }

        // Notify event listeners
        this.dispatchEvent(
            new KiCanvasSelectEvent({
                item: this.#selected?.context,
                previous: previous?.context,
            }),
        );

        later(() => this.paint_selected());
    }

    // New multi-selection API
    public get selected_items(): ReadonlySet<any> {
        return this.#selected_items;
    }

    public select_items(items: Iterable<any>, additive = false) {
        if (!additive) {
            this.#selected_items.clear();
        }

        const bboxes: BBox[] = [];
        for (const item of items) {
            this.#selected_items.add(item);
            // Find bbox for this item
            for (const layer of this.layers.interactive_layers()) {
                for (const [layerItem, bbox] of layer.bboxes.entries()) {
                    if (layerItem === item) {
                        bboxes.push(bbox);
                        break;
                    }
                }
            }
        }

        this._update_selection(bboxes);
    }

    public select_item(item: any, additive = false) {
        this.select_items([item], additive);
    }

    public clear_selection() {
        const had_selection = this.#selected_items.size > 0;
        this.#selected_items.clear();
        this.#selection_bbox = null;
        this.#selected = null;

        if (had_selection) {
            this.dispatchEvent(
                new KiCanvasSelectEvent({
                    item: null,
                    previous: null,
                }),
            );
            later(() => this.paint_selected());
        }
    }

    private _update_selection(bboxes: BBox[]) {
        const previous = this.#selected;

        if (bboxes.length === 0) {
            this.#selection_bbox = null;
            this.#selected = null;
        } else if (bboxes.length === 1) {
            this.#selection_bbox = bboxes[0]!.copy();
            this.#selected = bboxes[0]!.copy();
        } else {
            this.#selection_bbox = BBox.combine(bboxes);
            this.#selected = this.#selection_bbox;
        }

        // Notify event listeners (maintain backward compatibility)
        this.dispatchEvent(
            new KiCanvasSelectEvent({
                item: this.#selected?.context,
                previous: previous?.context,
            }),
        );

        later(() => this.paint_selected());
    }

    public get selection_color() {
        return Color.white;
    }

    protected paint_selected() {
        const layer = this.layers.overlay;

        layer.clear();

        // Draw box selection rectangle if currently selecting
        if (this.#is_box_selecting && this.#box_selection_start && this.#box_selection_end) {
            this.renderer.start_layer(layer.name);

            const selection_rect = BBox.from_corners(
                this.#box_selection_start.x,
                this.#box_selection_start.y,
                this.#box_selection_end.x,
                this.#box_selection_end.y,
            );

            // Draw selection rectangle with dashed blue stroke and semi-transparent fill
            const selection_color = new Color(0, 120, 255, 0.8);
            const fill_color = new Color(0, 120, 255, 0.1);

            this.renderer.line(
                Polyline.from_BBox(selection_rect, 0.254, selection_color),
            );

            this.renderer.polygon(Polygon.from_BBox(selection_rect, fill_color));

            layer.graphics = this.renderer.end_layer();
        }

        // Draw selected items highlights
        if (this.#selected_items.size > 0) {
            this.renderer.start_layer(layer.name);

            // Highlight each selected item
            for (const item of this.#selected_items) {
                // Find bbox for this item
                for (const viewLayer of this.layers.interactive_layers()) {
                    for (const [layerItem, bbox] of viewLayer.bboxes.entries()) {
                        if (layerItem === item) {
                            const bb = bbox.copy().grow(bbox.w * 0.1);

                            this.renderer.line(
                                Polyline.from_BBox(bb, 0.254, this.selection_color),
                            );

                            this.renderer.polygon(Polygon.from_BBox(bb, this.selection_color));
                            break;
                        }
                    }
                }
            }

            layer.graphics = this.renderer.end_layer();

            if (layer.graphics) {
                layer.graphics.composite_operation = "overlay";
            }
        }

        this.draw();
    }

    abstract zoom_to_page(): void;

    zoom_to_selection() {
        if (!this.selected) {
            return;
        }
        this.viewport.camera.bbox = this.selected.grow(10);
        this.draw();
    }
}
