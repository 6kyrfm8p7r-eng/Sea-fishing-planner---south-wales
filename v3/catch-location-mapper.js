"use strict";


/*
 SEA FISHING PLANNER
 Conservative catch-report location mapper.

 Rules:
 - Explicit place names / known aliases only.
 - No mapping from broad regions such as "Gower".
 - No fuzzy guessing.
 - One unambiguous mark only.
*/


const LOCATION_ALIASES = [

  /* Vale of Glamorgan */

  {
    markId: "aberthaw",
    aliases: [
      "aberthaw",
      "aberthaw west"
    ]
  },

  {
    markId: "llantwitMajor",
    aliases: [
      "llantwit major",
      "llantwit major beach"
      "llanwit major"
    ]
  },

  {
    markId: "stDonats",
    aliases: [
      "st donats",
      "st donat's"
    ]
  },

  {
    markId: "nashPoint",
    aliases: [
      "nash point"
    ]
  },

  {
    markId: "monknash",
    aliases: [
      "monknash"
    ]
  },

  {
    markId: "dunravenBay",
    aliases: [
      "dunraven bay",
      "dunraven"
    ]
  },

  {
    markId: "southerndown",
    aliases: [
      "southerndown"
    ]
  },

  {
    markId: "ogmore",
    aliases: [
      "ogmore",
      "ogmore by sea"
      "ogmore deeps"
    ]
  },

  {
    markId: "barryDocks",
    aliases: [
      "barry docks",
      "barry dock"
    ]
  },

  {
    markId: "cardiffBayBarrage",
    aliases: [
      "cardiff bay barrage",
      "cardiff barrage"
    ]
  },


  /* Porthcawl / Bridgend / Port Talbot */

  {
    markId: "skerPoint",
    aliases: [
      "sker point"
    ]
  },

  {
    markId: "skerRocks",
    aliases: [
      "sker rocks"
    ]
  },

  {
    markId: "restBay",
    aliases: [
      "rest bay"
    ]
  },

  {
    markId: "newtonPoint",
    aliases: [
      "newton point"
    ]
  },

  {
    markId: "porthcawlHarbour",
    aliases: [
      "porthcawl harbour",
      "porthcawl harbor"
    ]
  },

  {
    markId: "aberavon",
    aliases: [
      "aberavon",
      "aberavon beach"
    ]
  },

  {
    markId: "neathRiverMouth",
    aliases: [
      "neath river mouth",
      "river neath mouth",
      "neath estuary mouth"
    ]
  },


  /* Swansea / Gower */

  {
    markId: "swanseaWestPier",
    aliases: [
      "swansea west pier",
      "west pier swansea"
      "swanasea west pier"
      "swansea pier"
      "swansea peir"
    ]
  },

  {
    markId: "mumbles",
    aliases: [
      "mumbles",
      "the mumbles"
      "mumbles pier"
      "mumble pier"
      "mumbles head"
    ]
  },

  {
    markId: "braceletBay",
    aliases: [
      "bracelet bay"
    ]
  },

  {
    markId: "langlandBay",
    aliases: [
      "langland bay",
      "langland"
    ]
  },

  {
    markId: "caswellBay",
    aliases: [
      "caswell bay",
      "caswell"
    ]
  },

  {
    markId: "brandyCove",
    aliases: [
      "brandy cove"
    ]
  },

  {
    markId: "threeCliffsBay",
    aliases: [
      "three cliffs bay",
      "three cliffs"
    ]
  },

  {
    markId: "oxwichBay",
    aliases: [
      "oxwich bay",
      "oxwich"
    ]
  },

  {
    markId: "llangennith",
    aliases: [
      "llangennith"
    ]
  },

  {
    markId: "wormsHead",
    aliases: [
      "worms head",
      "worm's head"
    ]
  },

 {
  markId: "burryHolms",
  aliases: [
    "burry holms",
    "burry holmes"
  ]
},


  /* Carmarthenshire */

  {
    markId: "burryPort",
    aliases: [
      "burry port"
    ]
  },

  {
    markId: "burryPortNorthChannel",
    aliases: [
      "burry port north channel",
      "north channel burry port"
    ]
  },


  /* Pembrokeshire */

  {
    markId: "freshwaterWest",
    aliases: [
      "freshwater west"
    ]
  },

  {
    markId: "manorbierCastleBeach",
    aliases: [
      "manorbier castle beach",
      "manorbier beach"
    ]
  },

  {
    markId: "saundersfootBeach",
    aliases: [
      "saundersfoot beach"
    ]
  },

  {
    markId: "saundersfootHarbour",
    aliases: [
      "saundersfoot harbour",
      "saundersfoot harbor"
    ]
  },

  {
    markId: "broadHavenSouth",
    aliases: [
      "broad haven south"
    ]
  },

  {
    markId: "druidstonHaven",
    aliases: [
      "druidston haven",
      "druidston"
    ]
  },

  {
    markId: "angleBay",
    aliases: [
      "angle bay"
    ]
  },

  {
    markId: "pembrokeRiver",
    aliases: [
      "pembroke river"
    ]
  }

];


function normaliseText(value) {

  return String(
    value || ""
  )
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


function containsAlias(
  text,
  alias
) {

  const haystack =
    ` ${normaliseText(text)} `;

  const needle =
    ` ${normaliseText(alias)} `;


  if (
    needle.trim().length < 4
  ) {
    return false;
  }


  return haystack.includes(
    needle
  );

}


function findLocationMatches({
  heading,
  notes
} = {}) {

  const combined =
    `${heading || ""} ${notes || ""}`;


  const matches = [];


  for (
    const location of
    LOCATION_ALIASES
  ) {

    const matchedAlias =
      location.aliases.find(
        alias =>
          containsAlias(
            combined,
            alias
          )
      );


    if (matchedAlias) {

      matches.push({

        markId:
          location.markId,

        alias:
          matchedAlias

      });

    }

  }

  /*
   If one matched alias is simply contained inside
   a longer, more specific matched alias, keep the
   more specific mark.

   Example:
   "Burry Port North Channel" should not also become
   an ambiguous "Burry Port" match.

   Separate locations such as Mumbles + Burry Holms
   remain genuinely ambiguous.
  */

  const specificMatches =
    matches.filter(
      match => {

        const current =
          normaliseText(
            match.alias
          );


        return !matches.some(
          other => {

            if (
              other === match ||
              other.markId ===
                match.markId
            ) {

              return false;

            }


            const competing =
              normaliseText(
                other.alias
              );


            return (
              competing.length >
                current.length &&
              competing.includes(
                current
              )
            );

          }
        );

      }
    );


  return specificMatches;

}



function mapCatchLocation(
  candidate
) {

  const matches =
    findLocationMatches(
      candidate
    );


  /*
   Conservative rule:
   exactly one mark must match.
  */

  if (matches.length !== 1) {

    return {

      ...candidate,

      markId:
        null,

      locationMatch:
        null,

      locationStatus:
        matches.length > 1
          ? "AMBIGUOUS"
          : "UNMAPPED"

    };

  }


  const match =
    matches[0];


  return {

    ...candidate,

    markId:
      match.markId,

    locationMatch:
      match.alias,

    locationStatus:
      "MAPPED"

  };

}


function mapCatchLocations(
  candidates
) {

  if (!Array.isArray(candidates)) {
    return [];
  }


  return candidates.map(
    mapCatchLocation
  );

}


module.exports = {

  LOCATION_ALIASES,

  normaliseText,

  findLocationMatches,

  mapCatchLocation,

  mapCatchLocations

};
