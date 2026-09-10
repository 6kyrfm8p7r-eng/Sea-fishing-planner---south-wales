/* =========================================================
   SEA FISHING PLANNER — TIDE ENGINE
   Detects high/low water events from sea-level data
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function validPoint(point) {

    return (
      point &&
      point.time &&
      Number.isFinite(
        Number(point.seaLevel)
      )
    );

  }


  function toTime(value) {

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  function hoursBetween(a, b) {

    const first =
      toTime(a);

    const second =
      toTime(b);

    if (!first || !second) {
      return Infinity;
    }

    return Math.abs(
      second.getTime() -
      first.getTime()
    ) / 3600000;

  }


  /* =======================================================
     CLEAN SEA-LEVEL SERIES
     ======================================================= */

  function cleanSeaLevelSeries(points) {

    if (!Array.isArray(points)) {
      return [];
    }

    return points
      .filter(validPoint)
      .map(point => ({
        time: point.time,
        date: toTime(point.time),
        seaLevel: Number(point.seaLevel)
      }))
      .filter(point => point.date)
      .sort(
        (a, b) =>
          a.date.getTime() -
          b.date.getTime()
      );

  }


  /* =======================================================
     OPTIONAL LIGHT SMOOTHING

     Reduces tiny model fluctuations without shifting tide
     times significantly.
     ======================================================= */

  function smoothSeaLevelSeries(
    points,
    radius = 1
  ) {

    const series =
      cleanSeaLevelSeries(points);

    if (
      radius <= 0 ||
      series.length < 3
    ) {
      return series;
    }

    return series.map(
      (point, index) => {

        let total = 0;
        let count = 0;

        for (
          let i = index - radius;
          i <= index + radius;
          i++
        ) {

          if (
            i >= 0 &&
            i < series.length
          ) {

            total +=
              series[i].seaLevel;

            count++;

          }

        }

        return {
          ...point,
          smoothedSeaLevel:
            count
              ? total / count
              : point.seaLevel
        };

      }
    );

  }


  /* =======================================================
     RAW TURNING POINT DETECTION
     ======================================================= */

  function detectTurningPoints(points) {

    const series =
      smoothSeaLevelSeries(
        points,
        1
      );

    if (series.length < 3) {
      return [];
    }

    const events = [];

    for (
      let i = 1;
      i < series.length - 1;
      i++
    ) {

      const previous =
        series[i - 1];

      const current =
        series[i];

      const next =
        series[i + 1];

      const prevLevel =
        previous.smoothedSeaLevel ??
        previous.seaLevel;

      const currentLevel =
        current.smoothedSeaLevel ??
        current.seaLevel;

      const nextLevel =
        next.smoothedSeaLevel ??
        next.seaLevel;


      const isHigh =
        currentLevel >= prevLevel &&
        currentLevel > nextLevel;

      const isLow =
        currentLevel <= prevLevel &&
        currentLevel < nextLevel;


      if (
        !isHigh &&
        !isLow
      ) {
        continue;
      }


      events.push({

        type:
          isHigh
            ? "high"
            : "low",

        time:
          current.time,

        date:
          current.date,

        seaLevel:
          current.seaLevel,

        smoothedSeaLevel:
          currentLevel,

        source:
          "Open-Meteo sea level model"

      });

    }

    return events;

  }


  /* =======================================================
     REMOVE FALSE / DUPLICATE EVENTS

     Real high/low waters should be several hours apart.
     This collapses tiny nearby fluctuations.
     ======================================================= */

  function deduplicateEvents(
    events,
    minimumSpacingHours = 4
  ) {

    if (!Array.isArray(events)) {
      return [];
    }

    const sorted =
      [...events].sort(
        (a, b) =>
          new Date(a.time) -
          new Date(b.time)
      );

    const result = [];

    for (const event of sorted) {

      const previous =
        result[
          result.length - 1
        ];

      if (!previous) {

        result.push(event);
        continue;

      }


      const spacing =
        hoursBetween(
          previous.time,
          event.time
        );


      if (
        spacing >=
        minimumSpacingHours
      ) {

        result.push(event);
        continue;

      }


      /*
       If two nearby candidates are the same tide type,
       keep the more extreme one.
      */

      if (
        previous.type ===
        event.type
      ) {

        const replace =

          event.type === "high"
            ? event.seaLevel >
              previous.seaLevel
            : event.seaLevel <
              previous.seaLevel;


        if (replace) {

          result[
            result.length - 1
          ] = event;

        }

        continue;

      }


      /*
       Opposite tide types occurring unrealistically close
       together are treated as model noise.
      */

    }

    return result;

  }


  /* =======================================================
     ENFORCE HIGH / LOW ALTERNATION
     ======================================================= */

  function enforceAlternation(events) {

    if (!Array.isArray(events)) {
      return [];
    }

    const result = [];

    for (const event of events) {

      const previous =
        result[
          result.length - 1
        ];

      if (!previous) {

        result.push(event);
        continue;

      }


      if (
        previous.type !==
        event.type
      ) {

        result.push(event);
        continue;

      }


      /*
       Same type twice in a row:
       retain the stronger extreme.
      */

      const replace =

        event.type === "high"
          ? event.seaLevel >
            previous.seaLevel
          : event.seaLevel <
            previous.seaLevel;


      if (replace) {

        result[
          result.length - 1
        ] = event;

      }

    }

    return result;

  }


  /* =======================================================
     MAIN TIDE EVENT DETECTOR
     ======================================================= */

  function detectTideEvents(points) {

    const raw =
      detectTurningPoints(
        points
      );

    const deduplicated =
      deduplicateEvents(
        raw,
        4
      );

    return enforceAlternation(
      deduplicated
    );

  }


  /* =======================================================
     FILTERING HELPERS
     ======================================================= */

  function eventsBetween(
    events,
    start,
    end
  ) {

    const startDate =
      toTime(start);

    const endDate =
      toTime(end);

    if (
      !startDate ||
      !endDate
    ) {
      return [];
    }

    return events.filter(
      event => {

        const date =
          toTime(event.time);

        return (
          date &&
          date >= startDate &&
          date <= endDate
        );

      }
    );

  }


  function nextEvents(
    events,
    numberOfHours = 24,
    now = new Date()
  ) {

    const start =
      toTime(now);

    if (!start) {
      return [];
    }

    const end =
      new Date(
        start.getTime() +
        numberOfHours *
        3600000
      );

    return eventsBetween(
      events,
      start,
      end
    );

  }


  function eventsForDate(
    events,
    date
  ) {

    const target =
      toTime(date);

    if (!target) {
      return [];
    }

    return events.filter(
      event => {

        const current =
          toTime(event.time);

        return (
          current &&
          current.getFullYear() ===
            target.getFullYear() &&
          current.getMonth() ===
            target.getMonth() &&
          current.getDate() ===
            target.getDate()
        );

      }
    );

  }


  function eventsByType(
    events,
    type
  ) {

    return events.filter(
      event =>
        event.type === type
    );

  }


  /* =======================================================
     FISHING DNA EVENT SELECTION
     ======================================================= */

  function getRelevantTideType(
    markOrId
  ) {

    const Profiles =
      window.SeaPlannerProfiles;

    if (!Profiles) {
      return "low";
    }

    const profile =
      Profiles.get(
        markOrId
      );

    return (
      profile?.tideReference ||
      "low"
    );

  }


  function getPrimeWindowForEvent(
    event,
    markOrId
  ) {

    if (!event) {
      return null;
    }

    const Profiles =
      window.SeaPlannerProfiles;

    if (
      !Profiles ||
      typeof Profiles.getPrimeWindow !==
        "function"
    ) {

      return null;
    }

    return Profiles.getPrimeWindow(
      event.time,
      markOrId
    );

  }


  /* =======================================================
     FIND NEXT USABLE PRIME WINDOW

     Important:
     This does NOT just select the next tide event.

     It selects the first Fishing DNA window whose END
     has not already passed.

     This fixes the old V2 bug where a nearly-finished
     or already-finished prime window could be selected.
     ======================================================= */

  function findNextPrimeWindow(
    events,
    markOrId,
    now = new Date()
  ) {

    const currentTime =
      toTime(now);

    if (!currentTime) {
      return null;
    }

    const tideType =
      getRelevantTideType(
        markOrId
      );

    const candidates =
      eventsByType(
        events,
        tideType
      );

    for (
      const event of candidates
    ) {

      const window =
        getPrimeWindowForEvent(
          event,
          markOrId
        );

      if (!window) {
        continue;
      }


      /*
       Ignore any prime window which has completely passed.
      */

      if (
        window.end <
        currentTime
      ) {
        continue;
      }


      const status =

        window.start >
        currentTime
          ? "upcoming"
          : "active";


      return {

        event,
        window,

        status,

        isActive:
          status === "active",

        isUpcoming:
          status === "upcoming"

      };

    }

    return null;

  }


  /* =======================================================
     FIND PRIME WINDOWS WITHIN A FORECAST PERIOD
     ======================================================= */

  function getPrimeWindowsBetween(
    events,
    markOrId,
    start,
    end
  ) {

    const startDate =
      toTime(start);

    const endDate =
      toTime(end);

    if (
      !startDate ||
      !endDate
    ) {
      return [];
    }


    const tideType =
      getRelevantTideType(
        markOrId
      );


    return eventsByType(
      events,
      tideType
    )
      .map(event => {

        const window =
          getPrimeWindowForEvent(
            event,
            markOrId
          );

        if (!window) {
          return null;
        }


        const overlaps =

          window.end >= startDate &&
          window.start <= endDate;


        if (!overlaps) {
          return null;
        }


        return {

          event,
          window,

          tideReference:
            tideType

        };

      })
      .filter(Boolean);

  }


  /* =======================================================
     DAILY HIGH / LOW TIDE HELPERS
     ======================================================= */

  function getDailyTides(
    events,
    date
  ) {

    const daily =
      eventsForDate(
        events,
        date
      );

    return {

      all:
        daily,

      highs:
        eventsByType(
          daily,
          "high"
        ),

      lows:
        eventsByType(
          daily,
          "low"
        )

    };

  }


  /* =======================================================
     BUILD TIDE DATA FROM FORECAST RESULT
     ======================================================= */

  function fromForecast(
    forecastResult
  ) {

    const seaLevel15 =
      forecastResult
        ?.seaLevel15Minutes ||
      [];

    let events =
      detectTideEvents(
        seaLevel15
      );


    /*
     Fallback to hourly sea-level data if the 15-minute
     series is unavailable.
    */

    if (
      events.length < 2 &&
      Array.isArray(
        forecastResult?.hourly
      )
    ) {

      const hourlySeaLevel =
        forecastResult.hourly
          .filter(
            hour =>
              Number.isFinite(
                Number(
                  hour.seaLevel
                )
              )
          )
          .map(
            hour => ({
              time:
                hour.time,

              seaLevel:
                Number(
                  hour.seaLevel
                )
            })
          );


      events =
        detectTideEvents(
          hourlySeaLevel
        );

    }


    return {

      source:
        "Open-Meteo sea-level model",

      resolution:
        seaLevel15.length
          ? "15-minute"
          : "hourly",

      events,

      highs:
        eventsByType(
          events,
          "high"
        ),

      lows:
        eventsByType(
          events,
          "low"
        ),

      next24Hours:
        nextEvents(
          events,
          24
        )

    };

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerTides = {

    cleanSeaLevelSeries,
    smoothSeaLevelSeries,

    detectTurningPoints,
    deduplicateEvents,
    enforceAlternation,
    detectTideEvents,

    eventsBetween,
    nextEvents,
    eventsForDate,
    eventsByType,

    getRelevantTideType,
    getPrimeWindowForEvent,
    findNextPrimeWindow,
    getPrimeWindowsBetween,

    getDailyTides,

    fromForecast

  };


  console.log(
    "Sea Fishing Planner: tide engine ready."
  );

})();
