"use strict";


const fs = require("fs");
const path = require("path");

const CollectorContract =
  require("./collector-contract.js");
const {
  fetchFishingInWales
} =
  require("./sources/fishing-in-wales.js");

const DATA_DIR =
  path.join(__dirname, "data");
const {
  parseFishingInWales,
  splitEvidenceSentences,
  classifyBassEvidence
} =
  require("./sources/fishing-in-wales-parser.js");
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
  const now =
    new Date();

  const thirtyDaysAgo =
    new Date(
      now.getTime() -
      (30 * 24 * 60 * 60 * 1000)
    );


  const recentBassReports =
    bassReports.filter(
      report => {

        if (!report.reportDate) {
          return false;
        }


        const reportDate =
          new Date(
            `${report.reportDate}T00:00:00Z`
          );


        return (
          reportDate <= now &&
          reportDate >= thirtyDaysAgo
        );

      }
    );

 
  
  console.log(
    `Parsed Fishing in Wales reports: ${parsedReports.length}`
  );

  console.log(
    `Reports mentioning bass: ${bassReports.length}`
  );

    console.log(
    `Bass reports within 30 days: ${recentBassReports.length}`
  );

  console.log(
    `Fishing in Wales source candidates: ${sourceCandidates.length}`
  );

  const sourceCandidates =
    recentBassReports
      .flatMap(
        report =>
          report.bassText.flatMap(
            text =>
              splitEvidenceSentences(text)
                .filter(
                  sentence =>
                    classifyBassEvidence(sentence) ===
                    "SHORE_CATCH"
                )
                .map(
                  sentence => ({

                    sourceId:
                      "web-fishing-in-wales",

                    sourceUrl:
                      fishingInWales.sourceUrl,

                    species:
                      "bass",

                    date:
                      report.reportDate,

                    heading:
                      report.heading,

                    notes:
                      sentence

                  })
                )
          )
      );
  
  const evidenceBreakdown =
    bassReports
      .flatMap(
        report =>
          report.bassText.map(
            text =>
              classifyBassEvidence(text)
          )
      )
      .reduce(
        (counts, classification) => {

          counts[classification] =
            (counts[classification] || 0) + 1;

          return counts;

        },
        {}
      );


  console.log(
    "Bass evidence classifications:",
    evidenceBreakdown
  );

  const classificationSamples =
    bassReports
      .flatMap(
        report =>
          report.bassText.map(
            text => ({

              classification:
                classifyBassEvidence(text),

              text

            })
          )
      )
      .slice(0, 20);


  console.log(
    "Bass evidence samples:",
    classificationSamples
  );

  const sentenceSamples =
    bassReports
      .flatMap(
        report =>
          report.bassText.flatMap(
            text =>
              splitEvidenceSentences(text)
                .map(
                  sentence => ({

                    classification:
                      classifyBassEvidence(sentence),

                    sentence

                  })
                )
          )
      )
      .slice(0, 30);


  console.log(
    "Bass sentence samples:",
    sentenceSamples
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
