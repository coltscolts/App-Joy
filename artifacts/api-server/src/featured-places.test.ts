import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFeaturedPlaces } from "./featured-places";
import type { ActivitySuggestion, TravelSuggestionParams } from "./openai";

const base: TravelSuggestionParams = { destination: "Ciudad de México, México", adults: 2, children: 0, category: "bar", date: "2030-05-01", language: "es", budget: "medium" };
const idea = (title: string, category = "bar"): ActivitySuggestion => ({ title, category, description: "", location: "", estimatedTime: "", kidFriendly: false, budget: "medium" });

test("GOATROOM MX goes first for bars in Mexico City, without duplicates", () => {
  const result = applyFeaturedPlaces(base, [idea("Licorería Limantour"), idea("Goatroom")]);
  assert.equal(result[0].title, "GOATROOM MX");
  assert.equal(result[0].featured, true);
  assert.equal(result[0].category, "bar");
  assert.deepEqual(result.map((s) => s.title), ["GOATROOM MX", "Licorería Limantour"]);
});

test("works for nightlife and for mixed ideas with night interests (CDMX, accents, English)", () => {
  assert.equal(applyFeaturedPlaces({ ...base, category: "nightlife", destination: "Mexico City" }, [])[0].category, "nightlife");
  assert.equal(applyFeaturedPlaces({ ...base, category: "any", interests: ["Vida nocturna"], destination: "CDMX" }, [idea("Museo", "cultural")])[0].title, "GOATROOM MX");
  assert.equal(applyFeaturedPlaces({ ...base, category: "any", interests: ["Cocktails"], destination: "Ciudad de Mexico" }, [])[0].title, "GOATROOM MX");
  assert.equal(applyFeaturedPlaces({ ...base, category: "any", destination: "Ciudad de México" }, [idea("Museo", "cultural"), idea("Bar X", "bar")])[0].title, "GOATROOM MX");
});

test("not added for other cities, other categories or fitness 'Barre'", () => {
  assert.equal(applyFeaturedPlaces({ ...base, destination: "Madrid, España" }, [idea("Bar")])[0].title, "Bar");
  assert.equal(applyFeaturedPlaces({ ...base, category: "restaurant" }, [idea("Pujol", "restaurant")])[0].title, "Pujol");
  assert.equal(applyFeaturedPlaces({ ...base, category: "any", interests: ["Barre"] }, [idea("Museo", "cultural")])[0].title, "Museo");
});
