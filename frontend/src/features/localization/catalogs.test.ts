/// <reference types="vite/client" />
import { expect, it } from "vitest";
import english from "./messages/en.json";

const catalogs = import.meta.glob<Record<string, string>>(
  "./messages/??.json",
  { eager: true, import: "default" },
);

it("ships complete catalogs and preserves interpolation parameters for every supported language", () => {
  const keys = Object.keys(english).sort();
  for (const code of ["ta", "hi", "te", "kn", "ml", "mr", "bn", "gu", "pa"]) {
    const messages = catalogs[`./messages/${code}.json`];
    expect(messages, `${code} catalog`).toBeDefined();
    expect(Object.keys(messages).sort(), `${code} coverage`).toEqual(keys);
    for (const key of keys) {
      expect(messages[key].trim(), `${code}: ${key}`).not.toBe("");
      expect(
        messages[key].match(/\{\d+\}/g)?.sort() || [],
        `${code}: ${key}`,
      ).toEqual(key.match(/\{\d+\}/g)?.sort() || []);
    }
  }
});
