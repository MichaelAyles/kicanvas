# KiCanvas Project Documentation

## Project Overview

**KiCanvas** is an interactive, browser-based viewer for KiCAD schematics and PCB boards. It enables users to view and interact with KiCAD design files (`.kicad_sch` and `.kicad_pcb`) directly in a web browser without requiring KiCAD to be installed.

**Status:** Early alpha stage with continuous development
**License:** MIT
**Live Deployment:** https://kicanvas.org
**Repository:** https://github.com/theacodes/kicanvas

### Key Features
- Interactive pan, zoom, and selection
- Supports KiCAD 6+ files (KiCAD 5 not supported)
- Embeddable via Web Component API
- Full-featured shell application
- Theme support
- GitHub integration for loading projects
- Hierarchical schematic sheet navigation
- PCB layer visualization
- Net highlighting

---

## Technology Stack

### Languages & Frameworks
- **TypeScript 5.2** (ES2022 target) - ~9,200 lines across 130 files
- **Web Components** - Custom elements for UI (no external framework dependencies)
- **Vanilla JS** - Fully self-contained with no runtime dependencies

### Rendering
- **Canvas 2D API** - For schematic rendering (simpler geometry)
- **WebGL2** - For PCB board rendering (performance optimization for complex boards)
- Hybrid approach based on document complexity

### Build System
- **esbuild** - Fast JavaScript bundler for production builds
- **TypeScript compiler** - Type checking and compilation
- **npm** - Package management

### Testing
- **@web/test-runner** - Test execution framework
- **Mocha** - Test framework
- **Chai** - Assertion library

### Code Quality
- **ESLint** - TypeScript linting
- **Prettier** - Code formatting
- **TypeScript strict mode** - Strict type checking enabled

---

## Architecture Overview

### High-Level Data Flow

```
Project (VirtualFileSystem)
  ↓
[Load all .kicad_sch, .kicad_pcb, .kicad_pro files]
  ↓
KicadSch / KicadPCB (parsed data models)
  ↓
DocumentViewer (SchematicViewer or BoardViewer)
  ↓
[Painter converts objects to graphics primitives]
  ↓
[Renderer (Canvas2D or WebGL2) draws primitives]
  ↓
HTML Canvas Display
```

### Key Architectural Patterns

1. **Retained-Mode Rendering**
   - Drawing commands cached in layers
   - Efficient re-rendering without recalculation
   - Trade-off: More memory for faster draws

2. **Painter Pattern**
   - ItemPainter classes for each drawable type
   - DocumentPainter orchestrates painting
   - Separates data model from rendering

3. **Visitor Pattern**
   - `document.items()` generator iterates objects
   - Each painter claims responsibility for types

4. **Type Processors**
   - Extensible parsing via T.* type functions
   - Composable type definitions
   - Enables flexible S-expression parsing

5. **Web Components**
   - UI isolation via custom elements
   - Shadow DOM for styling encapsulation
   - Attributes for configuration

6. **Event-Driven Architecture**
   - Custom events for viewer state changes
   - Observable selection model
   - Event bubbling for UI composition

---

## Directory Structure

```
/home/user/kicanvas/
├── src/                          # Main source code (9,193 LOC)
│   ├── base/                     # Core utility libraries
│   │   ├── async.ts              # Async utilities (Barrier, later)
│   │   ├── color.ts              # Color representation and conversion
│   │   ├── disposable.ts         # Resource cleanup patterns
│   │   ├── dom/                  # DOM utilities
│   │   │   ├── pan-and-zoom.ts   # Interactive pan/zoom functionality
│   │   │   ├── size-observer.ts  # Canvas size tracking
│   │   │   └── drag-drop.ts      # File drag-drop support
│   │   ├── math/                 # Vector and geometric math
│   │   │   ├── vec2.ts           # 2D vectors
│   │   │   ├── matrix3.ts        # 3x3 transformation matrices
│   │   │   ├── bbox.ts           # Bounding box calculations
│   │   │   ├── camera2.ts        # 2D camera with viewport
│   │   │   ├── angle.ts          # Angle representation
│   │   │   └── arc.ts            # Arc calculations
│   │   ├── web-components/       # Custom element utilities
│   │   │   ├── custom-element.ts # Base custom element class
│   │   │   ├── decorators.ts     # Property/attribute decorators
│   │   │   └── html.ts           # Template literals
│   │   ├── types.ts              # Type guards and utilities
│   │   ├── iterator.ts           # Iterator utilities
│   │   ├── log.ts                # Logging system
│   │   └── events.ts             # Event utilities
│   │
│   ├── graphics/                 # Rendering abstraction layer
│   │   ├── renderer.ts           # Abstract Renderer base class
│   │   │                         # Implements retained-mode rendering
│   │   │                         # Manages RenderLayers and drawing commands
│   │   ├── shapes.ts             # Geometric primitives
│   │   │                         # Circle, Arc, Polyline, Polygon
│   │   ├── canvas2d.ts           # Canvas 2D renderer implementation
│   │   │                         # Uses Path2D + display lists
│   │   └── webgl/                # WebGL2 renderer
│   │       ├── renderer.ts       # WebGL2 implementation
│   │       ├── vector.ts         # WebGL vector/primitive handling
│   │       └── helpers.ts        # WebGL utilities
│   │
│   ├── kicad/                    # KiCAD file format handling
│   │   ├── tokenizer.ts          # S-expression tokenizer
│   │   │                         # Handles: OPEN, CLOSE, ATOM, NUMBER, STRING
│   │   ├── parser.ts             # S-expression parser
│   │   │                         # Type processors for converting tokens to typed objects
│   │   ├── schematic.ts          # Schematic (.kicad_sch) data model
│   │   │                         # KicadSch, SchematicSymbol, Wire, Bus, Junction, Label
│   │   ├── board.ts              # Board (.kicad_pcb) data model
│   │   │                         # KicadPCB, Footprint, Via, Segment, Zone
│   │   ├── common.ts             # Shared data structures
│   │   │                         # At, Effects, Stroke, Paper, TitleBlock
│   │   ├── project-settings.ts   # Project settings (.kicad_pro)
│   │   ├── drawing-sheet.ts      # Drawing sheet templates
│   │   ├── theme.ts              # Theme definitions
│   │   └── text/                 # Text handling
│   │       ├── stroke-font.ts    # Stroke font rendering
│   │       ├── eda-text.ts       # EDA text layout
│   │       ├── sch-text.ts       # Schematic text
│   │       ├── font.ts           # Font management
│   │       ├── glyph.ts          # Individual glyph handling
│   │       └── markup.ts         # Text markup parsing
│   │
│   ├── viewers/                  # Document viewers
│   │   ├── base/                 # Base classes
│   │   │   ├── viewer.ts         # Abstract Viewer base
│   │   │   │                     # Handles events, selection, mouse interaction
│   │   │   ├── document-viewer.ts # DocumentViewer base for specific formats
│   │   │   ├── painter.ts        # ItemPainter and DocumentPainter classes
│   │   │   │                     # Converts KiCAD objects to graphics primitives
│   │   │   ├── view-layers.ts    # ViewLayer and ViewLayerSet
│   │   │   │                     # Manages rendering layers and hit testing
│   │   │   ├── viewport.ts       # Camera and viewport management
│   │   │   ├── grid.ts           # Grid drawing with LOD
│   │   │   └── events.ts         # Viewer events (select, load, mousemove)
│   │   ├── schematic/            # Schematic viewer
│   │   │   ├── viewer.ts         # SchematicViewer class
│   │   │   ├── painter.ts        # SchematicPainter (main painting logic)
│   │   │   ├── layers.ts         # Schematic-specific layers
│   │   │   └── painters/         # Individual item painters
│   │   │       ├── base.ts       # Base painter classes
│   │   │       ├── symbol.ts     # Symbol rendering
│   │   │       ├── pin.ts        # Pin rendering
│   │   │       └── label.ts      # Label rendering
│   │   ├── board/                # Board viewer
│   │   │   ├── viewer.ts         # BoardViewer class
│   │   │   ├── painter.ts        # BoardPainter (main painting logic)
│   │   │   └── layers.ts         # Board-specific layers
│   │   └── drawing-sheet/        # Drawing sheet viewer
│   │       └── painter.ts        # Drawing sheet rendering
│   │
│   ├── kicanvas/                 # KiCanvas application
│   │   ├── project.ts            # Project management and loading
│   │   │                         # Orchestrates loading of all files, resolves sheets
│   │   ├── preferences.ts        # User preferences
│   │   ├── elements/             # UI Web Components
│   │   │   ├── kicanvas-shell.ts     # Main shell app
│   │   │   ├── kicanvas-embed.ts     # Embeddable element
│   │   │   ├── common/               # Shared UI components
│   │   │   │   ├── app.ts            # Base app element
│   │   │   │   ├── viewer.ts         # Viewer container element
│   │   │   │   ├── project-panel.ts  # File navigation
│   │   │   │   ├── preferences-panel.ts
│   │   │   │   └── help-panel.ts
│   │   │   ├── kc-schematic/        # Schematic-specific UI
│   │   │   │   ├── app.ts
│   │   │   │   ├── viewer.ts
│   │   │   │   ├── symbols-panel.ts
│   │   │   │   ├── properties-panel.ts
│   │   │   │   └── info-panel.ts
│   │   │   └── kc-board/            # Board-specific UI
│   │   │       ├── app.ts
│   │   │       ├── viewer.ts
│   │   │       ├── layers-panel.ts
│   │   │       ├── nets-panel.ts
│   │   │       ├── footprints-panel.ts
│   │   │       ├── objects-panel.ts
│   │   │       ├── properties-panel.ts
│   │   │       └── info-panel.ts
│   │   ├── services/              # External services
│   │   │   ├── vfs.ts             # Virtual File System abstraction
│   │   │   ├── github-vfs.ts      # GitHub API integration
│   │   │   └── github.ts          # GitHub API utilities
│   │   ├── themes/                # Theme definitions
│   │   │   ├── kicad-default.ts
│   │   │   └── witch-hazel.ts
│   │   └── icons/                 # SVG icon sprites
│   │
│   └── kc-ui/                    # Generic UI components library
│       ├── element.ts            # KCUIElement base class
│       ├── app.ts                # App container
│       ├── button.ts             # Button component
│       ├── icon.ts               # Icon component
│       ├── panel.ts              # Panel component
│       ├── activity-side-bar.ts  # Side navigation
│       ├── split-view.ts         # Resizable split panel
│       ├── control-list.ts       # Control list component
│       ├── dropdown.ts           # Dropdown component
│       ├── menu.ts               # Menu component
│       ├── property-list.ts      # Property display
│       └── range.ts              # Range slider
│
├── scripts/                      # Build scripts
│   ├── build.js                  # Main build script
│   ├── bundle.js                 # Bundler configuration
│   ├── serve.js                  # Development server
│   ├── build-font.js             # Font building
│   ├── build-sprites.js          # Icon sprite building
│   └── web-test-runner.config.mjs # Test runner config
│
├── test/                         # Test files
├── docs/                         # Project documentation
├── package.json                  # NPM configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## Core Components

### 1. S-Expression Parser (kicad/)

KiCAD uses S-expressions (Lisp-like syntax) for all file formats:

```lisp
(kicad_sch
  (version 20230121)
  (generator "eeschema")
  (uuid "...")
  (wire
    (pts (xy 10 20) (xy 30 40))
    (stroke (width 0.254))
    (uuid "...")
  )
  (symbol
    (lib_id "Device:R")
    (at 50 60 0)
    (property "Reference" "R1" ...)
  )
)
```

**Tokenizer** (`tokenizer.ts`):
- Converts raw text to tokens: OPEN `(`, CLOSE `)`, ATOM, NUMBER, STRING
- Handles quoted strings, escape sequences, numbers, whitespace, comments
- Supports base64-encoded data (e.g., embedded images)

**Parser** (`parser.ts`):
- Type processors convert tokens to typed objects
- Composable type definitions via `T.*` functions
- Property definitions specify structure:
  - `P.pair()` - Single pair: `(version 20)`
  - `P.positional()` - Positional arg: `(at 10 20)`
  - `P.atom()` - Flag: `(locked)`
  - `P.collection()` - Arrays
  - `T.item()`, `T.object()` - Nested structures

**Supported File Formats:**
- `.kicad_sch` - Schematic files (hierarchical sheets)
- `.kicad_pcb` - PCB board files
- `.kicad_pro` - Project settings
- `.kicad_wks` - Drawing sheet templates

### 2. Rendering System (graphics/)

**Retained-Mode Rendering Pipeline:**

```
1. PAINT PHASE
   Painter.paint(document)
   └─ For each item: ItemPainter.paint() issues drawing commands

2. DRAWING COMMAND ACCUMULATION
   renderer.start_layer(name)
   └─ renderer.circle(), line(), polygon(), arc()
   └─ Drawing commands compiled into RenderLayer
   renderer.end_layer()

3. RENDER PHASE
   renderer.draw()
   └─ For each layer (by z-order):
      └─ Apply layer opacity/visibility
      └─ layer.draw(context, matrix)
```

**Renderer Classes:**

1. **Abstract `Renderer` Base** (`renderer.ts`)
   - Defines graphics API: circle, line, polygon, arc, text
   - Manages RenderLayers
   - Handles render state (color, stroke width, fill)
   - Bounding box calculation

2. **`Canvas2DRenderer`** (`canvas2d.ts`)
   - Uses HTML Canvas 2D context
   - Converts drawing commands to Path2D
   - Optimal for schematics (simple geometry)
   - Uses display list pattern for re-rendering

3. **`WebGL2Renderer`** (`webgl/renderer.ts`)
   - Uses WebGL2 context
   - Vector-based rendering with shaders
   - Shader-based polygon/line tessellation
   - Optimal for complex PCBs with thousands of elements

**RenderLayer Structure:**
```typescript
interface RenderLayer {
    name: string;
    opacity: number;
    visible: boolean;
    draw(ctx: Context, matrix: Matrix3): void;
}
```

### 3. ViewLayer System (viewers/base/view-layers.ts)

Organizes items and graphics by layer for ordered rendering and hit testing.

```typescript
class ViewLayer {
    name: string;
    color: Color;              // Layer color (used by painters)
    opacity: number;           // Layer opacity
    items: any[];              // KiCAD objects on layer
    graphics?: RenderLayer;    // Compiled graphics
    interactive: boolean;      // Can be hit-tested
    bboxes: Map<any, BBox>;    // Item → BBox mapping for selection
    highlighted: boolean;      // For visual emphasis
}
```

**Schematic Layers** (sorted by depth):
- Notes
- Wires
- Bus entries
- Junctions
- Symbols
- Labels
- Pins
- Text

**Board Layers** (physical + virtual):
- Copper layers (F.Cu, B.Cu, Inner 1-28)
- Silkscreen, Mask, Paste
- User layers (Drawings, Comments, Eco)
- Virtual layers for zones, vias, footprints

### 4. Viewer System (viewers/)

**Base Viewer** (`viewers/base/viewer.ts`):
- Abstract base class for all viewers
- Manages canvas, viewport, camera
- Handles mouse interaction (pan, zoom, click)
- Selection model (BBox-based)
- Event dispatching

**DocumentViewer** (`viewers/base/document-viewer.ts`):
- Extends Viewer for specific document types
- Integrates with Painter system
- Manages ViewLayerSet

**SchematicViewer** (`viewers/schematic/viewer.ts`):
- Specialized for `.kicad_sch` files
- Symbol selection by UUID or reference
- Hierarchical sheet navigation
- Wire/bus/junction handling

**BoardViewer** (`viewers/board/viewer.ts`):
- Specialized for `.kicad_pcb` files
- Footprint selection
- Net highlighting
- Layer visibility control

### 5. Selection and Interaction

**Selection Model:**
```typescript
// In Viewer base class
private #selected: BBox | null;

public select(item: BBox | null): void
public get selected(): BBox | null
public zoom_to_selection(): void
```

**BBox Structure:**
- Stores bounding box rectangle (min/max points)
- `.context` property references original object
- Used for hit testing and selection highlighting

**Interaction Flow:**
1. Mouse move → track position → `KiCanvasMouseMoveEvent`
2. Click → hit test via `ViewLayerSet.query_point(position)`
3. Hit found → `on_pick()` → `select(item)`
4. Selection → fire `KiCanvasSelectEvent`
5. Visual feedback → redraw with selection highlight

**Custom Events:**
- `KiCanvasLoadEvent` - Document loaded
- `KiCanvasSelectEvent` - Item selected
- `KiCanvasMouseMoveEvent` - Mouse movement

**Pan and Zoom:**
- Implemented via `PanAndZoom` handler (`base/dom/pan-and-zoom.ts`)
- Mouse wheel zoom
- Click-and-drag pan
- Touch gesture support
- Zoom limits: 0.5x to 190x

### 6. Web Components (kicanvas/elements/)

**Two Main Entry Points:**

1. **`<kicanvas-shell>`** - Full application shell
   - Complete desktop-like UI
   - Side panels, toolbars, navigation
   - Project file browser
   - Properties panels
   - Preferences

2. **`<kicanvas-embed>`** - Embeddable viewer
   - Minimal UI for embedding in websites
   - Attributes: `src`, `theme`, `zoom`, `controls`
   - Can load from GitHub URLs
   - Lightweight and fast

**Usage Example:**
```html
<kicanvas-embed
  src="https://github.com/user/repo/file.kicad_sch"
  theme="kicad-default"
  controls="full">
</kicanvas-embed>
```

---

## Development Workflow

### Build Commands

```bash
# Full build with type checking
npm run build

# Fast build without type checking
npm run build:no-check

# Development server with live reload
npm run serve

# Run tests
npm run test

# Lint and format
npm run lint
npm run format

# Clean build artifacts
npm run clean
```

### Project Structure
- Source: `src/` (TypeScript)
- Output: `build/kicanvas.js` (bundled, minified)
- Tests: `test/` (Mocha + Chai)
- Docs: `docs/` (MkDocs)

### TypeScript Configuration
- Target: ES2022
- Module: ES2022 (ESM)
- Strict mode enabled
- No emit (esbuild handles compilation)

---

## Key Files and Entry Points

### Main Entry Point
**`src/index.ts`**
```typescript
import "./base/livereload";
import "./kicanvas/elements/kicanvas-shell";
import "./kicanvas/elements/kicanvas-embed";
```

### Critical Base Classes
- `src/viewers/base/viewer.ts` - Base viewer with selection/interaction
- `src/graphics/renderer.ts` - Abstract renderer
- `src/kicad/parser.ts` - S-expression parser
- `src/base/web-components/custom-element.ts` - Web Component base

### Data Models
- `src/kicad/schematic.ts` - Schematic data structures
- `src/kicad/board.ts` - PCB board data structures
- `src/kicad/common.ts` - Shared structures

---

## Current Capabilities and Limitations

### What Works
✓ Loading and parsing KiCAD 6+ files
✓ Interactive schematic viewing
✓ Interactive PCB viewing
✓ Pan and zoom
✓ Single-item selection (click-to-select)
✓ Properties display
✓ Layer visibility control
✓ Net highlighting
✓ Hierarchical sheet navigation
✓ Theme support
✓ GitHub integration
✓ Embedding API

### Current Limitations
✗ No box selection (drag to select multiple items)
✗ No multi-select
✗ No clipboard operations (copy/paste)
✗ No editing capabilities (view-only)
✗ No measurements or dimensions
✗ No 3D view
✗ KiCAD 5 files not supported

---

## Testing

### Test Structure
- Unit tests: `test/kicad/` - Parser and data model tests
- Integration tests: `test/sch/`, `test/dom/` - Viewer and interaction tests
- Test files: Individual `.test.ts` files
- Test data: `test/kicad/files/` - Sample KiCAD files

### Running Tests
```bash
npm test
```

Uses @web/test-runner with Chromium for browser-based testing.

---

## Extending KiCanvas

### Adding New Viewer Features
1. Extend `Viewer` or `DocumentViewer` base class
2. Override interaction methods (`on_pick`, `on_mouse_move`)
3. Dispatch custom events for state changes
4. Update painter if visual changes needed

### Adding New File Format Support
1. Define data structures in `src/kicad/`
2. Add property definitions using `P.*` and `T.*`
3. Create parser in constructor
4. Create DocumentViewer subclass
5. Create Painter subclass

### Adding New UI Components
1. Extend `KCUIElement` from `src/kc-ui/element.ts`
2. Define shadow DOM template
3. Add event handlers
4. Register custom element

---

## Resources

- **Documentation**: https://kicanvas.org/docs
- **Repository**: https://github.com/theacodes/kicanvas
- **Issues**: https://github.com/theacodes/kicanvas/issues
- **License**: MIT
- **Author**: Alethea Katherine Flowers

---

## Summary

KiCanvas is a well-architected TypeScript project that provides browser-based viewing of KiCAD electronic design files. It uses a retained-mode rendering system with Canvas 2D and WebGL2, a modular painter pattern for converting data to graphics, and Web Components for UI. The codebase is clean, well-structured, and highly extensible.

The project prioritizes performance (WebGL for complex boards), correctness (strict TypeScript), and developer experience (no build dependencies at runtime, modern ES2022 features).
