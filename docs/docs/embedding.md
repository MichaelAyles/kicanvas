# <kicanvas-embed\>: The KiCanvas embedded viewer element

<!-- load kicanvas -->
<script type="module" src="/kicanvas/kicanvas.js"></script>

!!! warning "Work in progress"

    KiCanvas is in **alpha**. This is a proposed API with an incomplete implementation. Everything here is subject to change and you should be cautious if using it on your own web page.

The `<kicanvas-embed>` HTML element embeds one or more KiCAD documents onto the page:

```html
<kicanvas-embed src="my-schematic.kicad_sch"></kicanvas-embed>
```

<kicanvas-embed src="/examples/simple.kicad_sch"></kicanvas-embed>

The above example shows the most basic usage of the `<kicanvas-embed>` element. It's usage is intentionally similar to the [`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) and [`<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) elements. Through the use of additional [attributes](#attributes) you can control how the document is displayed, control interactivity, and load multiple files.

!!! note

    This page's format is modeled after MDN's [HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element). It's intended to be familiar to web developers.

## Installation

During alpha, the best way to install KiCanvas is to [download the bundled kicanvas.js](/kicanvas/kicanvas.js), copy it into your project, and include it with a script tag:

```html
<script type="module" src="/kicanvas.js"></script>
```

## Examples

### Interactivity

This example embeds a single document and enables only basic controls- such as pan, zoom, select, & download:

```html
<kicanvas-embed src="my-schematic.kicad_sch" controls="basic"> </kicanvas-embed>
```

<kicanvas-embed src="/examples/simple.kicad_sch" controls="basic"></kicanvas-embed>

Using `controls="full"`, the viewer gains the sidebar and info panels:

```html
<kicanvas-embed src="my-schematic.kicad_sch" controls="full"> </kicanvas-embed>
```

<kicanvas-embed src="/examples/simple.kicad_sch" controls="full"></kicanvas-embed>

You can disable specific controls and panels using `controlslist`. This example hides the download button:

```html
<kicanvas-embed
    src="my-schematic.kicad_sch"
    controls="basic"
    controlslist="nodownload">
</kicanvas-embed>
```

<kicanvas-embed src="/examples/simple.kicad_sch" controls="basic" controlslist="nodownload"></kicanvas-embed>

### Deep linking

!!! warning "Not yet implemented"

    This functionality hasn't been implemented yet

This example shows that if you give the `<kicanvas-embed>` element an `id`, you can deep link into it using `#[id]:[reference]`:

```html
<kicanvas-embed id="my-schematic" src="my-schematic.kicad_sch" controls="basic">
</kicanvas-embed>

<a href="#my-schematic:Q101">Link to Q101</a>
```

### Theme customization

The `theme` attribute allows you to control the color scheme of the embedded viewer to match your page's design. This is especially useful for supporting light and dark modes.

#### Basic theme usage

```html
<!-- Light theme (KiCad default) -->
<kicanvas-embed src="my-schematic.kicad_sch" theme="kicad"></kicanvas-embed>

<!-- Dark theme (Witch Hazel) -->
<kicanvas-embed
    src="my-schematic.kicad_sch"
    theme="witchhazel"></kicanvas-embed>
```

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
    <div>
        <p><strong>KiCad Theme (Light)</strong></p>
        <kicanvas-embed src="/examples/simple.kicad_sch" theme="kicad" controls="basic"></kicanvas-embed>
    </div>
    <div>
        <p><strong>Witch Hazel Theme (Dark)</strong></p>
        <kicanvas-embed src="/examples/simple.kicad_sch" theme="witchhazel" controls="basic"></kicanvas-embed>
    </div>
</div>

#### Dynamic theme switching

You can change the theme programmatically to match your page's theme:

```html
<kicanvas-embed id="my-viewer" src="my-schematic.kicad_sch"></kicanvas-embed>

<script>
    const viewer = document.getElementById("my-viewer");

    // Wait for the viewer to load before changing theme
    viewer.addEventListener("kicanvas:load", () => {
        viewer.theme = "witchhazel";
    });
</script>
```

#### Matching system dark mode

This example shows how to automatically switch themes based on the user's system preference:

```html
<kicanvas-embed
    id="adaptive-viewer"
    src="my-schematic.kicad_sch"></kicanvas-embed>

<script>
    const viewer = document.getElementById("adaptive-viewer");
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function updateTheme() {
        // Wait for viewer to be ready
        if (!viewer.loaded) {
            viewer.addEventListener("kicanvas:load", updateTheme, {
                once: true,
            });
            return;
        }

        viewer.theme = darkModeQuery.matches ? "witchhazel" : "kicad";
    }

    // Set initial theme
    updateTheme();

    // Listen for system theme changes
    darkModeQuery.addEventListener("change", updateTheme);
</script>
```

#### Integration with page theme

For a complete example of theme integration with page-level theme controls, see the [theme demo page](/debug/theme-demo.html).

### Multiple files

This example shows how to use `<kicanvas-source>` to load multiple files.

```html
<kicanvas-embed controls="full">
    <kicanvas-source src="project.kicad_prj"></kicanvas-source>
    <kicanvas-source src="schematic1.kicad_sch"></kicanvas-source>
    <kicanvas-source src="schematic2.kicad_sch"></kicanvas-source>
    <kicanvas-source src="board.kicad_pcb"></kicanvas-source>
</kicanvas-embed>
```

<kicanvas-embed controls="full">
    <kicanvas-source src="/examples/simple.kicad_sch"></kicanvas-source>
    <kicanvas-source src="/examples/starfish.kicad_pcb"></kicanvas-source>
</kicanvas-embed>

You can switch between the displayed files using the project panel on the right side. Note that if the files are all part of the same project, then the root schematic will be shown by default. If they are unrelated, the first schematic will be shown.

### Inline source

!!! warning "Not yet implemented"

    This functionality hasn't been implemented yet

This example shows how to use `<kicanvas-source>` along with inline KiCAD data. In this case, it's a symbol copied from a schematic and pasted into the HTML source:

```html
<kicanvas-embed>
    <kicanvas-source type="schematic">
        (lib_symbols (symbol "power:+12V" (power) (pin_names (offset 0)) (in_bom
        yes) (on_board yes) (property "Reference" "#PWR" (at 0 -3.81 0) (effects
        (font (size 1.27 1.27)) hide) ) ...
    </kicanvas-source>
</kicanvas-embed>
```

## Attributes

!!! warning "Not yet implemented"

    Attributes marked with a ⚠️ are either not yet implemented or not completely implemented.

-   `controls` - determines if the document is interactive (pan, zoom, etc.) and which controls are available.
    -   `none` - document is not interactive and behaves like an `<img>` (default)
    -   `basic` - zoom, pan, and select are available.
    -   `full` - complete interactive viewer, including side panels.
-   `controlslist` - further customizes the available controls.
    -   `nooverlay` - don't show the "click or tap to interact" overlay.
    -   `nofullscreen` - don't show the fullscreen button. ⚠️
    -   `nodownload` - don't show the download button.
    -   `download` - show the download button when used with controls="none". ⚠️
    -   `nosymbols` - don't show the schematic symbols panel. ⚠️
    -   `nofootprints` - don't show the board footprints panel. ⚠️
    -   `noobjects` - don't show the board objects panel. ⚠️
    -   `noproperties` - don't show the selection properties panel. ⚠️
    -   `noinfo` - don't show the document info panel. ⚠️
    -   `nopreferences` - don't show the user preferences panel. ⚠️
    -   `nohelp` - don't show the help panel. ⚠️
-   `src` - the URL of the document to embed. If you want to show multiple documents within a single viewer, you can use multiple child `<kicanvas-source>` elements.
-   `theme` - sets the color theme to use, valid values are `kicad` and `witchhazel`.
-   `zoom` - sets the initial view into the document. ⚠️
    -   `objects` - zooms to show all visible objects (default). ⚠️
    -   `page` - zooms to show the entire page. ⚠️
    -   `x y w h` - zooms to the given area, similar to the SVG `viewBox` attribute. For example, `10 10 100 100`. ⚠️
    -   `<list of references>` - zooms to include the given symbols or footprints. For example `C101 D101 Q101`. ⚠️

## Events

The `<kicanvas-embed>` element dispatches custom events that you can listen to for interactive behaviors.

| Event Name                   | Fired When                                                                                        | Status          |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | --------------- |
| ⚠️ `kicanvas:click`          | The user clicks or taps within the embedded document                                              | Not implemented |
| ⚠️ `kicanvas:documentchange` | The currently displayed document is changed, either through user interaction or programmatically. | Not implemented |
| ⚠️ `kicanvas:error`          | An error occurs while loading source files                                                        | Not implemented |
| `kicanvas:load`              | All sources files have been successfully loaded                                                   | **Implemented** |
| ⚠️ `kicanvas:loadstart`      | KiCanvas begins loading source files                                                              | Not implemented |
| `kicanvas:select`            | The user selects (or deselects) an object within the document                                     | **Implemented** |

### Using events

```html
<kicanvas-embed id="my-viewer" src="my-schematic.kicad_sch"></kicanvas-embed>

<script>
    const viewer = document.getElementById("my-viewer");

    // Listen for load event
    viewer.addEventListener("kicanvas:load", (event) => {
        console.log("Viewer loaded and ready");
        // Safe to manipulate viewer properties now
        viewer.theme = "witchhazel";
    });

    // Listen for selection events
    viewer.addEventListener("kicanvas:select", (event) => {
        if (event.detail.item) {
            console.log("Selected item:", event.detail.item);
        } else {
            console.log("Selection cleared");
        }
    });
</script>
```

### Event details

#### kicanvas:load

Fired when the viewer has finished loading all files and is ready for interaction. The `loaded` property on the element will be `true` after this event fires.

```javascript
viewer.addEventListener("kicanvas:load", () => {
    console.log("Viewer is ready");
});
```

#### kicanvas:select

Fired when the user selects or deselects items in the viewer. The event detail contains:

-   `detail.item` - The selected item object, or `null` if selection was cleared
-   `detail.previous` - The previously selected item, if any

```javascript
viewer.addEventListener("kicanvas:select", (event) => {
    if (event.detail.item) {
        console.log("Selected:", event.detail.item);
    }
});
```
