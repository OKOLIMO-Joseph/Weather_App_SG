
// OpenWeather API key
const API_KEY = "78c11182e00e1fdf70b9facbdc936abb";

// DOM elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherContainer = document.getElementById('weatherContent');

// Helper: escape HTML to avoid injection
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Helper: update UI with weather data object
function renderWeatherUI(data, cityNameFromApi) {
  // data expects: name, sys.country, main.temp, main.feels_like, main.humidity, wind.speed,
  // weather[0].description, weather[0].icon, dt (timestamp)
  const city = data.name || cityNameFromApi || "Unknown";
  const country = data.sys?.country || "";
  const tempC = (data.main.temp - 273.15).toFixed(1);
  const feelsLikeC = (data.main.feels_like - 273.15).toFixed(1);
  const humidity = data.main.humidity;
  const windSpeed = (data.wind.speed * 3.6).toFixed(1); // convert m/s to km/h
  const description = data.weather[0].description;
  const iconCode = data.weather[0].icon;
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  
  // Get formatted local time based on timezone offset (seconds)
  let localTimeStr = "--:-- --";
  if (data.timezone !== undefined) {
    const utcTimestamp = data.dt;      // Unix UTC seconds
    const offsetSeconds = data.timezone;
    const localDate = new Date((utcTimestamp + offsetSeconds) * 1000);
    const hours = localDate.getUTCHours().toString().padStart(2, '0');
    const minutes = localDate.getUTCMinutes().toString().padStart(2, '0');
    localTimeStr = `${hours}:${minutes}`;
  } else {
    // fallback
    const d = new Date();
    localTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const dateObj = new Date();
  const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  
  const weatherHTML = `
    <div class="city-name">
      <span>${escapeHtml(city)}${country ? `, ${escapeHtml(country)}` : ''}</span>
      <span class="country-code">📍 Live</span>
    </div>
    <div class="date-time">📅 ${formattedDate} • 🕘 ${localTimeStr} (local)</div>
    
    <div class="main-temp-section">
      <div>
        <div class="temp-big">${tempC}<span class="temp-unit">°C</span></div>
        <div class="feels-like">Feels like ${feelsLikeC}°C</div>
      </div>
      <div class="weather-icon-box">
        <img class="weather-icon" src="${iconUrl}" alt="${escapeHtml(description)}" loading="lazy">
        <div class="weather-description">${escapeHtml(description)}</div>
      </div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon">💧</div>
        <div class="metric-label">Humidity</div>
        <div class="metric-value">${humidity}<span class="metric-unit">%</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">🌬️</div>
        <div class="metric-label">Wind Speed</div>
        <div class="metric-value">${windSpeed}<span class="metric-unit">km/h</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-icon">🌈</div>
        <div class="metric-label">Conditions</div>
        <div class="metric-value" style="font-size:1.1rem;">${escapeHtml(description.substring(0, 14))}</div>
      </div>
    </div>
  `;
  
  weatherContainer.innerHTML = weatherHTML;
}

// Core fetch function using OpenWeather Current Weather Data API
async function fetchWeather(city) {
  if (!city || city.trim() === "") {
    weatherContainer.innerHTML = `<div class="message-area">❌ Please enter a valid city name.</div>`;
    return false;
  }
  
  // Show loading state
  weatherContainer.innerHTML = `<div class="message-area"><span class="loading-spinner"></span> Fetching live weather for "${escapeHtml(city)}"...</div>`;
  
  const trimmedCity = city.trim();
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmedCity)}&appid=${API_KEY}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorMsg = `⚠️ City not found. Please check the spelling.`;
      if (response.status === 401) errorMsg = `🔑 Invalid API key. Please check your OpenWeather API key.`;
      else if (response.status === 404) errorMsg = `🌍 City "${escapeHtml(trimmedCity)}" not found. Try another name.`;
      else if (response.status === 429) errorMsg = `📡 Too many requests. Please try again later.`;
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    // Validate essential fields
    if (!data || !data.main || !data.weather) throw new Error("Incomplete weather data");
    renderWeatherUI(data, trimmedCity);
    return true;
  } catch (err) {
    console.warn("Weather API error:", err.message);
    let friendlyError = err.message;
    if (err.name === 'AbortError') friendlyError = "⏱️ Request timeout. Please check your internet connection.";
    weatherContainer.innerHTML = `<div class="message-area">❌ ${friendlyError}</div>`;
    return false;
  }
}

// handle search trigger
async function performSearch() {
  let query = cityInput.value.trim();
  if (query === "") {
    weatherContainer.innerHTML = `<div class="message-area">🔍 Type a city name (e.g., Paris, Berlin, Mumbai)</div>`;
    return;
  }
  await fetchWeather(query);
}

// initial welcome message - fetch default city
async function initWelcome() {
  weatherContainer.innerHTML = `<div class="message-area"><span class="loading-spinner"></span> Loading weather for Kampala...</div>`;
  // Fetch weather for a default city (Kampala)
  await fetchWeather("Kampala");
}

// EVENT LISTENERS
searchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  performSearch();
});

cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performSearch();
  }
});

// initialize the app
initWelcome();