"use strict";


const {
  splitEvidenceSentences,
  classifyBassEvidence
} =
  require(
    "./fishing-in-wales-parser.js"
  );


const STATIC_SOURCES = [

  {
    sourceId:
      "web-angling-cymru-east",

    sourceName:
      "Angling Cymru",

    sourceUrl:
      "https://www.anglingcymru.org.uk/match-reports"
  },

  {
    sourceId:
      "web-angling-cymru-sw",

    sourceName:
      "Angling Cymru South West",

    sourceUrl:
      "https://www.anglingcymru.org.uk/sw-match-reports"
  },

  {
    sourceId:
      "web-ordinary-angler-pembrokeshire",

    sourceName:
      "Ordinary Angler",

    sourceUrl:
      "https://ordinaryangler.blogspot.com/search/label/Pembrokeshire"
  }

];


const GARRY_EVANS_INDEX_URL =
  "https://garryevans.co.uk/blogs";


async function fetchHtml(url) {

  const response =
    await fetch(
      url,
      {
        headers: {
          "user-agent":
            "BassFinderWales/1.0"
        },

        signal:
          AbortSignal.timeout(
            15000
          )
      }
    );


  if (!response.ok) {

    throw new Error(
      `${response.status} ${response.statusText}`
    );

  }


  return response.text();

}


function decodeHtml(value) {

  return String(
    value || ""
  )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      "\""
    )
    .replace(
      /&#39;|&apos;/gi,
      "'"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&#(\d+);/g,
      (
        _match,
        code
      ) =>
        String.fromCharCode(
          Number(code)
        )
    );

}


function htmlToText(html) {

  return decodeHtml(
    String(
      html || ""
    )
      .replace(
        /<script\b[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style\b[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<br\s*\/?>/gi,
        ". "
      )
      .replace(
        /<\/p>/gi,
        ". "
      )
      .replace(
        /<\/div>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


const MONTHS = {

  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12

};


function isoDate(
  year,
  month,
  day
) {

  const date =
    new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day)
      )
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date
    .toISOString()
    .slice(
      0,
      10
    );

}


function parseDateFromText(value) {

  const text =
    String(
      value || ""
    );


  let match =
    text.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(20\d{2})\b/i
    );


  if (match) {

    return isoDate(
      match[3],
      MONTHS[
        match[2]
          .toLowerCase()
      ],
      match[1]
    );

  }


  match =
    text.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(20\d{2})\b/i
    );


  if (match) {

    return isoDate(
      match[3],
      MONTHS[
        match[1]
          .toLowerCase()
      ],
      match[2]
    );

  }


  match =
    text.match(
      /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/
    );


  if (match) {

    return isoDate(
      match[3],
      match[2],
      match[1]
    );

  }


  match =
    text.match(
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/
    );


  if (match) {

    return isoDate(
      match[1],
      match[2],
      match[3]
    );

  }


  return null;

}


function extractSections(
  page
) {

  const html =
    String(
      page?.html || ""
    );


  const headingMatches =
    [
      ...html.matchAll(
        /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi
      )
    ];


  if (
    headingMatches.length === 0
  ) {

    return [];

  }


  const fullText =
    htmlToText(
      html
    );


  const pageDate =
    page.singleArticle
      ? parseDateFromText(
          fullText.slice(
            0,
            2000
          )
        )
      : null;


  const sections = [];


  for (
    let index = 0;
    index <
    headingMatches.length;
    index++
  ) {

    const match =
      headingMatches[index];

    const nextMatch =
      headingMatches[
        index + 1
      ];


    const start =
      match.index;

    const end =
      nextMatch
        ? nextMatch.index
        : html.length;


    const heading =
      htmlToText(
        match[2]
      );


    const text =
      htmlToText(
        html.slice(
          start,
          end
        )
      );


    const reportDate =
      parseDateFromText(
        `${heading} ${text.slice(0, 900)}`
      ) ||
      pageDate;


    if (!reportDate) {
      continue;
    }


    sections.push({

      heading,

      reportDate,

      text

    });

  }


  return sections;

}


function garryEvansCatchReportUrls(
  html
) {

  const urls =
    new Set();


  const anchors =
    [
      ...String(
        html || ""
      ).matchAll(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      )
    ];


  for (
    const anchor of
    anchors
  ) {

    const label =
      htmlToText(
        anchor[2]
      );


    if (
      !/catch\s+report/i.test(
        label
      )
    ) {

      continue;

    }


    try {

      const url =
        new URL(
          anchor[1],
          GARRY_EVANS_INDEX_URL
        ).href;


      if (
        url.includes(
          "garryevans.co.uk/blogs/"
        )
      ) {

        urls.add(
          url
        );

      }

    }
    catch (_error) {

      /* Ignore malformed links. */

    }

  }


  return [
    ...urls
  ].slice(
    0,
    12
  );

}


async function fetchAdditionalReportSources() {

  const pages = [];


  for (
    const source of
    STATIC_SOURCES
  ) {

    try {

      const html =
        await fetchHtml(
          source.sourceUrl
        );


      pages.push({

        ...source,

        html,

        singleArticle:
          false,

        error:
          null

      });

    }
    catch (error) {

      pages.push({

        ...source,

        html:
          "",

        singleArticle:
          false,

        error:
          error?.message ||
          String(error)

      });

    }

  }


  try {

    const indexHtml =
      await fetchHtml(
        GARRY_EVANS_INDEX_URL
      );


    const reportUrls =
      garryEvansCatchReportUrls(
        indexHtml
      );


    for (
      const sourceUrl of
      reportUrls
    ) {

      try {

        const html =
          await fetchHtml(
            sourceUrl
          );


        pages.push({

          sourceId:
            "web-garry-evans",

          sourceName:
            "Garry Evans",

          sourceUrl,

          html,

          singleArticle:
            true,

          error:
            null

        });

      }
      catch (error) {

        pages.push({

          sourceId:
            "web-garry-evans",

          sourceName:
            "Garry Evans",

          sourceUrl,

          html:
            "",

          singleArticle:
            true,

          error:
            error?.message ||
            String(error)

        });

      }

    }

  }
  catch (error) {

    pages.push({

      sourceId:
        "web-garry-evans",

      sourceName:
        "Garry Evans",

      sourceUrl:
        GARRY_EVANS_INDEX_URL,

      html:
        "",

      singleArticle:
        false,

      error:
        error?.message ||
        String(error)

    });

  }


  return pages;

}


function extractAdditionalSourceCandidates(
  pages
) {

  if (
    !Array.isArray(
      pages
    )
  ) {

    return [];

  }


  const candidates = [];

  const seen =
    new Set();


  for (
    const page of
    pages
  ) {

    if (
      page?.error ||
      !page?.html
    ) {

      continue;

    }


    const sections =
      extractSections(
        page
      );


    for (
      const section of
      sections
    ) {

      const sentences =
        splitEvidenceSentences(
          section.text
        );


      for (
        const sentence of
        sentences
      ) {

        if (
          !/\bbass\b/i.test(
            sentence
          )
        ) {

          continue;

        }


        const contextLead =
          section.text.slice(
            0,
            420
          );


        const classification =
          classifyBassEvidence(
            `${section.heading} ${contextLead} ${sentence}`
          );


        if (
          classification !==
          "SHORE_CATCH"
        ) {

          continue;

        }


        const candidate = {

          sourceId:
            page.sourceId,

          sourceName:
            page.sourceName,

          sourceType:
            "website",

          sourceUrl:
            page.sourceUrl,

          species:
            "bass",

          date:
            section.reportDate,

          heading:
            `${section.heading} ${contextLead}`,

          notes:
            sentence

        };


        const key =
          [
            candidate.sourceId,
            candidate.date,
            candidate.heading,
            candidate.notes
          ]
            .map(
              value =>
                String(
                  value || ""
                )
                  .trim()
                  .toLowerCase()
                  .replace(
                    /\s+/g,
                    " "
                  )
            )
            .join(
              "|"
            );


        if (
          seen.has(
            key
          )
        ) {

          continue;

        }


        seen.add(
          key
        );


        candidates.push(
          candidate
        );

      }

    }

  }


  return candidates;

}


module.exports = {

  fetchAdditionalReportSources,

  extractAdditionalSourceCandidates,

  parseDateFromText,

  htmlToText

};
