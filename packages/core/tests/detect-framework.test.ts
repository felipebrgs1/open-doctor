import { describe, expect, it } from "vite-plus/test";
import { detectFramework, formatFrameworkName } from "../src/project-info/detect-framework.js";

describe("detectFramework", () => {
  it("classifies a Vue + Vite app as vue, not vite", () => {
    expect(detectFramework({ vue: "^3.5.0", vite: "^6.0.0" })).toBe("vue");
  });

  it("classifies Nuxt before Vite", () => {
    expect(detectFramework({ nuxt: "^3.14.0", vue: "^3.5.0", vite: "^6.0.0" })).toBe("nuxt");
  });

  it("classifies a Vue app with no bundler as vue", () => {
    expect(detectFramework({ vue: "^3.4.0" })).toBe("vue");
  });

  it("keeps Astro when Vue is only an island renderer", () => {
    expect(detectFramework({ astro: "^5.0.0", vue: "^3.5.0" })).toBe("astro");
  });

  it("keeps Next.js when both React and Vue are declared", () => {
    expect(detectFramework({ next: "15.0.0", react: "19.0.0", vue: "^3.5.0" })).toBe("nextjs");
  });

  it("does not steal a React + Vite app that also lists Vue", () => {
    expect(detectFramework({ vite: "^6.0.0", react: "19.0.0", vue: "^3.5.0" })).toBe("vite");
  });

  it("still classifies pure Preact as preact", () => {
    expect(detectFramework({ preact: "10.22.0" })).toBe("preact");
  });
});

describe("formatFrameworkName", () => {
  it("names Vue and Nuxt", () => {
    expect(formatFrameworkName("vue")).toBe("Vue");
    expect(formatFrameworkName("nuxt")).toBe("Nuxt");
  });
});
