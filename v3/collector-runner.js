"use strict";


const fs = require("fs");
const path = require("path");

const CollectorContract =
  require("./collector-contract.js");
const {
  fetchFishingInWales
} =
  require("./sources/fishing-in-wales.js");
const {
  parseFishingInWales
} =
  require("./sources/fishing-in-wales-parser.js");
const DATA_DIR =
  path.join(__dirname, "data");

const REPORTS_PATH =
  path.join(DATA_DIR, "bass-reports.json");

const SCAN_STATE_PATH =
  path.join(DATA_DIR, "scan-state.json");


function readJson(filePath) {

  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );

}


async function runCollector() {

  const reportStore =
    readJson(REPORTS_PATH);

  const scanState =
    readJson(SCAN_STATE_PATH);


  const reports =
    Array.isArray(reportStore.reports)
      ? reportStore.reports
      : [];


  const normalisedReports =
    reports
      .map(
        CollectorContract
          .normaliseCollectorReport
      )
      .filter(Boolean);


  console.log(
    "Collector ready."
  );

  console.log(
    `Stored reports: ${normalisedReports.length}`
  );

    console.log(
    `Last successful scan: ${
      scanState.lastSuccessfulScanAt || "never"
    }`
  );


  const fishingInWales =
    await fetchFishingInWales();


  console.log(
    `Fishing in Wales fetched: ${fishingInWales.html.length} characters`
  );
  const headingMatches =
    [
      ...fishingInWales.html.matchAll(
        /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi
      )
    ]
      .map(
        match =>
          match[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/\s+/g, " ")
            .trim()
      )
      .filter(Boolean);


  console.log(
    `Fishing in Wales headings: ${headingMatches.length}`
  );

  console.log(
    "First headings:",
    headingMatches.slice(0, 12)
  );
    const parsedReports =
    parseFishingInWales(
      fishingInWales.html
    );


  const bassReports =
    parsedReports.filter(
      report =>
        report.bassText.length > 0
    );


  console.log(
    `Parsed Fishing in Wales reports: ${parsedReports.length}`
  );

  console.log(
    `Reports mentioning bass: ${bassReports.length}`
  );

  console.log(
    "First bass reports:",
    bassReports
      .slice(0, 5)
      .map(
        report => ({
          heading:
            report.heading,
          reportDate:
            report.reportDate,
          bassText:
            report.bassText
        })
      )
  );
}


runCollector();
