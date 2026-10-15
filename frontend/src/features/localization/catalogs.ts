const modules: Record<string, () => Promise<Record<string, string>>> = {
  ta: () => import("./messages/ta.json").then((module) => module.default),
  hi: () => import("./messages/hi.json").then((module) => module.default),
  te: () => import("./messages/te.json").then((module) => module.default),
  kn: () => import("./messages/kn.json").then((module) => module.default),
  ml: () => import("./messages/ml.json").then((module) => module.default),
  mr: () => import("./messages/mr.json").then((module) => module.default),
  bn: () => import("./messages/bn.json").then((module) => module.default),
  gu: () => import("./messages/gu.json").then((module) => module.default),
  pa: () => import("./messages/pa.json").then((module) => module.default),
};
const catalogs: Record<string, Record<string, string>> = {};
// Keep the most visible citizen controls consistent and easy to understand.
const tamil = {
  "Submit complaint": "புகாரைச் சமர்ப்பிக்கவும்",
  "Track complaint": "புகாரைக் கண்காணிக்கவும்",
  "Officer workspace": "அதிகாரி பணியிடம்",
  "Main navigation": "முதன்மை வழிசெலுத்தல்",
  "Your complaint": "உங்கள் புகார்",
  "Tracking ID": "கண்காணிப்பு எண்",
  "Type a complaint": "புகாரை எழுதவும்",
  "Use your voice": "குரலில் தெரிவிக்கவும்",
  "Tell us what happened": "என்ன நடந்தது என்று கூறுங்கள்",
  Language: "மொழி",
  "Complaint workspace": "புகார் பணியிடம்",
  "Citizen services": "குடிமக்கள் சேவைகள்",
  "Road damage": "சாலை சேதம்",
  "Water supply": "குடிநீர் விநியோகம்",
  "+ Add Landmark": "+ அருகிலுள்ள இடத்தைச் சேர்க்கவும்",
  "+ Add Duration": "+ கால அளவைச் சேர்க்கவும்",
  "+ Specify Scope": "+ பாதிக்கப்பட்ட பகுதியைக் குறிப்பிடவும்",
  "USP 1 · Adaptive Intake": "புகார் பதிவு உதவி",
};
const hindi = {
  "Submit complaint": "शिकायत दर्ज करें",
  "Track complaint": "शिकायत की स्थिति देखें",
  "Officer workspace": "अधिकारी कार्यक्षेत्र",
  "Main navigation": "मुख्य नेविगेशन",
  "Your complaint": "आपकी शिकायत",
  "Tracking ID": "ट्रैकिंग आईडी",
  "Filter by department": "विभाग के अनुसार फ़िल्टर करें",
  "Type a complaint": "शिकायत लिखें",
  "Use your voice": "अपनी आवाज़ में बताएँ",
  Language: "भाषा",
  "Road damage": "सड़क की क्षति",
  "Water supply": "जल आपूर्ति",
  "+ Add Landmark": "+ नज़दीकी स्थान जोड़ें",
  "+ Add Duration": "+ अवधि जोड़ें",
  "+ Specify Scope": "+ प्रभावित क्षेत्र बताएँ",
};
const overrides: Record<string, Record<string, string>> = {
  ta: tamil,
  hi: hindi,
};
Object.assign(catalogs, { ta: { ...tamil }, hi: { ...hindi } });
const loaded = new Set(["en"]);
export async function loadLanguageCatalog(language: string) {
  if (loaded.has(language)) return;
  const loader = modules[language];
  if (!loader) throw new Error("Language catalog unavailable");
  const messages = await loader();
  catalogs[language] = { ...messages, ...overrides[language] };
  loaded.add(language);
}
export default catalogs;
