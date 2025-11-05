# Box Selection and Clipboard Copy Feature Design

## Overview

This document outlines the design for implementing click-and-drag box selection with clipboard copy functionality for KiCanvas. Users will be able to:

1. **Box Selection**: Click and drag with the left mouse button to create a selection rectangle
2. **Multi-Select**: Select multiple items within the rectangle
3. **Clipboard Copy**: Press Ctrl+C to copy the S-expression representation of selected items

## Current State Analysis

### Existing Selection System

**Location**: `src/viewers/base/viewer.ts`

Current implementation:
- Single-item selection via click
- Selection stored as `BBox | null` in `#selected` field
- Click → `query_point()` → `on_pick()` → `select()`
- Visual feedback via overlay layer with highlight
- Dispatches `KiCanvasSelectEvent` on selection change

**Key Code Locations**:
- Selection: `src/viewers/base/viewer.ts:187-213`
- Hit testing: `src/viewers/base/view-layers.ts:294-300`
- Mouse handling: `src/viewers/base/viewer.ts:83-99`

### Existing Pan & Zoom System

**Location**: `src/base/dom/pan-and-zoom.ts`

Current mouse button assignments:
- **Left click**: Item selection
- **Middle/Right mouse + drag**: Pan
- **Wheel**: Zoom (with Ctrl for zoom-to-cursor)
- **Touch gestures**: Two-finger pinch/pan

### Current Architecture Constraints

1. **Single Selection Model**: `#selected: BBox | null` only supports one item
2. **No Clipboard API**: No existing clipboard handling code
3. **Pan Conflicts**: Must coordinate with PanAndZoom to avoid conflicts
4. **No Serialization**: No existing S-expression serialization (only parsing)

---

## Proposed Design

### 1. Box Selection Interaction Model

#### Mouse Interaction State Machine

```
IDLE
 ├─ Left Mouse Down (no Ctrl/Shift)
 │   → START_BOX_SELECTION
 │       ├─ Mouse Move → DRAWING_BOX (draw selection rectangle)
 │       └─ Mouse Up → END_BOX_SELECTION (query items, select)
 │
 ├─ Left Click (quick release)
 │   → SINGLE_SELECT (existing behavior)
 │
 ├─ Middle/Right Mouse Down
 │   → PAN_MODE (existing PanAndZoom behavior)
 │
 └─ Ctrl+C
     → COPY_TO_CLIPBOARD (serialize selected items)
```

#### Threshold-Based Detection

To distinguish between click-to-select and drag-to-box-select:

```typescript
const DRAG_THRESHOLD = 5; // pixels

on mousedown:
    dragStart = mouse position
    isDragging = false

on mousemove:
    distance = distance(mouse, dragStart)
    if distance > DRAG_THRESHOLD:
        isDragging = true
        // Start drawing selection box

on mouseup:
    if isDragging:
        // Complete box selection
    else:
        // Single item selection (click)
```

This ensures accidental small movements during clicks don't trigger box selection.

### 2. Multi-Selection Data Model

#### New Selection Structure

**Change from**: `#selected: BBox | null`

**Change to**: `#selected_items: Set<any>` and `#selection_bbox: BBox | null`

```typescript
export abstract class Viewer extends EventTarget {
    // New multi-selection model
    protected #selected_items: Set<any> = new Set();
    protected #selection_bbox: BBox | null = null;

    // Box selection state
    protected #box_selection_start: Vec2 | null = null;
    protected #box_selection_end: Vec2 | null = null;
    protected #is_box_selecting = false;

    // ... existing code
}
```

#### Backward Compatibility

To maintain compatibility with existing code:

```typescript
// Legacy single-selection API (for backward compatibility)
public get selected(): BBox | null {
    if (this.#selected_items.size === 1) {
        const item = Array.from(this.#selected_items)[0];
        // Find bbox for this item
        for (const bbox of this.layers.query_item_bboxes(item)) {
            return bbox;
        }
    }
    return this.#selection_bbox;
}

public set selected(bb: BBox | null) {
    if (bb === null) {
        this.clear_selection();
    } else {
        this.select_item(bb.context);
    }
}

// New multi-selection API
public get selected_items(): ReadonlySet<any> {
    return this.#selected_items;
}

public select_items(items: Iterable<any>, additive = false) {
    if (!additive) {
        this.#selected_items.clear();
    }
    for (const item of items) {
        this.#selected_items.add(item);
    }
    this._update_selection();
}

public select_item(item: any, additive = false) {
    this.select_items([item], additive);
}

public clear_selection() {
    this.#selected_items.clear();
    this.#selection_bbox = null;
    this._update_selection();
}
```

### 3. Box Selection UI/UX

#### Visual Feedback

**Selection Rectangle**:
- **Stroke**: Dashed blue line (2px, rgba(0, 120, 255, 0.8))
- **Fill**: Semi-transparent blue (rgba(0, 120, 255, 0.1))
- **Drawn on**: Overlay layer (always on top)

**Selected Items**:
- **Highlight**: White overlay with 25% opacity (existing)
- **Outline**: 10% growth around bbox (existing)

#### Query Strategy

When box selection completes, query all interactive layers for items:

```typescript
protected complete_box_selection(start: Vec2, end: Vec2) {
    const selection_bbox = BBox.from_corners(
        start.x, start.y, end.x, end.y
    );

    const selected_items = new Set<any>();

    for (const layer of this.layers.interactive_layers()) {
        for (const [item, bbox] of layer.bboxes.entries()) {
            // Check if bbox is fully or partially contained
            if (selection_bbox.contains(bbox) ||
                bbox.intersects(selection_bbox)) {
                selected_items.add(item);
            }
        }
    }

    this.select_items(selected_items);
}
```

**Note**: BBox needs an `intersects()` method (currently missing).

### 4. Mouse Event Handling Modifications

#### Viewer.ts Changes

**Current**:
```typescript
this.disposables.add(
    listen(this.canvas, "click", (e) => {
        const items = this.layers.query_point(this.mouse_position);
        this.on_pick(this.mouse_position, items);
    }),
);
```

**Proposed**:
```typescript
this.disposables.add(
    listen(this.canvas, "mousedown", (e) => {
        if (e.button === 0) { // Left button
            this.on_mouse_down(e);
        }
    }),
);

this.disposables.add(
    listen(this.canvas, "mousemove", (e) => {
        this.on_mouse_change(e);
        if (this.#is_box_selecting) {
            this.on_box_selection_move(e);
        }
    }),
);

this.disposables.add(
    listen(this.canvas, "mouseup", (e) => {
        if (e.button === 0) {
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
        }
    }),
);
```

#### Coordination with PanAndZoom

**Issue**: PanAndZoom listens for `mousedown`, `mousemove`, `mouseup` on middle/right buttons.

**Solution**: PanAndZoom already filters by button (lines 93-98):
```typescript
if (e.button === 1 || e.button === 2) { // Middle or right button
    // ... pan logic
}
```

Our box selection only uses left button (button 0), so **no conflicts**.

### 5. Clipboard Copy Implementation

#### S-Expression Serialization

Need to implement serialization for KiCAD objects back to S-expression format.

**New File**: `src/kicad/serializer.ts`

```typescript
/**
 * Serializes KiCAD objects to S-expression format
 */
export class SExprSerializer {
    private indent_level = 0;
    private indent_str = "  ";

    serialize(obj: any): string {
        if (obj === null || obj === undefined) {
            return "";
        }

        // Detect type and dispatch to appropriate handler
        if (obj.constructor.name === "Wire") {
            return this.serialize_wire(obj);
        } else if (obj.constructor.name === "Junction") {
            return this.serialize_junction(obj);
        }
        // ... more types

        return "";
    }

    private serialize_wire(wire: Wire): string {
        const pts = wire.pts.map(p => `(xy ${p.x} ${p.y})`).join(" ");
        return `(wire (pts ${pts}) (stroke (width ${wire.stroke.width})) (uuid ${wire.uuid}))`;
    }

    // ... more serializers for each type
}
```

**Challenge**: Not all properties are stored - some are computed or defaults. Need to:
1. Track original S-expression if available
2. Use defaults from KiCAD spec
3. Include minimal required properties

#### Alternative: Store Original S-Expression

**Better approach**: Store raw S-expression during parsing.

In `src/kicad/parser.ts`, add raw expression storage:

```typescript
export function parse_expr(expr: Parseable, ...defs: PropertyDefinition[]) {
    const result = { _raw_expr: expr }; // Store original
    // ... existing parsing logic
    return result;
}
```

Then for clipboard copy:

```typescript
protected on_copy() {
    if (this.#selected_items.size === 0) {
        return;
    }

    const s_expressions: string[] = [];

    for (const item of this.#selected_items) {
        if (item._raw_expr) {
            // Use original S-expression
            s_expressions.push(list_to_string(item._raw_expr));
        } else {
            // Fall back to serializer
            s_expressions.push(new SExprSerializer().serialize(item));
        }
    }

    const text = s_expressions.join("\n");

    // Copy to clipboard
    navigator.clipboard.writeText(text).catch(err => {
        console.error("Failed to copy:", err);
    });
}
```

**Helper**: `list_to_string()` to convert parsed List back to string:

```typescript
function list_to_string(expr: List): string {
    let result = "(";
    for (let i = 0; i < expr.length; i++) {
        if (i > 0) result += " ";

        const item = expr[i];
        if (item instanceof List) {
            result += list_to_string(item);
        } else if (typeof item === "string") {
            result += `"${item}"`;
        } else {
            result += String(item);
        }
    }
    result += ")";
    return result;
}
```

### 6. BBox Extensions

Need to add intersection test to BBox class.

**File**: `src/base/math/bbox.ts`

```typescript
/**
 * @returns true if this box intersects with another
 */
intersects(other: BBox): boolean {
    return !(
        this.x2 < other.x ||
        this.x > other.x2 ||
        this.y2 < other.y ||
        this.y > other.y2
    );
}
```

---

## Implementation Plan

### Phase 1: Multi-Selection Model (Foundation)

**Files to modify**:
- `src/viewers/base/viewer.ts`

**Tasks**:
1. Change `#selected: BBox | null` to `#selected_items: Set<any>`
2. Add `#selection_bbox: BBox | null` for combined selection bounds
3. Implement new multi-selection API:
   - `select_items(items, additive)`
   - `select_item(item, additive)`
   - `clear_selection()`
   - `get selected_items()`
4. Keep backward-compatible `get/set selected()` accessors
5. Update `paint_selected()` to handle multiple items

**Testing**:
- Verify existing single-selection still works
- Verify properties panels still work
- Verify selection events fire correctly

### Phase 2: Box Selection Interaction

**Files to modify**:
- `src/viewers/base/viewer.ts`

**Tasks**:
1. Add box selection state variables:
   - `#box_selection_start: Vec2 | null`
   - `#box_selection_end: Vec2 | null`
   - `#is_box_selecting: boolean`
2. Replace `click` listener with `mousedown`/`mousemove`/`mouseup`
3. Implement drag threshold detection (5px)
4. Implement box selection state machine:
   - `on_mouse_down()` - start tracking
   - `on_box_selection_move()` - update box
   - `on_mouse_up()` - complete selection or click
5. Draw selection rectangle on overlay layer
6. Implement `complete_box_selection()` query logic

**Testing**:
- Verify click-to-select still works (no drag)
- Verify box selection works (with drag)
- Verify pan still works (middle/right mouse)
- Verify selection rectangle draws correctly
- Verify multiple items selected

### Phase 3: BBox Extensions

**Files to modify**:
- `src/base/math/bbox.ts`

**Tasks**:
1. Add `intersects(other: BBox): boolean` method

**Testing**:
- Unit tests for intersection detection
- Test edge cases (touching, partial overlap, full containment)

### Phase 4: S-Expression Serialization

**Files to modify**:
- `src/kicad/parser.ts` - Store raw expressions
- `src/kicad/serializer.ts` (new) - Serialize back to S-expr

**Tasks**:
1. **Option A**: Store `_raw_expr` during parsing
   - Modify `parse_expr()` to include raw expression
   - Implement `list_to_string()` helper
2. **Option B**: Implement full serializers
   - Create `SExprSerializer` class
   - Implement serializers for each object type
3. Choose approach based on complexity

**Testing**:
- Verify serialized output matches original
- Test with various object types
- Test with nested structures

### Phase 5: Clipboard Copy

**Files to modify**:
- `src/viewers/base/viewer.ts`

**Tasks**:
1. Add keyboard event listener for Ctrl+C (Cmd+C on Mac)
2. Implement `on_copy()` method:
   - Check if items selected
   - Serialize each item to S-expression
   - Join with newlines
   - Copy to clipboard via `navigator.clipboard.writeText()`
3. Handle clipboard API permissions/errors

**Testing**:
- Verify Ctrl+C copies selected items
- Verify clipboard contains valid S-expressions
- Verify copied text can be pasted into text editor
- Test with schematic viewer
- Test with board viewer

### Phase 6: Visual Polish

**Tasks**:
1. Improve selection rectangle appearance
2. Add animation for selection
3. Show count of selected items
4. Add visual feedback on copy (toast notification?)

---

## Event API Changes

### New Event: `KiCanvasMultiSelectEvent`

**File**: `src/viewers/base/events.ts`

```typescript
interface MultiSelectDetails {
    items: ReadonlySet<any>;
    previous: ReadonlySet<any>;
}

export class KiCanvasMultiSelectEvent extends KiCanvasEvent<MultiSelectDetails> {
    static readonly type = "kicanvas:multiselect";

    constructor(detail: MultiSelectDetails) {
        super(KiCanvasMultiSelectEvent.type, detail, true);
    }
}
```

**Backward compatibility**: Continue firing `KiCanvasSelectEvent` with first item for single selection.

---

## Testing Strategy

### Unit Tests

1. **BBox intersection** (`test/base/math/bbox.test.ts`)
   - Test `intersects()` method
   - Edge cases: touching, overlap, containment

2. **Multi-selection model** (`test/viewers/base/viewer.test.ts`)
   - Test `select_items()`
   - Test `clear_selection()`
   - Test backward compatibility of `selected` getter/setter

3. **Serialization** (`test/kicad/serializer.test.ts`)
   - Test S-expression serialization
   - Test round-trip (parse → serialize → parse)

### Integration Tests

1. **Box selection interaction**
   - Click without drag → single select
   - Click with drag → box select
   - Verify pan still works

2. **Clipboard copy**
   - Select items → Ctrl+C → verify clipboard
   - Test with different item types

---

## Edge Cases and Considerations

### 1. Touch Devices

Box selection with touch:
- Single tap: select
- Long press + drag: box select?
- Two-finger drag: pan (existing)

**Decision**: Defer touch box selection to future enhancement.

### 2. Keyboard Modifiers

- **Ctrl+Click**: Add to selection (additive)
- **Shift+Click**: Range selection (future)
- **Ctrl+A**: Select all (future)
- **Escape**: Clear selection

### 3. Performance

Box selection could select hundreds of items:
- Use `Set<any>` for O(1) add/remove
- Batch paint updates (single `requestAnimationFrame`)
- Consider virtual rendering for large selections

### 4. Hierarchical Sheets

Items span multiple sheets in hierarchy:
- **Current sheet only**: Only select items on visible sheet
- Don't traverse hierarchy in box selection

### 5. Board vs Schematic

Different item types:
- **Schematic**: wires, symbols, labels, junctions, text
- **Board**: footprints, tracks, vias, zones

Same implementation works for both! Serialization handles type differences.

### 6. Clipboard Permissions

`navigator.clipboard.writeText()` requires HTTPS or localhost:
- Show error message if blocked
- Provide fallback: show text in modal for manual copy

---

## Future Enhancements

1. **Cut/Paste** (Ctrl+X, Ctrl+V)
   - Requires editing capabilities
   - Currently KiCanvas is view-only

2. **Drag Selected Items**
   - Click on selected item + drag to move
   - Requires editing capabilities

3. **Delete Selected Items** (Delete key)
   - Requires editing capabilities

4. **Select All** (Ctrl+A)
   - Select all items on current page

5. **Copy with Metadata**
   - Include position offsets
   - Preserve relative positioning

6. **Selection Persistence**
   - Remember selection across page changes?
   - Clear on navigation?

7. **Selection UI Panel**
   - Show list of selected items
   - Click to highlight individual items
   - Remove items from selection

---

## Success Criteria

1. ✅ Users can drag to create selection rectangle
2. ✅ Multiple items selected when in rectangle
3. ✅ Selected items visually highlighted
4. ✅ Ctrl+C copies S-expression to clipboard
5. ✅ Pasted text is valid KiCAD S-expression format
6. ✅ Existing single-click selection still works
7. ✅ Pan/zoom functionality unaffected
8. ✅ Works for both schematic and board viewers

---

## Open Questions

1. **Serialization approach**: Store raw S-expr or implement serializers?
   - **Recommendation**: Store raw S-expr (simpler, guaranteed correct)

2. **Selection mode**: Full containment or partial overlap?
   - **Recommendation**: Partial overlap (more intuitive)

3. **Modifier keys**: Ctrl+Click for additive selection?
   - **Recommendation**: Yes, implement in Phase 2

4. **Clipboard fallback**: Show modal if clipboard API fails?
   - **Recommendation**: Yes, show modal with copyable text

5. **Event compatibility**: Keep firing single-select events?
   - **Recommendation**: Yes, for first item in multi-selection

---

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Multi-Selection Model | 4 hours | Low |
| Phase 2: Box Selection Interaction | 6 hours | Medium |
| Phase 3: BBox Extensions | 1 hour | Low |
| Phase 4: S-Expression Serialization | 8 hours | High |
| Phase 5: Clipboard Copy | 2 hours | Low |
| Phase 6: Visual Polish | 3 hours | Low |
| **Total** | **24 hours** | |

**Highest Risk**: Phase 4 (Serialization) - depends on complexity of KiCAD format.

---

## References

- Current Viewer: `src/viewers/base/viewer.ts:22-251`
- Selection Model: `src/viewers/base/viewer.ts:187-213`
- Pan and Zoom: `src/base/dom/pan-and-zoom.ts:21-235`
- BBox Class: `src/base/math/bbox.ts:13-281`
- Events: `src/viewers/base/events.ts:7-65`
- Schematic Model: `src/kicad/schematic.ts:58-130`
- Parser: `src/kicad/parser.ts`
