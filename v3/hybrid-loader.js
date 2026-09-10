/* =========================================================
   BASS FINDER WALES — HYBRID FORECAST LOADER

   STAGE 1
   -------
   Scan all marks using tightly grouped coastal forecast
   points. This stage finds POTENTIAL contenders only.

   STAGE 2
   -------
   Re-fetch shortlisted marks at their EXACT coordinates.
   Only exact-coordinate results are allowed to become
   final recommendations.

   IMPORTANT
   ---------
   Coarse safety is NEVER used to permanently reject a mark.
   Final safety decisions use exact-coordinate forecasts.
   ========================================================= */

(function () {

  "use strict";


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


  const DEFAULT_OPTIONS = {

    /*
     Tight radius deliberately chosen because swell can
     change meaningfully around the Welsh coastline.
    */
    clusterRadiusKm: 7,

    /*
     Maximum number of cluster forecasts running together.
     Each forecast itself performs weather + marine calls.
    */
    clusterConcurrency: 3,

    /*
     Exact checks are deliberately conservative.
    */
    exactConcurrency: 3,

    /*
     Shortlist sizes.

     Duplicates are removed, so actual exact checks will
     normally be fewer than the sum of these.
    */
    topOverall: 8,
    topLow: 4,
    topHigh: 4,

    horizonHours: 24

  };


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function dateValue(value) {

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
      dateValue(value);

    return date
      ? date.getTime()
      : null;

  }


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


  function toRadians(degrees) {

    return (
      degrees *
      Math.PI /
      180
    );

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
        .map(mark =>
          number(mark.lat)
        )
        .filter(
          Number.isFinite
        );


    const longitudes =
      marks
        .map(mark =>
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

     Greedy clustering is intentional here.

     It keeps the implementation predictable and prevents
     us from making extremely broad forecast regions.
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

      let chosen = null;


      /*
       Find the closest existing cluster which is still
       within our deliberately small radius.
      */

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
              cluster?.marks
                ?.map(
                  mark =>
                    mark.name
                ) || [],

            reason:
              result?.error
                ?.message ||
              "Cluster forecast failed"

          });

          return;

        }


        /*
         Every mark in this cluster temporarily uses
         the same forecast for the screening stage.
        */

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
     CLIP A FISHING DNA WINDOW TO OUR SEARCH HORIZON
     ======================================================= */

  function clipWindow(
    window,
    rangeStart,
    rangeEnd
  ) {

    const start =
      Math.max(
        timeValue(
          window?.start
        ) ?? Infinity,
        timeValue(
          rangeStart
        ) ?? Infinity
      );


    const end =
      Math.min(
        timeValue(
          window?.end
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


  /* =======================================================
     FIRST-PASS SCREENING

     CRITICAL DESIGN DECISION:

     We do NOT reject on coarse safety here.

     A shared/clustered swell forecast is good enough for
     finding candidates, but not good enough to permanently
     say a specific rock mark is safe or unsafe.

     Safety becomes authoritative only after exact re-fetch.
     ======================================================= */

  function screenMark({
    mark,
    forecast,
    now,
    horizonHours
  }) {

    if (
      !mark ||
      !forecast
    ) {
      return null;
    }


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
          candidate.event.type,

        tideEvent:
          candidate.event,

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
        b.score - a.score
    );


    /*
     One first-pass result per mark is enough.
     Exact stage can inspect all relevant windows.
    */

    return candidates[0];

  }


  /* =======================================================
     SCREEN ALL MARKS
     ======================================================= */

  function screenAllMarks({
    marks,
    forecastByMark,
    now,
    horizonHours
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
          screenMark({

            mark,

            forecast,

            now,

            horizonHours

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
        b.score - a.score
    );

  }


  /* =======================================================
     FINALIST SELECTION
     ======================================================= */

  function selectFinalists(
    screened,
    options
  ) {

    const overall =
      screened.slice(
        0,
        options.topOverall
      );


    const lows =
      screened
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
      screened
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
     FETCH EXACT FORECASTS FOR FINALISTS
     ======================================================= */

  async function fetchExactForecasts({
    marks,
    concurrency
  }) {

    const results =
      await mapWithConcurrency(

        marks,

        concurrency,

        async mark => {

          const forecast =
            await Forecast
              .fetchForecast(mark);


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
          marks[index];


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
              result?.error
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
     COMPLETE HYBRID ANALYSIS
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
        : Marks?.all || [];


    if (!marks.length) {

      throw new Error(
        "No fishing marks available."
      );

    }


    /* -----------------------------------------------------
       STAGE 1 — CLUSTERED COASTAL SCAN
       ----------------------------------------------------- */

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

        overall:
          null,

        low:
          null,

        high:
          null,

        all:
          [],

        screened:
          [],

        finalists:
          [],

        diagnostics: {

          requestedMarks:
            marks.length,

          clusterCount:
            clusters.length,

          exactChecks:
            0,

          clusterFailures:
            clusterData
              .failures,

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


    /* -----------------------------------------------------
       STAGE 2 — EXACT COORDINATE RECHECK
       ----------------------------------------------------- */

    const exactData =
      await fetchExactForecasts({

        marks:
          finalists,

        concurrency:
          options
            .exactConcurrency

      });


    /*
     This is where the existing opportunity engine becomes
     authoritative.

     It reruns:
       - exact tides
       - Fishing DNA
       - hour-by-hour fishing score
       - exact swell / wave safety
       - wind safety
       - deterioration
       - latest safe departure
       - best SAFE fishing hour

     High-risk / dangerous recommendations are rejected here.
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
     PUBLIC API
     ======================================================= */

  window.SeaPlannerHybrid = {

    options:
      DEFAULT_OPTIONS,

    distanceKm,

    buildClusters,

    fetchClusterForecasts,

    screenMark,

    screenAllMarks,

    selectFinalists,

    fetchExactForecasts,

    analyseNext24Hours

  };


  console.log(
    "Bass Finder Wales: hybrid forecast loader ready."
  );

})();
