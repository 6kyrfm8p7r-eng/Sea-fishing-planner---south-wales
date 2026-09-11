/* =========================================================
   SEA FISHING PLANNER — FISHING DNA
   Mark-specific tide timing and behavioural profiles
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     DEFAULT PROFILE
     Used when a mark has not yet been researched in detail.
     ======================================================= */

  const DEFAULT_PROFILE = {

    tideReference: "low",

    primeBeforeHours: 3,
    primeAfterHours: 2,

    tideRangePreference: "neutral",

    dawnBoost: 5,
    duskBoost: 5,
    nightBoost: 0,

    confidence: "baseline",

    sources: []

  };


  /* =======================================================
     MARK-SPECIFIC FISHING DNA
     ======================================================= */

  const PROFILES = {


    /* -----------------------------------------------------
       VALE OF GLAMORGAN
       ----------------------------------------------------- */

    aberthaw: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 3,
      primeAfterHours: 1,

      tideRangePreference: "small",

      dawnBoost: 5,
      duskBoost: 5,
      nightBoost: 2,

      confidence: "high",

      sources: [
        "Mumbles Motor Boat & Fishing Club",
        "SeaAngler",
        "Total Fishing"
      ]

    },


    monknash: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 1,

      tideRangePreference: "neutral",

      dawnBoost: 5,
      duskBoost: 6,
      nightBoost: 4,

      confidence: "medium",

      sources: [
        "local fishing guides",
        "SeaAngler"
      ]

    },


    nashPoint: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 5,
      duskBoost: 6,
      nightBoost: 5,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    southerndown: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 6,
      duskBoost: 8,
      nightBoost: 6,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    dunravenBay: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 6,
      duskBoost: 8,
      nightBoost: 6,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    ogmore: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 1,
      primeAfterHours: 3,

      tideRangePreference: "neutral",

      dawnBoost: 5,
      duskBoost: 6,
      nightBoost: 2,

      confidence: "high",

      sources: [
        "SeaAngler"
      ]

    },


    /* -----------------------------------------------------
       PORTHCAWL / BRIDGEND
       ----------------------------------------------------- */

    newtonPoint: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 5,
      duskBoost: 5,
      nightBoost: 2,

      confidence: "high",

      sources: [
        "SeaAngler",
        "AnglersWorld"
      ]

    },


    skerRocks: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 2,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 7,
      duskBoost: 7,
      nightBoost: 3,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    restBay: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 1,

      tideRangePreference: "neutral",

      dawnBoost: 6,
      duskBoost: 7,
      nightBoost: 4,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    porthcawlHarbour: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 3,

      tideRangePreference: "neutral",

      dawnBoost: 5,
      duskBoost: 6,
      nightBoost: 3,

      confidence: "high",

      sources: [
        "SeaAngler",
        "AnglersWorld"
      ]

    },


    /* -----------------------------------------------------
       SWANSEA / GOWER
       ----------------------------------------------------- */

    mumbles: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 2,
      primeAfterHours: 2,

      tideRangePreference: "small",

      dawnBoost: 7,
      duskBoost: 7,
      nightBoost: 2,

      confidence: "high",

      sources: [
        "SeaAngler",
        "AnglersWorld"
      ]

    },


    braceletBay: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 7,
      duskBoost: 8,
      nightBoost: 4,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    langlandBay: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 7,
      duskBoost: 8,
      nightBoost: 4,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    caswellBay: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 6,
      duskBoost: 8,
      nightBoost: 6,

      confidence: "medium",

      sources: [
        "local fishing guides"
      ]

    },


    brandyCove: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "small",

      dawnBoost: 6,
      duskBoost: 7,
      nightBoost: 6,

      confidence: "medium",

      sources: [
        "SeaAngler",
        "local angler reports"
      ]

    },


    threeCliffsBay: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 2,
      primeAfterHours: 2,

      tideRangePreference: "mid",

      dawnBoost: 6,
      duskBoost: 7,
      nightBoost: 3,

      confidence: "high",

      sources: [
        "SeaAngler"
      ]

    },


    oxwichBay: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 6,
      duskBoost: 7,
      nightBoost: 3,

      confidence: "medium",

      sources: [
        "Where's The Fish"
      ]

    },


    llangennith: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 2,
      primeAfterHours: 1,

      tideRangePreference: "mid",

      dawnBoost: 6,
      duskBoost: 8,
      nightBoost: 6,

      confidence: "high",

      sources: [
        "SeaAngler"
      ]

    },


    /* -----------------------------------------------------
       CARMARTHENSHIRE
       ----------------------------------------------------- */

    burryPort: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 6,
      duskBoost: 7,
      nightBoost: 3,

      confidence: "medium",

      sources: [
        "Where's The Fish",
        "SeaAngler",
        "Fishing in Wales"
      ]

    },


    burryPortNorthChannel: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 6,
      duskBoost: 7,
      nightBoost: 3,

      confidence: "medium",

      sources: [
        "SeaAngler",
        "Fishing in Wales"
      ]

    },

    /* -----------------------------------------------------
       ADDITIONAL SOUTH / SOUTH-WEST WALES MARKS
       ----------------------------------------------------- */

    cardiffBayBarrage: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 2,
      primeAfterHours: 2,

      tideRangePreference: "mid",

      dawnBoost: 5,
      duskBoost: 7,
      nightBoost: 4,

      confidence: "medium",

      sources: [
        "SeaAngler",
        "Fishing in Wales"
      ]

    
  },


    barryDocks: {

      ...DEFAULT_PROFILE,

      tideReference: "high",

      primeBeforeHours: 3,
      primeAfterHours: 2,

      tideRangePreference: "neutral",

      dawnBoost: 5,
      duskBoost: 7,
      nightBoost: 5,

      confidence: "medium",

      sources: [
        "Fishing in Wales",
        "local fishing guides"
      ]

    },


    wormsHead: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 2,
      primeAfterHours: 1,

      tideRangePreference: "small",

      dawnBoost: 7,
      duskBoost: 8,
      nightBoost: 2,

      confidence: "medium",

      sources: [
        "Fishing in Wales",
        "local fishing guides"
      ]

    },


    burryHolms: {

      ...DEFAULT_PROFILE,

      tideReference: "low",

      primeBeforeHours: 2,
      primeAfterHours: 1,

      tideRangePreference: "small",

      dawnBoost: 7,
      duskBoost: 8,
      nightBoost: 2,

      confidence: "medium",

      sources: [
        "Fishing in Wales",
        "local fishing guides"
      ]

    
  };

  /* =======================================================
     PROFILE LOOKUP
     ======================================================= */

function getProfile(markOrId) {

  if (!markOrId) {
    return DEFAULT_PROFILE;
  }


  const Marks =
    window.SeaPlannerMarks;


  let mark = null;
  let id = "";


  /*
   If a full mark object was supplied,
   use it directly.
  */

  if (
    typeof markOrId === "object"
  ) {

    mark =
      markOrId;

    id =
      mark.id || "";

  }


  /*
   If an ID or name was supplied,
   resolve it back to the mark database.
  */

  if (
    typeof markOrId === "string"
  ) {

    id =
      markOrId;


    if (Marks) {

      mark =
        (
          typeof Marks.getById ===
          "function"
        )
          ? Marks.getById(markOrId)
          : null;


      if (
        !mark &&
        typeof Marks.getByName ===
        "function"
      ) {

        mark =
          Marks.getByName(
            markOrId
          );

      }

    }

  }


  /*
   A researched custom Fishing DNA profile
   always takes priority.
  */

  if (
    id &&
    PROFILES[id]
  ) {

    return PROFILES[id];

  }


  /*
   If the string resolved to a mark whose
   ID has a custom profile, use that.
  */

  if (
    mark?.id &&
    PROFILES[mark.id]
  ) {

    return PROFILES[mark.id];

  }


  /*
   IMPORTANT FALLBACK:

   Unresearched marks should inherit their
   high/low tide preference from marks.js,
   rather than blindly defaulting to LOW.

   All the other baseline Fishing DNA values
   still come from DEFAULT_PROFILE.
  */

  if (
    mark?.type === "high" ||
    mark?.type === "low"
  ) {

    return {

      ...DEFAULT_PROFILE,

      tideReference:
        mark.type

    };

  }


  /*
   Final defensive fallback when the mark
   cannot be resolved at all.
  */

  return DEFAULT_PROFILE;

}


  function hasCustomProfile(markOrId) {

    if (!markOrId) {
      return false;
    }

    const id =
      typeof markOrId === "string"
        ? markOrId
        : markOrId.id;

    if (
      id &&
      PROFILES[id]
    ) {

      return true;

    }


    const Marks =
      window.SeaPlannerMarks;

    if (
      Marks &&
      typeof markOrId === "string"
    ) {

      const mark =
        Marks.getByName(markOrId);

      return Boolean(
        mark &&
        PROFILES[mark.id]
      );

    }


    return false;

  }


  function getPrimeWindow(
    tideTime,
    markOrId
  ) {

    const profile =
      getProfile(markOrId);

    const tide =
      new Date(tideTime);

    if (
      Number.isNaN(
        tide.getTime()
      )
    ) {

      return null;

    }


    const start =
      new Date(
        tide.getTime() -
        profile.primeBeforeHours *
        60 *
        60 *
        1000
      );


    const end =
      new Date(
        tide.getTime() +
        profile.primeAfterHours *
        60 *
        60 *
        1000
      );


    return {

      start,
      end,

      tideTime: tide,

      tideReference:
        profile.tideReference,

      profile

    };

  }


  function getConfidenceLabel(
    confidence
  ) {

    switch (confidence) {

      case "high":
        return "High";

      case "medium":
        return "Medium";

      case "low":
        return "Low";

      default:
        return "Baseline";

    }

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerProfiles = {

    defaultProfile:
      DEFAULT_PROFILE,

    all:
      PROFILES,

    get:
      getProfile,

    hasCustom:
      hasCustomProfile,

    getPrimeWindow,

    getConfidenceLabel

  };


  console.log(
    `Sea Fishing Planner: ${
      Object.keys(PROFILES).length
    } Fishing DNA profiles loaded.`
  );

})();
