/* =========================================================
   SEA FISHING PLANNER — SHARED UTILITIES
   ========================================================= */


/* ---------------------------------------------------------
   NUMBERS
   --------------------------------------------------------- */

function clamp(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(min, number)
  );
}


function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function roundTo(value, decimals = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  const multiplier =
    Math.pow(10, decimals);

  return (
    Math.round(number * multiplier) /
    multiplier
  );
}


/* ---------------------------------------------------------
   WIND DIRECTION
   Converts degrees into a 16-point compass direction.

   Examples:
   0°   = N
   45°  = NE
   225° = SW
   247° = WSW
   --------------------------------------------------------- */

function degreesToCompass(degrees) {

  const value = Number(degrees);

  if (!Number.isFinite(value)) {
    return "—";
  }

  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW"
  ];

  const normalised =
    ((value % 360) + 360) % 360;

  const index =
    Math.round(normalised / 22.5) % 16;

  return directions[index];
}


/* ---------------------------------------------------------
   WIND DISPLAY

   Example:
   SW 12 mph • Gusting 19 mph
   --------------------------------------------------------- */

function formatWind(
  directionDegrees,
  speed,
  gusts
) {

  const direction =
    degreesToCompass(directionDegrees);

  const windSpeed =
    Math.round(safeNumber(speed));

  const gustSpeed =
    Math.round(safeNumber(gusts));

  if (direction === "—") {
    return `${windSpeed} mph`;
  }

  if (
    gustSpeed > windSpeed + 2
  ) {
    return (
      `${direction} ${windSpeed} mph` +
      ` • Gusting ${gustSpeed} mph`
    );
  }

  return `${direction} ${windSpeed} mph`;
}


/* ---------------------------------------------------------
   DATE / TIME
   --------------------------------------------------------- */

function parseDate(value) {

  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}


function isValidDate(value) {

  const date =
    parseDate(value);

  return Number.isFinite(
    date.getTime()
  );
}


function formatHour(value) {

  const date =
    parseDate(value);

  if (!isValidDate(date)) {
    return "—";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  );
}


function formatDayName(value) {

  const date =
    parseDate(value);

  if (!isValidDate(date)) {
    return "—";
  }

  return date
    .toLocaleDateString(
      [],
      {
        weekday: "long"
      }
    )
    .toUpperCase();
}


function formatShortDate(value) {

  const date =
    parseDate(value);

  if (!isValidDate(date)) {
    return "—";
  }

  return date.toLocaleDateString(
    [],
    {
      day: "numeric",
      month: "short"
    }
  );
}


function formatDayHeading(value) {

  const date =
    parseDate(value);

  if (!isValidDate(date)) {
    return "—";
  }

  return (
    `${formatDayName(date)} ` +
    `${formatShortDate(date).toUpperCase()}`
  );
}


/* ---------------------------------------------------------
   PRIME WINDOW DISPLAY
   --------------------------------------------------------- */

function formatPrimeWindow(
  startValue,
  endValue
) {

  const start =
    parseDate(startValue);

  const end =
    parseDate(endValue);

  if (
    !isValidDate(start) ||
    !isValidDate(end)
  ) {
    return "—";
  }

  const startText =
    formatHour(start);

  const endText =
    formatHour(end);

  const differentDay =
    start.getFullYear() !==
      end.getFullYear() ||

    start.getMonth() !==
      end.getMonth() ||

    start.getDate() !==
      end.getDate();

  return differentDay
    ? `${startText} → ${endText} (next day)`
    : `${startText} → ${endText}`;
}


/* ---------------------------------------------------------
   FORECAST AGE / CONFIDENCE

   This is intentionally separate from fishing score.

   A brilliant-looking fishing forecast seven days away
   should not appear as certain as tomorrow's forecast.
   --------------------------------------------------------- */

function forecastDayDistance(value) {

  const target =
    parseDate(value);

  if (!isValidDate(target)) {
    return 0;
  }

  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const targetDay =
    new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate()
    );

  return Math.max(
    0,
    Math.round(
      (
        targetDay.getTime() -
        today.getTime()
      ) /
      86400000
    )
  );
}


function getForecastConfidence(value) {

  const day =
    forecastDayDistance(value);

  if (day <= 1) {
    return {
      level: "high",
      label: "High confidence",
      score: 95
    };
  }

  if (day <= 3) {
    return {
      level: "medium-high",
      label: "Good confidence",
      score: 82
    };
  }

  if (day <= 5) {
    return {
      level: "medium",
      label: "Medium confidence",
      score: 68
    };
  }

  return {
    level: "lower",
    label: "Lower confidence",
    score: 52
  };
}


/* ---------------------------------------------------------
   SAFETY HELPERS
   Fishing quality and safety remain independent.
   --------------------------------------------------------- */

function safetyRank(status) {

  const value =
    String(status || "")
      .toUpperCase();

  if (
    value.includes("DANGEROUS")
  ) {
    return 3;
  }

  if (
    value.includes("HIGH RISK")
  ) {
    return 2;
  }

  if (
    value.includes("CAUTION")
  ) {
    return 1;
  }

  return 0;
}


function safetyLabel(status) {

  const rank =
    safetyRank(status);

  if (rank === 3) {
    return "DANGEROUS";
  }

  if (rank === 2) {
    return "HIGH RISK";
  }

  if (rank === 1) {
    return "CAUTION";
  }

  return "SAFE";
}


/* ---------------------------------------------------------
   SCORE HELPERS
   --------------------------------------------------------- */

function scoreLabel(score) {

  const value =
    clamp(score, 0, 100);

  if (value >= 90) {
    return "Exceptional";
  }

  if (value >= 80) {
    return "Excellent";
  }

  if (value >= 70) {
    return "Good";
  }

  if (value >= 60) {
    return "Fair";
  }

  if (value >= 50) {
    return "Marginal";
  }

  return "Poor";
}


/* ---------------------------------------------------------
   TIDE LABELS
   --------------------------------------------------------- */

function tideLabel(type) {

  const value =
    String(type || "")
      .toLowerCase();

  if (value === "high") {
    return "High water";
  }

  if (value === "low") {
    return "Low water";
  }

  return "Tide";
}


/* ---------------------------------------------------------
   SIMPLE ID NORMALISATION

   Used later to reliably match marks such as:
   "St Donats"
   "St. Donat's"
   "st-donats"
   --------------------------------------------------------- */

function normaliseName(value) {

  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      ""
    );
}


/* ---------------------------------------------------------
   EXPOSE UTILITIES

   Keeping one namespace prevents lots of unrelated global
   variables as V3 grows.
   --------------------------------------------------------- */

window.SeaPlannerUtils = {

  clamp,
  safeNumber,
  roundTo,

  degreesToCompass,
  formatWind,

  parseDate,
  isValidDate,
  formatHour,
  formatDayName,
  formatShortDate,
  formatDayHeading,
  formatPrimeWindow,

  forecastDayDistance,
  getForecastConfidence,

  safetyRank,
  safetyLabel,

  scoreLabel,
  tideLabel,

  normaliseName

};
