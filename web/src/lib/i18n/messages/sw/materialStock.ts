import type { materialStock as enMaterialStock } from "../en/materialStock";
import type { Widen } from "../../types";

export const materialStock: Widen<typeof enMaterialStock> = {
  pageTitle: "Akiba ya vifaa",
  loading: "Inapakia akiba ya vifaa",
  subtitle:
    "Vifaa vilivyobebwa mbele kutoka hatua iliyofungwa na ambavyo bado havijatumika kwenye orodha ya mahitaji au kufutwa kwenye hesabu. Orodha ya mahitaji ya vifaa hukagua hapa kabla ya kuomba zaidi.",
  onSite: "Vilivyopo eneo la kazi",
  none: "Hakuna vifaa vya ziada vilivyobebwa mbele kwenye mradi huu bado.",
  caption: "Vifaa vilivyopo eneo la kazi",
  columns: {
    item: "Kipengee",
    unit: "Kipimo",
    onSite: "Kilichopo",
  },
  recent: "Mienendo ya karibuni",
  noMovements: "Hakuna mienendo ya akiba iliyorekodiwa bado.",
  reason: {
    carriedForward: "Imebebwa mbele",
    drawnIntoTakeoff: "Imetumika kwenye orodha ya mahitaji",
    writtenOff: "Imefutwa kwenye hesabu",
  },
};
