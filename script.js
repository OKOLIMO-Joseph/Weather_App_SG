// ----------------------------------------------
// WEATHER APP USING OPENWEATHERMAP API (free tier)
// ----------------------------------------------

// ---------- CONFIGURATION ----------
// IMPORTANT: Replace with your own OpenWeather API key
// Get yours for free at https://home.openweathermap.org/api_keys
const API_KEY = "78c11182e00e1fdf70b9facbdc936abb";   // <-- Replace with a valid OpenWeather API key

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

// Demo fallback data (in case API key is missing/blocked)
function showDemoWeather(cityQuery = "Tokyo") {
  const demoCity = cityQuery ? cityQuery.charAt(0).toUpperCase() + cityQuery.slice(1) : "Sample City";
  const demoData = {
    name: demoCity === "Sample City" ? "San Francisco" : demoCity,
    sys: { country: "DEMO" },
    main: { temp: 291.15, feels_like: 289.85, humidity: 68 },
    wind: { speed: 3.2 },
    weather: [{ description: "partly cloudy", icon: "02d" }],
    dt: Math.floor(Date.now() / 1000),
    timezone: -14400   // EDT example
  };
  renderWeatherUI(demoData, demoCity);
  // show demo overlay message
  const note = document.createElement('div');
  note.className = 'message-area';
  note.style.marginTop = '12px';
  note.style.background = 'rgba(0,0,0,0.55)';
  note.innerHTML = '⚠️ Demo mode: Using sample weather data. Add valid OpenWeather API key for real forecasts.';
  if (!weatherContainer.querySelector('.demo-note-added')) {
    note.classList.add('demo-note-added');
    weatherContainer.appendChild(note);
    setTimeout(() => {
      if(note.parentNode) note.style.opacity = '0.7';
    }, 100);
  }
}

// Core fetch function using OpenWeather Current Weather Data API
async function fetchWeather(city) {
  if (!city || city.trim() === "") {
    weatherContainer.innerHTML = `<div class="message-area">❌ Please enter a valid city name.</div>`;
    return false;
  }
  
  // Show loading state
  weatherContainer.innerHTML = `<div class="message-area"><span class="loading-spinner"></span> Fetching live weather for "${escapeHtml(city)}"...</div>`;
  
  // Validate api key placeholder
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    // No valid API key: show demo mode fallback
    setTimeout(() => {
      weatherContainer.innerHTML = '';
      showDemoWeather(city);
    }, 300);
    return false;
  }
  
  const trimmedCity = city.trim();
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmedCity)}&appid=${API_KEY}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorMsg = `⚠️ City not found. Please check the spelling.`;
      if (response.status === 401) errorMsg = `🔑 Invalid API key. Using demo mode. Replace with your OpenWeather key.`;
      else if (response.status === 404) errorMsg = `🌍 City "${escapeHtml(trimmedCity)}" not found. Try another name.`;
      else if (response.status === 429) errorMsg = `📡 Too many requests. Please try later or use demo mode.`;
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
    if (err.name === 'AbortError') friendlyError = "⏱️ Request timeout. Check internet or use demo mode.";
    if (friendlyError.includes("API key") || friendlyError.includes("401")) {
      weatherContainer.innerHTML = '';
      showDemoWeather(trimmedCity);
      return false;
    }
    weatherContainer.innerHTML = `<div class="message-area">❌ ${friendlyError}</div>`;
    // if other network error, show retry suggestion
    if (!friendlyError.includes("City not found") && !friendlyError.includes("check the spelling")) {
      const retryDiv = document.createElement('div');
      retryDiv.className = 'message-area';
      retryDiv.style.marginTop = '10px';
      retryDiv.innerHTML = '💡 Try searching again or check API key. Using demo? <button id="useDemoBtn" style="background:#ffb347; border:none; border-radius:50px; padding:4px 10px; margin-left:5px; cursor:pointer;">Load Demo</button>';
      weatherContainer.appendChild(retryDiv);
      const demoBtn = document.getElementById('useDemoBtn');
      if (demoBtn) demoBtn.onclick = () => showDemoWeather(trimmedCity);
    }
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

// initial welcome message
function initWelcome() {
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    weatherContainer.innerHTML = `
      <div class="message-area" style="background: rgba(0,0,0,0.5);">
        🌟 Welcome to SkyCast! <br>
        ⚠️ <strong>Demo mode active</strong> — using sample data. <br>
        🔑 Get your free API key from <a href="https://openweathermap.org/api" target="_blank">OpenWeatherMap</a> and replace "YOUR_API_KEY_HERE" in script.js for live weather.<br>
        🔽 Try searching any city (demo preview)
      </div>
    `;
  } else {
    weatherContainer.innerHTML = `<div class="message-area">✨ Ready! Search for a city to get current weather 🌦️</div>`;
    // optional: auto fetch default city for better experience
    setTimeout(() => {
      if (weatherContainer.innerHTML.includes("Ready! Search")) {
        fetchWeather("London").catch(()=>{});
      }
    }, 200);
  }
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