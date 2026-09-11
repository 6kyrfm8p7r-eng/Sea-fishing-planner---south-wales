"use strict";


function cleanText(value) {

  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/\s+/g, " ")
    .trim();

}


function parseReportDate(heading) {

  const match =
    String(heading || "").match(
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
    );


  if (!match) {
    return null;
  }


  const day =
    Number(match[1]);

  const month =
    Number(match[2]);

  const year =
    Number(match[3]);


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );


  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }


  return date
    .toISOString()
    .slice(0, 10);

}


function extractBassText(sectionHtml) {

  const chunks = [];

  const blockPattern =
    /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;


  for (
    const match of
    sectionHtml.matchAll(blockPattern)
  ) {

    const text =
      cleanText(match[2]);


    if (
      text &&
      /\bbass\b/i.test(text)
    ) {

      chunks.push(text);

    }

  }


  return [
    ...new Set(chunks)
  ];

}

function classifyBassEvidence(text) {

  const value =
    String(text || "")
      .toLowerCase();

  const offshore =
    /\b(kayak|charter|boat|afloat|offshore)\b/.test(
      value
    );


  const prediction =
    /\b(anticipated|expect|expected|should|could|look forward|prospects)\b/.test(
      value
    );


  const shoreContext =
    /\b(shore|shores|beach|pier|barrage|rock marks|from the rocks|off the rocks)\b/.test(
      value
    );


  const catchEvidence =
    /\b(caught|catch|catches|producing|productive)\b/.test(
      value
    );


  const shoreCatch =
    shoreContext &&
    catchEvidence;


  if (
    offshore &&
    shoreCatch
  ) {

    return "MIXED";

  }


  if (offshore) {

    return "OFFSHORE";

  }


  if (prediction) {

    return "PREDICTION";

  }


  if (shoreCatch) {

    return "SHORE_CATCH";

  }


  return "GENERAL";


}

function parseFishingInWales(html) {

  const sourceHtml =
    String(html || "");

  const headings =
    [
      ...sourceHtml.matchAll(
        /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi
      )
    ];


  const reports = [];


  for (
    let index = 0;
    index < headings.length;
    index += 1
  ) {

    const current =
      headings[index];

    const next =
      headings[index + 1];


    const heading =
      cleanText(current[2]);


    const sectionStart =
      current.index +
      current[0].length;

    const sectionEnd =
      next
        ? next.index
        : sourceHtml.length;


    const sectionHtml =
      sourceHtml.slice(
        sectionStart,
        sectionEnd
      );


    const reportDate =
      parseReportDate(heading);

    const bassText =
      extractBassText(sectionHtml);


    if (
      !reportDate &&
      bassText.length === 0
    ) {
      continue;
    }


    reports.push({

      heading,

      reportDate,

      sectionHtml,

      bassText

    });

  }


  return reports;

}


module.exports = {

  cleanText,
  parseReportDate,
  extractBassText,
  classifyBassEvidence,
  parseFishingInWales

};
