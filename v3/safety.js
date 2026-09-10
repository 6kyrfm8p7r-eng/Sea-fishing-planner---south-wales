/* =========================================================
   SEA FISHING PLANNER — SAFETY ENGINE

   Independent from fishing score.

   A mark can score extremely well for fishing and still
   be classified as dangerous.

   This module is decision support only and must never
   replace observing the actual sea, local warnings,
   Met Office forecasts or RNLI advice.
   ========================================================= */

(function () {

  "use strict";


  const U =
    window.SeaPlannerUtils;


  /* =======================================================
     HELPERS
     ======================================================= */

  function number(
    value,
    fallback = null
  ) {

    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;

  }


  function clamp(
    value,
    minimum,
    maximum
  ) {

    if (U?.clamp) {

      return U.clamp(
        value,
        minimum,
        maximum
      );

    }

    return Math.max(
      minimum,
      Math.min(
        maximum,
        value
      )
    );

  }


  function timeValue(value) {

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date.getTime();

  }


  /* =======================================================
     EXPOSURE

     Exposure changes how seriously the same weather
     conditions should be treated.

     Example:
     1.2 m swell at a sheltered harbour is not treated
     the same as 1.2 m swell on an exposed rock mark.
     ======================================================= */

  function exposureFactor(mark) {

    switch (
      String(
        mark?.exposure ||
        ""
      ).toLowerCase()
    ) {

      case "very exposed":
        return 1.35;

      case "exposed":
        return 1.20;

      case "mixed":
        return 1.05;

      case "sheltered":
        return 0.85;

      default:
        return 1;

    }

  }


  /* =======================================================
     INDIVIDUAL RISK COMPONENTS

     Each returns a risk score:
       0   = minimal modelled concern
       100 = extreme concern

     These are deliberately conservative and will be
     refined with mark-specific safety rules later.
     ======================================================= */

  function waveRisk(
    mark,
    hour
  ) {

    const wave =
      number(
        hour?.waveHeight ??
        hour?.swellHeight,
        0
      );


    const adjusted =
      wave *
      exposureFactor(mark);


    if (adjusted < 0.5) {
      return 5;
    }

    if (adjusted < 0.8) {
      return 15;
    }

    if (adjusted < 1.1) {
      return 30;
    }

    if (adjusted < 1.4) {
      return 50;
    }

    if (adjusted < 1.8) {
      return 70;
    }

    if (adjusted < 2.2) {
      return 88;
    }

    return 100;

  }


  function periodRisk(
    mark,
    hour
  ) {

    const period =
      number(
        hour?.swellPeriod ??
        hour?.wavePeriod,
        0
      );


    const height =
      number(
        hour?.swellHeight ??
        hour?.waveHeight,
        0
      );


    /*
     Long-period swell carries substantially more energy.
     Height is included because long-period tiny swell is
     not treated like long-period large swell.
    */

    const energyProxy =
      height *
      period *
      exposureFactor(mark);


    if (energyProxy < 4) {
      return 5;
    }

    if (energyProxy < 7) {
      return 15;
    }

    if (energyProxy < 10) {
      return 30;
    }

    if (energyProxy < 14) {
      return 50;
    }

    if (energyProxy < 18) {
      return 70;
    }

    if (energyProxy < 24) {
      return 88;
    }

    return 100;

  }


  function windRisk(
    mark,
    hour
  ) {

    const speed =
      number(
        hour?.windSpeed,
        0
      );


    const gust =
      number(
        hour?.windGust,
        speed
      );


    const factor =
      exposureFactor(mark);


    const effective =
      Math.max(
        speed * factor,
        gust * 0.8 * factor
      );


    if (effective < 12) {
      return 5;
    }

    if (effective < 18) {
      return 15;
    }

    if (effective < 24) {
      return 30;
    }

    if (effective < 30) {
      return 50;
    }

    if (effective < 36) {
      return 70;
    }

    if (effective < 42) {
      return 88;
    }

    return 100;

  }


  function combinedSeaRisk(
    mark,
    hour
  ) {

    const wave =
      waveRisk(
        mark,
        hour
      );


    const period =
      periodRisk(
        mark,
        hour
      );


    /*
     Use the worse of the two as the main signal, then
     add a smaller contribution from the other.
    */

    const maximum =
      Math.max(
        wave,
        period
      );


    const minimum =
      Math.min(
        wave,
        period
      );


    return clamp(
      maximum +
      minimum * 0.20,
      0,
      100
    );

  }


  /* =======================================================
     RISK CLASSIFICATION
     ======================================================= */

  function classifyRisk(score) {

    const risk =
      number(
        score,
        0
      );


    if (risk >= 80) {

      return {

        level:
          "dangerous",

        rank:
          4,

        label:
          "DANGEROUS — DON'T FISH THIS MARK",

        icon:
          "🔴"

      };

    }


    if (risk >= 60) {

      return {

        level:
          "high-risk",

        rank:
          3,

        label:
          "HIGH RISK",

        icon:
          "🟠"

      };

    }


    if (risk >= 35) {

      return {

        level:
          "caution",

        rank:
          2,

        label:
          "CAUTION",

        icon:
          "🟡"

      };

    }


    return {

      level:
        "normal",

      rank:
        1,

      label:
        "SAFE / NORMAL",

      icon:
        "🟢"

    };

  }


  /* =======================================================
     SCORE ONE FORECAST HOUR
     ======================================================= */

  function assessHour(
    mark,
    hour
  ) {

    const sea =
      combinedSeaRisk(
        mark,
        hour
      );


    const wind =
      windRisk(
        mark,
        hour
      );


    /*
     Sea state dominates shoreline safety.
     Wind remains important but secondary.
    */

    let risk =
      sea * 0.72 +
      wind * 0.28;


    /*
     Hard overrides.

     These prevent averaging from hiding severe conditions.
    */

    if (
      sea >= 88 ||
      wind >= 95
    ) {

      risk =
        Math.max(
          risk,
          82
        );

    }


    if (
      sea >= 100
    ) {

      risk = 100;

    }


    risk =
      Math.round(
        clamp(
          risk,
          0,
          100
        )
      );


    const classification =
      classifyRisk(risk);


    return {

      hour,

      risk,

      ...classification,

      components: {

        sea:
          Math.round(sea),

        wave:
          Math.round(
            waveRisk(
              mark,
              hour
            )
          ),

        period:
          Math.round(
            periodRisk(
              mark,
              hour
            )
          ),

        wind:
          Math.round(wind)

      }

    };

  }


  /* =======================================================
     ASSESS A PRIME WINDOW
     ======================================================= */

  function assessPrimeWindow({
    mark,
    forecast,
    primeWindow
  }) {

    if (
      !mark ||
      !forecast ||
      !primeWindow ||
      !Array.isArray(
        forecast.hourly
      )
    ) {

      return null;

    }


    const start =
      timeValue(
        primeWindow.start
      );


    const end =
      timeValue(
        primeWindow.end
      );


    if (
      start === null ||
      end === null
    ) {

      return null;

    }


    const hours =
      forecast.hourly.filter(
        hour => {

          const time =
            timeValue(
              hour.time
            );


          return (
            time !== null &&
            time >= start &&
            time <= end
          );

        }
      );


    if (!hours.length) {
      return null;
    }


    const assessments =
      hours.map(
        hour =>
          assessHour(
            mark,
            hour
          )
      );


    const worst =
      [...assessments].sort(
        (a, b) =>
          b.risk -
          a.risk
      )[0];


    const highestRank =
      Math.max(
        ...assessments.map(
          item => item.rank
        )
      );


    const overallClassification =
      assessments.find(
        item =>
          item.rank ===
          highestRank
      );


    return {

      mark,

      primeWindow,

      hours:
        assessments,

      risk:
        worst?.risk ?? 0,

      worstHour:
        worst?.hour ?? null,

      level:
        overallClassification?.level ??
        "normal",

      rank:
        highestRank,

      label:
        overallClassification?.label ??
        "SAFE / NORMAL",

      icon:
        overallClassification?.icon ??
        "🟢",

      worstComponents:
        worst?.components ??
        null

    };

  }


  /* =======================================================
     DETERIORATION DETECTION

     Looks forward through the fishing window and identifies
     when conditions noticeably worsen.
     ======================================================= */

  function detectDeterioration(
    safetyResult
  ) {

    const hours =
      safetyResult?.hours;


    if (
      !Array.isArray(hours) ||
      hours.length < 2
    ) {

      return null;

    }


    for (
      let i = 1;
      i < hours.length;
      i++
    ) {

      const previous =
        hours[i - 1];

      const current =
        hours[i];


      /*
       Trigger when safety classification moves into
       HIGH RISK or DANGEROUS.
      */

      if (
        previous.rank < 3 &&
        current.rank >= 3
      ) {

        return {

          startsAt:
            current.hour.time,

          previousSafeHour:
            previous.hour.time,

          from:
            previous.label,

          to:
            current.label,

          risk:
            current.risk

        };

      }


      /*
       Also catch rapid deterioration even before a
       classification boundary is crossed.
      */

      if (
        current.risk -
        previous.risk >= 25
      ) {

        return {

          startsAt:
            current.hour.time,

          previousSafeHour:
            previous.hour.time,

          from:
            previous.label,

          to:
            current.label,

          risk:
            current.risk

        };

      }

    }


    return null;

  }


  /* =======================================================
     LATEST SAFE DEPARTURE

     Default:
       end of Fishing DNA prime window.

     If forecast conditions move into HIGH RISK or
     DANGEROUS first:
       use the previous forecast hour instead.

     This follows the V2 behaviour we wanted to preserve,
     but keeps it inside the independent safety module.
     ======================================================= */

  function getLatestSafeDeparture(
    safetyResult
  ) {

    if (
      !safetyResult ||
      !Array.isArray(
        safetyResult.hours
      ) ||
      !safetyResult.hours.length
    ) {

      return null;

    }


    const hours =
      safetyResult.hours;


    /*
     If the first hour is already HIGH RISK or DANGEROUS,
     we should not invent a "safe departure".
    */

    if (
      hours[0].rank >= 3
    ) {

      return {

        time:
          null,

        forcedEarly:
          true,

        shouldFish:
          false,

        reason:
          hours[0].label

      };

    }


    for (
      let i = 1;
      i < hours.length;
      i++
    ) {

      if (
        hours[i].rank >= 3
      ) {

        return {

          time:
            hours[i - 1]
              .hour
              .time,

          forcedEarly:
            true,

          shouldFish:
            true,

          reason:
            `Conditions worsen to ${hours[i].label}`

        };

      }

    }


    return {

      time:
        safetyResult
          .primeWindow
          .end,

      forcedEarly:
        false,

      shouldFish:
        true,

      reason:
        "No forecast safety cut-off detected"

    };

  }


  /* =======================================================
     BEST SAFE HOUR

     Later the planner can combine this with fishing score.
     ======================================================= */

  function isHourFishable(
    safetyAssessment
  ) {

    return (
      safetyAssessment &&
      safetyAssessment.rank < 3
    );

  }


  function getSafeHours(
    safetyResult
  ) {

    if (
      !Array.isArray(
        safetyResult?.hours
      )
    ) {

      return [];

    }


    return safetyResult.hours.filter(
      isHourFishable
    );

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerSafety = {

    exposureFactor,

    waveRisk,
    periodRisk,
    windRisk,
    combinedSeaRisk,

    classifyRisk,

    assessHour,
    assessPrimeWindow,

    detectDeterioration,
    getLatestSafeDeparture,

    isHourFishable,
    getSafeHours

  };


  console.log(
    "Sea Fishing Planner: safety engine ready."
  );

})();
