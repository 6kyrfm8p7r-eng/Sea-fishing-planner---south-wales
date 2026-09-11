/* =========================================================
   BASS FINDER WALES — BASS ACTIVITY ENGINE

   PURPOSE
   -------
   Keeps catch evidence separate from the forecast-based
   Fishing Score.

   Fishing Score = forecast quality
   Bass Activity = recent catch evidence
   Confidence = strength/recency of evidence
   Safety = NEVER overridden here

   This first version is intentionally conservative.
   It works with manually-added reports now and can later
   accept automated/verified report feeds.
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     SETTINGS
     ======================================================= */

  const SETTINGS = {

    /*
     Reports older than this are ignored.
    */

    maxReportAgeDays: 30,


    /*
     Recent reports matter more than older ones.
    */

    recencyBands: [

      {
        maxDays: 2,
        weight: 1.00
      },

      {
        maxDays: 7,
        weight: 0.80
      },

      {
        maxDays: 14,
        weight: 0.55
      },

      {
        maxDays: 30,
        weight: 0.30
      }

    ],


    /*
     Prevent catch evidence from overpowering the
     forecast-based Fishing Score.
    */

    maxPositiveAdjustment: 10,

    maxNegativeAdjustment: -10
};
  /* =======================================================
     REPORT SOURCE REGISTRY

     Trusted sources are preferred, but the future collector
     may also accept newly-discovered public sources at a
     lower confidence.

     Source relevance controls evidence quality only.
     It must NEVER affect safety.
     ======================================================= */

  const REPORT_SOURCES = [

    {
      id: "fb-bass-lure-fishing-wales",
      platform: "facebook",
      name: "Bass lure fishing wales",
      region: "Wales",
      sourceClass: "trusted-social",
      relevance: 1.00,
      enabled: true
    },

    {
      id: "fb-lure-fishing-for-bass",
      platform: "facebook",
      name: "Lure fishing for bass",
      region: "UK",
      sourceClass: "trusted-social",
      relevance: 0.80,
      enabled: true
    },

    {
      id: "fb-porthcawl-swansea-port-talbot",
      platform: "facebook",
      name: "Sea fishing porthcawl Swansea port talbot and local areas",
      region: "South Wales",
      sourceClass: "trusted-social",
      relevance: 1.00,
      enabled: true
    },

    {
      id: "fb-sea-fishing-south-wales",
      platform: "facebook",
      name: "Sea fishing in south wales",
      region: "South Wales",
      sourceClass: "trusted-social",
      relevance: 1.00,
      enabled: true
    },

    {
      id: "fb-sa1-sea-fishing",
      platform: "facebook",
      name: "Sa1 sea fishing Swansea Bay Area pier beach rocks n boat",
      region: "Swansea Bay",
      sourceClass: "trusted-social",
      relevance: 1.00,
      enabled: true
    },

    {
      id: "fb-foreshore-fishing-locals",
      platform: "facebook",
      name: "Foreshore fishing for locals",
      region: "South Wales",
      sourceClass: "trusted-social",
      relevance: 0.85,
      enabled: true
    },

    {
      id: "web-fishing-in-wales",
      platform: "website",
      name: "Fishing in Wales",
      region: "Wales",
      sourceClass: "trusted-public",
      relevance: 0.90,
      enabled: true
    },

    {
      id: "reddit-seafishinguk",
      platform: "reddit",
      name: "r/SeafishingUK",
      region: "UK",
      sourceClass: "public-social",
      relevance: 0.65,
      enabled: true
    },

    {
      id: "reddit-fishinguk",
      platform: "reddit",
      name: "r/fishingUK",
      region: "UK",
      sourceClass: "public-social",
      relevance: 0.55,
      enabled: true
    },

    {
      id: "local-tackle-shop",
      platform: "website-social",
      name: "Local tackle shop reports",
      region: "South Wales",
      sourceClass: "discovered-local",
      relevance: 0.80,
      enabled: true
    },

    {
      id: "local-angling-club",
      platform: "website-social",
      name: "Local angling club reports",
      region: "South Wales",
      sourceClass: "discovered-local",
      relevance: 0.80,
      enabled: true
    },

    {
      id: "guide-charter-shore",
      platform: "website-social",
      name: "Local guide and charter shore reports",
      region: "South Wales",
      sourceClass: "discovered-local",
      relevance: 0.70,
      enabled: true
    },

    {
      id: "manual-verified",
      platform: "manual",
      name: "Verified Bass Finder report",
      region: "South Wales",
      sourceClass: "verified",
      relevance: 1.00,
      enabled: true
    },

    {
      id: "discovered-public",
      platform: "public-web",
      name: "Discovered public fishing report",
      region: "Unknown",
      sourceClass: "discovered",
      relevance: 0.50,
      enabled: true
    }

  ];

  /* =======================================================
     REPORT STORE

     Future report example:
     {
       id: "report-001",

       markId: "ogmore",
       species: "bass",
       caught: true,

       /*
        Original catch/report time.
       */
       date: "2026-09-10T18:30:00",

       /*
        Source identity.
       */
       sourceId: "fb-bass-lure-fishing-wales",
       sourceType: "facebook",
       sourceName: "Bass lure fishing wales",

       /*
        Stable post identity where available.
        This is the strongest duplicate key.
       */
       externalPostId: "facebook-post-id",
       sourceUrl: "https://example.com/post",

       /*
        Scanner timestamps.
       */
       firstSeenAt: "2026-09-11T06:00:00Z",
       lastSeenAt: "2026-09-11T12:00:00Z",

       /*
        Generated fingerprint used when a stable
        external post ID is unavailable.
       */
       fingerprint: "source-author-date-content-hash",

       /*
        Optional shared catch-event ID.
        Multiple posts can point to the same catch.
       */
       catchEventId: "catch-ogmore-20260910-001",

       verified: true,
       notes: "One bass on lure"
     }

     Keep this empty for now.
     ======================================================= */

  const REPORTS = [

  ];


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function toDate(value) {

    const date =
      value instanceof Date
        ? value
        : new Date(value);


    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  function clamp(
    value,
    minimum,
    maximum
  ) {

    return Math.max(
      minimum,
      Math.min(
        maximum,
        value
      )
    );

  }


  function daysBetween(
    newer,
    older
  ) {

    const a =
      toDate(newer);

    const b =
      toDate(older);


    if (!a || !b) {

      return Infinity;

    }


    return Math.abs(
      a.getTime() -
      b.getTime()
    ) /
    86400000;

  }

  function normaliseIdentityValue(
    value
  ) {

    return String(
      value || ""
    )
      .trim()
      .toLowerCase();

  }


  function reportIdentityKey(
    report
  ) {

    if (!report) {

      return null;

    }


    const sourceId =
      normaliseIdentityValue(
        report.sourceId ||
        report.sourceName
      );


    const externalPostId =
      normaliseIdentityValue(
        report.externalPostId
      );


    if (
      sourceId &&
      externalPostId
    ) {

      return (
        "external:" +
        sourceId +
        ":" +
        externalPostId
      );

    }


    const fingerprint =
      normaliseIdentityValue(
        report.fingerprint
      );


    if (fingerprint) {

      return (
        "fingerprint:" +
        fingerprint
      );

    }


    return null;

  }


  function isSameReport(
    a,
    b
  ) {

    if (!a || !b) {

      return false;

    }


    const aKey =
      reportIdentityKey(a);

    const bKey =
      reportIdentityKey(b);


    return Boolean(
      aKey &&
      bKey &&
      aKey === bKey
    );

  }


  function isSameCatchEvent(
    a,
    b
  ) {

    if (!a || !b) {

      return false;

    }


    const aEvent =
      normaliseIdentityValue(
        a.catchEventId
      );

    const bEvent =
      normaliseIdentityValue(
        b.catchEventId
      );


    if (
      aEvent &&
      bEvent
    ) {

      return (
        aEvent ===
        bEvent
      );

    }


    /*
     Conservative automatic cross-post match.

     Require the same mark, species, catch result,
     very similar report text and a timestamp within
     six hours.

     This avoids treating unrelated catches as the
     same event merely because they occurred at the
     same mark.
    */

    const aMark =
      normaliseIdentityValue(
        a.markId
      );

    const bMark =
      normaliseIdentityValue(
        b.markId
      );


    const sameMark =
      Boolean(
        aMark &&
        bMark &&
        aMark === bMark
      );


    const aSpecies =
      normaliseIdentityValue(
        a.species
      );

    const bSpecies =
      normaliseIdentityValue(
        b.species
      );


    const sameSpecies =
      Boolean(
        aSpecies &&
        bSpecies &&
        aSpecies === bSpecies
      );
    const aSource =
      normaliseIdentityValue(
        a.sourceId
      );

    const bSource =
      normaliseIdentityValue(
        b.sourceId
      );


    const differentSources =
      Boolean(
        aSource &&
        bSource &&
        aSource !== bSource
      );
    const sameCaughtState =
      a.caught ===
      b.caught;


    const aNotes =
      normaliseIdentityValue(
        a.notes
      );

    const bNotes =
      normaliseIdentityValue(
        b.notes
      );


    const aWords =
      new Set(
        aNotes
          .split(/\s+/)
          .filter(
            word =>
              word.length >= 4
          )
      );

    const bWords =
      new Set(
        bNotes
          .split(/\s+/)
          .filter(
            word =>
              word.length >= 4
          )
      );


    const sharedWordCount =
      Array.from(
        aWords
      )
        .filter(
          word =>
            bWords.has(
              word
            )
        )
        .length;


    const smallerWordSetSize =
      Math.min(
        aWords.size,
        bWords.size
      );


    const requiredSharedWords =
      smallerWordSetSize >= 3
        ? 3
        : smallerWordSetSize;


    const notesSimilar =
      Boolean(
        aNotes &&
        bNotes &&
        smallerWordSetSize > 0 &&
        (
          aNotes === bNotes ||
          (
            sharedWordCount >=
              requiredSharedWords &&
            sharedWordCount /
              smallerWordSetSize >=
              0.6
          )
        )
      );


    const aDate =
      new Date(
        a.date
      );

    const bDate =
      new Date(
        b.date
      );


    const validDates =
      !Number.isNaN(
        aDate.getTime()
      ) &&
      !Number.isNaN(
        bDate.getTime()
      );


    const withinSixHours =
      validDates &&
      Math.abs(
        aDate.getTime() -
        bDate.getTime()
      ) <=
      6 * 60 * 60 * 1000;

    return Boolean(
      sameMark &&
      sameSpecies &&
      differentSources &&
      sameCaughtState &&
      notesSimilar &&
      withinSixHours
    );
    
  }


  function findDuplicateReport(
    candidate,
    reports = REPORTS
  ) {

    return (
      reports.find(
        report =>
          isSameReport(
            candidate,
            report
          )
      ) ||
      null
    );

  }
  function findSameCatchEvent(
    candidate,
    reports = REPORTS
  ) {

    return (
      reports.find(
        report =>
          isSameCatchEvent(
            candidate,
            report
          )
      ) ||
      null
    );

  }


  function ingestReport(
    candidate,
    reports = REPORTS,
    now = new Date()
  ) {

    if (!candidate) {

      return {
        action: "rejected",
        reason: "missing-report",
        report: null
      };

    }

    const candidateSourceId =
      String(
        candidate.sourceId || ""
      )
        .trim()
        .toLowerCase();


    if (candidateSourceId) {

      const registeredSource =
        REPORT_SOURCES.find(
          source =>
            String(
              source.id || ""
            )
              .trim()
              .toLowerCase() ===
            candidateSourceId
        );


      if (
        registeredSource &&
        registeredSource.enabled === false
      ) {

        return {
          action: "rejected",
          reason: "source-disabled",
          report: null
        };

      }

    }
    const nowDate =
      now instanceof Date
        ? now
        : new Date(now);


    const validNow =
      !Number.isNaN(
        nowDate.getTime()
      );


    const seenAt =
      validNow
        ? nowDate.toISOString()
        : new Date().toISOString();


    const duplicate =
      findDuplicateReport(
        candidate,
        reports
      );


        if (duplicate) {

      const originalFirstSeenAt =
        duplicate.firstSeenAt ||
        seenAt;


      Object.entries(
        candidate
      ).forEach(
        ([key, value]) => {

          if (
            value !== undefined &&
            key !== "firstSeenAt" &&
            key !== "lastSeenAt"
          ) {

            duplicate[key] =
              value;

          }

        }
      );


      duplicate.firstSeenAt =
        originalFirstSeenAt;

      duplicate.lastSeenAt =
        seenAt;


      return {
        action: "updated-existing",
        reason: "same-report",
        report: duplicate
      };

    }


    const sameCatch =
      findSameCatchEvent(
        candidate,
        reports
      );


    const prepared = {
      ...candidate,

      firstSeenAt:
        candidate.firstSeenAt ||
        seenAt,

      lastSeenAt:
        seenAt
    };


    if (sameCatch) {

      const sameCatchDate =
        new Date(
          sameCatch.date
        );


      const sameCatchTimestamp =
        Number.isNaN(
          sameCatchDate.getTime()
        )
          ? seenAt
          : sameCatchDate.getTime();


      const catchEventId =
        candidate.catchEventId ||
        sameCatch.catchEventId ||
        (
          "catch-event-" +
          String(
            sameCatch.id ||
            reportIdentityKey(
              sameCatch
            ) ||
            (
              normaliseIdentityValue(
                sameCatch.markId
              ) +
              "-" +
              sameCatchTimestamp
            )
          )
        );


      sameCatch.catchEventId =
        catchEventId;

      prepared.catchEventId =
        catchEventId;

    }


    reports.push(
      prepared
    );


    return {
      action:
        sameCatch
          ? "added-corroboration"
          : "added-new",

      reason:
        sameCatch
          ? "same-catch-event"
          : "new-report",

      report:
        prepared
    };

  }
  /* =======================================================
     REPORT VALIDATION
     ======================================================= */

  function isBassReport(report) {

    if (!report) {

      return false;

    }


    const species =
      String(
        report.species || ""
      )
        .trim()
        .toLowerCase();


    return species === "bass";

  }


  function isUsableReport(
    report,
    now = new Date()
  ) {

    if (
      !report ||
      !report.markId ||
      !isBassReport(report)
    ) {

      return false;

    }


    const reportDate =
      toDate(
        report.date
      );


    if (!reportDate) {

      return false;

    }


    const ageDays =
      daysBetween(
        now,
        reportDate
      );


    if (
      ageDays >
      SETTINGS.maxReportAgeDays
    ) {

      return false;

    }


    /*
     Ignore reports dated in the future.
    */

    if (
      reportDate >
      toDate(now)
    ) {

      return false;

    }


    return true;

  }


  /* =======================================================
     RECENCY WEIGHT
     ======================================================= */

  function getRecencyWeight(
    reportDate,
    now = new Date()
  ) {

    const ageDays =
      daysBetween(
        now,
        reportDate
      );


    for (
      const band of
      SETTINGS.recencyBands
    ) {

      if (
        ageDays <=
        band.maxDays
      ) {

        return band.weight;

      }

    }


    return 0;

  }


  /* =======================================================
     SOURCE QUALITY
     ======================================================= */
  function getSourceWeight(
    report
  ) {

    if (!report) {

      return 0;

    }


    /*
     Explicitly verified evidence receives full weight.
    */

    if (
      report.verified === true
    ) {

      return 1.00;

    }


    /*
     Prefer the registered source relevance
     whenever a sourceId is available.
    */

    const sourceId =
      String(
        report.sourceId || ""
      )
        .trim()
        .toLowerCase();


    if (sourceId) {

      const registeredSource =
        REPORT_SOURCES.find(
          source =>
            String(
              source.id || ""
            )
              .trim()
              .toLowerCase() ===
            sourceId
        );


      if (
        registeredSource &&
        registeredSource.enabled !== false &&
        Number.isFinite(
          Number(
            registeredSource.relevance
          )
        )
      ) {

        return clamp(
          Number(
            registeredSource.relevance
          ),
          0,
          1
        );

      }

    }


    /*
     Fallback for reports without a registered sourceId.
    */

    const sourceType =
      String(
        report.sourceType || ""
      )
        .trim()
        .toLowerCase();


    if (
      sourceType === "manual"
    ) {

      return 0.75;

    }


    if (
      sourceType === "external"
    ) {

      return 0.65;

    }


    return 0.50;

  }


  /* =======================================================
     REPORT EVIDENCE SCORE
     ======================================================= */

  function scoreReportEvidence(
    report,
    now = new Date()
  ) {

    if (
      !isUsableReport(
        report,
        now
      )
    ) {

      return null;

    }


    const recencyWeight =
      getRecencyWeight(
        report.date,
        now
      );


    const sourceWeight =
      getSourceWeight(
        report
      );


    const evidenceWeight =
      recencyWeight *
      sourceWeight;


    /*
     Positive catch evidence.
    */

    if (
      report.caught === true
    ) {

      return {

        direction: 1,

        weight:
          evidenceWeight

      };

    }


    /*
     Blank / unsuccessful session.

     Deliberately weaker than a confirmed catch because
     a blank does not prove bass were absent.
    */

    if (
      report.caught === false
    ) {

      return {

        direction: -1,

        weight:
          evidenceWeight *
          0.35

      };

    }


    return null;

  }


  /* =======================================================
     REPORTS FOR MARK
     ======================================================= */

  function getReportsForMark(
    markOrId,
    now = new Date()
  ) {

    const markId =

      typeof markOrId === "string"

        ? markOrId

        : markOrId?.id;


    if (!markId) {

      return [];

    }


    return REPORTS
      .filter(
        report =>
          report.markId ===
            markId &&
          isUsableReport(
            report,
            now
          )
      )
      .sort(
        (a, b) =>
          toDate(b.date) -
          toDate(a.date)
      );

  }


  /* =======================================================
     BASS ACTIVITY
     ======================================================= */

  function analyseMarkActivity(
    markOrId,
    now = new Date()
  ) {

    const reports =
      getReportsForMark(
        markOrId,
        now
      )
        .filter(
          (
            report,
            index,
            allReports
          ) => {

            const eventId =
              normaliseIdentityValue(
                report.catchEventId
              );


            /*
             Reports without a grouped catch event
             remain independent evidence.
            */

            if (!eventId) {

              return true;

            }


            /*
             For a grouped catch event, use the report
             from the strongest available source.

             If source strength is equal, the first report
             in the existing newest-first list wins.
            */

            const eventReports =
              allReports.filter(
                candidate =>
                  normaliseIdentityValue(
                    candidate.catchEventId
                  ) ===
                  eventId
              );


            const strongestSourceWeight =
              Math.max(
                ...eventReports.map(
                  candidate =>
                    getSourceWeight(
                      candidate
                    )
                )
              );


            const strongestReport =
              eventReports.find(
                candidate =>
                  getSourceWeight(
                    candidate
                  ) ===
                  strongestSourceWeight
              );


            return (
              report ===
              strongestReport
            );

          }
        );


    if (!reports.length) {

      return {

        score: 50,

        label:
          "NO RECENT EVIDENCE",

        confidence:
          0,

        confidenceLabel:
          "No evidence",

        reportCount:
          0,

        positiveReports:
          0,

              negativeReports:
          0,

        corroborationCount:
          0,

        corroboratingSources:
          0,

        adjustment:
          0,

        reports: []

      };

    }


    let positiveEvidence = 0;

    let negativeEvidence = 0;

    let positiveReports = 0;

    let negativeReports = 0;


    for (
      const report of
      reports
    ) {

      const evidence =
        scoreReportEvidence(
          report,
          now
        );


      if (!evidence) {

        continue;

      }


      if (
        evidence.direction >
        0
      ) {

        positiveEvidence +=
          evidence.weight;

        positiveReports++;

      }
      else {

        negativeEvidence +=
          evidence.weight;

        negativeReports++;

      }

    }


    const netEvidence =
      positiveEvidence -
      negativeEvidence;


    /*
     Neutral = 50.

     Strong recent positive evidence can move activity
     towards 100.

     Repeated blanks can lower it, but deliberately more
     slowly than catches can raise it.
    */

    const score =
      clamp(
        Math.round(
          50 +
          (
            netEvidence *
            25
          )
        ),
        0,
        100
      );


    /*
     Confidence depends on both amount and quality of
     evidence, not merely whether a catch exists.
    */

    const totalEvidence =
      positiveEvidence +
      negativeEvidence;


    /*
     Corroborating posts must not increase activity score,
     but genuinely independent sources can slightly raise
     confidence in a grouped catch event.
    */

    const groupedEventIds =
      new Set(
        reports
          .map(
            report =>
              normaliseIdentityValue(
                report.catchEventId
              )
          )
          .filter(Boolean)
      );


    const eventSourcePairs =
      new Set();


    for (
      const report of
      getReportsForMark(
        markOrId,
        now
      )
    ) {

      const eventId =
        normaliseIdentityValue(
          report.catchEventId
        );

            const sourceId =
        normaliseIdentityValue(
          report.sourceId
        );


      const registeredSource =
        REPORT_SOURCES.find(
          source =>
            normaliseIdentityValue(
              source.id
            ) ===
            sourceId
        );


      const validSource =
        Boolean(
          registeredSource &&
          registeredSource.enabled !== false
        );


      if (
               eventId &&
        sourceId &&
        validSource &&
        groupedEventIds.has(
          eventId
        )
      ) {

        eventSourcePairs.add(
          eventId +
          ":" +
          sourceId
        );

      }

    }


        let corroborationCount =
      0;


    for (
      const eventId of
      groupedEventIds
    ) {

      const sourceCount =
        Array.from(
          eventSourcePairs
        )
          .filter(
            pair =>
              pair.startsWith(
                eventId + ":"
              )
          )
          .length;


      corroborationCount +=
        Math.max(
          0,
          sourceCount - 1
        );

    }


    const corroborationBonus =
      Math.min(
        corroborationCount * 5,
        15
      );


    const confidence =
      clamp(
        Math.round(
          (
            totalEvidence *
            35
          ) +
          corroborationBonus
        ),
        0,
        100
      );


    let label =
      "MIXED ACTIVITY";


    if (
      score >= 75
    ) {

      label =
        "STRONG ACTIVITY";

    }
    else if (
      score >= 60
    ) {

      label =
        "POSITIVE ACTIVITY";

    }
    else if (
      score <= 30
    ) {

      label =
        "LOW ACTIVITY";

    }
    else if (
      score <= 45
    ) {

      label =
        "WEAK ACTIVITY";

    }


    let confidenceLabel =
      "Low confidence";


    if (
      confidence >= 75
    ) {

      confidenceLabel =
        "High confidence";

    }
    else if (
      confidence >= 50
    ) {

      confidenceLabel =
        "Good confidence";

    }
    else if (
      confidence >= 25
    ) {

      confidenceLabel =
        "Some evidence";

    }


    /*
     Convert evidence into a small bounded adjustment.

     This is deliberately modest:
     Bass Activity should influence the forecast score,
     not replace it.
    */

    const rawAdjustment =
      (
        score -
        50
      ) /
      5;


    const adjustment =
      Math.round(
        clamp(
          rawAdjustment,
          SETTINGS.maxNegativeAdjustment,
          SETTINGS.maxPositiveAdjustment
        )
      );


    return {

      score,

      label,

      confidence,

      confidenceLabel,

      reportCount:
        reports.length,

      positiveReports,

          negativeReports,

      corroborationCount,

      corroboratingSources:
        eventSourcePairs.size,

      adjustment,

      reports

    };

  }


  /* =======================================================
     OPPORTUNITY SCORE

     Combines Fishing Score and Bass Activity.

     Safety is intentionally NOT part of this function.
     The existing safety engine remains authoritative.
     ======================================================= */

    function calculateOpportunityScore(
    fishingScore,
    activity
  ) {

    const base =
      Number(
        fishingScore
      );


    if (
      !Number.isFinite(base)
    ) {

      return null;

    }


    const adjustment =
      Number(
        activity?.adjustment || 0
      );


    return Math.round(
      clamp(
        base +
        adjustment,
        0,
        100
      )
    );

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerBassActivity = {

    settings:
      SETTINGS,

    sources:
      REPORT_SOURCES,

    reports:
      REPORTS,

    reportIdentityKey,

    isSameReport,

    isSameCatchEvent,

    findDuplicateReport,

    findSameCatchEvent,

    ingestReport,

    isUsableReport,

    getRecencyWeight,

    getSourceWeight,

    scoreReportEvidence,

    getReportsForMark,

    analyseMarkActivity,

    calculateOpportunityScore

  };

})();
