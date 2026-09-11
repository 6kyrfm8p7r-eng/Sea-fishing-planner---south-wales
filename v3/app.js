/* =========================================================
   BASS FINDER WALES — APP CONTROLLER

   NOW
   ---
   Wales-wide 24-hour hybrid scan.

   7 DAYS
   ------
   Efficient weekly hybrid scan.
   Best LOW and HIGH water opportunity for each day.

   MARKS
   -----
   Fishing DNA information.

   IMPORTANT
   ---------
   NOW and 7-DAY results are cached independently so
   changing tabs does not keep repeating expensive API calls.
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
const BassActivity =
  window.SeaPlannerBassActivity;

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


    /* NOW */

    nowLoading:
      false,

    nowResult:
      null,

    nowError:
      null,

    nowPromise:
      null,

    nowUpdated:
      null,


    /* 7 DAYS */

    plannerLoading:
      false,

    plannerResult:
      null,

    plannerError:
      null,

    plannerPromise:
      null,

    plannerUpdated:
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

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return "—";

    }


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

  if (value === "high") {
    return "EST. HIGH WATER";
  }

  if (value === "low") {
    return "EST. LOW WATER";
  }

  return "EST. TIDE";

}


  function tideIcon(value) {

    return value === "high"
      ? "↗"
      : "↘";

  }


  function opportunityConfidence(
    opportunity
  ) {

    return formatScore(
      opportunity
        ?.confidence
        ?.score
    );

  }


  function opportunitySafetyRisk(
    opportunity
  ) {

    return formatScore(
      opportunity
        ?.safetyRisk
    );

  }
function activityForOpportunity(
  opportunity
) {

  if (
    !BassActivity ||
    !opportunity
  ) {

    return null;

  }


  const markId =
    opportunity.markId ||
    opportunity.mark?.id ||
    null;


  if (!markId) {

    return null;

  }


  return BassActivity.analyseMarkActivity(
    markId
  );

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
     Start NOW only if it has not already been loaded.
    */

    if (
      view === "now" &&
      !state.nowResult &&
      !state.nowPromise
    ) {

      runNowAnalysis();

    }


    /*
     Start weekly analysis only when the user opens
     the 7 DAYS tab for the first time.
    */

    if (
      view === "planner" &&
      !state.plannerResult &&
      !state.plannerPromise
    ) {

      runPlannerAnalysis();

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
     NOW LOADING VIEW
     ======================================================= */

  function renderNowLoading() {

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
          then checking the strongest contenders
          at their exact coordinates.
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
     FULL NOW OPPORTUNITY CARD
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
            No safe qualifying session was found
            in this category during the next 24 hours.
          </p>

        </section>

      `;

    }


    const confidence =
      opportunityConfidence(
        opportunity
      );


    const safetyRisk =
      opportunitySafetyRisk(
        opportunity
      );
const activity =
  opportunity.bassActivity || null;


const opportunityScore =
  opportunity.opportunityScore ??
  opportunity.score;

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
              ${tideIcon(
                opportunity.tideReference
              )}
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
                opportunity.primeWindow
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
          class="tide-grid"
          style="margin-top:12px;"
        >

          <div class="tide-box">

            <div class="metric-label">
              BASS ACTIVITY
            </div>

            <div class="metric-value">
              ${
                activity
                  ? `${formatScore(
                      activity.score
                    )} / 100`
                  : "—"
              }
            </div>

          </div>


          <div class="tide-box">

            <div class="metric-label">
              ACTIVITY CONFIDENCE
            </div>

            <div class="metric-value">
              ${
                activity
                  ? `${formatScore(
                      activity.confidence
                    )} / 100`
                  : "—"
              }
            </div>

          </div>


          <div class="tide-box">

            <div class="metric-label">
              OPPORTUNITY SCORE
            </div>

            <div class="metric-value">
              ${formatScore(
                opportunityScore
              )} / 100
            </div>

          </div>

        </div>


        ${
          activity
            ? `

              <div
                class="status-pill"
                style="margin-top:12px;"
              >

                ◉ ${activity.label}

                · ${activity.reportCount}
                recent report${activity.reportCount === 1 ? "" : "s"}

              </div>

            `
            : ""
        }

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

      </section>

    `;

  }


  /* =======================================================
     NOW ENGINE DIAGNOSTICS
     ======================================================= */

  function renderNowDiagnostics(
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
          Final recommendations above use
          exact-coordinate forecasts for the
          shortlisted marks.
        </p>

      </section>

    `;

  }


  /* =======================================================
     NOW VIEW
     ======================================================= */

  function renderNow() {

    if (state.nowLoading) {

      return renderNowLoading();

    }


    if (state.nowError) {

      return `

        <section class="card">

          <div class="eyebrow">
            LIVE INTELLIGENCE
          </div>

          <h2 class="card-title">
            Hybrid analysis failed
          </h2>

          <p class="card-subtitle">
            ${state.nowError}
          </p>

        </section>

      `;

    }


    if (!state.nowResult) {

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
      state.nowResult;


    return `

      <section class="card">

        <div class="eyebrow">
          NEXT 24 HOURS
        </div>

        <h2 class="card-title">
          Where should I fish?
        </h2>

        <p class="card-subtitle">
          Every recommendation below survived
          the exact-coordinate fishing and
          safety recheck.
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


      ${renderNowDiagnostics(
        result
      )}

    `;

  }


  /* =======================================================
     7-DAY LOADING VIEW
     ======================================================= */

  function renderPlannerLoading() {

    return `

      <section class="card">

        <div class="eyebrow">
          7-DAY PLANNER
        </div>

        <h2 class="card-title">
          Analysing the week…
        </h2>

        <p class="card-subtitle">
          Screening every fishing mark across
          seven days, then validating the strongest
          candidates using exact-coordinate forecasts.
        </p>

      </section>


      <section class="card">

        <div class="eyebrow">
          EFFICIENT WEEKLY SCAN
        </div>

        <div class="component-grid">

          <div class="component">

            <small>
              STAGE 1
            </small>

            <strong>
              Wales-wide scan
            </strong>

          </div>


          <div class="component">

            <small>
              STAGE 2
            </small>

            <strong>
              Exact finalists
            </strong>

          </div>


          <div class="component">

            <small>
              OUTPUT
            </small>

            <strong>
              Best low
            </strong>

          </div>


          <div class="component">

            <small>
              OUTPUT
            </small>

            <strong>
              Best high
            </strong>

          </div>

        </div>

      </section>

    `;

  }


  /* =======================================================
     COMPACT 7-DAY OPPORTUNITY
     ======================================================= */

  function renderPlannerOption(
    opportunity,
    tideType
  ) {

    const label =
      tideType === "high"
        ? "HIGH WATER"
        : "LOW WATER";


    const icon =
      tideType === "high"
        ? "↗"
        : "↘";


    if (!opportunity) {

      return `

        <div class="planner-option">

          <div class="eyebrow">
            ${icon} ${label}
          </div>

          <strong>
            No safe opportunity
          </strong>

          <p class="card-subtitle">
            No qualifying session found.
          </p>

        </div>

      `;

    }


    const score =
      formatScore(
        opportunity.score
      );


    const confidence =
      opportunityConfidence(
        opportunity
      );


    const risk =
      opportunitySafetyRisk(
        opportunity
      );


    const departure =
      opportunity
        .latestDeparture
        ?.time;


    return `

      <details class="planner-option">

        <summary
          style="
            cursor:pointer;
            list-style:none;
          "
        >

          <div class="eyebrow">
            ${icon} ${label}
          </div>

          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:flex-start;
              gap:12px;
              margin-top:7px;
            "
          >

            <div>

              <strong
                style="
                  display:block;
                  font-size:1.05rem;
                "
              >
                ${opportunity.markName || "Unknown mark"}
              </strong>

              <small
                style="
                  display:block;
                  margin-top:4px;
                  opacity:.7;
                "
              >
                ${String(
                  opportunity.region || ""
                ).toUpperCase()}
              </small>

            </div>


            <div class="version-pill">
              ${score}
            </div>

          </div>


          <div
            style="
              margin-top:13px;
              display:grid;
              grid-template-columns:1fr 1fr;
              gap:10px;
            "
          >

            <div>

              <small>
                TIDE
              </small>

              <strong
                style="
                  display:block;
                  margin-top:3px;
                "
              >
                ${formatTime(
                  opportunity.tideTime
                )}
              </strong>

            </div>


            <div>

              <small>
                PRIME WINDOW
              </small>

              <strong
                style="
                  display:block;
                  margin-top:3px;
                "
              >
                ${formatWindow(
                  opportunity.primeWindow
                )}
              </strong>

            </div>

          </div>

        </summary>


        <div
          style="
            margin-top:16px;
            padding-top:14px;
            border-top:1px solid rgba(255,255,255,.12);
          "
        >

          <div class="component-grid">

            <div class="component">

              <small>
                FISHING SCORE
              </small>

              <strong>
                ${score}/100
              </strong>

            </div>


            <div class="component">

              <small>
                CONFIDENCE
              </small>

              <strong>
                ${confidence}/100
              </strong>

            </div>


            <div class="component">

              <small>
                BEST SAFE HOUR
              </small>

              <strong>
                ${formatTime(
                  opportunity
                    .bestHour
                    ?.time
                )}
              </strong>

            </div>


            <div class="component">

              <small>
                LEAVE BY
              </small>

              <strong>
                ${formatTime(
                  departure
                )}
              </strong>

            </div>

          </div>


          <div
            class="
              status-pill
              ${safetyClass(
                opportunity.safetyLevel
              )}
            "
            style="margin-top:14px;"
          >

            ${opportunity.safetyIcon || "✓"}

            ${opportunity.safetyLabel || "Safety checked"}

            · ${risk}/100 risk

          </div>


          ${
            opportunity.forcedEarlyDeparture

              ? `

                <div
                  class="status-pill status-caution"
                  style="margin-top:10px;"
                >

                  ⚠ Conditions deteriorate —
                  leave earlier than the normal
                  Fishing DNA window.

                </div>

              `

              : ""
          }

        </div>

      </details>

    `;

  }


  /* =======================================================
     ONE 7-DAY DAY CARD
     ======================================================= */

  function renderPlannerDay(
    day,
    index
  ) {

    const date =
      day?.date
        ? new Date(day.date)
        : null;


    let heading =
      `DAY ${index + 1}`;


    if (
      date &&
      !Number.isNaN(
        date.getTime()
      )
    ) {

      try {

        heading =
          U.formatDayHeading(
            date
          );

      }
      catch (error) {

        heading =
          `DAY ${index + 1}`;

      }

    }


    let forecastConfidence =
      null;


    if (date) {

      try {

        forecastConfidence =
          U.getForecastConfidence(
            date
          );

      }
      catch (error) {

        forecastConfidence =
          null;

      }

    }


    return `

      <section class="card">

        <div class="eyebrow">
          ${heading}
        </div>

        <h2 class="card-title">
          Best low & high water
        </h2>

        <p class="card-subtitle">
          ${
            forecastConfidence?.label ||
            "Forecast confidence calculated"
          }
        </p>


        <div
          class="planner-grid"
          style="
            display:grid;
            gap:14px;
          "
        >

          ${renderPlannerOption(
            day?.low,
            "low"
          )}


          ${renderPlannerOption(
            day?.high,
            "high"
          )}

        </div>

      </section>

    `;

  }


  /* =======================================================
     WEEKLY DIAGNOSTICS
     ======================================================= */

  function renderPlannerDiagnostics(
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
          WEEKLY ENGINE
        </div>

        <h2 class="card-title">
          7-day scan completed
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
              DAYS
            </small>

            <strong>
              ${diagnostics.plannerDays ?? "—"}
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
              UNIQUE EXACT CHECKS
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

      </section>

    `;

  }


  /* =======================================================
     7-DAY PLANNER VIEW
     ======================================================= */

  function renderPlanner() {

    if (state.plannerLoading) {

      return renderPlannerLoading();

    }


    if (state.plannerError) {

      return `

        <section class="card">

          <div class="eyebrow">
            7-DAY PLANNER
          </div>

          <h2 class="card-title">
            Weekly analysis failed
          </h2>

          <p class="card-subtitle">
            ${state.plannerError}
          </p>

        </section>

      `;

    }


    if (!state.plannerResult) {

      return `

        <section class="card">

          <div class="eyebrow">
            7-DAY PLANNER
          </div>

          <h2 class="card-title">
            Plan the best session
          </h2>

          <p class="card-subtitle">
            Preparing the weekly
            fishing intelligence engine…
          </p>

        </section>

      `;

    }


    const days =
      Array.isArray(
        state
          .plannerResult
          .days
      )
        ? state
            .plannerResult
            .days
        : [];


    return `

      <section class="card">

        <div class="eyebrow">
          7-DAY PLANNER
        </div>

        <h2 class="card-title">
          Best sessions this week
        </h2>

        <p class="card-subtitle">
          Each day shows the strongest safe
          low-water and high-water opportunity
          surviving exact-coordinate validation.
          Tap an option for more detail.
        </p>

      </section>


      ${
        days.length

          ? days
              .map(
                (day, index) =>
                  renderPlannerDay(
                    day,
                    index
                  )
              )
              .join("")

          : `

            <section class="card">

              <h2 class="card-title">
                No weekly opportunities found
              </h2>

              <p class="card-subtitle">
                No qualifying safe sessions were
                returned by the weekly engine.
              </p>

            </section>

          `
      }


      ${renderPlannerDiagnostics(
        state.plannerResult
      )}

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
          sea-state preferences, light preferences,
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
     RUN NOW ANALYSIS
     ======================================================= */

  async function runNowAnalysis() {

    if (state.nowPromise) {

      return state.nowPromise;

    }


    state.nowLoading =
      true;

    state.nowError =
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


    state.nowPromise =
      job;


    try {

      const result =
        await job;


      state.nowResult =
        result;

      state.nowUpdated =
        new Date();

    }
    catch (error) {

      console.error(
        "Bass Finder Wales NOW analysis failed:",
        error
      );


      state.nowError =
        error?.message ||
        String(error) ||
        "Unknown NOW analysis error.";

    }
    finally {

      state.nowLoading =
        false;

      state.nowPromise =
        null;


      if (
        state.currentView ===
        "now"
      ) {

        render();

      }

    }


    return state.nowResult;

  }


  /* =======================================================
     RUN 7-DAY ANALYSIS
     ======================================================= */

  async function runPlannerAnalysis() {

    if (state.plannerPromise) {

      return state.plannerPromise;

    }


    if (
      typeof Hybrid
        .analyseNext7Days !==
      "function"
    ) {

      state.plannerError =
        "7-day hybrid engine is not available.";

      render();

      return null;

    }


    state.plannerLoading =
      true;

    state.plannerError =
      null;


    if (
      state.currentView ===
      "planner"
    ) {

      render();

    }


    const job =
      Hybrid
        .analyseNext7Days();


    state.plannerPromise =
      job;


    try {

      const result =
        await job;


      state.plannerResult =
        result;

      state.plannerUpdated =
        new Date();

    }
    catch (error) {

      console.error(
        "Bass Finder Wales 7-day analysis failed:",
        error
      );


      state.plannerError =
        error?.message ||
        String(error) ||
        "Unknown 7-day analysis error.";

    }
    finally {

      state.plannerLoading =
        false;

      state.plannerPromise =
        null;


      if (
        state.currentView ===
        "planner"
      ) {

        render();

      }

    }


    return state.plannerResult;

  }


  /* =======================================================
     STARTUP
     ======================================================= */

  render();


  /*
   NOW starts immediately.

   The heavier weekly planner waits until
   the user actually opens the 7 DAYS tab.
  */

  runNowAnalysis();


  console.log(
    "Bass Finder Wales: NOW + 7-day app controller ready."
  );

})();
