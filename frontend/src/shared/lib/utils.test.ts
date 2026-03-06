import { describe, expect, it } from "vitest";

import { cn, slugify } from "./utils";


describe("utils smoke", () => {
  it("joins classes", () => {
    expect(cn("a", null, "b", undefined, false)).toBe("a b");
  });

  it("slugifies text", () => {
    expect(slugify("My Club Moscow")).toBe("my-club-moscow");
  });
});
