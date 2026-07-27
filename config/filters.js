

export const config = {
  // -----------------------------------------------------------
  // 1) Yad2 Search URLs
  // -----------------------------------------------------------
  yad2SearchUrls: [
    "https://www.yad2.co.il/realestate/rent/center-and-sharon?minPrice=1000&maxPrice=4500&area=70&city=0698&neighborhood=991148&bBox=32.319772%2C34.955418%2C32.330583%2C34.967157&zoom=16",
    "https://www.yad2.co.il/realestate/rent/center-and-sharon?property=5%2C39%2C32%2C55&area=9&city=0466&neighborhood=990418&bBox=32.088916%2C34.767192%2C32.211657%2C34.900209&zoom=12",
  ],

  // -----------------------------------------------------------
  // 2) Madlan Search URLs
  // -----------------------------------------------------------
  madlanSearchUrls: [
    "https://www.madlan.co.il/for-rent/%D7%90%D7%96%D7%95%D7%A8-%D7%9E%D7%95%D7%A9%D7%91%D7%99%D7%9D-%D7%91%D7%9E%D7%A8%D7%9B%D7%96-%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
  ],

  // -----------------------------------------------------------
  // 3) Facebook Groups
  // -----------------------------------------------------------
  facebookGroupUrls: [
    "https://www.facebook.com/groups/960020180804645",
    "https://www.facebook.com/groups/512846588904138",
    "https://www.facebook.com/groups/dirotbemoshavimdarom",
  ],

  // -----------------------------------------------------------
  // 4) filters
  // -----------------------------------------------------------
  filters: {
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
    postsPerGroup: 15,
    scrollRounds: 4,
  },
};
