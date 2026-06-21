/*
 * Mitti — the catalog. Shared by the storefront and the demo film.
 * Prices in USD cents to keep the "Stripe" math honest.
 */
(function (root) {
  'use strict';

  var PRODUCTS = [
    {
      id: 'kulhad-set',
      name: 'Kulhad Chai Cups',
      sub: 'Set of four',
      type: 'kulhad', glaze: 'terracotta', seed: 11,
      price: 4800,
      collection: 'Chai & Coffee',
      blurb: 'Unglazed-rim terracotta cups that keep cutting chai hot and a little earthy, the way the railway platform intended.',
      details: ['Wheel-thrown terracotta', 'Holds 120 ml', 'Bare clay drinking rim', 'Set of four, no two alike'],
      glazes: ['terracotta', 'rust', 'haldi'],
      tag: 'Bestseller'
    },
    {
      id: 'surahi',
      name: 'Surahi Water Carafe',
      sub: 'Self-cooling',
      type: 'surahi', glaze: 'rust', seed: 23,
      price: 7200,
      collection: 'Table',
      blurb: 'A long-necked carafe of breathable terracotta. It sweats, it cools, it makes tap water taste like a verandah in May.',
      details: ['Porous terracotta body', '1.1 litre', 'Cork stopper included', 'Evaporative cooling'],
      glazes: ['rust', 'terracotta', 'longpi'],
      tag: 'New'
    },
    {
      id: 'indigo-planter',
      name: 'Indigo Jali Planter',
      sub: 'Drainage + saucer',
      type: 'planter', glaze: 'jaipur', seed: 5,
      price: 6400,
      collection: 'Home',
      blurb: 'Jaipur-blue glaze over a carved jali lip. Built for a fern that wants to be noticed.',
      details: ['Stoneware, food-safe glaze', '6" mouth · drainage hole', 'Matching saucer', 'Carved jali rim'],
      glazes: ['jaipur', 'indigo', 'celadon']
    },
    {
      id: 'marigold-bowl',
      name: 'Marigold Serving Bowl',
      sub: 'Big enough for biryani',
      type: 'bowl', glaze: 'marigold', seed: 31,
      price: 5800,
      collection: 'Table',
      blurb: 'A wide, generous bowl in a marigold glaze that pools darker where the wall turns. Made for the dish that arrives last and leaves empty.',
      details: ['High-fire stoneware', '9" diameter · 2.2 L', 'Dishwasher safe', 'Pools darker at the curve'],
      glazes: ['marigold', 'haldi', 'saffron'],
      tag: 'Bestseller'
    },
    {
      id: 'longpi-tumbler',
      name: 'Longpi Black Tumbler',
      sub: 'Manipur-inspired',
      type: 'tumbler', glaze: 'longpi', seed: 17,
      price: 3800,
      collection: 'Chai & Coffee',
      blurb: 'Matte black stoneware in homage to Longpi, the hand-built pottery of the Tangkhul Naga. Reads like graphite, feels like stone.',
      details: ['Matte black stoneware', 'Holds 300 ml', 'Unglazed exterior', 'Soft satin rim'],
      glazes: ['longpi', 'riverstone', 'celadon']
    },
    {
      id: 'jaipur-vase',
      name: 'Jaipur Blue Bud Vase',
      sub: 'For a single stem',
      type: 'vase', glaze: 'jaipur', seed: 41,
      price: 4200,
      collection: 'Home',
      blurb: 'A narrow-necked vase glazed in the cobalt that made Jaipur famous. One marigold, one ranunculus, done.',
      details: ['Stoneware, watertight', '7" tall', 'Hand-glazed cobalt', 'Sold singly'],
      glazes: ['jaipur', 'indigo', 'plum']
    },
    {
      id: 'haldi-mug',
      name: 'Haldi Breakfast Mug',
      sub: 'Pull-handle',
      type: 'mug', glaze: 'haldi', seed: 9,
      price: 3400,
      collection: 'Chai & Coffee',
      blurb: 'A turmeric-yellow mug with a hand-pulled handle sized for a whole fist. The Sunday-morning workhorse.',
      details: ['Stoneware, food-safe', 'Holds 350 ml', 'Hand-pulled handle', 'Microwave safe'],
      glazes: ['haldi', 'marigold', 'neem']
    },
    {
      id: 'neem-thali',
      name: 'Neem Coupe Plate',
      sub: 'Salad / dessert',
      type: 'plate', glaze: 'neem', seed: 27,
      price: 4000,
      collection: 'Table',
      blurb: 'A shallow neem-green coupe with a soft well in the centre. The plate that quietly makes the food look better.',
      details: ['High-fire stoneware', '8" coupe', 'Stackable', 'Dishwasher safe'],
      glazes: ['neem', 'celadon', 'oat']
    },
    {
      id: 'saffron-pitcher',
      name: 'Saffron Pour Pitcher',
      sub: 'Spout + handle',
      type: 'pitcher', glaze: 'saffron', seed: 13,
      price: 6800,
      collection: 'Table',
      blurb: 'A round-bellied pitcher in a saffron glaze with a clean pouring spout. For nimbu pani, for milk, for the table that needs a centrepiece.',
      details: ['Stoneware, watertight', '1.4 litre', 'Drip-free spout', 'Hand-pulled handle'],
      glazes: ['saffron', 'rust', 'marigold']
    },
    {
      id: 'riverstone-ramen',
      name: 'River-Stone Ramen Bowl',
      sub: 'Deep + wide',
      type: 'ramen', glaze: 'riverstone', seed: 37,
      price: 4600,
      collection: 'Table',
      blurb: 'A deep, grey, speckled bowl that holds a full portion and a soft-boiled egg with room to spare.',
      details: ['Speckled stoneware', '7.5" · 1 L', 'Chip-resistant rim', 'Dishwasher safe'],
      glazes: ['riverstone', 'longpi', 'celadon']
    }
  ];

  var COLLECTIONS = ['All', 'Chai & Coffee', 'Table', 'Home'];

  function money(cents) {
    return '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  }

  var API = { PRODUCTS: PRODUCTS, COLLECTIONS: COLLECTIONS, money: money };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.MittiCatalog = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
