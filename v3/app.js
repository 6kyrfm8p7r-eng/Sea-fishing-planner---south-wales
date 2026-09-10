/* =========================================================
   SEA FISHING PLANNER — APP CONTROLLER
   ========================================================= */

(function () {

  "use strict";


  /* -------------------------------------------------------
     DEPENDENCIES
     ------------------------------------------------------- */

  const U =
    window.SeaPlannerUtils;

  if (!U) {

    console.error(
      "Sea Fishing Planner: utilities failed to load."
    );

    return;
  }


  /* -------------------------------------------------------
     APP STATE
     ------------------------------------------------------- */

  const state = {

    currentView: "now",

    loading: false,

    lastUpdated: null

  };


  const app =
    document.getElementById("app");


  const navButtons =
    Array.from(
      document.querySelectorAll(
        ".nav-button"
      )
    );


  /* -------------------------------------------------------
     NAVIGATION
     ------------------------------------------------------- */

  function setView(view) {

    state.currentView = view;

    navButtons.forEach(button => {

      const active =
        button.dataset.view === view;

      button.classList.toggle(
        "active",
        active
      );

    });


    render();


    if (view === "now") {

      runForecastSmokeTest();

    }

  }


  navButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        setView(
          button.dataset.view
        );

      }
    );

  });


  /* -------------------------------------------------------
     NOW VIEW
     ------------------------------------------------------- */

  function renderNow() {

    return `
      <section class="card">

        <div class="eyebrow">
          NEXT 24 HOURS
        </div>

        <h2 class="card-title">
          Best opportunity
        </h2>

        <p class="card-subtitle">
          Analysing live weather,
          marine conditions,
          Fishing DNA and safety.
        </p>

      </section>
    `;

  }


  /* -------------------------------------------------------
     7-DAY PLANNER
     ------------------------------------------------------- */

  function renderPlanner() {

    const days = [];

    const today =
      new Date();


    for (
      let offset = 0;
      offset < 7;
      offset++
    ) {

      const date =
        new Date(today);

      date.setDate(
        today.getDate() + offset
      );


      const confidence =
        U.getForecastConfidence(date);


      days.push(`
        <section class="card">

          <div class="eyebrow">
            ${U.formatDayHeading(date)}
          </div>

          <h2 class="card-title">
            Best low & high water
          </h2>

          <p class="card-subtitle">
            ${confidence.label}
          </p>


          <div class="planner-grid">

            <div class="planner-option">

              <div class="eyebrow">
                LOW WATER
              </div>

              <strong>
                Awaiting forecast
              </strong>

            </div>


            <div class="planner-option">

              <div class="eyebrow">
                HIGH WATER
              </div>

              <strong>
                Awaiting forecast
              </strong>

            </div>

          </div>

        </section>
      `);

    }


    return `
      <section class="card">

        <div class="eyebrow">
          7-DAY PLANNER
        </div>

        <h2 class="card-title">
          Plan the best session
        </h2>

        <p class="card-subtitle">
          Every suitable mark and tide
          will be analysed behind the scenes.
          The strongest low-water and
          high-water opportunities will
          appear here.
        </p>

      </section>

      ${days.join("")}
    `;

  }


  /* -------------------------------------------------------
     MARKS VIEW
     ------------------------------------------------------- */

  function renderMarks() {

    return `
      <section class="card">

        <div class="eyebrow">
          FISHING DNA
        </div>

        <h2 class="card-title">
          Mark intelligence
        </h2>

        <p class="card-subtitle">
          Each mark has its own tidal behaviour,
          sea-state preferences,
          light preferences,
          safety rules and evidence confidence.
        </p>

      </section>


      <section class="card">

        <div class="eyebrow">
          LEARNING ENGINE
        </div>

        <h2 class="card-title">
          Collective evidence
        </h2>

        <p class="card-subtitle">
          Catch reports, blanks and verified
          external evidence will gradually
          refine each mark's Fishing DNA.
        </p>

      </section>
    `;

  }


  /* -------------------------------------------------------
     MAIN RENDER
     ------------------------------------------------------- */

  function render() {

    if (!app) {
      return;
    }


    if (
      state.currentView ===
      "planner"
    ) {

      app.innerHTML =
        renderPlanner();

      return;
    }


    if (
      state.currentView ===
      "marks"
    ) {

      app.innerHTML =
        renderMarks();

      return;
    }


    app.innerHTML =
      renderNow();

  }


  /* -------------------------------------------------------
     LIVE FORECAST TEST
     ------------------------------------------------------- */

  async function runForecastSmokeTest() {

    const Marks =
      window.SeaPlannerMarks;

    const Forecast =
      window.SeaPlannerForecast;

    const Tides =
      window.SeaPlannerTides;

    const Scoring =
      window.SeaPlannerScoring;

    const Safety =
      window.SeaPlannerSafety;


    if (
      !Marks ||
      !Forecast ||
      !Tides
    ) {

      return;

    }


    const mark =
      Marks.getById(
        "aberthaw"
      );


    if (!mark) {
      return;
    }


    /*
     Loading state.
     This appears while the live APIs are being fetched.
    */

    app.innerHTML = `
      <section class="card">

        <div class="eyebrow">
          LIVE CONDITIONS
        </div>

        <h2 class="card-title">
          Aberthaw
        </h2>

        <p class="card-subtitle">
          Fetching live weather,
          marine and tide data…
        </p>

      </section>
    `;


    try {

      const forecast =
        await Forecast.fetchForecast(
          mark
        );


      /*
       If the user changed tab while the API request
       was running, do not overwrite that new view.
      */

      if (
        state.currentView !==
        "now"
      ) {

        return;

      }


      const tides =
        Tides.fromForecast(
          forecast
        );


      const nextPrime =
        Tides.findNextPrimeWindow(
          tides.events,
          mark
        );


      const scoredPrime =
        nextPrime &&
        Scoring

          ? Scoring.scorePrimeWindow({

              mark,

              forecast,

              primeWindow:
                nextPrime.window

            })

          : null;


      const safetyResult =
        nextPrime &&
        Safety

          ? Safety.assessPrimeWindow({

              mark,

              forecast,

              primeWindow:
                nextPrime.window

            })

          : null;


      const safeDeparture =
        safetyResult &&
        Safety

          ? Safety.getLatestSafeDeparture(
              safetyResult
            )

          : null;


      const now =
        new Date();


      const nextHigh =
        tides.highs.find(
          event =>
            new Date(
              event.time
            ) >= now
        );


      const nextLow =
        tides.lows.find(
          event =>
            new Date(
              event.time
            ) >= now
        );


      /*
       Dashboard.
       All values below are already calculated,
       so there are no undefined-variable issues.
      */

      app.innerHTML = `
        <section class="card dashboard-card">

          <div class="mark-heading">

            <div>

              <div class="eyebrow">
                LIVE CONDITIONS
              </div>

              <h2 class="mark-name">
                ${mark.name}
              </h2>

              <div class="mark-region">
                ${String(
                  mark.region || ""
                ).toUpperCase()}
              </div>

            </div>


            <div class="version-pill">
              LIVE
            </div>

          </div>


          <div class="metrics-grid">

            <div class="metric-box">

              <div class="metric-icon">
                ↗
              </div>

              <div class="metric-label">
                NEXT HIGH
              </div>

              <div class="metric-value">
                ${
                  nextHigh
                    ? U.formatHour(
                        nextHigh.time
                      )
                    : "—"
                }
              </div>

            </div>


            <div class="metric-box">

              <div class="metric-icon">
                ↘
              </div>

              <div class="metric-label">
                NEXT LOW
              </div>

              <div class="metric-value">
                ${
                  nextLow
                    ? U.formatHour(
                        nextLow.time
                      )
                    : "—"
                }
              </div>

            </div>


            <div class="metric-box">

              <div class="metric-icon">
                ◷
              </div>

              <div class="metric-label">
                BEST HOUR
              </div>

              <div class="metric-value">
                ${
                  scoredPrime?.bestHour

                    ? U.formatHour(
                        scoredPrime
                          .bestHour
                          .time
                      )

                    : "—"
                }
              </div>

            </div>

          </div>


          <div class="tide-grid">

            <div class="tide-box">

              <div class="metric-label">
                PRIME WINDOW
              </div>

              <div class="metric-value">

                ${
                  nextPrime

                    ? U.formatPrimeWindow(
                        nextPrime
                          .window
                          .start,

                        nextPrime
                          .window
                          .end
                      )

                    : "—"
                }

              </div>

            </div>


            <div class="tide-box tide-high">

              <div class="metric-icon">
                ≈
              </div>

              <div class="metric-label">
                WEATHER HOURS
              </div>

              <div class="metric-value">
                ${forecast.hourly.length}
              </div>

            </div>


            <div class="tide-box tide-low">

              <div class="metric-icon">
                ≋
              </div>

              <div class="metric-label">
                TIDE EVENTS
              </div>

              <div class="metric-value">
                ${tides.events.length}
              </div>

            </div>

          </div>

        </section>


        <section class="score-panel">

          <div class="score-half">

            <div class="score-label">
              FISHING SCORE
            </div>

            <div class="score-number good">
              ${
                scoredPrime?.score ??
                "—"
              } / 100
            </div>

            <div class="progress-track">

              <div
                class="progress-fill"
                style="
                  width:
                  ${
                    scoredPrime?.score ??
                    0
                  }%
                "
              ></div>

            </div>

          </div>


          <div class="score-half">

            <div class="score-label">
              SAFETY
            </div>

            <div class="score-number risk">
              ${
                safetyResult?.risk ??
                "—"
              } / 100
            </div>

            <div class="progress-track">

              <div
                class="progress-fill risk"
                style="
                  width:
                  ${
                    safetyResult?.risk ??
                    0
                  }%
                "
              ></div>

            </div>


            <div
              class="
                status-pill
                ${
                  safetyResult?.level ===
                  "dangerous"

                    ? "status-danger"

                    : safetyResult?.level ===
                      "high-risk"

                      ? "status-risk"

                      : safetyResult?.level ===
                        "caution"

                        ? "status-caution"

                        : "status-safe"
                }
              "
              style="margin-top:12px;"
            >

              ${safetyResult?.icon ?? ""}

              ${
                safetyResult?.label ??
                "Not found"
              }

            </div>

          </div>

        </section>


        <section class="card">

          <div class="eyebrow">
            CONDITIONS
          </div>


          <div class="component-grid">

            <div class="component">

              <div class="icon">
                ↕
              </div>

              <small>
                TIDE
              </small>

              <strong>
                ${
                  scoredPrime
                    ?.bestComponents
                    ?.tide ??
                  "—"
                }
              </strong>

            </div>


            <div class="component">

              <div class="icon">
                ≈
              </div>

              <small>
                SWELL
              </small>

              <strong>
                ${
                  scoredPrime
                    ?.bestComponents
                    ?.swell ??
                  "—"
                }
              </strong>

            </div>


            <div class="component">

              <div class="icon">
                ➤
              </div>

              <small>
                WIND
              </small>

              <strong>
                ${
                  scoredPrime
                    ?.bestComponents
                    ?.wind ??
                  "—"
                }
              </strong>

            </div>


            <div class="component">

              <div class="icon">
                ◌
              </div>

              <small>
                CLARITY
              </small>

              <strong>
                ${
                  scoredPrime
                    ?.bestComponents
                    ?.clarity ??
                  "—"
                }
              </strong>

            </div>


            <div class="component">

              <div class="icon">
                ☁
              </div>

              <small>
                CLOUD
              </small>

              <strong>
                ${
                  scoredPrime
                    ?.bestComponents
                    ?.cloud ??
                  "—"
                }
              </strong>

            </div>


            <div class="component">

              <div class="icon">
                ♨
              </div>

              <small>
                SEA TEMP
              </small>

              <strong>
                ${
                  scoredPrime
                    ?.bestComponents
                    ?.seaTemperature ??
                  "—"
                }
              </strong>

            </div>

          </div>


          <div class="safety-footer">

            <div class="safety-item">

              <div class="big-icon">
                ⚠
              </div>

              <div>

                <div class="metric-label">
                  WORST SAFETY HOUR
                </div>

                <div class="metric-value">

                  ${
                    safetyResult
                      ?.worstHour

                      ? U.formatHour(
                          safetyResult
                            .worstHour
                            .time
                        )

                      : "—"
                  }

                </div>

              </div>

            </div>


            <div class="safety-item departure">

              <div class="big-icon">
                ◷
              </div>

              <div>

                <div class="metric-label">
                  LATEST SAFE DEPARTURE
                </div>

                <div class="metric-value">

                  ${
                    safeDeparture?.time

                      ? U.formatHour(
                          safeDeparture.time
                        )

                      : safeDeparture
                          ?.shouldFish ===
                        false

                        ? "Do not fish"

                        : "—"
                  }

                </div>

              </div>

            </div>

          </div>

        </section>
      `;


      state.lastUpdated =
        new Date();


    } catch (error) {

      /*
       Again, don't overwrite another tab
       if the user moved while fetching.
      */

      if (
        state.currentView !==
        "now"
      ) {

        return;

      }


      app.innerHTML = `
        <section class="card">

          <div class="eyebrow">
            LIVE CONDITIONS
          </div>

          <h2 class="card-title">
            Unable to load live data
          </h2>

          <p class="card-subtitle">
            ${
              error?.message ||
              "Unknown forecast error"
            }
          </p>

        </section>
      `;

    }

  }


  /* -------------------------------------------------------
     START APP
     ------------------------------------------------------- */

  render();

  runForecastSmokeTest();


  console.log(
    "Sea Fishing Planner V3 started."
  );


  console.log(
    "Compass test:",
    U.degreesToCompass(225)
  );


})();
