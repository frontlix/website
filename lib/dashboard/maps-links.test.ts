import { describe, it, expect } from "vitest";
import {
  streetViewHref,
  satelliteHref,
  mapsSearchHref,
  locatieLinks,
} from "./maps-links";

describe("streetViewHref", () => {
  it("bouwt een pano-link op coordinaten", () => {
    expect(streetViewHref(51.5, 3.6)).toBe(
      "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=51.5,3.6",
    );
  });
  it("geeft null zonder coordinaten", () => {
    expect(streetViewHref(null, 3.6)).toBeNull();
    expect(streetViewHref(51.5, null)).toBeNull();
    expect(streetViewHref(undefined, undefined)).toBeNull();
  });
});

describe("satelliteHref", () => {
  it("bouwt een ingezoomde satelliet-link op coordinaten", () => {
    expect(satelliteHref(51.5, 3.6)).toBe(
      "https://www.google.com/maps/@?api=1&map_action=map&center=51.5,3.6&zoom=20&basemap=satellite",
    );
  });
  it("geeft null zonder coordinaten", () => {
    expect(satelliteHref(null, null)).toBeNull();
  });
});

describe("mapsSearchHref", () => {
  it("encodeert het adres in de query", () => {
    expect(mapsSearchHref("Lange Noordstraat 1, 4331 Middelburg")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Lange%20Noordstraat%201%2C%204331%20Middelburg",
    );
  });
});

describe("locatieLinks", () => {
  const adres = "Lange Noordstraat 1, 4331 Middelburg";

  it("geeft Street View + Satelliet met coordinaten", () => {
    const links = locatieLinks({ lat: 51.5, lng: 3.6, adres, heeftAdres: true });
    expect(links.map((l) => l.label)).toEqual(["Street View", "Satelliet"]);
    expect(links[0].href).toContain("map_action=pano");
    expect(links[1].href).toContain("basemap=satellite");
  });

  it("valt zonder coordinaten terug op een enkele Maps-link op het adres", () => {
    const links = locatieLinks({ lat: null, lng: null, adres, heeftAdres: true });
    expect(links).toHaveLength(1);
    expect(links[0].label).toBe("Open in Maps");
    expect(links[0].href).toContain("/maps/search/");
  });

  it("geeft geen linkjes zonder coordinaten en zonder adres", () => {
    const links = locatieLinks({ lat: null, lng: null, adres: "", heeftAdres: false });
    expect(links).toEqual([]);
  });
});
