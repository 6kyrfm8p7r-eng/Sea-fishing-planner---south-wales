"use strict";


const fs = require("fs");
const path = require("path");

const CollectorContract =
  require("./collector-contract.js");


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


function runCollector() {

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

}


runCollector();
