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
   TURNING-POINT INTERPOLATION

   The Open-Meteo sea-level series is normally sampled
   every 15 minutes.

   A real high or low water can occur between those samples.

   We use the level immediately before, at, and after the
   detected turning point to estimate the mathematical peak
   or trough between them.

   This improves OUR timing resolution without pretending
   that the underlying model is an official tide table.
   ======================================================= */

function interpolateTurningPoint(
  previous,
  current,
  next,
  previousLevel,
  currentLevel,
  nextLevel
) {

  const previousTime =
    toTime(
      previous?.time
    );

  const currentTime =
    toTime(
      current?.time
    );

  const nextTime =
    toTime(
      next?.time
    );


  if (
    !previousTime ||
    !currentTime ||
    !nextTime
  ) {

    return {
      time: current.time,
      date: current.date,
      offsetMinutes: 0
    };

  }


  /*
   Parabolic interpolation.

   For three equally spaced samples:

               y(-1), y(0), y(+1)

   the vertex offset from the centre sample is:

       0.5 × (y(-1) - y(+1))
       ---------------------
       y(-1) - 2y(0) + y(+1)

   An offset of:
      -1 = previous sample
       0 = centre sample
      +1 = next sample
  */

  const denominator =
    previousLevel -
    (2 * currentLevel) +
    nextLevel;


  if (
    !Number.isFinite(denominator) ||
    Math.abs(denominator) <
      0.0000001
  ) {

    return {
      time: current.time,
      date: current.date,
      offsetMinutes: 0
    };

  }


  let offset =
    0.5 *
    (
      previousLevel -
      nextLevel
    ) /
    denominator;


  /*
   Defensive clamp.

   We detected the centre point as the turning point,
   so the refined vertex should remain between its
   neighbouring samples.
  */

  offset =
    Math.max(
      -1,
      Math.min(
        1,
        offset
      )
    );


  /*
   Calculate representative spacing.

   This also allows the same interpolation to work if
   we fall back to hourly sea-level data.
  */

  const previousSpacing =
    currentTime.getTime() -
    previousTime.getTime();


  const nextSpacing =
    nextTime.getTime() -
    currentTime.getTime();


  const sampleSpacing =
    (
      previousSpacing +
      nextSpacing
    ) /
    2;


  if (
    !Number.isFinite(sampleSpacing) ||
    sampleSpacing <= 0
  ) {

    return {
      time: current.time,
      date: current.date,
      offsetMinutes: 0
    };

  }


  const refinedDate =
    new Date(
      currentTime.getTime() +
      (
        offset *
        sampleSpacing
      )
    );


  const offsetMinutes =
    (
      refinedDate.getTime() -
      currentTime.getTime()
    ) /
    60000;


  return {

    /*
     Keep the same local-style timestamp format already
     used throughout the app.

     We use the Date object itself internally, while the
     ISO-style string remains compatible with the rest
     of the tide engine.
    */

    time:
      refinedDate,

    date:
      refinedDate,

    offsetMinutes

  };

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


  if (
    series.length <
    3
  ) {

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


    const previousLevel =
      previous.smoothedSeaLevel ??
      previous.seaLevel;


    const currentLevel =
      current.smoothedSeaLevel ??
      current.seaLevel;


    const nextLevel =
      next.smoothedSeaLevel ??
      next.seaLevel;


    const isHigh =
      currentLevel >=
        previousLevel &&
      currentLevel >
        nextLevel;


    const isLow =
      currentLevel <=
        previousLevel &&
      currentLevel <
        nextLevel;


    if (
      !isHigh &&
      !isLow
    ) {

      continue;

    }


    const refined =
      interpolateTurningPoint(

        previous,

        current,

        next,

        previousLevel,

        currentLevel,

        nextLevel

      );


    events.push({

      type:
        isHigh
          ? "high"
          : "low",

      /*
       Refined model-derived turning point.
      */

      time:
        refined.time,

      date:
        refined.date,

      /*
       Raw centre sample retained for diagnostics.
      */

      rawTime:
        current.time,

      timingAdjustmentMinutes:
        refined.offsetMinutes,

      seaLevel:
        current.seaLevel,

      smoothedSeaLevel:
        currentLevel,

      source:
        "Open-Meteo sea level model — interpolated estimate"

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
   LOCAL TIDE CALIBRATION LAYER

   PURPOSE
   -------
   Open-Meteo provides the continuous sea-level curve.

   Our interpolation refines the turning point between
   model samples.

   This layer allows individual marks to receive a LOCAL
   timing correction derived from an authoritative tidal
   reference station.

   IMPORTANT
   ---------
   No guessed offsets are applied here.

   Until a mark has a verified calibration entry,
   offsetMinutes remains zero and existing tide behaviour
   is unchanged.
   ======================================================= */


/*
 Example future entry:

 aberthaw: {
   stationId: "verified-reference-id",
   stationName: "Verified reference station",
   offsetMinutes: 12,
   verified: true,
   source: "UKHO"
 }

 Do NOT populate these from guesses.
*/

const MARK_TIDE_CALIBRATIONS = {

};


function getTideCalibration(
  markOrId
) {

  let id = "";


  if (
    typeof markOrId === "string"
  ) {

    id =
      markOrId;

  }
  else if (
    markOrId &&
    typeof markOrId === "object"
  ) {

    id =
      markOrId.id || "";

  }


  const calibration =
    id
      ? MARK_TIDE_CALIBRATIONS[id]
      : null;


  /*
   Only verified calibration data is permitted to
   alter tide timing.
  */

  if (
    !calibration ||
    calibration.verified !== true ||
    !Number.isFinite(
      Number(
        calibration.offsetMinutes
      )
    )
  ) {

    return {

      stationId:
        null,

      stationName:
        null,

      offsetMinutes:
        0,

      verified:
        false,

      source:
        null

    };

  }


  return {

    stationId:
      calibration.stationId ||
      null,

    stationName:
      calibration.stationName ||
      null,

    offsetMinutes:
      Number(
        calibration.offsetMinutes
      ),

    verified:
      true,

    source:
      calibration.source ||
      "Verified tide reference"

  };

}


function calibrateTideEvent(
  event,
  markOrId
) {

  if (!event) {

    return null;

  }


  const calibration =
    getTideCalibration(
      markOrId
    );


  /*
   Preserve the original model-derived event even
   when there is no verified calibration.
  */

  if (
    !calibration.verified ||
    calibration.offsetMinutes === 0
  ) {

    return {

      ...event,

      modelTime:
        event.time,

      calibrationMinutes:
        0,

      calibrated:
        false,

      calibrationSource:
        null,

      referenceStationId:
        null,

      referenceStationName:
        null

    };

  }


  const original =
    toTime(
      event.time
    );


  if (!original) {

    return {

      ...event,

      modelTime:
        event.time,

      calibrationMinutes:
        0,

      calibrated:
        false

    };

  }


  const calibratedDate =
    new Date(
      original.getTime() +
      (
        calibration.offsetMinutes *
        60000
      )
    );


  return {

    ...event,

    /*
     Final tide time used by Fishing DNA.
    */

    time:
      calibratedDate,

    date:
      calibratedDate,


    /*
     Preserve the interpolated model time for
     diagnostics and later validation.
    */

    modelTime:
      event.time,

    calibrationMinutes:
      calibration.offsetMinutes,

    calibrated:
      true,

    calibrationSource:
      calibration.source,

    referenceStationId:
      calibration.stationId,

    referenceStationName:
      calibration.stationName

  };

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
    const rawEvent of candidates
  ) {

    /*
     Apply a verified local correction if one exists.

     Otherwise this returns the same model-derived time.
    */

    const event =
      calibrateTideEvent(
        rawEvent,
        markOrId
      );


    const window =
      getPrimeWindowForEvent(
        event,
        markOrId
      );


    if (!window) {

      continue;

    }


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
        status ===
        "active",

      isUpcoming:
        status ===
        "upcoming"

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

    .map(
      rawEvent => {

        /*
         Apply verified local calibration before
         constructing the Fishing DNA window.
        */

        const event =
          calibrateTideEvent(
            rawEvent,
            markOrId
          );


        const window =
          getPrimeWindowForEvent(
            event,
            markOrId
          );


        if (!window) {

          return null;

        }


        const overlaps =

          window.end >=
            startDate &&

          window.start <=
            endDate;


        if (!overlaps) {

          return null;

        }


        return {

          event,

          window,

          tideReference:
            tideType

        };

      }
    )

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
getTideCalibration,
calibrateTideEvent,
MARK_TIDE_CALIBRATIONS,
})();
