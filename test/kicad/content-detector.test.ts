/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import {
    detectContentType,
    isFragment,
    isFullDocument,
} from "../../src/kicad/content-detector";

suite(
    "kicad.content-detector.detectContentType(): content type detection",
    () => {
        test("with empty content", () => {
            assert.equal(detectContentType(""), "unknown");
            assert.equal(detectContentType("   "), "unknown");
        });

        test("with JSON content (kicad_pro)", () => {
            assert.equal(detectContentType('{"meta": {}}'), "kicad_pro");
            assert.equal(detectContentType('  {"schematic": {}}'), "kicad_pro");
        });

        test("with full kicad_sch document", () => {
            const content = `(kicad_sch
            (version 20231120)
            (generator "kicanvas")
            (uuid "test-uuid")
        )`;
            assert.equal(detectContentType(content), "kicad_sch");
        });

        test("with full kicad_pcb document", () => {
            const content = `(kicad_pcb
            (version 20231120)
            (generator "kicanvas")
        )`;
            assert.equal(detectContentType(content), "kicad_pcb");
        });

        test("with schematic fragment - text element", () => {
            const content = `(text "test"
            (at 100 100 0)
            (effects (font (size 1.27 1.27)))
            (uuid "test-uuid")
        )`;
            assert.equal(detectContentType(content), "sch_fragment");
        });

        test("with schematic fragment - wire element", () => {
            const content = `(wire (pts (xy 43.18 195.58) (xy 31.75 195.58))
            (stroke (width 0) (type default))
            (uuid "test-uuid"))`;
            assert.equal(detectContentType(content), "sch_fragment");
        });

        test("with schematic fragment - symbol element", () => {
            const content = `(symbol (lib_id "Device:R") (at 100 100 0) (unit 1)
            (uuid "test-uuid"))`;
            assert.equal(detectContentType(content), "sch_fragment");
        });

        test("with schematic fragment - text_box element", () => {
            const content = `(text_box "test content"
            (at 100 100 0)
            (size 50 50)
            (uuid "test-uuid"))`;
            assert.equal(detectContentType(content), "sch_fragment");
        });

        test("with schematic fragment - multiple elements", () => {
            const content = `(text "first" (at 0 0 0) (uuid "1"))
        (text "second" (at 10 10 0) (uuid "2"))`;
            assert.equal(detectContentType(content), "sch_fragment");
        });

        test("with pcb fragment - footprint element", () => {
            const content = `(footprint "Package:QFN-48"
            (layer "F.Cu")
            (uuid "test-uuid"))`;
            assert.equal(detectContentType(content), "pcb_fragment");
        });

        test("with pcb fragment - segment element", () => {
            const content = `(segment (start 100 100) (end 110 100)
            (width 0.25) (layer "F.Cu") (net 1))`;
            assert.equal(detectContentType(content), "pcb_fragment");
        });

        test("with pcb fragment - via element", () => {
            const content = `(via (at 100 100) (size 0.8) (drill 0.4)
            (layers "F.Cu" "B.Cu") (net 1))`;
            assert.equal(detectContentType(content), "pcb_fragment");
        });

        test("with pcb fragment - gr_line element", () => {
            const content = `(gr_line (start 0 0) (end 100 100)
            (layer "Edge.Cuts") (width 0.15))`;
            assert.equal(detectContentType(content), "pcb_fragment");
        });

        test("with drawing sheet document", () => {
            const content = `(kicad_wks
            (version 20210606)
            (generator "kicanvas"))`;
            assert.equal(detectContentType(content), "kicad_wks");
        });
    },
);

suite("kicad.content-detector.isFragment()", () => {
    test("returns true for fragment types", () => {
        assert.equal(isFragment("sch_fragment"), true);
        assert.equal(isFragment("pcb_fragment"), true);
    });

    test("returns false for document types", () => {
        assert.equal(isFragment("kicad_sch"), false);
        assert.equal(isFragment("kicad_pcb"), false);
        assert.equal(isFragment("unknown"), false);
    });
});

suite("kicad.content-detector.isFullDocument()", () => {
    test("returns true for document types", () => {
        assert.equal(isFullDocument("kicad_sch"), true);
        assert.equal(isFullDocument("kicad_pcb"), true);
        assert.equal(isFullDocument("kicad_wks"), true);
        assert.equal(isFullDocument("kicad_sym"), true);
    });

    test("returns false for fragment types", () => {
        assert.equal(isFullDocument("sch_fragment"), false);
        assert.equal(isFullDocument("pcb_fragment"), false);
        assert.equal(isFullDocument("unknown"), false);
    });
});
