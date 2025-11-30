/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, BBox, Arc as MathArc, Matrix3, Vec2 } from "../../base/math";
import {
    Arc,
    Circle,
    Color,
    Polygon,
    Polyline,
    Renderer,
} from "../../graphics";
import type { SchematicTheme } from "../../kicad";
import * as schematic_items from "../../kicad/schematic";
import { LibText, SchField, SchText, StrokeFont } from "../../kicad/text";
import { LayerNames, LayerSet, ViewLayer } from "./layers";
import { BaseSchematicPainter, SchematicItemPainter } from "./painters/base";
import {
    GlobalLabelPainter,
    HierarchicalLabelPainter,
    NetLabelPainter,
} from "./painters/label";
import { PinPainter } from "./painters/pin";
import { LibSymbolPainter, SchematicSymbolPainter } from "./painters/symbol";

class RectanglePainter extends SchematicItemPainter {
    classes = [schematic_items.Rectangle];

    layers_for(item: schematic_items.Rectangle) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, r: schematic_items.Rectangle) {
        const pts = [
            r.start,
            new Vec2(r.end.x, r.start.y),
            r.end,
            new Vec2(r.start.x, r.end.y),
            r.start,
        ];

        this.#fill(layer, r, pts);
        this.#stroke(layer, r, pts);
    }

    #stroke(layer: ViewLayer, r: schematic_items.Rectangle, pts: Vec2[]) {
        const { width, color } = this.determine_stroke(layer, r);

        if (!width || !color) {
            return;
        }

        this.gfx.line(
            new Polyline(
                pts,
                r.stroke?.width || this.gfx.state.stroke_width,
                color,
            ),
        );
    }

    #fill(layer: ViewLayer, r: schematic_items.Rectangle, pts: Vec2[]) {
        const color = this.determine_fill(layer, r);

        if (!color) {
            return;
        }

        this.gfx.polygon(new Polygon(pts, color));
    }
}

class PolylinePainter extends SchematicItemPainter {
    classes = [schematic_items.Polyline];

    layers_for(item: schematic_items.Polyline) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, pl: schematic_items.Polyline) {
        this.#fill(layer, pl);
        this.#stroke(layer, pl);
    }

    #stroke(layer: ViewLayer, pl: schematic_items.Polyline) {
        const { width, color } = this.determine_stroke(layer, pl);

        if (!width || !color) {
            return;
        }

        this.gfx.line(new Polyline(pl.pts, width, color));
    }

    #fill(layer: ViewLayer, pl: schematic_items.Polyline) {
        const color = this.determine_fill(layer, pl);

        if (!color) {
            return;
        }

        this.gfx.polygon(new Polygon(pl.pts, color));
    }
}

class WirePainter extends SchematicItemPainter {
    classes = [schematic_items.Wire];

    layers_for(item: schematic_items.Wire) {
        return [LayerNames.wire];
    }

    paint(layer: ViewLayer, w: schematic_items.Wire) {
        this.gfx.line(
            new Polyline(w.pts, this.gfx.state.stroke_width, this.theme.wire),
        );
    }
}

class BusPainter extends SchematicItemPainter {
    classes = [schematic_items.Bus];

    layers_for(item: schematic_items.Bus) {
        return [LayerNames.wire];
    }

    paint(layer: ViewLayer, w: schematic_items.Bus) {
        this.gfx.line(
            new Polyline(
                w.pts,
                schematic_items.DefaultValues.bus_width,
                this.theme.bus,
            ),
        );
    }
}

class BusEntryPainter extends SchematicItemPainter {
    classes = [schematic_items.BusEntry];

    layers_for(item: schematic_items.BusEntry) {
        return [LayerNames.junction];
    }

    paint(layer: ViewLayer, be: schematic_items.BusEntry) {
        this.gfx.line(
            new Polyline(
                [be.at.position, be.at.position.add(be.size)],
                schematic_items.DefaultValues.wire_width,
                this.theme.wire,
            ),
        );
    }
}

class CirclePainter extends SchematicItemPainter {
    classes = [schematic_items.Circle];

    layers_for(item: schematic_items.Circle) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, c: schematic_items.Circle) {
        this.#fill(layer, c);
        this.#stroke(layer, c);
    }

    #stroke(layer: ViewLayer, c: schematic_items.Circle) {
        const { width, color } = this.determine_stroke(layer, c);

        if (!width || !color) {
            return;
        }

        this.gfx.arc(
            new Arc(
                c.center,
                c.radius,
                new Angle(0),
                new Angle(Math.PI * 2),
                width,
                color,
            ),
        );
    }

    #fill(layer: ViewLayer, c: schematic_items.Circle) {
        const color = this.determine_fill(layer, c);

        if (!color) {
            return;
        }

        this.gfx.circle(new Circle(c.center, c.radius, color));
    }
}

class ArcPainter extends SchematicItemPainter {
    classes = [schematic_items.Arc];

    layers_for(item: schematic_items.Arc) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, a: schematic_items.Arc) {
        const arc = MathArc.from_three_points(
            a.start,
            a.mid,
            a.end,
            a.stroke?.width,
        );

        this.#fill(layer, a, arc);
        this.#stroke(layer, a, arc);
    }

    #stroke(layer: ViewLayer, a: schematic_items.Arc, arc: MathArc) {
        const { width, color } = this.determine_stroke(layer, a);

        if (!width || !color) {
            return;
        }

        this.gfx.arc(
            new Arc(
                arc.center,
                arc.radius,
                arc.start_angle,
                arc.end_angle,
                width,
                color,
            ),
        );
    }

    #fill(layer: ViewLayer, a: schematic_items.Arc, arc: MathArc) {
        const color = this.determine_fill(layer, a);

        if (!color) {
            return;
        }

        this.gfx.polygon(new Polygon(arc.to_polygon(), color));
    }
}

class JunctionPainter extends SchematicItemPainter {
    classes = [schematic_items.Junction];

    layers_for(item: schematic_items.Junction) {
        return [LayerNames.junction];
    }

    paint(layer: ViewLayer, j: schematic_items.Junction) {
        const color = this.theme.junction;
        this.gfx.circle(
            new Circle(j.at.position, (j.diameter || 1) / 2, color),
        );
    }
}

class NoConnectPainter extends SchematicItemPainter {
    classes = [schematic_items.NoConnect];

    layers_for(item: schematic_items.NoConnect) {
        return [LayerNames.junction];
    }

    paint(layer: ViewLayer, nc: schematic_items.NoConnect): void {
        const color = this.theme.no_connect;
        const width = schematic_items.DefaultValues.line_width;
        const size = schematic_items.DefaultValues.noconnect_size / 2;

        this.gfx.state.push();
        this.gfx.state.matrix.translate_self(
            nc.at.position.x,
            nc.at.position.y,
        );

        this.gfx.line(
            new Polyline(
                [new Vec2(-size, -size), new Vec2(size, size)],
                width,
                color,
            ),
        );

        this.gfx.line(
            new Polyline(
                [new Vec2(size, -size), new Vec2(-size, size)],
                width,
                color,
            ),
        );

        this.gfx.state.pop();
    }
}

class TextPainter extends SchematicItemPainter {
    classes = [schematic_items.Text];

    layers_for(item: schematic_items.Text) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, t: schematic_items.Text) {
        if (t.effects.hide || !t.text) {
            return;
        }

        const schtext = new SchText(t.shown_text);

        schtext.apply_at(t.at);
        schtext.apply_effects(t.effects);

        const font_color = t.effects.font.color;
        if (font_color.is_transparent_black) {
            // The color was not specified.
            const text_color = this.theme.note;
            schtext.attributes.color = this.dim_if_needed(text_color);
        } else {
            schtext.attributes.color = this.dim_if_needed(font_color);
        }

        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            schtext.shown_text,
            schtext.text_pos,
            schtext.attributes,
        );
        this.gfx.state.pop();
    }
}

class TextBoxPainter extends SchematicItemPainter {
    classes = [schematic_items.TextBox];

    layers_for(item: schematic_items.TextBox) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, tb: schematic_items.TextBox) {
        // Draw box
        const pos = tb.at.position;
        const size = tb.size;
        const pts = [
            pos,
            new Vec2(pos.x + size.x, pos.y),
            new Vec2(pos.x + size.x, pos.y + size.y),
            new Vec2(pos.x, pos.y + size.y),
            pos,
        ];

        this.#fill(layer, tb, pts);
        this.#stroke(layer, tb, pts);
        this.#text(layer, tb);
    }

    #stroke(layer: ViewLayer, tb: schematic_items.TextBox, pts: Vec2[]) {
        const width = tb.stroke?.width || this.gfx.state.stroke_width;

        if (width < 0) {
            return;
        }

        const stroke_type = tb.stroke?.type ?? "none";
        if (stroke_type == "none") {
            return;
        }

        const default_stroke = this.theme.note;
        const color = this.dim_if_needed(tb.stroke?.color ?? default_stroke);

        this.gfx.line(new Polyline(pts, width, color));
    }

    #fill(layer: ViewLayer, tb: schematic_items.TextBox, pts: Vec2[]) {
        const fill_type = tb.fill?.type ?? "none";

        if (fill_type == "none") {
            return;
        }

        let color: Color | undefined;

        switch (fill_type) {
            case "background":
                color = this.theme.component_body;
                break;
            case "outline":
                color = this.theme.component_outline;
                break;
            case "color":
                color = tb.fill!.color;
                break;
        }

        if (color) {
            this.gfx.polygon(new Polygon(pts, this.dim_if_needed(color)));
        }
    }

    #text(layer: ViewLayer, tb: schematic_items.TextBox) {
        if (tb.effects.hide || !tb.text) {
            return;
        }

        const schtext = new SchText(tb.shown_text);

        // Apply margins - margins are [left, top, right, bottom]
        const margins = tb.margins || [0, 0, 0, 0];
        const marginLeft = margins[0] || 0;
        const marginTop = margins[1] || 0;

        // Position text at top-left of box plus margins
        const textPos = new Vec2(
            tb.at.position.x + marginLeft,
            tb.at.position.y + marginTop,
        );

        schtext.text_pos = textPos;
        schtext.apply_effects(tb.effects);

        const font_color = tb.effects.font.color;
        if (font_color.is_transparent_black) {
            const text_color = this.theme.note;
            schtext.attributes.color = this.dim_if_needed(text_color);
        } else {
            schtext.attributes.color = this.dim_if_needed(font_color);
        }

        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            schtext.shown_text,
            schtext.text_pos,
            schtext.attributes,
        );
        this.gfx.state.pop();
    }
}

class TablePainter extends SchematicItemPainter {
    classes = [schematic_items.Table];

    layers_for(item: schematic_items.Table) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, table: schematic_items.Table) {
        // Paint cells
        for (const cell of table.cells) {
            this.#paintCell(layer, table, cell);
        }

        // Paint borders
        this.#paintBorders(layer, table);
    }

    #paintCell(
        layer: ViewLayer,
        table: schematic_items.Table,
        cell: schematic_items.TableCell,
    ) {
        const pos = cell.at.position;
        const size = cell.size;
        const pts = [
            pos,
            new Vec2(pos.x + size.x, pos.y),
            new Vec2(pos.x + size.x, pos.y + size.y),
            new Vec2(pos.x, pos.y + size.y),
            pos,
        ];

        // Fill cell if specified
        if (cell.fill?.type && cell.fill.type !== "none") {
            let fillColor: Color | undefined;
            if (cell.fill.type === "color" && cell.fill.color) {
                fillColor = cell.fill.color;
            } else if (cell.fill.type === "background") {
                fillColor = this.theme.sheet_background;
            }
            if (fillColor) {
                this.gfx.polygon(new Polygon(pts.slice(0, -1), fillColor));
            }
        }

        // Draw cell text
        this.#paintCellText(cell);
    }

    #paintCellText(cell: schematic_items.TableCell) {
        if (cell.effects.hide || !cell.text) {
            return;
        }

        const schtext = new SchText(cell.shown_text);

        // Apply margins - margins are [left, top, right, bottom]
        const margins = cell.margins || [0, 0, 0, 0];
        const marginLeft = margins[0] || 0;
        const marginTop = margins[1] || 0;

        // Position text at cell position plus margins
        const textPos = new Vec2(
            cell.at.position.x + marginLeft,
            cell.at.position.y + marginTop,
        );

        schtext.text_pos = textPos;
        schtext.apply_effects(cell.effects);

        const font_color = cell.effects.font.color;
        if (font_color.is_transparent_black) {
            const text_color = this.theme.note;
            schtext.attributes.color = this.dim_if_needed(text_color);
        } else {
            schtext.attributes.color = this.dim_if_needed(font_color);
        }

        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            schtext.shown_text,
            schtext.text_pos,
            schtext.attributes,
        );
        this.gfx.state.pop();
    }

    #paintBorders(layer: ViewLayer, table: schematic_items.Table) {
        const bbox = table.bbox;

        // Draw external border if specified
        if (table.border?.external && table.border.stroke) {
            const strokeWidth =
                table.border.stroke.width || this.gfx.state.stroke_width;
            const strokeColor =
                table.border.stroke.color?.is_transparent_black === false
                    ? table.border.stroke.color
                    : this.theme.note;

            const pts = [
                bbox.top_left,
                bbox.top_right,
                bbox.bottom_right,
                bbox.bottom_left,
                bbox.top_left,
            ];
            this.gfx.line(new Polyline(pts, strokeWidth, strokeColor));
        }

        // Draw separators if specified
        if (table.separators && table.separators.stroke) {
            const strokeWidth =
                table.separators.stroke.width || this.gfx.state.stroke_width;
            const strokeColor =
                table.separators.stroke.color?.is_transparent_black === false
                    ? table.separators.stroke.color
                    : this.theme.note;

            // Draw column separators
            if (table.separators.cols && table.column_widths.length > 1) {
                let x = bbox.x;
                for (let i = 0; i < table.column_widths.length - 1; i++) {
                    x += table.column_widths[i]!;
                    this.gfx.line(
                        new Polyline(
                            [new Vec2(x, bbox.y), new Vec2(x, bbox.y + bbox.h)],
                            strokeWidth,
                            strokeColor,
                        ),
                    );
                }
            }

            // Draw row separators
            if (table.separators.rows && table.row_heights.length > 1) {
                let y = bbox.y;
                for (let i = 0; i < table.row_heights.length - 1; i++) {
                    y += table.row_heights[i]!;
                    this.gfx.line(
                        new Polyline(
                            [new Vec2(bbox.x, y), new Vec2(bbox.x + bbox.w, y)],
                            strokeWidth,
                            strokeColor,
                        ),
                    );
                }
            }
        }
    }
}

class PropertyPainter extends SchematicItemPainter {
    classes = [schematic_items.Property];

    layers_for(item: schematic_items.Property) {
        return [LayerNames.symbol_field, LayerNames.interactive];
    }

    paint(layer: ViewLayer, p: schematic_items.Property) {
        if (p.effects.hide || !p.text) {
            return;
        }

        let color = this.theme.fields;
        if (p.parent instanceof schematic_items.SchematicSheet) {
            color = this.theme.sheet_fields;
        }

        const font_color = p.effects.font.color;
        if (font_color.is_transparent_black) {
            // The color was not specified.
            switch (p.name) {
                case "Reference":
                    color = this.theme.reference;
                    break;
                case "Value":
                    color = this.theme.value;
                    break;
                case "Sheet name":
                    color = this.theme.sheet_name;
                    break;
                case "Sheet file":
                    color = this.theme.sheet_filename;
                    break;
            }

            color = this.dim_if_needed(color);
        } else {
            color = this.dim_if_needed(font_color);
        }

        const parent = p.parent as schematic_items.SchematicSymbol;
        const transform = this.view_painter.current_symbol_transform;
        const matrix = transform?.matrix ?? Matrix3.identity();

        let text = p.shown_text;

        if (p.name == "Reference" && parent.unit) {
            text += parent.unit_suffix;
        }

        const schfield = new SchField(text, {
            position: parent.at.position.multiply(10000),
            transform: matrix,
            is_symbol: parent instanceof schematic_items.SchematicSymbol,
        });

        schfield.apply_effects(p.effects);
        schfield.attributes.angle = Angle.from_degrees(p.at.rotation);

        // Position is tricky. KiCAD's parser calls into SCH_FIELD::SetPosition
        // when parsing which sets the position relative to the parent transform
        // but KiCanvas doesn't do any of that. So we have to do that transform
        // here.
        let rel_position = p.at.position
            .multiply(10000)
            .sub(schfield.parent!.position);
        rel_position = matrix.inverse().transform(rel_position);
        rel_position = rel_position.add(schfield.parent!.position);

        schfield.text_pos = rel_position;

        const orient = schfield.draw_rotation;
        const bbox = schfield.bounding_box;
        const pos = bbox.center;

        schfield.attributes.angle = orient;
        schfield.attributes.h_align = "center";
        schfield.attributes.v_align = "center";
        schfield.attributes.stroke_width =
            schfield.get_effective_text_thickness(
                schematic_items.DefaultValues.line_width * 10000,
            );
        schfield.attributes.color = color;

        const bbox_pts = Matrix3.scaling(0.0001, 0.0001).transform_all([
            bbox.top_left,
            bbox.top_right,
            bbox.bottom_right,
            bbox.bottom_left,
            bbox.top_left,
        ]);

        if (layer.name == LayerNames.interactive) {
            // drawing text is expensive, just draw the bbox for the interactive layer.
            this.gfx.line(new Polyline(Array.from(bbox_pts), 0.1, Color.white));
        } else {
            this.gfx.state.push();
            StrokeFont.default().draw(
                this.gfx,
                schfield.shown_text,
                pos,
                schfield.attributes,
            );
            this.gfx.state.pop();
        }
    }
}

class LibTextPainter extends SchematicItemPainter {
    classes = [schematic_items.LibText];

    layers_for(item: schematic_items.LibText) {
        return [LayerNames.symbol_foreground];
    }

    paint(layer: ViewLayer, lt: schematic_items.LibText) {
        if (lt.effects.hide || !lt.text) {
            return;
        }

        const current_symbol_transform =
            this.view_painter.current_symbol_transform!;

        const libtext = new LibText(lt.shown_text);

        libtext.apply_effects(lt.effects);
        libtext.apply_at(lt.at);
        libtext.apply_symbol_transformations(current_symbol_transform);

        libtext.attributes.color = this.dim_if_needed(
            this.theme.component_outline,
        );

        // This gets the absolute world coordinates where the text should
        // be drawn.
        const pos = libtext.world_pos;

        // world_pos already applies v_align, so set it to center to draw
        // the text in the right spot.
        // Note: I'm not sure why it doesn't clear h_align like SchField
        // does.
        libtext.attributes.v_align = "center";

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.identity();

        StrokeFont.default().draw(
            this.gfx,
            libtext.shown_text,
            pos,
            libtext.attributes,
        );

        // this.paint_debug(bbox);

        this.gfx.state.pop();
    }

    paint_debug(bbox: BBox) {
        this.gfx.line(
            Polyline.from_BBox(
                bbox.scale(1 / 10000),
                0.127,
                new Color(0, 0, 1, 1),
            ),
        );

        this.gfx.circle(
            new Circle(
                bbox.center.multiply(1 / 10000),
                0.2,
                new Color(0, 1, 0, 1),
            ),
        );
    }
}

class SchematicSheetPainter extends SchematicItemPainter {
    classes = [schematic_items.SchematicSheet];

    layers_for(item: schematic_items.SchematicSheet) {
        return [
            LayerNames.interactive,
            LayerNames.label,
            LayerNames.symbol_foreground,
            LayerNames.symbol_background,
            LayerNames.symbol_field,
        ];
    }

    paint(layer: ViewLayer, ss: schematic_items.SchematicSheet) {
        const outline_color = this.theme.sheet;
        const fill_color = this.theme.sheet_background;
        const bbox = new BBox(
            ss.at.position.x,
            ss.at.position.y,
            ss.size.x,
            ss.size.y,
        );

        if (layer.name == LayerNames.interactive) {
            this.gfx.polygon(Polygon.from_BBox(bbox.grow(3), fill_color));
        }

        if (layer.name == LayerNames.symbol_background) {
            this.gfx.polygon(Polygon.from_BBox(bbox, fill_color));
        }

        if (layer.name == LayerNames.symbol_foreground) {
            this.gfx.line(
                Polyline.from_BBox(
                    bbox,
                    this.gfx.state.stroke_width,
                    outline_color,
                ),
            );
        }

        if (layer.name == LayerNames.symbol_field) {
            for (const property of ss.properties.values()) {
                this.view_painter.paint_item(layer, property);
            }
        }

        if (layer.name == LayerNames.label) {
            for (const pin of ss.pins) {
                const label = new schematic_items.HierarchicalLabel();
                label.at = pin.at.copy();
                label.effects = pin.effects;
                label.text = pin.name;
                label.shape = pin.shape;

                switch (label.at.rotation) {
                    case 0:
                        label.at.rotation = 180;
                        break;
                    case 180:
                        label.at.rotation = 0;
                        break;
                    case 90:
                        label.at.rotation = 270;
                        break;
                    case 270:
                        label.at.rotation = 90;
                        break;
                }

                if (pin.shape == "input") {
                    label.shape = "output";
                } else if (pin.shape == "output") {
                    label.shape = "input";
                }

                this.view_painter.paint_item(layer, label);
            }
        }
    }
}

export class SchematicPainter extends BaseSchematicPainter {
    override theme: SchematicTheme;

    constructor(gfx: Renderer, layers: LayerSet, theme: SchematicTheme) {
        super(gfx, layers, theme);
        this.painter_list = [
            new RectanglePainter(this, gfx),
            new PolylinePainter(this, gfx),
            new WirePainter(this, gfx),
            new BusPainter(this, gfx),
            new BusEntryPainter(this, gfx),
            new CirclePainter(this, gfx),
            new ArcPainter(this, gfx),
            new JunctionPainter(this, gfx),
            new NoConnectPainter(this, gfx),
            new TextPainter(this, gfx),
            new TextBoxPainter(this, gfx),
            new TablePainter(this, gfx),
            new LibTextPainter(this, gfx),
            new PinPainter(this, gfx),
            new LibSymbolPainter(this, gfx),
            new PropertyPainter(this, gfx),
            new SchematicSymbolPainter(this, gfx),
            new NetLabelPainter(this, gfx),
            new GlobalLabelPainter(this, gfx),
            new HierarchicalLabelPainter(this, gfx),
            new SchematicSheetPainter(this, gfx),
        ];
    }
}
