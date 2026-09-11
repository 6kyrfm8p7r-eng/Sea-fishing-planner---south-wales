/* =========================================================
   SEA FISHING PLANNER — MARK DATABASE
   South & South-West Wales

   This file contains the physical fishing locations only.

   Fishing DNA, learned behaviour and safety intelligence
   will live in separate modules.
   ========================================================= */

(function () {

  "use strict";


  const MARKS = [

    /* =====================================================
       VALE OF GLAMORGAN
       ===================================================== */

    {
      id: "monknash",
      name: "Monknash",
      region: "Vale of Glamorgan",
      lat: 51.4250,
      lon: -3.5500,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.4,
      periodMin: 5,
      periodMax: 11,
      windMin: 170,
      windMax: 270,
      note: "Low-water sand and rock with bass potential.",
      reason: "Best around low water and moving water across the mixed sand/rock ground."
    },

    {
      id: "nashPoint",
      name: "Nash Point",
      region: "Vale of Glamorgan",
      lat: 51.4048,
      lon: -3.5580,
      type: "low",
      tide: "ebb",
      exposure: "very exposed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 160,
      windMax: 250,
      note: "Exposed ledges and reef.",
      reason: "A moving-water rock mark where swell and wind direction are critical."
    },

    {
      id: "stDonats",
      name: "St Donats",
      region: "Vale of Glamorgan",
      lat: 51.4015,
      lon: -3.4630,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.2,
      swellMax: 1.2,
      periodMin: 5,
      periodMax: 10,
      windMin: 160,
      windMax: 260,
      note: "Rocky ground and tidal movement.",
      reason: "Structure and current can concentrate bass on the ebb."
    },

    {
      id: "llantwitMajor",
      name: "Llantwit Major",
      region: "Vale of Glamorgan",
      lat: 51.3970,
      lon: -3.4970,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 160,
      windMax: 260,
      note: "Mixed beach and rock ground.",
      reason: "Useful low-water option when colour and tidal movement are present."
    },

    {
      id: "aberthaw",
      name: "Aberthaw",
      region: "Vale of Glamorgan",
      lat: 51.3875,
      lon: -3.4050,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.4,
      swellMax: 1.4,
      periodMin: 5,
      periodMax: 11,
      windMin: 160,
      windMax: 250,
      note: "Strong tidal movement and mixed ground.",
      reason: "The ebb and coloured water can create a useful bass window."
    },

    {
      id: "dunravenBay",
      name: "Dunraven Bay",
      region: "Vale of Glamorgan",
      lat: 51.4440,
      lon: -3.6050,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 210,
      windMax: 300,
      note: "Beach, rock and cliff structure.",
      reason: "Flooding water pushes bait into the bay and around structure."
    },

    {
      id: "southerndown",
      name: "Southerndown",
      region: "Vale of Glamorgan",
      lat: 51.4470,
      lon: -3.6140,
      type: "low",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 210,
      windMax: 300,
      note: "Rock and sand transition.",
      reason: "Mixed ground can hold bass as the tide covers the structure."
    },

    {
      id: "ogmore",
      name: "Ogmore",
      region: "Vale of Glamorgan",
      lat: 51.4780,
      lon: -3.6100,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 200,
      windMax: 290,
      note: "River mouth and surf.",
      reason: "Freshwater and tidal flow create a natural bait concentration."
    },


    /* =====================================================
       PORTHCAWL / BRIDGEND / PORT TALBOT
       ===================================================== */

    {
      id: "skerPoint",
      name: "Sker Point",
      region: "Bridgend / Porthcawl",
      lat: 51.4970,
      lon: -3.7050,
      type: "high",
      tide: "flood",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.1,
      periodMin: 5,
      periodMax: 10,
      windMin: 230,
      windMax: 310,
      note: "Mixed reef, gullies and surf.",
      reason: "Gullies and sand/rock seams become increasingly fishable as water floods."
    },

    {
      id: "skerRocks",
      name: "Sker Rocks",
      region: "Bridgend / Porthcawl",
      lat: 51.5000,
      lon: -3.7350,
      type: "low",
      tide: "ebb",
      exposure: "very exposed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 5,
      periodMax: 10,
      windMin: 230,
      windMax: 310,
      note: "Low-water reef and deeper gullies.",
      reason: "A classic low-water bass/lure mark where swell must be carefully controlled."
    },

    {
      id: "restBay",
      name: "Rest Bay",
      region: "Bridgend / Porthcawl",
      lat: 51.4930,
      lon: -3.7000,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.3,
      swellMax: 1.2,
      periodMin: 5,
      periodMax: 10,
      windMin: 230,
      windMax: 310,
      note: "Surf beach with rocky edges.",
      reason: "A rising tide can push bait into the surf and shoreward structure."
    },

    {
      id: "newtonPoint",
      name: "Newton Point",
      region: "Bridgend / Porthcawl",
      lat: 51.4860,
      lon: -3.6820,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 230,
      windMax: 310,
      note: "Point with mixed sand and rock.",
      reason: "Current sweeps around the point and creates feeding lanes."
    },

    {
      id: "porthcawlHarbour",
      name: "Porthcawl Harbour",
      region: "Bridgend / Porthcawl",
      lat: 51.4780,
      lon: -3.7040,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.7,
      periodMin: 3,
      periodMax: 8,
      windMin: 210,
      windMax: 310,
      note: "Sheltered harbour and tidal water.",
      reason: "Useful backup when exposed marks are blown out."
    },

    {
      id: "aberavon",
      name: "Aberavon",
      region: "Neath Port Talbot",
      lat: 51.5290,
      lon: -3.7600,
      type: "high",
      tide: "flood",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 220,
      windMax: 310,
      note: "Long surf beach near Port Talbot.",
      reason: "Surf and a flooding tide can bring bass tight to the beach."
    },

    {
      id: "neathRiverMouth",
      name: "Neath River Mouth",
      region: "Neath Port Talbot",
      lat: 51.5290,
      lon: -3.7980,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 220,
      windMax: 310,
      note: "Estuary mouth and tidal current.",
      reason: "River flow, tidal movement and baitfish can make the mouth highly interesting."
    },


    /* =====================================================
       SWANSEA / GOWER
       ===================================================== */

    {
      id: "swanseaWestPier",
      name: "Swansea West Pier",
      region: "Swansea",
      lat: 51.5670,
      lon: -3.9850,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 210,
      windMax: 300,
      note: "Pier and tidal channel.",
      reason: "A known South Wales fishing mark with strong tidal movement."
    },

    {
      id: "mumbles",
      name: "Mumbles",
      region: "Swansea / Gower",
      lat: 51.5700,
      lon: -3.9900,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 200,
      windMax: 300,
      note: "Rocky shoreline and tidal flow.",
      reason: "Current around the headland can create feeding lanes."
    },

    {
      id: "braceletBay",
      name: "Bracelet Bay",
      region: "Swansea / Gower",
      lat: 51.5680,
      lon: -3.9960,
      type: "low",
      tide: "ebb",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 200,
      windMax: 300,
      note: "Rock and small bay.",
      reason: "Useful on the ebb when water drains around the rock features."
    },

    {
      id: "langlandBay",
      name: "Langland Bay",
      region: "Swansea / Gower",
      lat: 51.5680,
      lon: -4.0120,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 210,
      windMax: 300,
      note: "Rocky edges and sandy bay.",
      reason: "Flood tide covers structure and brings bait close to shore."
    },

    {
      id: "caswellBay",
      name: "Caswell Bay",
      region: "Swansea / Gower",
      lat: 51.5660,
      lon: -4.0850,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 210,
      windMax: 300,
      note: "Surf beach with rock features.",
      reason: "Bass can use the surf and rocky edges as the tide rises."
    },

    {
      id: "brandyCove",
      name: "Brandy Cove",
      region: "Swansea / Gower",
      lat: 51.5601,
      lon: -4.1855,
      type: "low",
      tide: "ebb",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 210,
      windMax: 300,
      note: "Rocky low-water bass mark.",
      reason: "Low water exposes gullies and rock structure where lure fishing can be productive."
    },

    {
      id: "pobblesBay",
      name: "Pobbles Bay",
      region: "Gower",
      lat: 51.5530,
      lon: -4.1250,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.2,
      swellMax: 1.1,
      periodMin: 5,
      periodMax: 10,
      windMin: 220,
      windMax: 310,
      note: "Deep gutters and strong tidal rips.",
      reason: "The river/sea meeting point and eastern rock features can concentrate fish."
    },

    {
      id: "threeCliffsBay",
      name: "Three Cliffs Bay",
      region: "Gower",
      lat: 51.5760,
      lon: -4.1050,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.3,
      swellMax: 1.2,
      periodMin: 5,
      periodMax: 10,
      windMin: 190,
      windMax: 280,
      note: "River, cliffs and sand.",
      reason: "Flooding water works through the channels and around the river mouth."
    },

    {
      id: "oxwichBay",
      name: "Oxwich Bay",
      region: "Gower",
      lat: 51.5527,
      lon: -4.1692,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.8,
      periodMin: 4,
      periodMax: 9,
      windMin: 180,
      windMax: 280,
      note: "Sheltered sandy bay.",
      reason: "A useful calmer-water option with bass potential on the flood."
    },

    {
      id: "portEynon",
      name: "Port Eynon",
      region: "Gower",
      lat: 51.5390,
      lon: -4.2100,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 10,
      windMin: 220,
      windMax: 310,
      note: "Beach with rocky edges.",
      reason: "Flood tide and surf can push bait into the bay."
    },

    {
      id: "mewsladeBay",
      name: "Mewslade Bay",
      region: "Gower",
      lat: 51.5600,
      lon: -4.2650,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 230,
      windMax: 320,
      note: "West-facing mixed bay.",
      reason: "Low-light, coloured-water conditions can create a quality bass window."
    },

    {
      id: "llangennith",
      name: "Llangennith",
      region: "Gower",
      lat: 51.5820,
      lon: -4.2950,
      type: "high",
      tide: "flood",
      exposure: "very exposed",
      swellMin: 0.4,
      swellMax: 1.5,
      periodMin: 6,
      periodMax: 12,
      windMin: 230,
      windMax: 320,
      note: "Classic surf beach.",
      reason: "Bass can move into the surf as the flood builds."
    },

    {
      id: "rhossili",
      name: "Rhossili",
      region: "Gower",
      lat: 51.5668,
      lon: -4.2870,
      type: "low",
      tide: "ebb",
      exposure: "very exposed",
      swellMin: 0.5,
      swellMax: 1.6,
      periodMin: 6,
      periodMax: 12,
      windMin: 210,
      windMax: 300,
      note: "Highly exposed open coast.",
      reason: "Can be excellent with manageable swell, but safety can deteriorate quickly."
    },

    {
      id: "broughtonBay",
      name: "Broughton Bay",
      region: "Gower",
      lat: 51.6000,
      lon: -4.3150,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 230,
      windMax: 320,
      note: "Rocky/sandy western Gower mark.",
      reason: "Moving water around structure can bring bass close."
    },

    {
      id: "whitefordSands",
      name: "Whiteford Sands",
      region: "Gower",
      lat: 51.6070,
      lon: -4.2700,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 4,
      periodMax: 9,
      windMin: 240,
      windMax: 320,
      note: "Long sandy and estuarine edge.",
      reason: "Flood tide can move bait through the shallow channels."
    },


    /* =====================================================
       LLANELLI / CARMARTHEN BAY
       ===================================================== */

    {
      id: "cefnSidan",
      name: "Cefn Sidan",
      region: "Carmarthenshire",
      lat: 51.6900,
      lon: -4.3500,
      type: "high",
      tide: "flood",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 230,
      windMax: 320,
      note: "Huge surf beach.",
      reason: "Bass can patrol the surf zone on a rising tide."
    },

    {
      id: "burryPortNorthChannel",
      name: "Burry Port North Channel",
      region: "Carmarthenshire",
      lat: 51.6840,
      lon: -4.2500,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.8,
      periodMin: 3,
      periodMax: 8,
      windMin: 220,
      windMax: 310,
      note: "Tidal channel and harbour edge.",
      reason: "Tidal flow and bait movement make this a useful estuary-style option."
    },

    {
      id: "burryPort",
      name: "Burry Port",
      region: "Carmarthenshire",
      lat: 51.6830,
      lon: -4.2550,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.7,
      periodMin: 3,
      periodMax: 8,
      windMin: 220,
      windMax: 310,
      note: "Harbour and tidal margins.",
      reason: "A calmer backup option when the open coast is unfishable."
    },

    {
      id: "pendine",
      name: "Pendine",
      region: "Carmarthenshire",
      lat: 51.7440,
      lon: -4.5520,
      type: "high",
      tide: "flood",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.3,
      periodMin: 5,
      periodMax: 11,
      windMin: 230,
      windMax: 320,
      note: "Open Carmarthen Bay surf.",
      reason: "Surf and flood tide provide classic bass conditions."
    },


    /* =====================================================
       PEMBROKESHIRE
       ===================================================== */

    {
      id: "freshwaterEast",
      name: "Freshwater East",
      region: "Pembrokeshire",
      lat: 51.6230,
      lon: -4.8720,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.2,
      swellMax: 1.2,
      periodMin: 5,
      periodMax: 11,
      windMin: 190,
      windMax: 280,
      note: "Rocky bay and sand.",
      reason: "Flooding water works across the mixed ground and beach."
    },

    {
      id: "manorbierBay",
      name: "Manorbier Bay",
      region: "Pembrokeshire",
      lat: 51.6420,
      lon: -4.7620,
      type: "high",
      tide: "flood",
      exposure: "exposed",
      swellMin: 0.2,
      swellMax: 1.2,
      periodMin: 5,
      periodMax: 11,
      windMin: 190,
      windMax: 290,
      note: "Open bay with rocky edges.",
      reason: "Bass can use the surf and rocky margins as the tide rises."
    },

    {
      id: "manorbierCastleBeach",
      name: "Manorbier Castle Beach",
      region: "Pembrokeshire",
      lat: 51.6400,
      lon: -4.7600,
      type: "low",
      tide: "ebb",
      exposure: "exposed",
      swellMin: 0.2,
      swellMax: 1.1,
      periodMin: 5,
      periodMax: 10,
      windMin: 190,
      windMax: 290,
      note: "Rock and sand transition.",
      reason: "Ebbing water drains across structure and channels."
    },

    {
      id: "saundersfootBeach",
      name: "Saundersfoot Beach",
      region: "Pembrokeshire",
      lat: 51.7080,
      lon: -4.7000,
      type: "high",
      tide: "flood",
      exposure: "mixed",
      swellMin: 0.1,
      swellMax: 0.9,
      periodMin: 4,
      periodMax: 9,
      windMin: 190,
      windMax: 290,
      note: "Sheltered bay with rock edges.",
      reason: "A useful more protected option when exposed marks are uncomfortable."
    },

    {
      id: "saundersfootHarbour",
      name: "Saundersfoot Harbour",
      region: "Pembrokeshire",
      lat: 51.7090,
      lon: -4.7020,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.6,
      periodMin: 3,
      periodMax: 8,
      windMin: 180,
      windMax: 300,
      note: "Sheltered harbour water.",
      reason: "Useful fallback with tidal flow and structure."
    },

    {
      id: "broadHavenSouth",
      name: "Broad Haven South",
      region: "Pembrokeshire",
      lat: 51.6390,
      lon: -4.9370,
      type: "high",
      tide: "flood",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.4,
      periodMin: 5,
      periodMax: 12,
      windMin: 200,
      windMax: 310,
      note: "Open surf beach.",
      reason: "Surf and rising water can bring bass into the shallows."
    },

    {
      id: "druidstonHaven",
      name: "Druidston Haven",
      region: "Pembrokeshire",
      lat: 51.6620,
      lon: -5.0500,
      type: "high",
      tide: "flood",
      exposure: "exposed",
      swellMin: 0.3,
      swellMax: 1.4,
      periodMin: 5,
      periodMax: 12,
      windMin: 210,
      windMax: 320,
      note: "Remote surf and rock.",
      reason: "Open-coast bass conditions can be strong when swell remains manageable."
    },

    {
      id: "angleBay",
      name: "Angle Bay",
      region: "Pembrokeshire",
      lat: 51.6840,
      lon: -5.0830,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.8,
      periodMin: 3,
      periodMax: 9,
      windMin: 180,
      windMax: 290,
      note: "Sheltered Milford Haven water.",
      reason: "Useful bad-weather alternative with strong tidal movement."
    },

    {
      id: "pembrokeRiver",
      name: "Pembroke River",
      region: "Pembrokeshire",
      lat: 51.6740,
      lon: -4.9160,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.05,
      swellMax: 0.6,
      periodMin: 2,
      periodMax: 7,
      windMin: 150,
      windMax: 320,
      note: "Sheltered tidal estuary.",
      reason: "A backup option when open coast conditions become poor."
    },

    {
      id: "freshwaterWest",
      name: "Freshwater West",
      region: "Pembrokeshire",
      lat: 51.6480,
      lon: -5.0600,
      type: "low",
      tide: "ebb",
      exposure: "very exposed",
      swellMin: 0.5,
      swellMax: 1.8,
      periodMin: 7,
      periodMax: 13,
      windMin: 210,
      windMax: 300,
      note: "Highly exposed surf and reef.",
      reason: "Potentially excellent bass water, but one of the marks where safety must dominate."
    },
    /* =====================================================
       ADDITIONAL SOUTH / SOUTH-WEST WALES MARKS
       ===================================================== */

    {
      id: "cardiffBayBarrage",
      name: "Cardiff Bay Barrage",
      region: "Cardiff",
      lat: 51.4474,
      lon: -3.1658,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.8,
      periodMin: 3,
      periodMax: 9,
      windMin: 170,
      windMax: 290,
      note: "Barrage wall, deep tidal channel and outflow structure.",
      reason: "Strong tidal movement, structure and outflows can concentrate bait and bass around the barrage."
    },

    {
      id: "barryDocks",
      name: "Barry Docks",
      region: "Vale of Glamorgan",
      lat: 51.3972,
      lon: -3.2650,
      type: "high",
      tide: "flood",
      exposure: "sheltered",
      swellMin: 0.1,
      swellMax: 0.8,
      periodMin: 3,
      periodMax: 9,
      windMin: 160,
      windMax: 290,
      note: "Sheltered dock and harbour structure with deep water.",
      reason: "Dock structure, tidal movement and sheltered water provide year-round fishing with documented bass potential."
    },

    {
      id: "wormsHead",
      name: "Worms Head",
      region: "Gower",
      lat: 51.5647,
      lon: -4.3272,
      type: "low",
      tide: "ebb",
      exposure: "very exposed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 5,
      periodMax: 10,
      windMin: 190,
      windMax: 290,
      note: "Highly exposed tidal headland with major cut-off risk.",
      reason: "Exceptional rough-ground bass habitat and strong tidal movement, but access and sea state must remain within strict safety limits."
    },

    {
      id: "burryHolms",
      name: "Burry Holms",
      region: "Gower",
      lat: 51.6092,
      lon: -4.3108,
      type: "low",
      tide: "ebb",
      exposure: "very exposed",
      swellMin: 0.2,
      swellMax: 1.0,
      periodMin: 5,
      periodMax: 10,
      windMin: 210,
      windMax: 310,
      note: "Tidal island and rock mark with fast-moving water and cut-off risk.",
      reason: "Rock structure, gullies and strong tidal flow create excellent bass habitat around low water when access and sea state are safe."
    }
  ];


  /* -------------------------------------------------------
     LOOKUP HELPERS
     ------------------------------------------------------- */

  function getMarkById(id) {

    return MARKS.find(
      mark => mark.id === id
    ) || null;

  }


  function getMarkByName(name) {

    const U =
      window.SeaPlannerUtils;

    if (!U) {
      return null;
    }

    const target =
      U.normaliseName(name);

    return MARKS.find(
      mark =>
        U.normaliseName(mark.name) ===
        target
    ) || null;

  }


  function getMarksByType(type) {

    return MARKS.filter(
      mark => mark.type === type
    );

  }


  function getMarksByRegion(region) {

    return MARKS.filter(
      mark => mark.region === region
    );

  }


  function getRegions() {

    return [
      ...new Set(
        MARKS.map(
          mark => mark.region
        )
      )
    ];

  }


  /* -------------------------------------------------------
     EXPOSE DATABASE
     ------------------------------------------------------- */

  window.SeaPlannerMarks = {

    all: MARKS,

    getById: getMarkById,
    getByName: getMarkByName,

    getByType: getMarksByType,
    getByRegion: getMarksByRegion,

    getRegions

  };


  console.log(
    `Sea Fishing Planner: ${MARKS.length} marks loaded.`
  );

})();
