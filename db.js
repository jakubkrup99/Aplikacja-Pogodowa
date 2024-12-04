import { openDB } from "idb";

export async function init() {
  const db = await openDB("weatherDb", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("weatherData")) {
        db.createObjectStore("weatherData", { keyPath: "name" });
      }
    },
  });
  return db;
}

export async function getAllWeatherData(db) {
  let tx = db.transaction("weatherData");
  let weatherDataObj = tx.objectStore("weatherData");
  let weatherData = await weatherDataObj.getAll();
  return weatherData;
}

export async function addCity(
  name,
  temp,
  time,
  weather,
  weatherDescription,
  humidity,
  wind,
  db
) {
  let tx = db.transaction("weatherData", "readwrite");

  try {
    await tx
      .objectStore("weatherData")
      .put({ name, temp, time, weather, weatherDescription, humidity, wind });
  } catch (err) {
    if (err.name == "ConstraintError") {
      return;
    } else {
      throw err;
    }
  }
}

export async function getCity(cityName, db) {
  let tx = db.transaction("weatherData", "readwrite");
  const data = await tx.objectStore("weatherData").get(cityName);
  return data;
}

export async function deleteCity(name, db) {
  let tx = db.transaction("weatherData", "readwrite");
  await tx.objectStore("weatherData").delete(name);
}
