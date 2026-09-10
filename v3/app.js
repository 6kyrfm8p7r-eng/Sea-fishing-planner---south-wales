/* =========================================================
   BASS FINDER WALES — APP CONTROLLER

   V3 HYBRID INTELLIGENCE TEST

   NOW:
   - scans all fishing marks
   - uses clustered forecasts for initial screening
   - re-fetches finalists at exact coordinates
   - runs exact fishing + safety analysis
   - returns Best Overall / Best Low / Best High

   7 DAYS:
   - placeholder until NOW engine is proven

   MARKS:
   - Fishing DNA information
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     DEPENDENCIES
     ======================================================= */

  const U =
    window.SeaPlannerUtils;

  const Hybrid =
    window.SeaPlannerHybrid;


  if (!U) {

    console.error(
      "Bass Finder Wales: utilities failed to load."
    );

    return;

  }


  if (!Hybrid) {

    console.error(
      "Bass Finder Wales: hybrid engine failed to load."
    );

    return;

  }


  /* =======================================================
     APP STATE
     ======================================================= */

  const state = {

    currentView:
      "now",

    loading:
      false,

    hybridResult:
      null,

    hybridError:
      null,

    hybridPromise:
      null,

    lastUpdated:
      null

  };


  const app =
    document.getElementById(
      "app"
    );


  const navButtons =
    Array.from(
      document.querySelectorAll(
        ".nav-button"
      )
    );


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function formatTime(value) {

    if (!value) {
      return "—";
    }


    try {

      return U.formatHour(
        value
      );

    }
    catch (error) {

      return "—";

    }

  }


  function formatWindow(window) {

    if (
      !window?.start ||
      !window?.end
    ) {
      return "—";
    }


    try {

      return U.formatPrimeWindow(
        window.start,
        window.end
      );

    }
    catch (error) {

      return "—";

    }

  }


  function formatScore(value) {

    const number =
      Number(value);


    return Number.isFinite(number)
      ? Math.round(number)
      : "—";

  }


  function safetyClass(level) {

    switch (
      String(level || "")
        .toLowerCase()
    ) {

      case "dangerous":
        return "status-danger";

      case "high-risk":
        return "status-risk";

      case "caution":
        return "status-caution";

      default:
        return "status-safe";

    }

  }


  function tideName(value) {

    return value === "high"
      ? "HIGH WATER"
      : value === "low"
        ? "LOW WATER"
        : "TIDE";

  }


  /* =======================================================
     NAVIGATION
     ======================================================= */

  function setView(view) {

    state.currentView =
      view;


    navButtons.forEach(
      button => {

        const active =
          button.dataset.view ===
          view;


        button.classList.toggle(
          "active",
          active
        );

      }
    );


    render();


    /*
     If NOW has never been analysed,
     start the hybrid engine.

     If results already exist, do NOT
     repeat all API requests simply
     because the user changed tabs.
    */

    if (
      view === "now" &&
      !state.hybridResult &&
      !state.hybridPromise
    ) {

      runHybridAnalysis();

    }

  }


  navButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          setView(
            button.dataset.view
          );

        }
      );

    }
  );


  /* =======================================================
     LOADING VIEW
     ======================================================= */

  function renderHybridLoading() {

    return `
      <section class="card">

        <div class="eyebrow">
          LIVE INTELLIGENCE
        </div>

        <h2 class="card-title">
          Searching the Welsh coast…
        </h2>

        <p class="card-subtitle">
          Screening all fishing marks,
          then checking the strongest
          contenders at their exact coordinates.
        </p>

      </section>


      <section class="card">

        <div class="eyebrow">
          TWO-STAGE ANALYSIS
        </div>

        <div class="component-grid">

          <div class="component">

            <div class="icon">
              1
            </div>

            <small>
              FIRST PASS
            </small>

            <strong>
              Coastal scan
            </strong>

          </div>


          <div class="component">

            <div class="icon">
              2
            </div>

            <small>
              FINALISTS
            </small>

            <strong>
              Exact coordinates
            </strong>

          </div>


          <div class="component">

            <div class="icon">
              ≈
            </div>

            <small>
              MARINE
            </small>

            <strong>
              Swell checked
            </strong>

          </div>


          <div class="component">

            <div class="icon">
              ⚠
            </div>

            <small>
              SAFETY
            </small>

            <strong>
              Independent
            </strong>

          </div>

        </div>

      </section>
    `;

  }


  /* =======================================================
     OPPORTUNITY CARD
     ======================================================= */

  function renderOpportunity(
    opportunity,
    label
  ) {

    if (!opportunity) {

      return `
        <section class="card">

          <div class="eyebrow">
            ${label}
          </div>

          <h2 class="card-title">
            No suitable opportunity
          </h2>

          <p class="card-subtitle">
            No safe qualifying session was
            found in this category during
            the next 24 hours.
          </p>

        </section>
      `;

    }


    const confidence =
      formatScore(
        opportunity
          .confidence
          ?.score
      );


    const safetyRisk =
      formatScore(
        opportunity
          .safetyRisk
      );


    const departure =
      opportunity
        .latestDeparture
        ?.time;


    return `
      <section class="card dashboard-card">

        <div class="mark-heading">

          <div>

            <div class="eyebrow">
              ${label}
            </div>

            <h2 class="mark-name">
              ${opportunity.markName || "Unknown mark"}
            </h2>

            <div class="mark-region">
              ${String(
                opportunity.region || ""
              ).toUpperCase()}
            </div>

          </div>


          <div class="version-pill">
            ${formatScore(
              opportunity.score
            )}
          </div>

        </div>


        <div class="metrics-grid">

          <div class="metric-box">

            <div class="metric-icon">
              ${opportunity.tideReference === "high" ? "↗" : "↘"}
            </div>

            <div class="metric-label">
              ${tideName(
                opportunity.tideReference
              )}
            </div>

            <div class="metric-value">
              ${formatTime(
                opportunity.tideTime
              )}
            </div>

          </div>


          <div class="metric-box">

            <div class="metric-icon">
              ◷
            </div>

            <div class="metric-label">
              BEST SAFE HOUR
            </div>

            <div class="metric-value">
              ${formatTime(
                opportunity
                  .bestHour
                  ?.time
              )}
            </div>

          </div>


          <div class="metric-box">

            <div class="metric-icon">
              ↩
            </div>

            <div class="metric-label">
              LEAVE BY
            </div>

            <div class="metric-value">
              ${formatTime(
                departure
              )}
            </div>

          </div>

        </div>


        <div class="tide-grid">

          <div class="tide-box">

            <div class="metric-label">
              PRIME WINDOW
            </div>

            <div class="metric-value">
              ${formatWindow(
                opportunity
                  .primeWindow
              )}
            </div>

          </div>


          <div class="tide-box">

            <div class="metric-label">
              FISHING SCORE
            </div>

            <div class="metric-value">
              ${formatScore(
                opportunity.score
              )} / 100
            </div>

          </div>


          <div class="tide-box">

            <div class="metric-label">
              CONFIDENCE
            </div>

            <div class="metric-value">
              ${confidence} / 100
            </div>

          </div>

        </div>


        <div
          class="
            status-pill
            ${safetyClass(
              opportunity.safetyLevel
            )}
          "
          style="margin-top:16px;"
        >

          ${opportunity.safetyIcon || "✓"}

          ${opportunity.safetyLabel || "Safety checked"}

          · ${safetyRisk}/100 risk

        </div>


        ${
          opportunity.forcedEarlyDeparture

            ? `
              <div
                class="status-pill status-caution"
                style="margin-top:10px;"
              >
                ⚠ Conditions deteriorate —
                leave earlier than the full
                Fishing DNA window.
              </div>
            `

            : ""
        }
        ${
          label === "BEST OVERALL"

            ? `
              <div style="margin-top:18px;">

                <div class="eyebrow">
                  TEMPORARY SCORE AUDIT
                </div>

                <div class="component-grid">

                  <div class="component">
                    <small>TIDE SCORE</small>
                    <strong>
                      ${opportunity.bestComponents?.tide ?? "—"}
                    </strong>
                  </div>

                  <div class="component">
                    <small>SWELL SCORE</small>
                    <strong>
                      ${opportunity.bestComponents?.swell ?? "—"}
                    </strong>
                  </div>

                  <div class="component">
                    <small>WIND SCORE</small>
                    <strong>
                      ${opportunity.bestComponents?.wind ?? "—"}
                    </strong>
                  </div>

                  <div class="component">
                    <small>CLARITY</small>
                    <strong>
                      ${opportunity.bestComponents?.clarity ?? "—"}
                    </strong>
                  </div>

                  <div class="component">
                    <small>CLOUD</small>
                    <strong>
                      ${opportunity.bestComponents?.cloud ?? "—"}
                    </strong>
                  </div>

                  <div class="component">
                    <small>SEA TEMP SCORE</small>
                    <strong>
                      ${opportunity.bestComponents?.seaTemperature ?? "—"}
                    </strong>
                  </div>

                  <div class="component">
                    <small>LIGHT BOOST</small>
                    <strong>
                      ${opportunity.bestComponents?.lightBoost ?? "—"}
                    </strong>
                  </div>

                  <div class="component">
                    <small>WAVE HEIGHT</small>
                    <strong>
                      ${
                        Number.isFinite(
                          Number(opportunity.bestHour?.waveHeight)
                        )
                          ? `${Number(opportunity.bestHour.waveHeight).toFixed(2)} m`
                          : "—"
                      }
                    </strong>
                  </div>

                  <div class="component">
                    <small>SWELL HEIGHT</small>
                    <strong>
                      ${
                        Number.isFinite(
                          Number(opportunity.bestHour?.swellHeight)
                        )
                          ? `${Number(opportunity.bestHour.swellHeight).toFixed(2)} m`
                          : "—"
                      }
                    </strong>
                  </div>

                  <div class="component">
                    <small>SWELL PERIOD</small>
                    <strong>
                      ${
                        Number.isFinite(
                          Number(opportunity.bestHour?.swellPeriod)
                        )
                          ? `${Number(opportunity.bestHour.swellPeriod).toFixed(1)} s`
                          : "—"
                      }
                    </strong>
                  </div>

                  <div class="component">
                    <small>WIND SPEED</small>
                    <strong>
                      ${
                        Number.isFinite(
                          Number(opportunity.bestHour?.windSpeed)
                        )
                          ? `${Math.round(Number(opportunity.bestHour.windSpeed))}`
                          : "—"
                      }
                    </strong>
                  </div>

                  <div class="component">
                    <small>WIND DIR</small>
                    <strong>
                      ${
                        Number.isFinite(
                          Number(opportunity.bestHour?.windDirection)
                        )
                          ? `${Math.round(Number(opportunity.bestHour.windDirection))}°`
                          : "—"
                      }
                    </strong>
                  </div>

                  <div class="component">
                    <small>WIND GUST</small>
                    <strong>
                      ${
                        Number.isFinite(
                          Number(opportunity.bestHour?.windGust)
                        )
                          ? `${Math.round(Number(opportunity.bestHour.windGust))}`
                          : "—"
                      }
                    </strong>
                  </div>

                  <div class="component">
                    <small>SEA TEMP</small>
                    <strong>
                      ${
                        Number.isFinite(
                          Number(opportunity.bestHour?.seaTemperature)
                        )
                          ? `${Number(opportunity.bestHour.seaTemperature).toFixed(1)}°C`
                          : "—"
                      }
                    </strong>
                  </div>

                </div>

              </div>
            `

            : ""
        }
      </section>
    `;

  }


  /* =======================================================
     DIAGNOSTICS CARD
     ======================================================= */

  function renderDiagnostics(
    result
  ) {

    const diagnostics =
      result?.diagnostics || {};


    const clusterFailures =
      Array.isArray(
        diagnostics.clusterFailures
      )
        ? diagnostics.clusterFailures.length
        : 0;


    const exactFailures =
      Array.isArray(
        diagnostics.exactFailures
      )
        ? diagnostics.exactFailures.length
        : 0;


    return `
      <section class="card">

        <div class="eyebrow">
          ENGINE DIAGNOSTICS
        </div>

        <h2 class="card-title">
          Hybrid scan completed
        </h2>


        <div class="component-grid">

          <div class="component">

            <small>
              MARKS
            </small>

            <strong>
              ${diagnostics.requestedMarks ?? "—"}
            </strong>

          </div>


          <div class="component">

            <small>
              CLUSTERS
            </small>

            <strong>
              ${diagnostics.clusterCount ?? "—"}
            </strong>

          </div>


          <div class="component">

            <small>
              SCREENED
            </small>

            <strong>
              ${diagnostics.screenedMarks ?? "—"}
            </strong>

          </div>


          <div class="component">

            <small>
              EXACT CHECKS
            </small>

            <strong>
              ${diagnostics.exactChecks ?? "—"}
            </strong>

          </div>


          <div class="component">

            <small>
              CLUSTER FAILURES
            </small>

            <strong>
              ${clusterFailures}
            </strong>

          </div>


          <div class="component">

            <small>
              EXACT FAILURES
            </small>

            <strong>
              ${exactFailures}
            </strong>

          </div>

        </div>


        <p class="card-subtitle">
          Final recommendations above are based
          on exact-coordinate forecasts for the
          shortlisted marks, not the shared
          first-pass forecast.
        </p>

      </section>
    `;

  }


  /* =======================================================
     NOW VIEW
     ======================================================= */

  function renderNow() {

    if (state.loading) {

      return renderHybridLoading();

    }


    if (state.hybridError) {

      return `
        <section class="card">

          <div class="eyebrow">
            LIVE INTELLIGENCE
          </div>

          <h2 class="card-title">
            Hybrid analysis failed
          </h2>

          <p class="card-subtitle">
            ${state.hybridError}
          </p>

        </section>
      `;

    }


    if (!state.hybridResult) {

      return `
        <section class="card">

          <div class="eyebrow">
            NEXT 24 HOURS
          </div>

          <h2 class="card-title">
            Best opportunity
          </h2>

          <p class="card-subtitle">
            Preparing the Wales-wide
            fishing intelligence engine…
          </p>

        </section>
      `;

    }


    const result =
      state.hybridResult;


    return `
      <section class="card">

        <div class="eyebrow">
          NEXT 24 HOURS
        </div>

        <h2 class="card-title">
          Where should I fish?
        </h2>

        <p class="card-subtitle">
          Every recommendation shown below
          survived the exact-coordinate
          fishing and safety recheck.
        </p>

      </section>


      ${renderOpportunity(
        result.overall,
        "BEST OVERALL"
      )}


      ${renderOpportunity(
        result.low,
        "BEST LOW WATER"
      )}


      ${renderOpportunity(
        result.high,
        "BEST HIGH WATER"
      )}


      ${renderDiagnostics(
        result
      )}
    `;

  }


  /* =======================================================
     7-DAY PLANNER
     ======================================================= */

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
        today.getDate() +
        offset
      );


      const confidence =
        U.getForecastConfidence(
          date
        );


      days.push(`
        <section class="card">

          <div class="eyebrow">
            ${U.formatDayHeading(
              date
            )}
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
                Coming next
              </strong>

            </div>


            <div class="planner-option">

              <div class="eyebrow">
                HIGH WATER
              </div>

              <strong>
                Coming next
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
          Once the NOW hybrid engine is
          validated, this same intelligence
          will rank each day's best low-water
          and high-water opportunities.
        </p>

      </section>

      ${days.join("")}
    `;

  }


  /* =======================================================
     MARKS VIEW
     ======================================================= */

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


  /* =======================================================
     MAIN RENDER
     ======================================================= */

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


  /* =======================================================
     RUN HYBRID ANALYSIS
     ======================================================= */

  async function runHybridAnalysis() {

    /*
     Prevent duplicate scans if the user
     taps NOW repeatedly while loading.
    */

    if (state.hybridPromise) {

      return state.hybridPromise;

    }


    state.loading =
      true;

    state.hybridError =
      null;


    if (
      state.currentView ===
      "now"
    ) {

      render();

    }


    const job =
      Hybrid
        .analyseNext24Hours();


    state.hybridPromise =
      job;


    try {

      const result =
        await job;


      state.hybridResult =
        result;

      state.lastUpdated =
        new Date();

    }
    catch (error) {

      console.error(
        "Bass Finder Wales hybrid analysis failed:",
        error
      );


      state.hybridError =
        error?.message ||
        String(error) ||
        "Unknown hybrid analysis error.";

    }
    finally {

      state.loading =
        false;

      state.hybridPromise =
        null;


      /*
       Don't overwrite another tab if the
       user moved away while analysis ran.
      */

      if (
        state.currentView ===
        "now"
      ) {

        render();

      }

    }


    return state.hybridResult;

  }


  /* =======================================================
     STARTUP
     ======================================================= */

  render();


  runHybridAnalysis();


  console.log(
    "Bass Finder Wales V3: hybrid app controller started."
  );

})();
