

export const config = {
  // -----------------------------------------------------------
  // 1) Yad2 Search URLs
  // -----------------------------------------------------------
  // -----------------------------------------------------------
  // 1) Yad2 Search URLs (כתובות רחבות לאזור השרון, עמק חפר ומושבים)
  // -----------------------------------------------------------
  yad2SearchUrls: [
    // דירות להשכרה בשרון ובמרכז (עד 4,500 ₪)
    "https://www.yad2.co.il/realestate/rent/center-and-sharon?minPrice=1000&maxPrice=4500",
    // דירות להשכרה באזור השרון (אזור 9)
    "https://www.yad2.co.il/realestate/rent?area=9&minPrice=1000&maxPrice=4500",
  ],

  // -----------------------------------------------------------
  // 2) Madlan Search URLs
  // -----------------------------------------------------------
  madlanSearchUrls: [
    "https://www.madlan.co.il/for-rent/%D7%90%D7%96%D7%95%D7%A8-%D7%9E%D7%95%D7%A9%D7%91%D7%99%D7%9D-%D7%91%D7%9E%D7%A8%D7%9B%D7%96-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  ],

  // -----------------------------------------------------------
  // 3) Facebook Groups (קבוצות פייסבוק מובילות לדירות במושבים/עמק חפר/שרון)
  // -----------------------------------------------------------
  facebookGroupUrls: [
    "https://www.facebook.com/groups/960020180804645",
    "https://www.facebook.com/groups/512846588904138",
    "https://www.facebook.com/groups/dirotbemoshavimdarom",
    "https://www.facebook.com/groups/1577747809187313",
    "https://www.facebook.com/groups/338276686307370",
    "https://www.facebook.com/groups/1905601096374544/"
  ],

  // -----------------------------------------------------------
  // 4) filters
  // -----------------------------------------------------------
  filters: {
    dealType: "rent", // 'rent' (להשכרה) | 'sale' (למכירה) | 'all' (הכל)
    minPrice: null,
    maxPrice: 4500,
    minRooms: 2,
    maxRooms: 3,
    requireKeywords: [],
    blockKeywords: ["דרושים", "שותף", "שותפה", "סאבלט קצר"],
  },

  // -----------------------------------------------------------
  // 5) Facebook - posts per group
  // -----------------------------------------------------------
  facebook: {
    postsPerGroup: 10,
    scrollRounds: 3,
  },
};

// פונקציות עזר לעדכון סינונים בזמן אמת מהטלגרם
export function updateFilter(key, value) {
  config.filters[key] = value;
}

export function getFilterSummary() {
  const f = config.filters;
  const dealTypeLabel = f.dealType === "rent" ? "להשכרה בלבד" : f.dealType === "sale" ? "למכירה בלבד" : "הכל";
  return [
    `🏷️ סוג עסקה: ${dealTypeLabel}`,
    `💰 מחיר מקסימלי: ${f.maxPrice ? f.maxPrice + ' ₪' : 'ללא הגבלה'}`,
    `🛏️ חדרים: ${f.minRooms || 0} - ${f.maxRooms || 'ללא הגבלה'}`,
    `🚫 מילות חסימה: ${f.blockKeywords.join(", ") || 'ללא'}`,
  ].join("\n");
}
