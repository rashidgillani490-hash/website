/**
 * Pakistan delivery geography. Province is a fixed list; city is a curated list
 * per province but free text is also accepted (smaller towns); area is free
 * text. Used by the checkout form and by server-side validation.
 */

export const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "Azad Jammu & Kashmir",
] as const;

export type Province = (typeof PROVINCES)[number];

export const CITIES_BY_PROVINCE: Record<Province, string[]> = {
  Punjab: [
    "Lahore",
    "Faisalabad",
    "Rawalpindi",
    "Multan",
    "Gujranwala",
    "Sialkot",
    "Bahawalpur",
    "Sargodha",
    "Sahiwal",
    "Sheikhupura",
    "Rahim Yar Khan",
    "Jhang",
    "Gujrat",
    "Kasur",
    "Okara",
  ],
  Sindh: [
    "Karachi",
    "Hyderabad",
    "Sukkur",
    "Larkana",
    "Nawabshah",
    "Mirpur Khas",
    "Jacobabad",
    "Shikarpur",
  ],
  "Khyber Pakhtunkhwa": [
    "Peshawar",
    "Mardan",
    "Abbottabad",
    "Swat (Mingora)",
    "Kohat",
    "Bannu",
    "Dera Ismail Khan",
    "Nowshera",
    "Mansehra",
  ],
  Balochistan: [
    "Quetta",
    "Turbat",
    "Khuzdar",
    "Chaman",
    "Hub",
    "Gwadar",
    "Sibi",
    "Zhob",
  ],
  "Islamabad Capital Territory": ["Islamabad"],
  "Gilgit-Baltistan": ["Gilgit", "Skardu", "Chilas", "Hunza", "Ghizer"],
  "Azad Jammu & Kashmir": ["Muzaffarabad", "Mirpur", "Rawalakot", "Kotli", "Bhimber"],
};

export function isProvince(value: string): value is Province {
  return (PROVINCES as readonly string[]).includes(value);
}

export function citiesForProvince(province: string): string[] {
  return isProvince(province) ? CITIES_BY_PROVINCE[province] : [];
}

/** Mobile: 03XXXXXXXXX, or +923XXXXXXXXX / 00923XXXXXXXXX. */
const MOBILE_RE = /^(?:\+92|0092|92|0)?3\d{9}$/;

export function normalizeMobile(raw: string): string {
  const digits = String(raw ?? "").replace(/[\s()-]/g, "");
  if (!MOBILE_RE.test(digits)) return "";
  // Canonicalise to local 03XXXXXXXXX
  const m = digits.replace(/^(?:\+92|0092|92)/, "0");
  return m.startsWith("0") ? m : `0${m}`;
}

export function isValidMobile(raw: string): boolean {
  return normalizeMobile(raw) !== "";
}

/** Pakistani postal codes are 5 digits. */
export function isValidPostalCode(raw: string): boolean {
  return /^\d{5}$/.test(String(raw ?? "").trim());
}
