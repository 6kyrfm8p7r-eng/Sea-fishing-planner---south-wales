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
       date: "2026-09-10T18:30:00",
       sourceType: "manual",
       sourceName: "Verified angler report",
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


    const confidence =
      clamp(
        Math.round(
          totalEvidence *
          35
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

    reports:
      REPORTS,

    isUsableReport,

    getRecencyWeight,

    getSourceWeight,

    scoreReportEvidence,

    getReportsForMark,

    analyseMarkActivity,

    calculateOpportunityScore

  };

})();
