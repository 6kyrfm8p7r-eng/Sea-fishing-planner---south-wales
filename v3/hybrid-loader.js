/* =========================================================
   BASS FINDER WALES — HYBRID FORECAST LOADER

   TWO-STAGE FORECAST ENGINE

   STAGE 1
   -------
   Scan all marks using tightly grouped coastal forecast
   points. This stage finds POTENTIAL contenders only.

   STAGE 2
   -------
   Re-fetch shortlisted marks at their EXACT coordinates.

   SAFETY
   ------
   Coarse safety is NEVER allowed to permanently reject
   a mark.

   Final safety decisions are always made using the
   exact-coordinate forecast.

   7-DAY PLANNER
   -------------
   The weekly planner reuses the same cluster forecasts
   across all seven days, then fetches every unique
   finalist at exact coordinates only once.
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     DEPENDENCIES
     ======================================================= */

  const Marks =
    window.SeaPlannerMarks;

  const Forecast =
    window.SeaPlannerForecast;

  const Tides =
    window.SeaPlannerTides;

  const Scoring =
    window.SeaPlannerScoring;

  const Opportunities =
    window.SeaPlannerOpportunities;
const BassActivity =
  window.SeaPlannerBassActivity;

  if (
    !Marks ||
    !Forecast ||
    !Tides ||
    !Scoring ||
    !Opportunities
  ) {

    console.error(
      "Bass Finder Wales: hybrid dependencies failed to load."
    );

    return;

  }


  /* =======================================================
     DEFAULT OPTIONS
     ======================================================= */

  const DEFAULT_OPTIONS = {

    /*
     Tight coastal clusters.

     Exact finalists are still re-fetched at their
     individual coordinates.
    */
    clusterRadiusKm: 7,

    clusterConcurrency: 3,

    exactConcurrency: 3,


    /*
     Number of contenders preserved from the first pass.

     The overall list plus dedicated LOW and HIGH lists
     prevents one tide type from dominating the shortlist.
    */

    topOverall: 8,

    topLow: 4,

    topHigh: 4,


    /*
     NOW horizon.
    */

    horizonHours: 24,


    /*
     Weekly planner length.
    */

    plannerDays: 7

  };


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function dateValue(value) {

    const date =
      value instanceof Date
        ? new Date(
            value.getTime()
          )
        : new Date(value);


    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  function timeValue(value) {

    const date =
      dateValue(value);


    return date
      ? date.getTime()
      : null;

  }


  function number(
    value,
    fallback = null
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }
function addBassActivity(
  opportunity
) {

  if (!opportunity) {
    return null;
  }

  if (!BassActivity) {

    return {
      ...opportunity,
      bassActivity: null,
      opportunityScore:
        opportunity.score
    };

  }

  const markId =
    opportunity.markId ||
    opportunity.mark?.id ||
    null;


  const activity =
    markId
      ? BassActivity
          .analyseMarkActivity(
            markId
          )
      : null;


  const opportunityScore =
    BassActivity
      .calculateOpportunityScore(
        opportunity.score,
        activity
      );


  return {

    ...opportunity,

    bassActivity:
      activity,

    opportunityScore

  };

}

    const parsed =
      Number(value);


    return Number.isFinite(parsed)
      ? parsed
      : fallback;

  }


  function toRadians(degrees) {

    return (
      degrees *
      Math.PI /
      180
    );

  }


  function startOfDay(value) {

    const date =
      dateValue(value);


    if (!date) {
      return null;
    }


    date.setHours(
      0,
      0,
      0,
      0
    );


    return date;

  }


  function startOfNextDay(value) {

    const date =
      startOfDay(value);


    if (!date) {
      return null;
    }


    date.setDate(
      date.getDate() + 1
    );


    return date;

  }


  function hoursBetween(
    start,
    end
  ) {

    const startTime =
      timeValue(start);

    const endTime =
      timeValue(end);


    if (
      startTime === null ||
      endTime === null ||
      endTime <= startTime
    ) {
      return 0;
    }


    return (
      endTime -
      startTime
    ) /
    3600000;

  }


  /* =======================================================
     DISTANCE
     ======================================================= */

  function distanceKm(
    first,
    second
  ) {

    const lat1 =
      number(first?.lat);

    const lon1 =
      number(first?.lon);

    const lat2 =
      number(second?.lat);

    const lon2 =
      number(second?.lon);


    if (
      lat1 === null ||
      lon1 === null ||
      lat2 === null ||
      lon2 === null
    ) {

      return Infinity;

    }


    const earthRadiusKm =
      6371;


    const latitudeDifference =
      toRadians(
        lat2 - lat1
      );


    const longitudeDifference =
      toRadians(
        lon2 - lon1
      );


    const a =
      Math.sin(
        latitudeDifference / 2
      ) ** 2 +

      Math.cos(
        toRadians(lat1)
      ) *

      Math.cos(
        toRadians(lat2)
      ) *

      Math.sin(
        longitudeDifference / 2
      ) ** 2;


    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );


    return (
      earthRadiusKm *
      c
    );

  }


  /* =======================================================
     CLUSTER CENTRE
     ======================================================= */

  function clusterCentre(marks) {

    if (
      !Array.isArray(marks) ||
      !marks.length
    ) {

      return null;

    }


    const latitudes =
      marks
        .map(
          mark =>
            number(mark.lat)
        )
        .filter(
          Number.isFinite
        );


    const longitudes =
      marks
        .map(
          mark =>
            number(mark.lon)
        )
        .filter(
          Number.isFinite
        );


    if (
      !latitudes.length ||
      !longitudes.length
    ) {

      return null;

    }


    return {

      lat:
        latitudes.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        latitudes.length,

      lon:
        longitudes.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        longitudes.length

    };

  }


  /* =======================================================
     BUILD TIGHT COASTAL CLUSTERS
     ======================================================= */

  function buildClusters(
    marks,
    radiusKm =
      DEFAULT_OPTIONS
        .clusterRadiusKm
  ) {

    const source =
      Array.isArray(marks)
        ? marks
        : [];


    const clusters = [];


    for (
      const mark of source
    ) {

      let chosen =
        null;


      for (
        const cluster of clusters
      ) {

        const centre =
          clusterCentre(
            cluster.marks
          );


        const distance =
          distanceKm(
            mark,
            centre
          );


        if (
          distance <= radiusKm &&
          (
            !chosen ||
            distance <
              chosen.distance
          )
        ) {

          chosen = {
            cluster,
            distance
          };

        }

      }


      if (chosen) {

        chosen
          .cluster
          .marks
          .push(mark);

      }
      else {

        clusters.push({

          id:
            `cluster-${clusters.length + 1}`,

          marks:
            [mark]

        });

      }

    }


    return clusters.map(
      cluster => {

        const centre =
          clusterCentre(
            cluster.marks
          );


        return {

          ...cluster,

          lat:
            centre?.lat,

          lon:
            centre?.lon,

          forecastPoint: {

            id:
              cluster.id,

            name:
              `Forecast ${cluster.id}`,

            lat:
              centre?.lat,

            lon:
              centre?.lon

          }

        };

      }
    );

  }


  /* =======================================================
     CONTROLLED CONCURRENCY
     ======================================================= */

  async function mapWithConcurrency(
    items,
    limit,
    worker
  ) {

    const source =
      Array.isArray(items)
        ? items
        : [];


    const results =
      new Array(
        source.length
      );


    let nextIndex = 0;


    async function runner() {

      while (true) {

        const index =
          nextIndex;


        nextIndex++;


        if (
          index >=
          source.length
        ) {

          return;

        }


        try {

          results[index] =
            await worker(
              source[index],
              index
            );

        }
        catch (error) {

          results[index] = {
            error
          };

        }

      }

    }


    const workerCount =
      Math.max(
        1,
        Math.min(
          Number(limit) || 1,
          source.length || 1
        )
      );


    await Promise.all(
      Array.from(
        {
          length:
            workerCount
        },
        () =>
          runner()
      )
    );


    return results;

  }


  /* =======================================================
     FETCH CLUSTER FORECASTS
     ======================================================= */

  async function fetchClusterForecasts({
    clusters,
    concurrency =
      DEFAULT_OPTIONS
        .clusterConcurrency
  }) {

    const results =
      await mapWithConcurrency(

        clusters,

        concurrency,

        async cluster => {

          const forecast =
            await Forecast
              .fetchForecast(
                cluster
                  .forecastPoint
              );


          return {
            cluster,
            forecast
          };

        }

      );


    const forecastByMark =
      new Map();


    const failures = [];


    results.forEach(
      (result, index) => {

        const cluster =
          clusters[index];


        if (
          !result ||
          result.error ||
          !result.forecast
        ) {

          failures.push({

            clusterId:
              cluster?.id,

            marks:
              cluster
                ?.marks
                ?.map(
                  mark =>
                    mark.name
                ) || [],

            reason:
              result
                ?.error
                ?.message ||
              "Cluster forecast failed"

          });


          return;

        }


        result
          .cluster
          .marks
          .forEach(
            mark => {

              forecastByMark.set(
                mark.id,
                result.forecast
              );

            }
          );

      }
    );


    return {

      forecastByMark,

      failures

    };

  }


  /* =======================================================
     WINDOW HELPERS
     ======================================================= */

  function clipWindow(
    window,
    rangeStart,
    rangeEnd
  ) {

    const windowStart =
      timeValue(
        window?.start
      );

    const windowEnd =
      timeValue(
        window?.end
      );

    const searchStart =
      timeValue(
        rangeStart
      );

    const searchEnd =
      timeValue(
        rangeEnd
      );


    if (
      windowStart === null ||
      windowEnd === null ||
      searchStart === null ||
      searchEnd === null
    ) {

      return null;

    }


    const start =
      Math.max(
        windowStart,
        searchStart
      );


    const end =
      Math.min(
        windowEnd,
        searchEnd
      );


    if (
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


  /* =======================================================
     FIRST-PASS SCREENING FOR A TIME RANGE

     IMPORTANT:
     No coarse safety rejection happens here.

     This stage only finds fishing-potential contenders.
     ======================================================= */

  function screenMarkRange({
    mark,
    forecast,
    rangeStart,
    rangeEnd
  }) {

    if (
      !mark ||
      !forecast
    ) {

      return null;

    }


    const start =
      dateValue(
        rangeStart
      );

    const end =
      dateValue(
        rangeEnd
      );


    if (
      !start ||
      !end ||
      end <= start
    ) {

      return null;

    }


    const tideData =
      Tides.fromForecast(
        forecast
      );


    if (
      !Array.isArray(
        tideData?.events
      )
    ) {

      return null;

    }


    const windows =
      Tides
        .getPrimeWindowsBetween(
          tideData.events,
          mark,
          start,
          end
        );


    const candidates = [];


    for (
      const candidate of windows
    ) {

      const clipped =
        clipWindow(
          candidate.window,
          start,
          end
        );


      if (!clipped) {
        continue;
      }


      const fishing =
        Scoring
          .scorePrimeWindow({

            mark,

            forecast,

            primeWindow:
              clipped

          });


      if (
        !fishing ||
        !Number.isFinite(
          Number(
            fishing
              .bestHourScore
          )
        )
      ) {

        continue;

      }


      candidates.push({

        mark,

        markId:
          mark.id,

        markName:
          mark.name,

        region:
          mark.region || "",

        tideReference:
          candidate
            .event
            .type,

        tideEvent:
          candidate.event,

        tideTime:
          candidate
            .event
            .time,

        primeWindow:
          clipped,

        score:
          Number(
            fishing
              .bestHourScore
          ),

        windowScore:
          fishing.score,

        bestHour:
          fishing.bestHour,

        bestComponents:
          fishing.bestComponents

      });

    }


    if (!candidates.length) {

      return null;

    }


    candidates.sort(
      (a, b) =>
        b.score -
        a.score
    );


    /*
     One coarse result per mark is enough.

     The exact stage will analyse the mark properly.
    */

    return candidates[0];

  }


  /* =======================================================
     LEGACY / NOW SCREENING WRAPPER
     ======================================================= */

  function screenMark({
    mark,
    forecast,
    now,
    horizonHours
  }) {

    const start =
      dateValue(now);


    if (!start) {

      return null;

    }


    const end =
      new Date(
        start.getTime() +
        horizonHours *
        3600000
      );


    return screenMarkRange({

      mark,

      forecast,

      rangeStart:
        start,

      rangeEnd:
        end

    });

  }


  /* =======================================================
     SCREEN ALL MARKS FOR RANGE
     ======================================================= */

  function screenAllMarksRange({
    marks,
    forecastByMark,
    rangeStart,
    rangeEnd
  }) {

    const results = [];


    for (
      const mark of marks
    ) {

      const forecast =
        forecastByMark.get(
          mark.id
        );


      if (!forecast) {
        continue;
      }


      try {

        const result =
          screenMarkRange({

            mark,

            forecast,

            rangeStart,

            rangeEnd

          });


        if (result) {

          results.push(
            result
          );

        }

      }
      catch (error) {

        console.warn(
          `Screening failed for ${mark.name}:`,
          error
        );

      }

    }


    return results.sort(
      (a, b) =>
        b.score -
        a.score
    );

  }


  /* =======================================================
     LEGACY / NOW SCREEN ALL MARKS WRAPPER
     ======================================================= */

  function screenAllMarks({
    marks,
    forecastByMark,
    now,
    horizonHours
  }) {

    const start =
      dateValue(now);


    if (!start) {

      return [];

    }


    const end =
      new Date(
        start.getTime() +
        horizonHours *
        3600000
      );


    return screenAllMarksRange({

      marks,

      forecastByMark,

      rangeStart:
        start,

      rangeEnd:
        end

    });

  }


  /* =======================================================
     FINALIST SELECTION
     ======================================================= */

  function selectFinalists(
    screened,
    options
  ) {

    const source =
      Array.isArray(screened)
        ? screened
        : [];


    const overall =
      source.slice(
        0,
        options.topOverall
      );


    const lows =
      source
        .filter(
          item =>
            item
              .tideReference ===
            "low"
        )
        .slice(
          0,
          options.topLow
        );


    const highs =
      source
        .filter(
          item =>
            item
              .tideReference ===
            "high"
        )
        .slice(
          0,
          options.topHigh
        );


    const unique =
      new Map();


    [
      ...overall,
      ...lows,
      ...highs
    ].forEach(
      item => {

        if (
          item?.mark?.id
        ) {

          unique.set(
            item.mark.id,
            item.mark
          );

        }

      }
    );


    return [
      ...unique.values()
    ];

  }


  /* =======================================================
     FETCH EXACT FORECASTS
     ======================================================= */

  async function fetchExactForecasts({
    marks,
    concurrency =
      DEFAULT_OPTIONS
        .exactConcurrency
  }) {

    const source =
      Array.isArray(marks)
        ? marks
        : [];


    const results =
      await mapWithConcurrency(

        source,

        concurrency,

        async mark => {

          const forecast =
            await Forecast
              .fetchForecast(
                mark
              );


          return {
            mark,
            forecast
          };

        }

      );


    const forecasts =
      new Map();


    const failures = [];


    results.forEach(
      (result, index) => {

        const mark =
          source[index];


        if (
          !result ||
          result.error ||
          !result.forecast
        ) {

          failures.push({

            markId:
              mark?.id,

            markName:
              mark?.name,

            reason:
              result
                ?.error
                ?.message ||
              "Exact forecast failed"

          });


          return;

        }


        forecasts.set(
          mark.id,
          result.forecast
        );

      }
    );


    return {

      forecasts,

      failures

    };

  }


  /* =======================================================
     EXACT RANGE ANALYSIS
     ======================================================= */

  function analyseExactRange({
    marks,
    forecasts,
    rangeStart,
    rangeEnd
  }) {

    const start =
      dateValue(
        rangeStart
      );

    const end =
      dateValue(
        rangeEnd
      );


    if (
      !start ||
      !end ||
      end <= start
    ) {

      return {

        overall: null,
        low: null,
        high: null,
        all: [],
        lows: [],
        highs: [],
        failures: []

      };

    }


    const hours =
      hoursBetween(
        start,
        end
      );


    return Opportunities
      .analyseForecastSet({

        marks,

        forecasts,

        now:
          start,

        hours

      });

  }


  /* =======================================================
     COMPLETE NOW ANALYSIS
     ======================================================= */

  async function analyseNext24Hours(
    customOptions = {}
  ) {

    const options = {

      ...DEFAULT_OPTIONS,

      ...customOptions

    };


    const now =
      customOptions.now
        ? dateValue(
            customOptions.now
          )
        : new Date();


    if (!now) {

      throw new Error(
        "Invalid analysis start time."
      );

    }


    const marks =
      Array.isArray(
        customOptions.marks
      )
        ? customOptions.marks
        : Marks.all || [];


    if (!marks.length) {

      throw new Error(
        "No fishing marks available."
      );

    }


    /*
     STAGE 1
     Clustered regional scan.
    */

    const clusters =
      buildClusters(
        marks,
        options.clusterRadiusKm
      );


    const clusterData =
      await fetchClusterForecasts({

        clusters,

        concurrency:
          options
            .clusterConcurrency

      });


    const screened =
      screenAllMarks({

        marks,

        forecastByMark:
          clusterData
            .forecastByMark,

        now,

        horizonHours:
          options
            .horizonHours

      });


    if (!screened.length) {

      return {

        overall: null,

        low: null,

        high: null,

        all: [],

        lows: [],

        highs: [],

        screened: [],

        finalists: [],

        diagnostics: {

          requestedMarks:
            marks.length,

          clusterCount:
            clusters.length,

          screenedMarks:
            0,

          exactChecks:
            0,

          clusterFailures:
            clusterData.failures,

          exactFailures:
            []

        }

      };

    }


    const finalists =
      selectFinalists(
        screened,
        options
      );


    /*
     STAGE 2
     Exact-coordinate forecasts.
    */

    const exactData =
      await fetchExactForecasts({

        marks:
          finalists,

        concurrency:
          options
            .exactConcurrency

      });


    /*
     Authoritative exact-coordinate analysis.

     Fishing score + exact safety + deterioration +
     latest safe departure all happen here.
    */

    const finalResults =
      Opportunities
        .analyseForecastSet({

          marks:
            finalists,

          forecasts:
            exactData
              .forecasts,

          now,

          hours:
            options
              .horizonHours

        });


    return {

      overall:
        finalResults
          .overall,

      low:
        finalResults
          .low,

      high:
        finalResults
          .high,

      all:
        finalResults
          .all || [],

      lows:
        finalResults
          .lows || [],

      highs:
        finalResults
          .highs || [],

      screened,

      finalists,

      diagnostics: {

        requestedMarks:
          marks.length,

        clusterCount:
          clusters.length,

        screenedMarks:
          screened.length,

        exactChecks:
          finalists.length,

        clusterFailures:
          clusterData
            .failures,

        exactFailures: [
          ...exactData.failures,
          ...(
            finalResults
              .failures || []
          )
        ]

      }

    };

  }


  /* =======================================================
     BUILD 7 CALENDAR DAY RANGES

     TODAY:
     Starts at the current time, so the planner will never
     recommend an opportunity which has already passed.

     FUTURE DAYS:
     Midnight to midnight.
     ======================================================= */

  function buildPlannerRanges(
    now,
    dayCount
  ) {

    const current =
      dateValue(now);


    if (!current) {

      return [];

    }


    const ranges = [];


    for (
      let index = 0;
      index < dayCount;
      index++
    ) {

      const calendarDay =
        startOfDay(
          current
        );


      calendarDay.setDate(
        calendarDay.getDate() +
        index
      );


      const nextDay =
        startOfNextDay(
          calendarDay
        );


      const rangeStart =
        index === 0
          ? new Date(
              current.getTime()
            )
          : calendarDay;


      const rangeEnd =
        nextDay;


      ranges.push({

        index,

        date:
          calendarDay,

        start:
          rangeStart,

        end:
          rangeEnd

      });

    }


    return ranges;

  }


  /* =======================================================
     COMPLETE 7-DAY HYBRID ANALYSIS

     IMPORTANT EFFICIENCY RULE:

     1. Fetch each regional cluster ONCE.
     2. Screen all seven days from those forecasts.
     3. Build one union of unique finalists.
     4. Fetch each finalist at exact coordinates ONCE.
     5. Analyse each day using those exact forecasts.

     This is substantially lighter than running seven
     completely separate Wales-wide scans.
     ======================================================= */

  async function analyseNext7Days(
    customOptions = {}
  ) {

    const options = {

      ...DEFAULT_OPTIONS,

      ...customOptions

    };


    const now =
      customOptions.now
        ? dateValue(
            customOptions.now
          )
        : new Date();


    if (!now) {

      throw new Error(
        "Invalid planner start time."
      );

    }


    const marks =
      Array.isArray(
        customOptions.marks
      )
        ? customOptions.marks
        : Marks.all || [];


    if (!marks.length) {

      throw new Error(
        "No fishing marks available."
      );

    }


    const dayCount =
      Math.max(
        1,
        Math.min(
          7,
          Number(
            options.plannerDays
          ) || 7
        )
      );


    const ranges =
      buildPlannerRanges(
        now,
        dayCount
      );


    /*
     -----------------------------------------------
     STAGE 1
     One regional forecast scan for the whole week.
     -----------------------------------------------
    */

    const clusters =
      buildClusters(
        marks,
        options.clusterRadiusKm
      );


    const clusterData =
      await fetchClusterForecasts({

        clusters,

        concurrency:
          options
            .clusterConcurrency

      });


    /*
     Screen each calendar day independently.
    */

    const screenedDays =
      ranges.map(
        range => {

          const screened =
            screenAllMarksRange({

              marks,

              forecastByMark:
                clusterData
                  .forecastByMark,

              rangeStart:
                range.start,

              rangeEnd:
                range.end

            });


          const finalists =
            selectFinalists(
              screened,
              options
            );


          return {

            ...range,

            screened,

            finalists

          };

        }
      );


    /*
     Union every day's finalists.

     A mark which qualifies on multiple days is only
     downloaded once at exact coordinates.
    */

    const uniqueFinalists =
      new Map();


    screenedDays.forEach(
      day => {

        day
          .finalists
          .forEach(
            mark => {

              if (
                mark?.id
              ) {

                uniqueFinalists.set(
                  mark.id,
                  mark
                );

              }

            }
          );

      }
    );


    const finalistMarks = [
      ...uniqueFinalists.values()
    ];


    /*
     If nothing qualified at all, return empty day cards.
    */

    if (!finalistMarks.length) {

      return {

        days:
          ranges.map(
            range => ({

              date:
                range.date,

              start:
                range.start,

              end:
                range.end,

              overall:
                null,

              low:
                null,

              high:
                null,

              all: [],

              lows: [],

              highs: []

            })
          ),

        finalists: [],

        diagnostics: {

          requestedMarks:
            marks.length,

          clusterCount:
            clusters.length,

          plannerDays:
            ranges.length,

          exactChecks:
            0,

          clusterFailures:
            clusterData.failures,

          exactFailures:
            []

        }

      };

    }


    /*
     -----------------------------------------------
     STAGE 2
     Exact coordinates — one fetch per unique finalist.
     -----------------------------------------------
    */

    const exactData =
      await fetchExactForecasts({

        marks:
          finalistMarks,

        concurrency:
          options
            .exactConcurrency

      });


    const exactFailures = [
      ...exactData.failures
    ];


    /*
     Analyse each calendar day independently using
     the exact-coordinate finalist forecasts.
    */

    const days =
      screenedDays.map(
        day => {

          const result =
            analyseExactRange({

              marks:
                day.finalists,

              forecasts:
                exactData.forecasts,

              rangeStart:
                day.start,

              rangeEnd:
                day.end

            });


          if (
            Array.isArray(
              result?.failures
            )
          ) {

            exactFailures.push(
              ...result.failures
            );

          }


          return {

            date:
              day.date,

            start:
              day.start,

            end:
              day.end,

            overall:
              result
                ?.overall ||
              null,

            low:
              result
                ?.low ||
              null,

            high:
              result
                ?.high ||
              null,

            all:
              result
                ?.all ||
              [],

            lows:
              result
                ?.lows ||
              [],

            highs:
              result
                ?.highs ||
              [],

            screenedCount:
              day
                .screened
                .length,

            finalistCount:
              day
                .finalists
                .length

          };

        }
      );


    return {

      days,

      finalists:
        finalistMarks,

      diagnostics: {

        requestedMarks:
          marks.length,

        clusterCount:
          clusters.length,

        plannerDays:
          days.length,

        exactChecks:
          finalistMarks.length,

        clusterFailures:
          clusterData.failures,

        exactFailures

      }

    };

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerHybrid = {

    options:
      DEFAULT_OPTIONS,

    distanceKm,

    buildClusters,

    fetchClusterForecasts,

    screenMark,

    screenMarkRange,

    screenAllMarks,

    screenAllMarksRange,

    selectFinalists,

    fetchExactForecasts,

    analyseNext24Hours,

    analyseNext7Days

  };


  console.log(
    "Bass Finder Wales: hybrid NOW + 7-day engine ready."
  );

})();
