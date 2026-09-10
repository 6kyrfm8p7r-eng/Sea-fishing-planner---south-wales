/* =========================================================
   SEA FISHING PLANNER — FORECAST ENGINE
   Live weather + marine forecast retrieval

   Designed for:
   - Next 24 hours
   - 7-day planner
   - Tide-window scoring
   - No fetch monkey-patching
   ========================================================= */

(function () {

  "use strict";


  const WEATHER_BASE =
    "https://api.open-meteo.com/v1/forecast";

  const MARINE_BASE =
    "https://marine-api.open-meteo.com/v1/marine";


  const FORECAST_DAYS = 8;


  /* =======================================================
     HELPERS
     ======================================================= */

  function requireMark(mark) {

    if (
      !mark ||
      typeof mark.lat !== "number" ||
      typeof mark.lon !== "number"
    ) {

      throw new Error(
        "A valid fishing mark with latitude and longitude is required."
      );

    }

  }


  async function fetchJson(url) {

    const response =
      await fetch(url);

    if (!response.ok) {

      throw new Error(
        `Forecast request failed: ${response.status}`
      );

    }

    return response.json();

  }


  function valueAt(array, index) {

    if (!Array.isArray(array)) {
      return null;
    }

    const value =
      array[index];

    return value === undefined
      ? null
      : value;

  }


  function makeTimeIndex(times) {

    const index =
      new Map();

    if (!Array.isArray(times)) {
      return index;
    }

    times.forEach(
      (time, i) => {

        index.set(
          time,
          i
        );

      }
    );

    return index;

  }


  /* =======================================================
     WEATHER
     ======================================================= */

  function buildWeatherUrl(mark) {

    const params =
      new URLSearchParams({

        latitude:
          mark.lat,

        longitude:
          mark.lon,

        timezone:
          "auto",

        forecast_days:
          String(FORECAST_DAYS),

        wind_speed_unit:
          "mph",

        precipitation_unit:
          "mm",

        hourly: [
          "temperature_2m",
          "precipitation",
          "rain",
          "cloud_cover",
          "visibility",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m"
        ].join(","),

        daily: [
          "sunrise",
          "sunset"
        ].join(",")

      });


    return (
      WEATHER_BASE +
      "?" +
      params.toString()
    );

  }


  async function fetchWeather(mark) {

    requireMark(mark);

    const url =
      buildWeatherUrl(mark);

    const data =
      await fetchJson(url);

    return {

      source:
        "Open-Meteo",

      type:
        "weather",

      markId:
        mark.id,

      markName:
        mark.name,

      latitude:
        data.latitude,

      longitude:
        data.longitude,

      timezone:
        data.timezone,

      utcOffsetSeconds:
        data.utc_offset_seconds,

      fetchedAt:
        new Date(),

      raw:
        data

    };

  }


  /* =======================================================
     MARINE
     ======================================================= */

  function buildMarineUrl(mark) {

    const params =
      new URLSearchParams({

        latitude:
          mark.lat,

        longitude:
          mark.lon,

        timezone:
          "auto",

        forecast_days:
          String(FORECAST_DAYS),

        cell_selection:
          "sea",

        hourly: [
          "wave_height",
          "wave_period",
          "wave_direction",
          "swell_wave_height",
          "swell_wave_period",
          "swell_wave_direction",
          "sea_level_height_msl",
          "sea_surface_temperature"
        ].join(","),

        minutely_15:
          "sea_level_height_msl"

      });


    return (
      MARINE_BASE +
      "?" +
      params.toString()
    );

  }


  async function fetchMarine(mark) {

    requireMark(mark);

    const url =
      buildMarineUrl(mark);

    const data =
      await fetchJson(url);

    return {

      source:
        "Open-Meteo Marine",

      type:
        "marine",

      markId:
        mark.id,

      markName:
        mark.name,

      latitude:
        data.latitude,

      longitude:
        data.longitude,

      timezone:
        data.timezone,

      utcOffsetSeconds:
        data.utc_offset_seconds,

      fetchedAt:
        new Date(),

      raw:
        data

    };

  }


  /* =======================================================
     NORMALISE HOURLY WEATHER
     ======================================================= */

  function normaliseWeatherHours(weatherResult) {

    const data =
      weatherResult?.raw;

    const hourly =
      data?.hourly;

    if (
      !hourly ||
      !Array.isArray(hourly.time)
    ) {

      return [];

    }


    return hourly.time.map(
      (time, index) => {

        return {

          time,

          date:
            new Date(time),

          temperature:
            valueAt(
              hourly.temperature_2m,
              index
            ),

          precipitation:
            valueAt(
              hourly.precipitation,
              index
            ),

          rain:
            valueAt(
              hourly.rain,
              index
            ),

          cloudCover:
            valueAt(
              hourly.cloud_cover,
              index
            ),

          visibility:
            valueAt(
              hourly.visibility,
              index
            ),

          windSpeed:
            valueAt(
              hourly.wind_speed_10m,
              index
            ),

          windDirection:
            valueAt(
              hourly.wind_direction_10m,
              index
            ),

          windGust:
            valueAt(
              hourly.wind_gusts_10m,
              index
            )

        };

      }
    );

  }


  /* =======================================================
     NORMALISE HOURLY MARINE
     ======================================================= */

  function normaliseMarineHours(marineResult) {

    const data =
      marineResult?.raw;

    const hourly =
      data?.hourly;

    if (
      !hourly ||
      !Array.isArray(hourly.time)
    ) {

      return [];

    }


    return hourly.time.map(
      (time, index) => {

        return {

          time,

          date:
            new Date(time),

          waveHeight:
            valueAt(
              hourly.wave_height,
              index
            ),

          wavePeriod:
            valueAt(
              hourly.wave_period,
              index
            ),

          waveDirection:
            valueAt(
              hourly.wave_direction,
              index
            ),

          swellHeight:
            valueAt(
              hourly.swell_wave_height,
              index
            ),

          swellPeriod:
            valueAt(
              hourly.swell_wave_period,
              index
            ),

          swellDirection:
            valueAt(
              hourly.swell_wave_direction,
              index
            ),

          seaLevel:
            valueAt(
              hourly.sea_level_height_msl,
              index
            ),

          seaTemperature:
            valueAt(
              hourly.sea_surface_temperature,
              index
            )

        };

      }
    );

  }


  /* =======================================================
     MERGE WEATHER + MARINE BY TIMESTAMP
     ======================================================= */

  function mergeHourly(
    weatherResult,
    marineResult
  ) {

    const weatherHours =
      normaliseWeatherHours(
        weatherResult
      );

    const marineHours =
      normaliseMarineHours(
        marineResult
      );


    const marineIndex =
      makeTimeIndex(
        marineHours.map(
          hour => hour.time
        )
      );


    return weatherHours.map(
      weatherHour => {

        const index =
          marineIndex.get(
            weatherHour.time
          );

        const marineHour =
          index === undefined
            ? null
            : marineHours[index];


        return {

          ...weatherHour,

          waveHeight:
            marineHour?.waveHeight ?? null,

          wavePeriod:
            marineHour?.wavePeriod ?? null,

          waveDirection:
            marineHour?.waveDirection ?? null,

          swellHeight:
            marineHour?.swellHeight ?? null,

          swellPeriod:
            marineHour?.swellPeriod ?? null,

          swellDirection:
            marineHour?.swellDirection ?? null,

          seaLevel:
            marineHour?.seaLevel ?? null,

          seaTemperature:
            marineHour?.seaTemperature ?? null

        };

      }
    );

  }


  /* =======================================================
     SUNRISE / SUNSET
     ======================================================= */

  function getDailyLight(weatherResult) {

    const daily =
      weatherResult?.raw?.daily;

    if (
      !daily ||
      !Array.isArray(daily.time)
    ) {

      return [];

    }


    return daily.time.map(
      (date, index) => {

        return {

          date,

          sunrise:
            valueAt(
              daily.sunrise,
              index
            ),

          sunset:
            valueAt(
              daily.sunset,
              index
            )

        };

      }
    );

  }


  /* =======================================================
     15-MINUTE SEA LEVEL DATA
     Used later for tide detection.
     ======================================================= */

  function getSeaLevel15Minutes(
    marineResult
  ) {

    const data =
      marineResult?.raw?.minutely_15;

    if (
      !data ||
      !Array.isArray(data.time)
    ) {

      return [];

    }


    return data.time.map(
      (time, index) => {

        return {

          time,

          date:
            new Date(time),

          seaLevel:
            valueAt(
              data.sea_level_height_msl,
              index
            )

        };

      }
    );

  }


  /* =======================================================
     TIME RANGE HELPERS
     ======================================================= */

  function between(
    hours,
    start,
    end
  ) {

    const startTime =
      new Date(start).getTime();

    const endTime =
      new Date(end).getTime();


    if (
      Number.isNaN(startTime) ||
      Number.isNaN(endTime)
    ) {

      return [];

    }


    return hours.filter(
      hour => {

        const time =
          new Date(
            hour.time
          ).getTime();

        return (
          time >= startTime &&
          time <= endTime
        );

      }
    );

  }


  function nextHours(
    hours,
    numberOfHours = 24,
    now = new Date()
  ) {

    const start =
      new Date(now);

    const end =
      new Date(
        start.getTime() +
        numberOfHours *
        60 *
        60 *
        1000
      );


    return between(
      hours,
      start,
      end
    );

  }


  function hoursForDate(
    hours,
    date
  ) {

    const target =
      new Date(date);

    if (
      Number.isNaN(
        target.getTime()
      )
    ) {

      return [];

    }


    const year =
      target.getFullYear();

    const month =
      target.getMonth();

    const day =
      target.getDate();


    return hours.filter(
      hour => {

        const current =
          new Date(
            hour.time
          );

        return (
          current.getFullYear() === year &&
          current.getMonth() === month &&
          current.getDate() === day
        );

      }
    );

  }


  /* =======================================================
     COMPLETE MARK FORECAST
     ======================================================= */

  async function fetchForecast(mark) {

    requireMark(mark);


    const [
      weather,
      marine
    ] = await Promise.all([

      fetchWeather(mark),

      fetchMarine(mark)

    ]);


    const hourly =
      mergeHourly(
        weather,
        marine
      );


    return {

      mark,

      timezone:
        weather.timezone ||
        marine.timezone,

      fetchedAt:
        new Date(),

      weather,

      marine,

      hourly,

      next24Hours:
        nextHours(
          hourly,
          24
        ),

      daylight:
        getDailyLight(
          weather
        ),

      seaLevel15Minutes:
        getSeaLevel15Minutes(
          marine
        )

    };

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.SeaPlannerForecast = {

    forecastDays:
      FORECAST_DAYS,

    buildWeatherUrl,
    buildMarineUrl,

    fetchWeather,
    fetchMarine,
    fetchForecast,

    normaliseWeatherHours,
    normaliseMarineHours,

    mergeHourly,

    getDailyLight,
    getSeaLevel15Minutes,

    between,
    nextHours,
    hoursForDate

  };


  console.log(
    `Sea Fishing Planner: forecast engine ready (${FORECAST_DAYS} days).`
  );

})();
