export const materialStock = {
  pageTitle: "Material stock",
  loading: "Loading material stock",
  subtitle:
    "Material carried forward from a closed stage and not yet drawn back into a take-off or written off. A Material Take-Off checks this before asking for more.",
  onSite: "On site",
  none: "No surplus material has been carried forward yet on this project.",
  caption: "Material on site",
  columns: {
    item: "Item",
    unit: "Unit",
    onSite: "On site",
  },
  recent: "Recent movements",
  noMovements: "No stock movements recorded yet.",
  reason: {
    carriedForward: "Carried forward",
    drawnIntoTakeoff: "Applied to take-off",
    writtenOff: "Written off",
  },
} as const;
