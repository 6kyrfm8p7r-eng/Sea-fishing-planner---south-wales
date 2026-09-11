/* =========================================================
   SEA FISHING PLANNER — OPPORTUNITY ENGINE

   PURPOSE
   -------
   Turns forecast + tide + Fishing DNA + safety into
   ranked fishing opportunities.

   IMPORTANT
   ---------
   - Fishing score never overrides safety.
   - Dangerous / already high-risk sessions are rejected.
   - The recommended best hour must occur before the
     latest safe departure.
   - This module does not render the UI.
   ========================================================= */

(function () {

  "use strict";


  const Marks =
    window.SeaPlannerMarks;

  const Tides =
    window.SeaPlannerTides;

  const Scoring =
    window.SeaPlannerScoring;

  const Safety =
    window.SeaPlannerSafety;

  const Profiles =
    window.SeaPlannerProfiles;


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function asDate(value) {

    const date =
      value instanceof Date
        ? new Date(value)
        : new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  function timeValue(value) {

    const date =
      asDate(value);

    return date
      ? date.getTime()
      : null;

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


  function average(values) {

    const clean =
      values
        .map(Number)
        .filter(Number.isFinite);

    if (!clean.length) {
      return null;
    }

    return (
      clean.reduce(
        (total, value) =>
          total + value,
        0
      ) / clean.length
    );

  }


  function sortByScore(items) {

    return [...items].sort(
      (a, b) => {

        const scoreDifference =
          (b.score ?? -1) -
          (a.score ?? -1);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }


        /*
         If fishing scores are tied,
         prefer the safer opportunity.
        */

        const safetyDifference =
          (a.safetyRisk ?? 100) -
          (b.safetyRisk ?? 100);

        if (safetyDifference !== 0) {
          return safetyDifference;
        }


        /*
         Then prefer the earlier opportunity.
        */

        return (
          timeValue(
            a.bestHour?.time
          ) ?? Infinity
        ) - (
          timeValue(
            b.bestHour?.time
          ) ?? Infinity
        );

      }
    );

  }

  function tidalRangeForEvent(
    tideEvent,
    events
  ) {

    if (
      !tideEvent ||
      !Array.isArray(events)
    ) {
      return null;
    }


    const eventTime =
      timeValue(
        tideEvent.modelTime ||
        tideEvent.time
      );

    const eventLevel =
      Number(
        tideEvent.seaLevel
      );


    if (
      eventTime === null ||
      !Number.isFinite(eventLevel)
    ) {
      return null;
    }


    const previousOpposite =
      events
        .filter(event => {

          if (
            !event ||
            event.type === tideEvent.type
          ) {
            return false;
          }


          const time =
            timeValue(
              event.time
            );

          const level =
            Number(
              event.seaLevel
            );


          return (
            time !== null &&
            time < eventTime &&
            Number.isFinite(level)
          );

        })
        .sort(
          (a, b) =>
            timeValue(b.time) -
            timeValue(a.time)
        )[0];


    if (!previousOpposite) {
      return null;
    }


    const previousTime =
      timeValue(
        previousOpposite.time
      );

    const previousLevel =
      Number(
        previousOpposite.seaLevel
      );


    const hoursApart =
      (
        eventTime -
        previousTime
      ) / 3600000;


    if (
      !Number.isFinite(hoursApart) ||
      hoursApart <= 0 ||
      hoursApart > 8
    ) {
      return null;
    }


    const metres =
      Math.abs(
        eventLevel -
        previousLevel
      );


    if (
      !Number.isFinite(metres) ||
      metres <= 0
    ) {
      return null;
    }


    return {

      metres:
        Math.round(
          metres * 10
        ) / 10,

      previousType:
        previousOpposite.type,

      currentType:
        tideEvent.type,

      source:
        "Open-Meteo modelled sea-level range"

    };

  }
    function tidalRangePreferenceFor(
    mark,
    tidalRange,
    events
  ) {

    const preference =
      String(
        Profiles?.get
          ? Profiles.get(mark)
              ?.tideRangePreference
          : "neutral"
      ).toLowerCase();


    if (
      !tidalRange ||
      !Number.isFinite(
        Number(
          tidalRange.metres
        )
      ) ||
      !Array.isArray(events) ||
      preference === "neutral"
    ) {

      return {
        preference,
        percentile:
          null,
        fitScore:
          50,
        adjustment:
          0
      };

    }


    const ranges =
      events
        .map(event =>
          tidalRangeForEvent(
            event,
            events
          )
        )
        .map(result =>
          Number(
            result?.metres
          )
        )
        .filter(Number.isFinite)
        .sort(
          (a, b) =>
            a - b
        );


    if (ranges.length < 4) {

      return {
        preference,
        percentile:
          null,
        fitScore:
          50,
        adjustment:
          0
      };

    }


    const current =
      Number(
        tidalRange.metres
      );


    const below =
      ranges.filter(
        value =>
          value < current
      ).length;


    const equal =
      ranges.filter(
        value =>
          value === current
      ).length;


    const percentile =
      clamp(
        (
          below +
          equal * 0.5
        ) /
        ranges.length,
        0,
        1
      );


    let fitScore = 50;


    if (
      preference === "small"
    ) {

      fitScore =
        (
          1 -
          percentile
        ) * 100;

    }
    else if (
      preference === "mid"
    ) {

      fitScore =
        (
          1 -
          Math.abs(
            percentile - 0.5
          ) * 2
        ) * 100;

    }
    else if (
      preference === "large"
    ) {

      fitScore =
        percentile * 100;

    }


    fitScore =
      clamp(
        fitScore,
        0,
        100
      );


    const adjustment =
      (
        fitScore - 50
      ) * 0.10;


    return {

      preference,

      percentile:
        Math.round(
          percentile * 100
        ),

      fitScore:
        Math.round(
          fitScore
        ),

      adjustment:
        Math.round(
          adjustment * 10
        ) / 10

    };

    } 
  /* =======================================================
     WINDOW HELPERS
     ======================================================= */

  function overlapWindow(
    primeWindow,
    rangeStart,
    rangeEnd
  ) {

    if (
      !primeWindow ||
      !rangeStart ||
      !rangeEnd
    ) {
      return null;
    }


    const start =
      Math.max(
        timeValue(
          primeWindow.start
        ) ?? Infinity,
        timeValue(
          rangeStart
        ) ?? Infinity
      );


    const end =
      Math.min(
        timeValue(
          primeWindow.end
        ) ?? -Infinity,
        timeValue(
          rangeEnd
        ) ?? -Infinity
      );


    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end < start
    ) {
      return null;
    }


    return {
      start:
        new Date(start),

      end:
        new Date(end)
    };

  }


  function hoursInsideWindow(
    forecast,
    window
  ) {

    if (
      !Array.isArray(
        forecast?.hourly
      ) ||
      !window
    ) {
      return [];
    }


    const start =
      timeValue(
        window.start
      );

    const end =
      timeValue(
        window.end
      );


    if (
      start === null ||
      end === null
    ) {
      return [];
    }


    return forecast.hourly.filter(
      hour => {

        const time =
          timeValue(
            hour?.time
          );

        return (
          time !== null &&
          time >= start &&
          time <= end
        );

      }
    );

  }


  /* =======================================================
     RECENT CONDITIONS FOR CLARITY ESTIMATE
     ======================================================= */

  function recentHoursFor(
    forecast,
    targetHour,
    lookbackHours = 12
  ) {

    if (
      !Array.isArray(
        forecast?.hourly
      ) ||
      !targetHour?.time
    ) {
      return [];
    }


    const target =
      timeValue(
        targetHour.time
      );


    if (target === null) {
      return [];
    }


    const lookback =
      lookbackHours *
      60 *
      60 *
      1000;


    return forecast.hourly.filter(
      hour => {

        const time =
          timeValue(
            hour?.time
          );

        if (time === null) {
          return false;
        }


        const difference =
          target - time;


        return (
          difference >= 0 &&
          difference <= lookback
        );

      }
    );

  }


  /* =======================================================
     MATCH FISHING SCORE TO SAFETY FOR EACH HOUR
     ======================================================= */

  function scoreSafeHours({
    mark,
    forecast,
    primeWindow,
    safetyResult,
    latestDeparture,
    rangeStart,
    rangeEnd
  }) {

    const clippedWindow =
      overlapWindow(
        primeWindow,
        rangeStart,
        rangeEnd
      );


    if (!clippedWindow) {
      return [];
    }


    const candidateHours =
      hoursInsideWindow(
        forecast,
        clippedWindow
      );


    const departureTime =
      latestDeparture?.time
        ? timeValue(
            latestDeparture.time
          )
        : null;


    const safetyByTime =
      new Map();


    if (
      Array.isArray(
        safetyResult?.hours
      )
    ) {

      safetyResult.hours.forEach(
        assessment => {

          if (
            assessment?.hour?.time
          ) {

            safetyByTime.set(
              assessment.hour.time,
              assessment
            );

          }

        }
      );

    }


    const scored = [];


    for (
      const hour of candidateHours
    ) {

      const hourTime =
        timeValue(
          hour.time
        );


      if (hourTime === null) {
        continue;
      }


      /*
       Never recommend an hour after the
       latest safe departure.
      */

      if (
        departureTime !== null &&
        hourTime > departureTime
      ) {
        continue;
      }


      const safetyAssessment =
        safetyByTime.get(
          hour.time
        );


      /*
       Rank 3 = HIGH RISK
       Rank 4 = DANGEROUS

       Neither can be considered a
       recommended fishing hour.
      */

      if (
        !safetyAssessment ||
        safetyAssessment.rank >= 3
      ) {
        continue;
      }


      const recentHours =
        recentHoursFor(
          forecast,
          hour,
          12
        );


      const fishing =
        Scoring.scoreHour({
          mark,
          hour,
          primeWindow,
          daylight:
            forecast.daylight || [],
          recentHours
        });


      if (
        !fishing ||
        !Number.isFinite(
          Number(
            fishing.score
          )
        )
      ) {
        continue;
      }


      scored.push({

        hour,

        score:
          Number(
            fishing.score
          ),

        components:
          fishing.components,

        safetyRisk:
          safetyAssessment.risk,

        safetyLevel:
          safetyAssessment.level,

        safetyLabel:
          safetyAssessment.label,

        safetyRank:
          safetyAssessment.rank

      });

    }


    return sortByScore(
      scored
    );

  }


  /* =======================================================
     ANALYSE ONE PRIME WINDOW
     ======================================================= */

  function analysePrimeWindow({
    mark,
    forecast,
    tideEvent,
    tideEvents,
    primeWindow,
    now = new Date(),
    horizonEnd
  }) {

    if (
      !mark ||
      !forecast ||
      !tideEvent ||
      !primeWindow
    ) {
      return null;
    }


    const safetyResult =
      Safety.assessPrimeWindow({
        mark,
        forecast,
        primeWindow
      });


    if (!safetyResult) {
      return null;
    }


    const latestDeparture =
      Safety.getLatestSafeDeparture(
        safetyResult
      );


    /*
     Safety engine can explicitly say the
     mark should not be fished.
    */

    if (
      !latestDeparture ||
      latestDeparture.shouldFish === false
    ) {
      return null;
    }


    const safeHours =
      scoreSafeHours({
        mark,
        forecast,
        primeWindow,
        safetyResult,
        latestDeparture,
        rangeStart:
          now,
        rangeEnd:
          horizonEnd
      });


    /*
     No safe forecast hour means this
     opportunity cannot be recommended.
    */

    if (!safeHours.length) {
      return null;
    }


    const best =
      safeHours[0];


    const safeAverage =
      average(
        safeHours.map(
          item => item.score
        )
      );


    const worstSafeRisk =
      Math.max(
        ...safeHours.map(
          item =>
            Number(
              item.safetyRisk
            ) || 0
        )
      );


      const tideReference =
      tideEvent.type;


       const tidalRange =
      tidalRangeForEvent(
        tideEvent,
        tideEvents
      );


    const tidalRangePreference =
      tidalRangePreferenceFor(
        mark,
        tidalRange,
        tideEvents
      );


    const rangeAdjustment =
      Number(
        tidalRangePreference
          ?.adjustment
      ) || 0;

    const adjustedBestScore =
      best.score === 100
        ? 100
        : clamp(
            best.score +
            rangeAdjustment,
            0,
            98
          );


    const adjustedWindowScore =
 
      safeAverage === null
        ? null
        : clamp(
            safeAverage +
            rangeAdjustment,
            0,
            98
          );


    return {

      mark,

      markId:
        mark.id,

      markName:
        mark.name,

      region:
        mark.region || "",

      tideReference,

      tideEvent,

           tideTime:
        tideEvent.time,

            tidalRange,

      tidalRangePreference,

      primeWindow,

      /*
       Headline score = best SAFE fishing hour.
       This is deliberately not the raw window
       score if its best hour is unsafe.
      */

            score:
        Math.round(
          adjustedBestScore
        ),

          windowScore:
        adjustedWindowScore === null
          ? null
          : Math.round(
              adjustedWindowScore
            ),

      bestHour:
        best.hour,

           bestComponents: {

        ...best.components,

        tideRangeFit:
          tidalRangePreference
            .fitScore,

        tideRangeAdjustment:
          tidalRangePreference
            .adjustment

      },

      bestHourSafetyRisk:
        best.safetyRisk,

      safetyRisk:
        safetyResult.risk,

      safeWindowRisk:
        Math.round(
          worstSafeRisk
        ),

      safetyLevel:
        safetyResult.level,

      safetyLabel:
        safetyResult.label,

      safetyIcon:
        safetyResult.icon,

      latestDeparture,

      safeHours,

      forcedEarlyDeparture:
        Boolean(
          latestDeparture
            .forcedEarly
        ),

      confidence:
        getOpportunityConfidence({
          mark,
          forecast,
          bestHour:
            best.hour
        })

    };

  }


  /* =======================================================
     CONFIDENCE

     Kept separate from fishing score.
     ======================================================= */

  function getOpportunityConfidence({
    mark,
    forecast,
    bestHour
  }) {

    const profile =
      Profiles?.get
        ? Profiles.get(mark)
        : null;


    const now =
      timeValue(
        forecast?.fetchedAt ||
        new Date()
      );


    const target =
      timeValue(
        bestHour?.time
      );


    let forecastConfidence = 70;


    if (
      now !== null &&
      target !== null
    ) {

      const hoursAhead =
        Math.max(
          0,
          (
            target - now
          ) / 3600000
        );


      if (hoursAhead <= 12) {
        forecastConfidence = 95;
      }
      else if (hoursAhead <= 24) {
        forecastConfidence = 90;
      }
      else if (hoursAhead <= 72) {
        forecastConfidence = 82;
      }
      else if (hoursAhead <= 120) {
        forecastConfidence = 68;
      }
      else {
        forecastConfidence = 55;
      }

    }


    let dnaConfidence = 65;


    switch (
      String(
        profile?.confidence || ""
      ).toLowerCase()
    ) {

      case "high":
        dnaConfidence = 95;
        break;

      case "good":
        dnaConfidence = 85;
        break;

      case "medium":
        dnaConfidence = 72;
        break;

      case "baseline":
        dnaConfidence = 60;
        break;

      case "low":
        dnaConfidence = 50;
        break;

      default:
        dnaConfidence = 65;

    }


    const score =
      Math.round(
        forecastConfidence * 0.65 +
        dnaConfidence * 0.35
      );


    return {

      score:
        clamp(
          score,
          0,
          100
        ),

      forecast:
        forecastConfidence,

      fishingDNA:
        dnaConfidence

    };

  }


  /* =======================================================
     ANALYSE ONE MARK FORECAST
     ======================================================= */

  function analyseMark({
    mark,
    forecast,
    now = new Date(),
    hours = 24
  }) {

    if (
      !mark ||
      !forecast
    ) {
      return [];
    }


    const current =
      asDate(now);


    if (!current) {
      return [];
    }


    const horizonEnd =
      new Date(
        current.getTime() +
        hours *
        60 *
        60 *
        1000
      );


    const tideData =
      Tides.fromForecast(
        forecast
      );


    if (
      !tideData ||
      !Array.isArray(
        tideData.events
      )
    ) {
      return [];
    }


    /*
     getPrimeWindowsBetween() respects the mark's
     Fishing DNA tide reference rather than using
     an arbitrary nearest tide.
    */

    const candidates =
      Tides.getPrimeWindowsBetween(
        tideData.events,
        mark,
        current,
        horizonEnd
      );


    const opportunities = [];


    for (
      const candidate of candidates
    ) {

      const result =
        analysePrimeWindow({

          mark,

          forecast,

                  tideEvent:
            candidate.event,

          tideEvents:
            tideData.events,

          primeWindow:
            candidate.window,

          now:
            current,

          horizonEnd

        });


      if (result) {
        opportunities.push(
          result
        );
      }

    }


    return sortByScore(
      opportunities
    );

  }


  /* =======================================================
     RANK ALREADY-ANALYSED MARK RESULTS
     ======================================================= */

  function rankOpportunities(
    opportunities
  ) {

    const ranked =
      sortByScore(
        Array.isArray(
          opportunities
        )
          ? opportunities
          : []
      );


    const lows =
      ranked.filter(
        item =>
          item.tideReference ===
          "low"
      );


    const highs =
      ranked.filter(
        item =>
          item.tideReference ===
          "high"
      );


    return {

      all:
        ranked,

      overall:
        ranked[0] || null,

      low:
        lows[0] || null,

      high:
        highs[0] || null,

      lows,

      highs

    };

  }


  /* =======================================================
     ANALYSE MULTIPLE PRE-FETCHED FORECASTS

     forecasts may be:
       Map(markId -> forecast)

     OR:
       plain object:
       {
         aberthaw: forecast,
         brandyCove: forecast
       }

     This separation lets us optimise network fetching
     independently without changing ranking logic.
     ======================================================= */

  function analyseForecastSet({
    marks,
    forecasts,
    now = new Date(),
    hours = 24
  }) {

    const markList =
      Array.isArray(marks)
        ? marks
        : Marks?.all || [];


    const opportunities = [];

    const failures = [];


    for (
      const mark of markList
    ) {

      let forecast = null;


      if (
        forecasts instanceof Map
      ) {

        forecast =
          forecasts.get(
            mark.id
          );

      }
      else if (
        forecasts &&
        typeof forecasts ===
          "object"
      ) {

        forecast =
          forecasts[
            mark.id
          ];

      }


      if (!forecast) {

        failures.push({

          markId:
            mark.id,

          markName:
            mark.name,

          reason:
            "No forecast supplied"

        });

        continue;

      }


      try {

        const results =
          analyseMark({

            mark,

            forecast,

            now,

            hours

          });


        opportunities.push(
          ...results
        );

      }
      catch (error) {

        failures.push({

          markId:
            mark.id,

          markName:
            mark.name,

          reason:
            error?.message ||
            String(error)

        });

      }

    }


    return {

      ...rankOpportunities(
        opportunities
      ),

      failures,

      analysedMarks:
        markList.length -
        failures.length,

      requestedMarks:
        markList.length

    };

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerOpportunities = {

    analysePrimeWindow,

    analyseMark,

    analyseForecastSet,

    rankOpportunities,

    getOpportunityConfidence,

    scoreSafeHours

  };


  console.log(
    "Sea Fishing Planner: opportunity engine ready."
  );

})();
