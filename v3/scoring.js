/* =========================================================
   SEA FISHING PLANNER — SCORING ENGINE
   Fishing opportunity scoring only.

   IMPORTANT:
   - This module does NOT make safety decisions.
   - Safety will be handled independently in safety.js.
   ========================================================= */

(function () {

  "use strict";


  const U =
    window.SeaPlannerUtils;


  const Profiles =
    window.SeaPlannerProfiles;


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function clampScore(value) {

    if (U?.clamp) {
      return U.clamp(value, 0, 100);
    }

    return Math.max(
      0,
      Math.min(100, value)
    );

  }


  function number(value, fallback = null) {

    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;

  }


  function circularDifference(a, b) {

    const first =
      number(a);

    const second =
      number(b);

    if (
      first === null ||
      second === null
    ) {
      return null;
    }

    const difference =
      Math.abs(first - second) % 360;

    return Math.min(
      difference,
      360 - difference
    );

  }


  function average(values) {

    const clean =
      values.filter(
        value =>
          Number.isFinite(
            Number(value)
          )
      );

    if (!clean.length) {
      return null;
    }

    return (
      clean.reduce(
        (total, value) =>
          total + Number(value),
        0
      ) / clean.length
    );

  }


  /* =======================================================
     GENERIC BAND SCORING
     ======================================================= */

  function scoreInsideRange(
    value,
    minimum,
    maximum,
    softness = 0.5
  ) {

    const current =
      number(value);

    if (
      current === null ||
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum)
    ) {
      return 50;
    }


    if (
      current >= minimum &&
      current <= maximum
    ) {
      return 100;
    }


    const width =
      Math.max(
        maximum - minimum,
        0.1
      );


    const distance =

      current < minimum
        ? minimum - current
        : current - maximum;


    const penalty =
      (
        distance /
        (width * softness)
      ) * 100;


    return clampScore(
      100 - penalty
    );

  }


  /* =======================================================
     WIND SCORING
     ======================================================= */

  function scoreWindSpeed(hour) {

    const speed =
      number(hour?.windSpeed);

    const gust =
      number(hour?.windGust);


    if (
      speed === null &&
      gust === null
    ) {
      return 50;
    }


    const effective =
      Math.max(
        speed ?? 0,
        (gust ?? 0) * 0.7
      );


    if (effective <= 8) {
      return 92;
    }

    if (effective <= 14) {
      return 100;
    }

    if (effective <= 20) {
      return 80;
    }

    if (effective <= 26) {
      return 55;
    }

    if (effective <= 32) {
      return 30;
    }

    return 10;

  }


  function directionWithinArc(
    direction,
    minimum,
    maximum
  ) {

    const value =
      number(direction);

    if (value === null) {
      return false;
    }


    const normalised =
      ((value % 360) + 360) % 360;


    if (minimum <= maximum) {

      return (
        normalised >= minimum &&
        normalised <= maximum
      );

    }


    /*
     Supports arcs crossing north.
     Example: 300° → 40°
    */

    return (
      normalised >= minimum ||
      normalised <= maximum
    );

  }


  function scoreWindDirection(
    mark,
    hour
  ) {

    const direction =
      number(
        hour?.windDirection
      );


    if (
      direction === null ||
      !mark
    ) {
      return 50;
    }


    const minimum =
      number(mark.windMin);

    const maximum =
      number(mark.windMax);


    if (
      minimum === null ||
      maximum === null
    ) {
      return 50;
    }


    if (
      directionWithinArc(
        direction,
        minimum,
        maximum
      )
    ) {
      return 100;
    }


    const differenceToMin =
      circularDifference(
        direction,
        minimum
      );


    const differenceToMax =
      circularDifference(
        direction,
        maximum
      );


    const difference =
      Math.min(
        differenceToMin ?? 180,
        differenceToMax ?? 180
      );


    if (difference <= 20) {
      return 80;
    }

    if (difference <= 45) {
      return 55;
    }

    if (difference <= 75) {
      return 30;
    }

    return 10;

  }


  function scoreWind(
    mark,
    hour
  ) {

    const speed =
      scoreWindSpeed(hour);

    const direction =
      scoreWindDirection(
        mark,
        hour
      );


    return clampScore(
      speed * 0.55 +
      direction * 0.45
    );

  }


  /* =======================================================
     SWELL SCORING
     ======================================================= */

  function scoreSwellHeight(
    mark,
    hour
  ) {

    const height =
      number(
        hour?.swellHeight ??
        hour?.waveHeight
      );


    if (
      height === null ||
      !mark
    ) {
      return 50;
    }


    return scoreInsideRange(
      height,
      number(mark.swellMin, 0.2),
      number(mark.swellMax, 1.2),
      0.8
    );

  }


  function scoreSwellPeriod(
    mark,
    hour
  ) {

    const period =
      number(
        hour?.swellPeriod ??
        hour?.wavePeriod
      );


    if (
      period === null ||
      !mark
    ) {
      return 50;
    }


    return scoreInsideRange(
      period,
      number(mark.periodMin, 4),
      number(mark.periodMax, 10),
      1
    );

  }


  function scoreSwell(
    mark,
    hour
  ) {

    const height =
      scoreSwellHeight(
        mark,
        hour
      );

    const period =
      scoreSwellPeriod(
        mark,
        hour
      );


    return clampScore(
      height * 0.65 +
      period * 0.35
    );

  }


  /* =======================================================
     WATER CLARITY ESTIMATE

     This estimates fishing visibility conditions.

     Atmospheric visibility is deliberately NOT treated
     as the same thing as water clarity.
     ======================================================= */

  function estimateClarity(
    hour,
    recentHours = []
  ) {

    let clarity = 82;


    const rainNow =
      number(hour?.rain, 0);

    const precipitationNow =
      number(
        hour?.precipitation,
        0
      );


    const recentRain =
      recentHours.reduce(
        (total, item) =>
          total +
          number(
            item?.rain ??
            item?.precipitation,
            0
          ),
        0
      );


    const wind =
      number(
        hour?.windSpeed,
        0
      );


    const gust =
      number(
        hour?.windGust,
        wind
      );


    const wave =
      number(
        hour?.waveHeight ??
        hour?.swellHeight,
        0
      );


    if (
      rainNow +
      precipitationNow >
      1.5
    ) {
      clarity -= 10;
    }


    if (recentRain > 4) {
      clarity -= 8;
    }

    if (recentRain > 10) {
      clarity -= 8;
    }


    if (wind > 18) {
      clarity -= 6;
    }

    if (wind > 25) {
      clarity -= 6;
    }


    if (gust > 30) {
      clarity -= 5;
    }


    if (wave > 0.9) {
      clarity -= 5;
    }

    if (wave > 1.4) {
      clarity -= 8;
    }

    if (wave > 2) {
      clarity -= 10;
    }


    return clampScore(
      clarity
    );

  }


  /* =======================================================
     CLOUD / LIGHT SCORING
     ======================================================= */

  function getLightBoost(
    hour,
    daylight,
    profile
  ) {

    if (
      !hour?.time ||
      !Array.isArray(daylight)
    ) {
      return 0;
    }


    const time =
      new Date(hour.time);


    if (
      Number.isNaN(
        time.getTime()
      )
    ) {
      return 0;
    }


    const dateKey =
      hour.time.slice(0, 10);


    const day =
      daylight.find(
        item =>
          item.date === dateKey
      );


    if (!day) {
      return 0;
    }


    const sunrise =
      day.sunrise
        ? new Date(day.sunrise)
        : null;


    const sunset =
      day.sunset
        ? new Date(day.sunset)
        : null;


    const dawnBoost =
      number(
        profile?.dawnBoost,
        0
      );


    const duskBoost =
      number(
        profile?.duskBoost,
        0
      );


    const nightBoost =
      number(
        profile?.nightBoost,
        0
      );


    let boost = 0;


    if (sunrise) {

      const minutes =
        Math.abs(
          time - sunrise
        ) / 60000;


      if (minutes <= 60) {

        boost +=
          dawnBoost *
          (
            1 -
            minutes / 60
          );

      }

    }


    if (sunset) {

      const minutes =
        Math.abs(
          time - sunset
        ) / 60000;


      if (minutes <= 60) {

        boost +=
          duskBoost *
          (
            1 -
            minutes / 60
          );

      }

    }


    if (
      sunrise &&
      sunset &&
      (
        time < sunrise ||
        time > sunset
      )
    ) {

      boost +=
        nightBoost;

    }


    return boost;

  }


  function scoreCloudCover(hour) {

    const cloud =
      number(
        hour?.cloudCover
      );


    if (cloud === null) {
      return 50;
    }


    /*
     Moderate cloud often suits bass lure fishing
     better than harsh bright conditions.
    */

    if (
      cloud >= 45 &&
      cloud <= 90
    ) {
      return 100;
    }

    if (
      cloud >= 25 &&
      cloud < 45
    ) {
      return 80;
    }

    if (
      cloud > 90
    ) {
      return 85;
    }

    return 65;

  }


  /* =======================================================
     SEA TEMPERATURE
     ======================================================= */

  function scoreSeaTemperature(hour) {

    const temperature =
      number(
        hour?.seaTemperature
      );


    if (temperature === null) {
      return 50;
    }


    /*
     Broad bass-friendly seasonal range.
     Kept deliberately gentle so temperature does not
     overpower tide/sea-state conditions.
    */

    if (
      temperature >= 12 &&
      temperature <= 18
    ) {
      return 100;
    }

    if (
      temperature >= 9 &&
      temperature < 12
    ) {
      return 75;
    }

    if (
      temperature > 18 &&
      temperature <= 20
    ) {
      return 80;
    }

    if (
      temperature >= 7 &&
      temperature < 9
    ) {
      return 50;
    }

    return 35;

  }


  /* =======================================================
     TIDE WINDOW POSITION
     ======================================================= */

  function scorePrimeWindowPosition(
    hour,
    primeWindow
  ) {

    if (
      !hour?.time ||
      !primeWindow?.start ||
      !primeWindow?.end
    ) {
      return 50;
    }


    const time =
      new Date(hour.time);

    const start =
      new Date(
        primeWindow.start
      );

    const end =
      new Date(
        primeWindow.end
      );


    if (
      time < start ||
      time > end
    ) {
      return 0;
    }


    const duration =
      end - start;


    if (duration <= 0) {
      return 50;
    }


    const progress =
      (time - start) /
      duration;


    /*
     Highest score through the middle of the Fishing DNA
     window, but still strong near either end.
    */

    const distanceFromMiddle =
      Math.abs(
        progress - 0.5
      ) * 2;


    return clampScore(
      100 -
      distanceFromMiddle * 30
    );

  }


  /* =======================================================
     SCORE A SINGLE FORECAST HOUR
     ======================================================= */

  function scoreHour({
    mark,
    hour,
    primeWindow,
    daylight = [],
    recentHours = []
  }) {

    const profile =
      Profiles?.get
        ? Profiles.get(mark)
        : {};


    const tide =
      scorePrimeWindowPosition(
        hour,
        primeWindow
      );


    const wind =
      scoreWind(
        mark,
        hour
      );


    const swell =
      scoreSwell(
        mark,
        hour
      );


    const clarity =
      estimateClarity(
        hour,
        recentHours
      );


    const cloud =
      scoreCloudCover(
        hour
      );


    const seaTemperature =
      scoreSeaTemperature(
        hour
      );


    const lightBoost =
      getLightBoost(
        hour,
        daylight,
        profile
      );


    /*
     Main fishing-condition score.

     Tide and sea state carry the most weight.
     Light is an additive DNA boost rather than a full
     standalone weighted metric.
    */

    let score =

      tide * 0.30 +
      swell * 0.22 +
      wind * 0.18 +
      clarity * 0.15 +
      cloud * 0.08 +
      seaTemperature * 0.07;


    score +=
      lightBoost;


    return {

      score:
        Math.round(
          clampScore(score)
        ),

      components: {

        tide:
          Math.round(tide),

        swell:
          Math.round(swell),

        wind:
          Math.round(wind),

        clarity:
          Math.round(clarity),

        cloud:
          Math.round(cloud),

        seaTemperature:
          Math.round(
            seaTemperature
          ),

        lightBoost:
          Math.round(
            lightBoost * 10
          ) / 10

      }

    };

  }


  /* =======================================================
     SCORE ALL HOURS IN ONE PRIME WINDOW
     ======================================================= */

  function scorePrimeWindow({
    mark,
    forecast,
    primeWindow
  }) {

    if (
      !mark ||
      !forecast ||
      !primeWindow
    ) {
      return null;
    }


    const hours =
      forecast.hourly.filter(
        hour => {

          const time =
            new Date(hour.time);

          return (
            time >=
              new Date(
                primeWindow.start
              ) &&
            time <=
              new Date(
                primeWindow.end
              )
          );

        }
      );


    if (!hours.length) {
      return null;
    }


    const scored =
      hours.map(
        (hour, index) => {

          const recentHours =
            forecast.hourly.filter(
              candidate => {

                const current =
                  new Date(hour.time);

                const candidateTime =
                  new Date(
                    candidate.time
                  );

                const difference =
                  current -
                  candidateTime;

                return (
                  difference >= 0 &&
                  difference <=
                    12 * 3600000
                );

              }
            );


          return {

            hour,

            ...scoreHour({

              mark,

              hour,

              primeWindow,

              daylight:
                forecast.daylight,

              recentHours

            })

          };

        }
      );


    const best =
      [...scored].sort(
        (a, b) =>
          b.score - a.score
      )[0];


    const averageScore =
      average(
        scored.map(
          item => item.score
        )
      );


    return {

      mark,

      primeWindow,

      hours:
        scored,

      bestHour:
        best?.hour || null,

      bestHourScore:
        best?.score ?? null,

      score:
        averageScore === null
          ? null
          : Math.round(
              averageScore
            ),

      bestComponents:
        best?.components || null

    };

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerScoring = {

    scoreInsideRange,

    scoreWindSpeed,
    scoreWindDirection,
    scoreWind,

    scoreSwellHeight,
    scoreSwellPeriod,
    scoreSwell,

    estimateClarity,

    scoreCloudCover,
    scoreSeaTemperature,

    getLightBoost,
    scorePrimeWindowPosition,

    scoreHour,
    scorePrimeWindow

  };


  console.log(
    "Sea Fishing Planner: scoring engine ready."
  );

})();
