import "/style.css";
import { init, getAllWeatherData, addCity, deleteCity, getCity } from "/db.js";
const API_KEY = "a68153c2f2d99f74403d7159690a7bf8";
let db;
init().then((res) => {
  db = res;
});
let isDataFromGps;
let currentCity;
let is6DaysDisplayed = false;
let weatherDataObj = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

function displayModalList(weatherData) {
  const savedCitiesUlElement = document.querySelector(".saved-cities-ul");
  const lang = localStorage.getItem("language");
  const colorMode = localStorage.getItem("colorMode");
  const colorClass = colorMode === "dark" ? "dark-li" : "light-li";
  if (!weatherData.length) {
    const liText =
      lang === "en"
        ? "No saved cities yet. Please add city."
        : "Brak zapisanych miast. Zapisz miasto";
    savedCitiesUlElement.innerHTML = `<li class="${colorClass}">${liText}</li>`;
    return;
  }

  savedCitiesUlElement.innerHTML = weatherData
    .map(
      (city) => `<li class="${colorClass}"><p>
        ${city.name} </p><span class="span-remove-city"><img tabindex="0" src="images/recycle-bin.png"/></span>
      </li>`
    )
    .join("");
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch (err) {
      console.log(err);
    }
  }
}

function load6DaysData() {
  const cityName = currentCity;
  const language = localStorage.getItem("language");
  if (is6DaysDisplayed) removeCards(1);
  const apiUrlCity = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${API_KEY}&units=metric&lang=${language}`;
  check5DaysWeather(apiUrlCity);
  is6DaysDisplayed = true;
}

function convertDate(unixTime, lang) {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return new Date(unixTime * 1000).toLocaleDateString(lang, options);
}

function convertTime(unixTime) {
  const date = new Date(unixTime * 1000);
  const hour = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minutes}`;
}

function removeCards(start, reverse = false) {
  const cards = Array.from(document.querySelectorAll(".card"));
  if (reverse) {
    cards.reverse();
  }

  for (let i = start; i < cards.length; i++) {
    cards[i].remove();
  }
}

function remove6DaysData() {
  if (!is6DaysDisplayed) return;
  removeCards(1);
  is6DaysDisplayed = false;
  const mainCard = document.querySelector(".weather");
  mainCard.removeEventListener("click", displayCards);
  mainCard.removeEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    displayCards.call(mainCard);
  });
}

function toggle6Days() {
  if (is6DaysDisplayed) {
    remove6DaysData();
    displayTextContent();
    return;
  }

  if (!is6DaysDisplayed) {
    load6DaysData();
    displayTextContent();
  }
}
const getHour = (date) => new Date(date * 1000).getHours();
const getDay = (date) => new Date(date * 1000).getDay();

function addNewCard(id, addTo) {
  const card = document.getElementById("1");
  const newCard = card.cloneNode(true);
  delete newCard.id;
  newCard.id = id;
  newCard.classList.add(`id-${id}`);
  addTo.appendChild(newCard);

  document.querySelector(`.id-${id} .menu`).remove();
  document.querySelector(`.id-${id} .search`).remove();
  document.querySelector(`.id-${id} .error`).remove();

  return {
    datePElement: document.querySelector(`.id-${id} .date`),
    timePElement: document.querySelector(`.id-${id} .hour`),
    tempElement: document.querySelector(`.id-${id} .temp`),
    weatherDescriptionElement: document.querySelector(
      `.id-${id} .weather-description`
    ),
    humidityElement: document.querySelector(`.id-${id} .humidity`),
    windElement: document.querySelector(`.id-${id} .wind`),
    weatherIconElement: document.querySelector(`.id-${id} .weather-icon`),
    cityNameElement: document.querySelector(`.id-${id} h1`),
  };
}
function displayCards() {
  document.getElementById("weather-modal").style.display = "block";
  const weatherContent = document.querySelector(".weather-content");
  const id = this.id === "" ? "1" : this.id;
  weatherDataObj[id].forEach((obj, i) => {
    let newCard = addNewCard((+id + 6 + i).toString(), weatherContent);
    const {
      main: { temp, humidity },
      wind: { speed: wind },
      weather: [{ main: weather, description: weatherDescription }],
      dt: time,
    } = obj;
    displayWeather(
      currentCity,
      temp,
      humidity,
      wind,
      weather,
      weatherDescription,
      time,
      newCard
    );
  });
}
async function check5DaysWeather(url) {
  const error = document.querySelector(".error");

  const response = await fetch(url);
  if (response.status === 404) {
    error.style.display = "block";
    localStorage.getItem("language") === "en"
      ? (error.textContent = "Invalid location")
      : (error.textContent = "Niewłaściwa lokalizacja");
    return;
  }
  const responseJson = await response.json();
  const { list } = responseJson;
  const hourInNextDays =
    getHour(list[0].dt) === 2 ? 23 : getHour(list[0].dt) - 3;
  let objIndex = "1";
  let currDay = getDay(list[0].dt);
  let id = 2;
  weatherDataObj = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  list.forEach((obj) => {
    if (getDay(obj.dt) !== currDay) {
      objIndex = (+objIndex + 1).toString();
      currDay = currDay === 6 ? 0 : ++currDay;
    }
    weatherDataObj[objIndex].push(obj);

    if (getHour(obj.dt) === hourInNextDays) {
      const body = document.querySelector("body");
      const elementsObj = addNewCard(id, body);
      const {
        dt: time,
        main: { temp, humidity },
        weather: [{ description: weatherDescription, main: weather }],
        wind: { speed: wind },
      } = obj;

      const cityName = currentCity;
      displayWeather(
        cityName,
        temp,
        humidity,
        wind,
        weather,
        weatherDescription,
        time,
        elementsObj
      );
      id++;
    }
  });

  const cards = Array.from(document.querySelectorAll(".card")).slice(1);
  cards.forEach((card) => {
    card.addEventListener("click", displayCards);
    card.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      displayCards.call(card);
    });
  });
  const mainCard = document.querySelector(".weather");
  mainCard.addEventListener("click", displayCards);
  mainCard.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    displayCards.call(mainCard);
  });
}

async function saveCity() {
  const cityName = document.querySelector("h2").textContent;
  const language = localStorage.getItem("language");
  const apiUrlCity = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=metric&lang=${language}`;
  const response = await fetch(apiUrlCity);
  const data = await response.json();
  const {
    name,
    main: { temp, humidity },
    dt: time,
    weather: [{ main: weather, description: weatherDescription }],
    wind: { speed },
  } = data;

  await addCity(
    name,
    temp,
    time,
    weather,
    weatherDescription,
    humidity,
    speed,
    db
  );
  const weatherData = await getAllWeatherData(db);
  displayModalList(weatherData);
}

function displayWeather(
  cityName,
  temp,
  humidity,
  wind,
  weather,
  weatherDescription,
  time,
  obj = null
) {
  const isObj = obj === null ? false : true;
  const tempElement = isObj ? obj.tempElement : document.querySelector(".temp");
  const cityNameElement = isObj
    ? obj.cityNameElement
    : document.querySelector(".city");
  const humidityElement = isObj
    ? obj.humidityElement
    : document.querySelector(".humidity");
  const windElement = isObj ? obj.windElement : document.querySelector(".wind");
  const weatherDescriptionElement = isObj
    ? obj.weatherDescriptionElement
    : document.querySelector(".weather-description");
  const datePElement = isObj
    ? obj.datePElement
    : document.querySelector(".date p");
  const timePElement = isObj
    ? obj.timePElement
    : document.querySelector(".hour p");
  const weatherIconElement = isObj
    ? obj.weatherIconElement
    : document.querySelector(".weather-icon");
  const error = document.querySelector(".error");
  const weatherDiv = document.querySelector(".weather");
  cityNameElement.textContent = cityName;
  tempElement.textContent = `${Math.round(temp)}°C`;
  humidityElement.textContent = `${humidity} %`;
  windElement.textContent = `${wind} m/s`;
  datePElement.textContent = convertDate(
    time,
    localStorage.getItem("language") == "en" ? "en-GB" : "pl-PL"
  );
  timePElement.textContent = convertTime(time);
  weatherDescriptionElement.textContent = `${weatherDescription}`;
  switch (weather) {
    case "Clouds":
      weatherIconElement.src = "images/clouds.png";
      break;
    case "Clear":
      weatherIconElement.src = "images/clear.png";
      break;
    case "Drizzle":
      weatherIconElement.src == "images/drizzle.png";
      break;
    case "Mist":
      weatherIconElement.src = "images/mist.png";
      break;
    case "Rain":
      weatherIconElement.src = "images/rain.png";
      break;
    case "Snow":
      weatherIconElement.src = "images/snow.png";
      break;
  }
  currentCity = cityName;
  error.style.display = "none";
  weatherDiv.style.display = "block";
}

async function checkWeather(url) {
  const error = document.querySelector(".error");

  const response = await fetch(url);
  if (response.status === 404) {
    error.style.display = "block";
    localStorage.getItem("language") === "en"
      ? (error.textContent = "Invalid location")
      : (error.textContent = "Niewłaściwa lokalizacja");
    return;
  }

  const data = await response.json();
  const {
    name,
    main: { temp, humidity },
    wind: { speed },
    weather: [{ main, description }],
    dt,
  } = data;

  displayWeather(name, temp, humidity, speed, main, description, dt);

  if (isCitySaved(name) || isDataFromGps) {
    addCity(name, temp, dt, main, description, humidity, speed, db);
    const weatherData = await getAllWeatherData(db);
    displayModalList(weatherData);
  }

  if (is6DaysDisplayed) {
    load6DaysData();
  }
}

function displayTextContent() {
  const languageButtonElement = document.querySelector(".btn-language");
  const daysButtonElement = document.querySelector(".btn-days");
  const inputElement = document.querySelector(".search input");
  const [humidityPElement, windPElement] = document.querySelectorAll(
    ".col div p:nth-child(2)"
  );

  const isEnglishOn = localStorage.getItem("language") === "en";
  if (!is6DaysDisplayed) {
    daysButtonElement.textContent = isEnglishOn ? "6 Days" : "6 Dni";
  } else {
    daysButtonElement.textContent = isEnglishOn ? "1 Day" : "1 Dzień";
  }

  languageButtonElement.childNodes[2].textContent = isEnglishOn
    ? "Polski"
    : "English";

  inputElement.attributes["1"].textContent = isEnglishOn
    ? "Enter city name"
    : "Wpisz nazwe miasta";

  humidityPElement.textContent = isEnglishOn ? "Humidity" : "Wilgotność";
  windPElement.textContent = isEnglishOn ? "Wind Speed" : "Prędkość wiatru";
}

function changeLanguage() {
  const newLanguage = localStorage.getItem("language") === "en" ? "pl" : "en";
  localStorage.setItem("language", newLanguage);
  displayTextContent();
  if (isDataFromGps) loadGpsData();
  else loadData();
}

function enableDarkMode() {
  const inputElement = document.querySelector(".search input");

  document.querySelector("body").style.background =
    "var(--background-darkmode)";

  document.querySelectorAll(".card").forEach((card) => {
    card.style.background = "var(--card-color-darkmode)";
    card.style.color = "var(--primary-color-darkmode)";
  });

  inputElement.style.background = "var(--background-darkmode)";
  inputElement.style.color = "var(--primary-color-darkmode)";

  document.querySelectorAll("button").forEach((button) => {
    button.style.background = "var(--background-darkmode)";
    button.style.color = "var(--primary-color-darkmode)";
  });

  document.querySelectorAll(".modal-content").forEach((modal) => {
    modal.style.background = "var(--background-darkmode)";
  });

  document.querySelector(".btn-color-mode img").src = "images/sun.png";
  localStorage.setItem("colorMode", "dark");
}

function enableLightMode() {
  const inputElement = document.querySelector(".search input");

  document.querySelector("body").style.background =
    "var(--background-lightmode)";

  document.querySelectorAll(".card").forEach((card) => {
    card.style.background = "var(--card-color-lightmode)";
    card.style.color = "var(--primary-color-lightmode)";
  });

  inputElement.style.background = "var(--primary-color-lightmode)";
  inputElement.style.color = "var(--background-dark-lightmode)";

  document.querySelectorAll("button").forEach((button) => {
    button.style.background = "var(--primary-color-lightmode)";
    button.style.color = "var(--background-dark-lightmode)";
  });

  document.querySelectorAll(".modal-content").forEach((modal) => {
    modal.style.background = "var(--background-lightmode)";
  });

  document.querySelector(".btn-color-mode img").src = "images/moon.png";
  localStorage.setItem("colorMode", "light");
}

function loadGpsData() {
  const language = localStorage.getItem("language");
  isDataFromGps = true;
  navigator.geolocation.getCurrentPosition((position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const apiUlrLocation = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=${language}`;
    checkWeather(apiUlrLocation);
    localStorage.setItem("latitude", latitude);
    localStorage.setItem("longitude", longitude);
  });
}

function isCitySaved(cityName) {
  const savedCities = Array.from(
    document.querySelectorAll(".saved-cities-ul li")
  ).map((li) => li.textContent.trim().split(" ")[0]);
  return savedCities.includes(cityName);
}

async function loadData() {
  const inputElement = document.querySelector(".search input");

  let cityName;
  if (inputElement.value === "" && currentCity === undefined) return;

  // Usuniecie buga, przy zmianie języka i pustym inpucie nie zmieniało się weather description;
  inputElement.value === ""
    ? (cityName = currentCity)
    : (cityName =
        inputElement.value.charAt(0).toUpperCase() +
        inputElement.value.slice(1).toLowerCase());

  //Dane wczytuja sie najpierw z bazy danych jesli sa w niej zapisane, nastepnie jest wołane api
  if (isCitySaved(cityName)) {
    const result = await getCity(cityName, db);
    const { name, temp, time, weather, weatherDescription, wind, humidity } =
      result;
    displayWeather(
      name,
      temp,
      humidity,
      wind,
      weather,
      weatherDescription,
      time
    );
  }
  const language = localStorage.getItem("language");
  const apiUrlCity = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=metric&lang=${language}`;
  isDataFromGps = false;
  checkWeather(apiUrlCity);
}

function changeColorMode() {
  if (localStorage.getItem("colorMode") === "light") enableDarkMode();
  else if (localStorage.getItem("colorMode") === "dark") enableLightMode();
}

function addListeners() {
  const searchButtonElement = document.querySelector(".btn-search");
  const gpsButtonElement = document.querySelector(".btn-gps");
  const colorModeButtonElement = document.querySelector(".btn-color-mode");
  const languageButtonElement = document.querySelector(".btn-language");
  const daysButtonElement = document.querySelector(".btn-days");
  const inputElement = document.querySelector(".search input");
  const savedCitiesBtn = document.querySelector(".btn-saved-list");
  const citiesModal = document.getElementById("cities-modal");
  const closeModalSpan = document.querySelector(".close");
  const weatherModal = document.getElementById("weather-modal");
  const closeWeatherModalSpan = document.querySelector(".close-weather");
  const saveCityButton = document.querySelector(".btn-save");
  const savedCitiesUlElement = document.querySelector(".saved-cities-ul");

  savedCitiesUlElement.addEventListener("click", async (e) => {
    if (e.target.matches(".span-remove-city img")) {
      const cityName = e.target.parentElement.parentElement.textContent
        .trim()
        .split(" ")[0];
      await deleteCity(cityName, db);
      const weatherData = await getAllWeatherData(db);
      displayModalList(weatherData);
    }
  });

  saveCityButton.addEventListener("click", saveCity);

  savedCitiesBtn.addEventListener("click", async () => {
    citiesModal.style.display = "block";
    const weatherData = await getAllWeatherData(db);
    displayModalList(weatherData);
  });

  closeModalSpan.addEventListener("click", () => {
    citiesModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target == citiesModal) {
      citiesModal.style.display = "none";
    }
  });

  window.addEventListener("click", (event) => {
    if (event.target == weatherModal) {
      weatherModal.style.display = "none";
      removeCards(6, true);
    }
  });

  closeWeatherModalSpan.addEventListener("click", () => {
    weatherModal.style.display = "none";
    removeCards(6, true);
  });

  searchButtonElement.addEventListener("click", loadData);
  gpsButtonElement.addEventListener("click", loadGpsData);
  colorModeButtonElement.addEventListener("click", changeColorMode);
  daysButtonElement.addEventListener("click", toggle6Days);
  inputElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    loadData();
  });
  languageButtonElement.addEventListener("click", () => changeLanguage(false));
}

function setDefaultLocalStorage() {
  const preferredLanguage = navigator.language || navigator.languages[0];
  const prefersDarkMode = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const prefix = preferredLanguage.startsWith("pl") ? "pl" : "en";
  localStorage.setItem("language", prefix);

  const color = prefersDarkMode ? "dark" : "light";
  localStorage.setItem("colorMode", color);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
setDefaultLocalStorage();

if (localStorage.getItem("colorMode") == "dark") enableDarkMode();

if (
  localStorage.getItem("latitude") !== null &&
  localStorage.getItem("longitude") !== null
) {
  isDataFromGps = true;
  const latitude = localStorage.getItem("latitude");
  const longitude = localStorage.getItem("longitude");
  const language = localStorage.getItem("language");
  const apiUlrLocation = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=${language}`;
  checkWeather(apiUlrLocation);
} else {
  isDataFromGps = false;
}

displayTextContent();
addListeners();
registerServiceWorker();
