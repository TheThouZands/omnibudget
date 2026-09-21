import { describe, expect, it } from "vitest";

import { escapeEmailHtml, renderEmailLayout } from "./layout";

describe("email layout", () => {
  it("escapes HTML in interpolated text", () => {
    expect(escapeEmailHtml('<a title="Tom & Ana\'s">')).toBe(
      "&lt;a title=&quot;Tom &amp; Ana&#39;s&quot;&gt;",
    );
  });

  it("escapes the title and preview but preserves trusted template markup", () => {
    const html = renderEmailLayout({
      title: "<script>unexpected()</script>",
      preview: "<img src=x onerror=unexpected()>",
      contentHtml: "<h1>Contenido de la plantilla</h1>",
    });

    expect(html).toContain("&lt;script&gt;unexpected()&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=unexpected()&gt;");
    expect(html).not.toMatch(/<script\b|<img src=x/);
    expect(html).toContain("<h1>Contenido de la plantilla</h1>");
  });
});
