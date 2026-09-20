import { describe, expect, it } from "vitest";

import {
  filterProjects,
  groupByAttention,
  needsAttention,
  sortByAttention,
  type PickerItem,
} from "@/lib/project-picker";

const item = (over: Partial<PickerItem> & { id: string; name: string }): PickerItem => ({
  code: `C-${over.id}`,
  clientName: "Client",
  site: "Dar es Salaam",
  health: "green",
  alertCount: 0,
  ...over,
});

const projects = [
  item({ id: "1", name: "Green house", health: "green" }),
  item({ id: "2", name: "Red villa", health: "red", alertCount: 1 }),
  item({ id: "3", name: "Amber block", health: "amber" }),
  item({ id: "4", name: "New site", health: null }),
  item({ id: "5", name: "Green with alert", health: "green", alertCount: 2 }),
  item({ id: "6", name: "Waiting on client", health: "blue" }),
];

describe("sortByAttention", () => {
  it("orders worst health first, then more alerts, then name", () => {
    expect(sortByAttention(projects).map((p) => p.id)).toEqual(["2", "3", "6", "5", "1", "4"]);
  });

  it("does not mutate its input", () => {
    const before = projects.map((p) => p.id);
    sortByAttention(projects);
    expect(projects.map((p) => p.id)).toEqual(before);
  });
});

describe("groupByAttention", () => {
  it("puts red, amber and anything with an alert under attention", () => {
    const { attention, rest } = groupByAttention(projects);
    expect(attention.map((p) => p.id)).toEqual(["2", "3", "5"]);
    expect(rest.map((p) => p.id)).toEqual(["6", "1", "4"]);
    expect(needsAttention(projects[3])).toBe(false);
  });
});

describe("filterProjects", () => {
  it("matches name, code, client and site, ignoring case and surrounding space", () => {
    expect(filterProjects(projects, "  VILLA ").map((p) => p.id)).toEqual(["2"]);
    expect(filterProjects(projects, "c-4").map((p) => p.id)).toEqual(["4"]);
    expect(filterProjects([item({ id: "9", name: "X", clientName: "Mwanga Ltd" })], "mwanga")).toHaveLength(1);
    expect(filterProjects([item({ id: "9", name: "X", site: "Arusha" })], "arusha")).toHaveLength(1);
  });

  it("keeps everything for an empty query and nothing for no match", () => {
    expect(filterProjects(projects, "")).toHaveLength(projects.length);
    expect(filterProjects(projects, "zzz")).toEqual([]);
  });
});
