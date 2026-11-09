// How many components the site documents, and the number written as words. The figure is the
// length of the families map that drives the sidebar, the megamenu and the home index, so a page
// added there changes every sentence that states the count — "Thirty-three" was typed in nine
// places in 1.0 and would have stayed thirty-three through 1.1.
import { families } from "../i18n/en.js";

export const componentCount = Object.keys(families).length;
export const cssCount = Object.values(families).filter((k) => k === "css").length;
export const jsCount = componentCount - cssCount;

const EN_UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ES_UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const ES_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];

/** 0–99 in words ("forty-six", "cuarenta y seis"); larger numbers stay digits. */
export function words(n, lang = "en") {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (lang === "es") {
    if (n < 30) return ES_UNITS[n];
    const u = n % 10;
    return ES_TENS[Math.floor(n / 10)] + (u ? ` y ${ES_UNITS[u]}` : "");
  }
  if (n < 20) return EN_UNITS[n];
  const u = n % 10;
  return EN_TENS[Math.floor(n / 10)] + (u ? `-${EN_UNITS[u]}` : "");
}
/** Same, with a capital first letter, for the start of a sentence. */
export const Words = (n, lang) => { const w = words(n, lang); return w[0].toUpperCase() + w.slice(1); };
