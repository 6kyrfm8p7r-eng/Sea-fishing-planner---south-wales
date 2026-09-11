"use strict";


const SOURCE_URL =
  "https://fishingwales.net/sea-fishing-catch-reports/";


async function fetchFishingInWales() {

  const response =
    await fetch(
      SOURCE_URL,
      {
        headers: {
          "user-agent":
            "BassFinderWales/1.0"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      `Fishing in Wales request failed: ${response.status}`
    );

  }


  const html =
    await response.text();


  return {

    sourceId:
      "web-fishing-in-wales",

    sourceUrl:
      SOURCE_URL,

    html

  };

}


module.exports = {

  fetchFishingInWales

};
