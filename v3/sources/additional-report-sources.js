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
      "https://www.anglingcymru.org.uk/match-reports",

    parserType:
      "angling-cymru"
  },

  {
    sourceId:
      "web-angling-cymru-sw",

    sourceName:
      "Angling Cymru South West",

    sourceUrl:
      "https://www.anglingcymru.org.uk/sw-match-reports",

    parserType:
      "angling-cymru"
  },

{
  sourceId:
    "web-ordinary-angler-pembrokeshire",

  sourceName:
    "Ordinary Angler",

  sourceUrl:
    "https://ordinaryangler.blogspot.com/feeds/posts/default?alt=atom&max-results=25",

  fallbackUrls: [
    "https://ordinaryangler.blogspot.com/feeds/posts/default?alt=rss&max-results=25",
    "https://ordinaryangler.blogspot.com/search/label/Pembrokeshire"
  ],

  parserType:
    "blogger"
}

];


const GARRY_EVANS_INDEX_URL =
  "https://garryevans.co.uk/blogs";

async function fetchHtml(
  url,
  fallbackUrls = []
) {

  const urls = [
    url,
    ...fallbackUrls
  ];


  let lastError = null;


  for (
    let index = 0;
    index < urls.length;
    index++
  ) {

    const candidateUrl =
      urls[index];


    try {

      const response =
        await fetch(
          candidateUrl,
          {
            headers: {
              "user-agent":
                "Mozilla/5.0 (compatible; BassFinderWales/1.0; +https://github.com/6kyrfm8p7r-eng/Sea-fishing-planner---south-wales)",

              "accept":
                "application/atom+xml, application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8"
            },

            signal:
              AbortSignal.timeout(
                15000
              )
          }
        );


      if (!response.ok) {

        lastError =
          new Error(
            `${response.status} ${response.statusText}`
          );


        console.log(
          `Fetch attempt failed: ${candidateUrl} — ${response.status} ${response.statusText}`
        );


        continue;

      }


      const html =
        await response.text();


      console.log(
        `Fetch succeeded: ${candidateUrl} — ${html.length} chars`
      );


      return {
        html,
        resolvedUrl:
          candidateUrl
      };

    }
    catch (error) {

      lastError =
        error;


      console.log(
        `Fetch attempt failed: ${candidateUrl} — ${error?.message || String(error)}`
      );

    }

  }


  throw (
    lastError ||
    new Error(
      "All source URLs failed"
    )
  );

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
        /<\/li>/gi,
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


function normaliseYear(year) {

  const value =
    Number(year);


  if (
    !Number.isFinite(
      value
    )
  ) {

    return null;

  }


  if (
    value >= 0 &&
    value < 100
  ) {

    return (
      value >= 70
        ? 1900 + value
        : 2000 + value
    );

  }


  return value;

}


function isoDate(
  year,
  month,
  day
) {

  const normalisedYear =
    normaliseYear(
      year
    );


  if (
    !normalisedYear
  ) {

    return null;

  }


  const date =
    new Date(
      Date.UTC(
        normalisedYear,
        Number(month) - 1,
        Number(day)
      )
    );


  if (
    Number.isNaN(
      date.getTime()
    ) ||
    date.getUTCFullYear() !==
      normalisedYear ||
    date.getUTCMonth() !==
      Number(month) - 1 ||
    date.getUTCDate() !==
      Number(day)
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
      /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/
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


function extractHeadingSections(
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
            2500
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
        `${heading} ${text.slice(0, 1200)}`
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


function extractFlatDateSections(
  page
) {

  const text =
    htmlToText(
      page?.html
    );


  if (!text) {
    return [];
  }


  const datePattern =
    /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*20\d{2}|\d{1,2}\/\d{1,2}\/(?:\d{2}|20\d{2})|20\d{2}-\d{1,2}-\d{1,2})\b/gi;


  const matches =
    [
      ...text.matchAll(
        datePattern
      )
    ];


  const sections = [];


  for (
    let index = 0;
    index <
    matches.length;
    index++
  ) {

    const match =
      matches[index];

    const next =
      matches[
        index + 1
      ];


    const reportDate =
      parseDateFromText(
        match[0]
      );


    if (!reportDate) {
      continue;
    }


    const start =
      Math.max(
        0,
        match.index - 180
      );

    const end =
      next
        ? next.index
        : Math.min(
            text.length,
            match.index + 5000
          );


    const sectionText =
      text.slice(
        start,
        end
      )
        .trim();


    const heading =
      text.slice(
        start,
        Math.min(
          text.length,
          match.index +
            match[0].length
        )
      )
        .trim();


    sections.push({

      heading,

      reportDate,

      text:
        sectionText

    });

  }


  return sections;

}


function extractSections(
  page
) {

  if (
    page?.parserType ===
    "blogger" &&
    /<(feed|rss)\b/i.test(
      String(
        page?.html || ""
      )
    )
  ) {

    const entries =
      [
        ...String(
          page.html
        ).matchAll(
          /<(?:entry|item)\b[\s\S]*?<\/(?:entry|item)>/gi
        )
      ];


    const sections = [];


    for (
      const entry of
      entries
    ) {

      const raw =
        entry[0];


      const titleMatch =
        raw.match(
          /<title\b[^>]*>([\s\S]*?)<\/title>/i
        );


      const dateMatch =
        raw.match(
          /<(?:published|updated|pubDate)\b[^>]*>([\s\S]*?)<\/(?:published|updated|pubDate)>/i
        );


      const heading =
        htmlToText(
          titleMatch?.[1] || ""
        );


      const text =
        htmlToText(
          raw
        );


      const reportDate =
        parseDateFromText(
          heading
        ) ||
        (
          dateMatch?.[1]
            ? new Date(
                htmlToText(
                  dateMatch[1]
                )
              )
                .toISOString()
                .slice(
                  0,
                  10
                )
            : null
        );


      if (
        reportDate
      ) {

        sections.push({

          heading,

          reportDate,

          text

        });

      }

    }


    return sections;

  }


  if (
    page?.parserType ===
    "angling-cymru"
  ) {

    const flatSections =
      extractFlatDateSections(
        page
      );


    if (
      flatSections.length > 0
    ) {

      return flatSections;

    }

  }


  return extractHeadingSections(
    page
  );

}


function isNegativeBassEvidence(
  text
) {

  const value =
    String(
      text || ""
    )
      .toLowerCase();


  return (
    /\b(blanked|blank|no bass|not had a bass|failed to catch a bass|failed to catch bass|without a bass|not a sniff)\b/.test(
      value
    )
  );

}


function isAdditionalSourceShoreCatch({
  page,
  section,
  sentence
}) {

  const combined =
    `${section.heading} ${section.text.slice(0, 650)} ${sentence}`;


  if (
    isNegativeBassEvidence(
      combined
    )
  ) {

    return false;

  }


  const normalClassification =
    classifyBassEvidence(
      combined
    );


  if (
    normalClassification ===
    "SHORE_CATCH"
  ) {

    return true;

  }


  if (
    page.parserType ===
    "angling-cymru"
  ) {

    /*
     These pages are shore-match reports.
     Confirmed result wording is sufficient
     when the section explicitly mentions bass.
    */

    return (
      /\bbass\b/i.test(
        sentence
      ) &&
      /\b(caught|catch|weigh|weighed|weighing|with a bass|species of fish|species were caught|species of fish were caught)\b/i.test(
        combined
      )
    );

  }


  if (
    page.parserType ===
    "blogger"
  ) {

    /*
     First-person session reports often use
     wording such as "had three bass".
    */

    return (
      /\bbass\b/i.test(
        sentence
      ) &&
      /\b(caught|landed|had|hooked|looking at my first bass|first bass)\b/i.test(
        combined
      ) &&
      /\b(shore|beach|estuary|pier|rocks?|point|haven|dock|lawrenny|pembrokeshire)\b/i.test(
        combined
      )
    );

  }


  return false;

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

const fetched =
  await fetchHtml(
    source.sourceUrl,
    source.fallbackUrls || []
  );


pages.push({

  ...source,

  sourceUrl:
    fetched.resolvedUrl,

  html:
    fetched.html,

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

          parserType:
            "article",

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

          parserType:
            "article",

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

      parserType:
        "article",

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


    let pageCandidateCount =
      0;


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


        if (
          !isAdditionalSourceShoreCatch({
            page,
            section,
            sentence
          })
        ) {

          continue;

        }


        const contextLead =
          section.text.slice(
            0,
            500
          );


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


        pageCandidateCount++;

      }

    }


    console.log(
      `Source diagnostic: ${page.sourceName} | ${page.html.length} chars | ${sections.length} dated sections | ${pageCandidateCount} shore-bass candidates`
    );

  }


  return candidates;

}


module.exports = {

  fetchAdditionalReportSources,

  extractAdditionalSourceCandidates,

  parseDateFromText,

  htmlToText

};
