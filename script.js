/**
 * ConvectX - AI Convective Scale Nowcasting & Early Warning System
 * Problem ID: SIH26084
 * Presentation-Ready Modular JavaScript Engine
 * Strictly NO blue / navy-blue styles applied dynamically.
 */

// ==========================================================================
// 1. DATA REPOSITORY & INITIAL STATE
// ==========================================================================

const STORM_CELLS = [
  {
    id: "A102",
    name: "Storm Cell #A102",
    region: "Gangetic Plain (Prayagraj)",
    lat: 25.4358,
    lng: 81.8463,
    bearing: 45, // NE
    speedKmH: 32,
    dbz: 56,
    severity: "SEVERE",
    ciProbability: 88,
    arrivalMin: 42,
    hazards: { ts: 78, lt: 71, rn: 54, hl: 22, wd: 48 },
    summary: "Severe convective cell undergoing explosive vertical ascent near Prayagraj."
  },
  {
    id: "B204",
    name: "Storm Cell #B204",
    region: "Himalayan Foothills (Dehradun)",
    lat: 30.3165,
    lng: 78.0322,
    bearing: 60, // ENE
    speedKmH: 24,
    dbz: 52,
    severity: "CRITICAL",
    ciProbability: 84,
    arrivalMin: 28,
    hazards: { ts: 82, lt: 65, rn: 86, hl: 18, wd: 42 },
    summary: "Orographic convective cloudburst cell moving along Rishikesh-Dehradun valley."
  },
  {
    id: "C308",
    name: "Storm Cell #C308",
    region: "Himachal Valley (Shimla)",
    lat: 31.1048,
    lng: 77.1734,
    bearing: 30, // NNE
    speedKmH: 22,
    dbz: 48,
    severity: "MODERATE",
    ciProbability: 72,
    arrivalMin: 55,
    hazards: { ts: 64, lt: 58, rn: 68, hl: 28, wd: 35 },
    summary: "Steep valley convergence producing localized high-intensity rainfall."
  },
  {
    id: "D412",
    name: "Storm Cell #D412",
    region: "Brahmaputra Valley (Guwahati)",
    lat: 26.1445,
    lng: 91.7362,
    bearing: 80, // E
    speedKmH: 36,
    dbz: 54,
    severity: "HIGH",
    ciProbability: 79,
    arrivalMin: 38,
    hazards: { ts: 74, lt: 69, rn: 78, hl: 14, wd: 52 },
    summary: "Brahmaputra moisture channel driving repetitive echo training."
  },
  {
    id: "E516",
    name: "Storm Cell #E516",
    region: "Bengal Delta (Kolkata/Midnapore)",
    lat: 22.5726,
    lng: 88.3639,
    bearing: 135, // SE
    speedKmH: 42,
    dbz: 58,
    severity: "SEVERE",
    ciProbability: 92,
    arrivalMin: 22,
    hazards: { ts: 88, lt: 85, rn: 62, hl: 34, wd: 72 },
    summary: "Kalbaishakhi squall line developing with rapid downburst potential."
  },
  {
    id: "F620",
    name: "Storm Cell #F620",
    region: "Odisha Coast (Cuttack/Bhubaneswar)",
    lat: 20.4625,
    lng: 85.8828,
    bearing: 40, // NE
    speedKmH: 28,
    dbz: 50,
    severity: "MODERATE",
    ciProbability: 66,
    arrivalMin: 65,
    hazards: { ts: 60, lt: 62, rn: 58, hl: 10, wd: 45 },
    summary: "Coastal sea-breeze frontal boundary triggering evening thunderstorms."
  },
  {
    id: "G724",
    name: "Storm Cell #G724",
    region: "Jammu Foothills (Udhampur)",
    lat: 32.9258,
    lng: 75.1416,
    bearing: 25, // NNE
    speedKmH: 20,
    dbz: 46,
    severity: "MONITORED",
    ciProbability: 58,
    arrivalMin: 78,
    hazards: { ts: 52, lt: 44, rn: 50, hl: 15, wd: 30 },
    summary: "Sub-Himalayan elevated convective trigger along Pir Panjal range."
  }
];

// Current State
let currentCell = STORM_CELLS[0];
let currentHorizonMinutes = 0;
let mapInstance = null;
let mapLayers = {
  cells: null,
  tracks: null,
  uncertainty: null,
  lightning: null,
  radarSim: null
};

let isDemoRunning = false;
let demoStepIndex = 0;
let demoTimer = null;
let replayPlaying = false;
let replayTimer = null;
let replayMinutes = 0;

// ==============================================
// 2. DOM CONTENT LOADED & INITIALIZATION
// ==============================================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Initialize Leaflet India GIS Map
  initLeafletMap();

  // Populate Default Location Risk Card with Prayagraj (#A102)
  selectStormCell(STORM_CELLS[0]);
});

// ==============================================
// 3. LEAFLET GIS ENGINE (DARK MATTER INDIA MAP)
// ==============================================
function initLeafletMap() {
  const mapElement = document.getElementById("gis-map");
  if (!mapElement) return;

  // Center on India (approx: 23.5° N, 80.5° E, zoom level 5)
  mapInstance = L.map("gis-map", {
    center: [23.5, 80.5],
    zoom: 5,
    minZoom: 4,
    maxZoom: 10,
    zoomControl: true
  });

  // Base Map: CartoDB Dark Matter (strictly dark, no blue/navy oceans)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | IMD ConvectX Simulation',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(mapInstance);

  // Initialize Layer Groups
  mapLayers.cells = L.layerGroup().addTo(mapInstance);
  mapLayers.tracks = L.layerGroup().addTo(mapInstance);
  mapLayers.uncertainty = L.layerGroup().addTo(mapInstance);
  mapLayers.lightning = L.layerGroup().addTo(mapInstance);
  mapLayers.radarSim = L.layerGroup().addTo(mapInstance);

  // Click on map anywhere to evaluate coordinates
  mapInstance.on("click", (e) => {
    handleMapCoordinateClick(e.latlng.lat, e.latlng.lng);
  });

  // Render Storms
  renderMapElements();
}

function renderMapElements() {
  if (!mapInstance) return;

  // Clear existing
  mapLayers.cells.clearLayers();
  mapLayers.tracks.clearLayers();
  mapLayers.uncertainty.clearLayers();
  mapLayers.lightning.clearLayers();
  mapLayers.radarSim.clearLayers();

  const showRisk = document.getElementById("layer-risk") ? document.getElementById("layer-risk").checked : true;
  const showLightning = document.getElementById("layer-lightning") ? document.getElementById("layer-lightning").checked : true;
  const showTracks = document.getElementById("layer-tracks") ? document.getElementById("layer-tracks").checked : true;
  const showRadar = document.getElementById("layer-radar") ? document.getElementById("layer-radar").checked : false;

  STORM_CELLS.forEach((cell) => {
    // Project position based on horizon minutes
    const displacementKm = (cell.speedKmH * (currentHorizonMinutes / 60));
    const bearingRad = (cell.bearing * Math.PI) / 180;
    
    // 1 deg lat ~ 111 km; 1 deg lng ~ 111 * cos(lat) km
    const dLat = (displacementKm * Math.cos(bearingRad)) / 111;
    const dLng = (displacementKm * Math.sin(bearingRad)) / (111 * Math.cos((cell.lat * Math.PI) / 180));
    
    const projLat = cell.lat + dLat;
    const projLng = cell.lng + dLng;

    // 1. STORM CELL CORE CIRCLE
    if (showRisk) {
      let coreColor = "#f59e0b"; // Golden Amber
      let pulseColor = "rgba(245, 158, 11, 0.4)";
      if (cell.dbz >= 55) {
        coreColor = "#ef4444"; // Crimson Red
        pulseColor = "rgba(239, 68, 68, 0.45)";
      } else if (cell.dbz < 50) {
        coreColor = "#10b981"; // Emerald
        pulseColor = "rgba(16, 185, 129, 0.35)";
      }

      // Buffer / Hazard swath
      const hazardCircle = L.circle([projLat, projLng], {
        radius: 28000 + currentHorizonMinutes * 150, // expands with time
        color: coreColor,
        weight: 1.5,
        fillColor: pulseColor,
        fillOpacity: 0.35
      }).addTo(mapLayers.cells);

      hazardCircle.on("click", () => {
        selectStormCell(cell);
      });

      // Cell Center Marker
      const centerMarker = L.circleMarker([projLat, projLng], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: coreColor,
        fillOpacity: 1
      }).addTo(mapLayers.cells);

      centerMarker.bindTooltip(`<strong>${cell.name}</strong><br/>${cell.dbz} dBZ • ${cell.region}`, {
        permanent: false,
        direction: "top"
      });

      centerMarker.on("click", () => {
        selectStormCell(cell);
      });
    }

    // 2. STORM TRACK & CONE OF UNCERTAINTY
    if (showTracks) {
      const pNow = [cell.lat, cell.lng];
      const pFuture = [projLat, projLng];

      // Historical/Current to future line
      L.polyline([pNow, pFuture], {
        color: "#f59e0b",
        weight: 2,
        dashArray: "4, 6"
      }).addTo(mapLayers.tracks);

      // Uncertainty Cone Polygon
      if (currentHorizonMinutes > 0) {
        const uncertaintySpread = 0.08 * (currentHorizonMinutes / 60);
        const conePoints = [
          pNow,
          [projLat + uncertaintySpread, projLng - uncertaintySpread],
          [projLat - uncertaintySpread, projLng + uncertaintySpread]
        ];
        L.polygon(conePoints, {
          color: "transparent",
          fillColor: "#f59e0b",
          fillOpacity: 0.12
        }).addTo(mapLayers.uncertainty);
      }
    }

    // 3. LIGHTNING DISCHARGES (Simulated around active cells)
    if (showLightning && cell.dbz >= 50) {
      for (let i = 0; i < 4; i++) {
        const offsetLat = projLat + (Math.sin(i * 1.5) * 0.18);
        const offsetLng = projLng + (Math.cos(i * 2.2) * 0.18);
        L.circleMarker([offsetLat, offsetLng], {
          radius: 3,
          color: "#f59e0b",
          fillColor: "#ffffff",
          fillOpacity: 0.9,
          weight: 1
        }).addTo(mapLayers.lightning);
      }
    }

    // 4. SYNTHETIC RADAR DBZ REFLECTIVITY OVERLAY
    if (showRadar) {
      L.circle([projLat, projLng], {
        radius: 40000,
        color: "#10b981",
        weight: 1,
        fillColor: "#10b981",
        fillOpacity: 0.15
      }).addTo(mapLayers.radarSim);
    }
  });
}

function toggleLayers() {
  renderMapElements();
}

function resetMapCenter() {
  if (mapInstance) {
    mapInstance.setView([23.5, 80.5], 5);
  }
}

// Search Map Location
function searchMapLocation() {
  const query = document.getElementById("map-search-input").value.trim().toLowerCase();
  if (!query) return;

  const found = STORM_CELLS.find((c) => 
    c.name.toLowerCase().includes(query) ||
    c.region.toLowerCase().includes(query)
  );

  if (found) {
    selectStormCell(found);
    if (mapInstance) {
      mapInstance.flyTo([found.lat, found.lng], 7, { duration: 1.2 });
    }
  } else {
    alert(`No convective cells currently mapped for "${query}". Try "Prayagraj", "Dehradun", or "Kolkata".`);
  }
}

function handleMapCoordinateClick(lat, lng) {
  // Update location panel with queried point
  document.getElementById("loc-display-name").textContent = `Selected Coordinate Area`;
  document.getElementById("loc-display-coords").textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

  // Find distance to closest cell
  let closest = null;
  let minDist = 9999;
  STORM_CELLS.forEach((c) => {
    const d = Math.hypot(c.lat - lat, c.lng - lng) * 111; // in km
    if (d < minDist) {
      minDist = d;
      closest = c;
    }
  });

  const arrivalMin = Math.round((minDist / 32) * 60);
  document.getElementById("loc-storm-arrival").textContent = `~${arrivalMin} min`;
  document.getElementById("loc-storm-vector").textContent = `NE at 32 km/h`;

  if (minDist < 60) {
    document.getElementById("loc-risk-level").textContent = "HIGH HAZARD";
    document.getElementById("loc-risk-level").className = "risk-level-tag text-crimson";
    document.getElementById("prob-ts").textContent = "76%";
    document.getElementById("prob-lt").textContent = "70%";
    document.getElementById("prob-rn").textContent = "58%";
  } else {
    document.getElementById("loc-risk-level").textContent = "MODERATE / MONITOR";
    document.getElementById("loc-risk-level").className = "risk-level-tag text-amber";
    document.getElementById("prob-ts").textContent = "38%";
    document.getElementById("prob-lt").textContent = "24%";
    document.getElementById("prob-rn").textContent = "32%";
  }
}

// ==============================================
// 4. TIMELINE SCRUBBER (+0 TO +6 HOURS)
// ==============================================
function setForecastTime(minutes, displayLabel) {
  currentHorizonMinutes = minutes;
  document.getElementById("timeline-display-time").textContent = displayLabel;

  // Update active state on buttons
  const buttons = document.querySelectorAll("#timeline-buttons .step-btn");
  buttons.forEach((btn) => {
    if (btn.textContent.includes(minutes === 0 ? "NOW" : `+${minutes / 60 < 1 ? minutes + " MIN" : (minutes / 60) + " HR"}`)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Dynamic KPI updates with forecast expansion
  const kpiCells = document.getElementById("kpi-cells");
  const kpiRiskLocs = document.getElementById("kpi-risk-locs");
  const kpiLightning = document.getElementById("kpi-lightning");
  const kpiRain = document.getElementById("kpi-rain-prob");

  if (minutes === 0) {
    if (kpiCells) kpiCells.textContent = "07";
    if (kpiRiskLocs) kpiRiskLocs.textContent = "12";
    if (kpiLightning) kpiLightning.textContent = "184/min";
    if (kpiRain) kpiRain.textContent = "64%";
  } else if (minutes <= 60) {
    if (kpiCells) kpiCells.textContent = "09";
    if (kpiRiskLocs) kpiRiskLocs.textContent = "16";
    if (kpiLightning) kpiLightning.textContent = "240/min";
    if (kpiRain) kpiRain.textContent = "76%";
  } else {
    if (kpiCells) kpiCells.textContent = "05";
    if (kpiRiskLocs) kpiRiskLocs.textContent = "08";
    if (kpiLightning) kpiLightning.textContent = "92/min";
    if (kpiRain) kpiRain.textContent = "42%";
  }

  // Recalculate and re-render map
  renderMapElements();
}

// ==============================================
// 5. SELECT STORM CELL & UPDATE PANELS
// ==============================================
function selectStormCell(cell) {
  currentCell = cell;

  // Update Location Panel
  document.getElementById("loc-display-name").textContent = cell.region;
  document.getElementById("loc-display-coords").textContent = `${cell.lat.toFixed(4)}° N, ${cell.lng.toFixed(4)}° E`;
  document.getElementById("loc-storm-arrival").textContent = `~${cell.arrivalMin} min`;
  document.getElementById("loc-storm-vector").textContent = `${cell.bearing === 45 ? "NE" : "ENE"} at ${cell.speedKmH} km/h`;
  document.getElementById("loc-confidence").textContent = `High (${cell.ciProbability}%)`;

  // Update Probability Metrics
  document.getElementById("prob-ts").textContent = `${cell.hazards.ts}%`;
  document.getElementById("prob-lt").textContent = `${cell.hazards.lt}%`;
  document.getElementById("prob-rn").textContent = `${cell.hazards.rn}%`;
  document.getElementById("prob-hl").textContent = `${cell.hazards.hl}%`;
  document.getElementById("prob-wd").textContent = `${cell.hazards.wd}%`;

  // Update Cell Inspector
  document.getElementById("cell-name-title").textContent = `${cell.name} TRACKING`;
  document.getElementById("cell-speed").textContent = `${cell.speedKmH} km/h`;
  document.getElementById("cell-arrival").textContent = `${cell.arrivalMin} min`;
  document.getElementById("cell-dbz").textContent = `${cell.dbz} dBZ`;
  document.getElementById("cell-movement").textContent = `${cell.bearing === 45 ? "NE (45°)" : "ENE (60°)"}`;

  // Severity badge color
  const sevBadge = document.getElementById("cell-sev-badge");
  if (sevBadge) {
    sevBadge.textContent = cell.severity;
    sevBadge.className = cell.dbz >= 55 ? "badge-status-high" : "badge-status-mod";
  }

  // Risk Level
  const riskLvl = document.getElementById("loc-risk-level");
  if (riskLvl) {
    riskLvl.textContent = cell.dbz >= 54 ? "HIGH HAZARD" : "MODERATE RISK";
    riskLvl.className = cell.dbz >= 54 ? "risk-level-tag text-crimson" : "risk-level-tag text-amber";
  }
}

// ==============================================
// 6. TAB SWITCHING SYSTEM
// ==============================================
function switchTab(tabId) {
  // Update nav buttons
  const navBtns = document.querySelectorAll(".main-nav .nav-item");
  navBtns.forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Switch view panels
  const panels = document.querySelectorAll(".view-panel");
  panels.forEach((p) => {
    if (p.id === tabId) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  // Re-invalidate Leaflet map if returning to nowcast
  if (tabId === "tab-nowcast" && mapInstance) {
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 200);
  }

  // Refresh icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ==============================================
// 7. PIPELINE STAGE INSPECTION
// ==============================================
const PIPELINE_DATA = {
  observe: {
    title: "STAGE 1: MULTI-SOURCE SENSOR INGESTION (OBSERVE)",
    desc: "Collect real-time observational feeds from IMD Doppler Weather Radars (S-band/C-band/X-band reflectivity and radial velocity), INSAT-3D/3DR multispectral satellite imagery (thermal infrared and water vapor channels), Earth Networks ground lightning sensor networks, and automated surface weather stations (AWS/ARG).",
    specs: ["Latency: < 90 seconds", "Resolution: 500m / 5-min", "Format: NetCDF4 / HDF5 / BUFR"]
  },
  fusion: {
    title: "STAGE 2: SPATIAL-TEMPORAL HARMONIZATION (DATA FUSION)",
    desc: "Projects disparate observations onto a uniform geographical coordinate mesh (EPSG:4326/EPSG:3857) using spatial bilinear resampling and Barnes objective interpolation for irregular AWS data.",
    specs: ["Grid Mesh: 0.005° (~500m)", "Time-Step: 5-minute sync", "Projection: EPSG:4326"]
  },
  preprocess: {
    title: "STAGE 3: QUALITY CONTROL & DE-NOISING (PREPROCESS)",
    desc: "Applies automated ground-clutter removal, anomalous propagation (AP) filtering on Doppler reflectivity, speckle de-noising, and zero-value attenuation compensation.",
    specs: ["Filter: Doppler Velocity QC", "Clutter Cut: Fuzzy Logic", "Missing Interpolation: IDW"]
  },
  ci: {
    title: "STAGE 4: CONVECTIVE INITIATION DETECTION (CI)",
    desc: "Monitors pre-convective cumulus clouds using INSAT TIR cloud-top brightness temperature drops (-4°C / 15 min), boundary-layer convergence signatures, and sudden lightning jump spikes.",
    specs: ["Lead Time Gain: +30 to 45 min", "Confidence Score: 0.0 - 1.0", "Sensor: INSAT-3DR + Radar"]
  },
  nowcast: {
    title: "STAGE 5: DEEP LEARNING SPATIO-TEMPORAL NOWCAST",
    desc: "Executes a Recurrent Spatio-Temporal Convolutional Network (ConvLSTM / PredRNN backbone) that models non-linear convective growth, decay, and advection for lead times of 0 to 6 hours.",
    specs: ["Inference Time: 480ms", "Model Weight: 42M params", "Framework: PyTorch TensorRT"]
  },
  risk: {
    title: "STAGE 6: MULTI-HAZARD RISK CALIBRATION",
    desc: "Converts probabilistic raw outputs into calibrated meteorological hazard tiers (Thunderstorm, Lightning, Heavy Rain, Hail, Strong Wind) using Platt isotonic scaling and historical validation.",
    specs: ["Calibration: Isotonic Platt", "Brier Skill Score: 0.084", "Hazard Tiers: 4 Configurable"]
  },
  tracking: {
    title: "STAGE 7: CELL ADVECTION & UNCERTAINTY CONES",
    desc: "Calculates storm centroid vectors, translation velocity, and lateral expansion cones (±12 km at +60m) to estimate accurate time of arrival for downstream settlements.",
    specs: ["Tracking Algorithm: Enhanced TITAN", "Speed Vector: 32 km/h NE", "Arrival Precision: ±6.4 min"]
  },
  gis: {
    title: "STAGE 8: GIS LOCATION TRANSLATION",
    desc: "Translates high-resolution spatial matrices into geospatial vector footprints and overlays them onto interactive dark-matter cartographic tiles with GeoJSON boundaries.",
    specs: ["Format: Mapbox Vector Tiles", "Spatial Index: PostGIS R-Tree", "FPS: 60 FPS Client GL"]
  },
  alert: {
    title: "STAGE 9: AUTOMATED EARLY WARNING DISPATCH",
    desc: "Generates standardized Common Alerting Protocol (CAP v1.2) XML messages for immediate dissemination to state disaster management authorities (SDMA/NDMA) and SMS gateways.",
    specs: ["Format: CAP v1.2 XML / JSON", "Delivery: Webhook / SMS / Push", "Dispatch Delay: < 2 sec"]
  }
};

function showPipelineDetail(stageKey) {
  const data = PIPELINE_DATA[stageKey];
  if (!data) return;

  // Active node highlighting
  const nodes = document.querySelectorAll(".pipeline-flow .pipe-node");
  nodes.forEach((n) => n.classList.remove("active"));
  event.currentTarget.classList.add("active");

  document.getElementById("pipe-detail-title").textContent = data.title;
  document.getElementById("pipe-detail-desc").textContent = data.desc;

  const specsBox = document.getElementById("pipe-detail-specs");
  specsBox.innerHTML = "";
  data.specs.forEach((s) => {
    const chip = document.createElement("div");
    chip.className = "spec-chip";
    chip.textContent = s;
    specsBox.appendChild(chip);
  });
}

// ==============================================
// 8. HISTORICAL REPLAY INTERACTION
// ==============================================
function toggleReplayPlay() {
  replayPlaying = !replayPlaying;
  const playBtn = document.getElementById("replay-play-txt");
  const playIcon = document.getElementById("replay-play-icon");

  if (replayPlaying) {
    playBtn.textContent = "Pause Replay";
    if (playIcon) playIcon.setAttribute("data-lucide", "pause");
    replayTimer = setInterval(advanceReplayStep, 1500);
  } else {
    playBtn.textContent = "Play Replay";
    if (playIcon) playIcon.setAttribute("data-lucide", "play");
    clearInterval(replayTimer);
  }

  if (window.lucide) window.lucide.createIcons();
}

function advanceReplayStep() {
  replayMinutes = (replayMinutes + 15) % 90;
  document.getElementById("replay-timer-display").textContent = `T + ${replayMinutes} min (${replayMinutes < 30 ? "Initiation" : "Peak Storm"})`;

  const predLabel = document.getElementById("rep-pred-label");
  const obsLabel = document.getElementById("rep-obs-label");

  if (replayMinutes === 0) {
    predLabel.textContent = "Predicted: Developing Convection Signature Detected";
    obsLabel.textContent = "Observed: Weak 25 dBZ Echo Detected by Radar";
  } else if (replayMinutes === 30) {
    predLabel.textContent = "Predicted: Rapid Ascent to 52 dBZ Core @ T+30m";
    obsLabel.textContent = "Observed: Actual 50 dBZ Core Formed";
  } else if (replayMinutes === 45 || replayMinutes === 60) {
    predLabel.textContent = "Predicted: 55 dBZ Severe Core Reaches Target";
    obsLabel.textContent = "Observed: 57 dBZ Ground Truth Recorded";
  } else {
    predLabel.textContent = "Predicted: Cell Decay & Anvil Spread";
    obsLabel.textContent = "Observed: Dissipation Phase Begins";
  }
}

function changeReplayEvent() {
  replayMinutes = 0;
  document.getElementById("replay-timer-display").textContent = "T + 00 min (Initiation)";
  advanceReplayStep();
}

// ==============================================
// 9. AUTOMATED 30-SECOND SIH JUDGE DEMO
// ==============================================
function triggerJudgeDemo() {
  if (isDemoRunning) return;

  isDemoRunning = true;
  demoStepIndex = 0;

  const banner = document.getElementById("demo-banner");
  banner.classList.remove("hidden");

  // Ensure on nowcast tab
  switchTab("tab-nowcast");

  runNextDemoStep();
}

const DEMO_SCRIPT = [
  {
    text: "Step 1/6: Ingesting live Doppler radar & INSAT satellite feeds...",
    action: () => {
      setForecastTime(0, "NOW (14:00 IST)");
      if (mapInstance) mapInstance.flyTo([25.4358, 81.8463], 6, { duration: 1 });
      selectStormCell(STORM_CELLS[0]); // Prayagraj
    }
  },
  {
    text: "Step 2/6: Convective Initiation (CI) detected! Rapid cloud-top cooling (-4.2°C) in Prayagraj...",
    action: () => {
      const ciPanel = document.querySelector(".ci-panel");
      if (ciPanel) ciPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },
  {
    text: "Step 3/6: AI Spatio-Temporal Nowcast predicts cell tracking vector NE at 32 km/h...",
    action: () => {
      if (mapInstance) mapInstance.flyTo([25.4358, 81.8463], 7, { duration: 1 });
    }
  },
  {
    text: "Step 4/6: Advancing forecast horizon to +1 HOUR (15:00 IST)...",
    action: () => {
      setForecastTime(60, "+1 HR (15:00 IST)");
    }
  },
  {
    text: "Step 5/6: Automated Location Hazard calculated: Prayagraj HIGH ALERT (78% TS, 71% Lightning)...",
    action: () => {
      const locPanel = document.querySelector(".location-panel");
      if (locPanel) locPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },
  {
    text: "Step 6/6: Automated Common Alerting Protocol (CAP) Warning Generated for Emergency Services.",
    action: () => {
      const alertPanel = document.querySelector(".alerts-panel");
      if (alertPanel) alertPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
];

function runNextDemoStep() {
  if (!isDemoRunning) return;

  if (demoStepIndex >= DEMO_SCRIPT.length) {
    document.getElementById("demo-step-text").textContent = "Demo Finished: ConvectX successfully demonstrated the 0–6h nowcasting chain!";
    setTimeout(() => {
      cancelDemo();
    }, 4000);
    return;
  }

  const step = DEMO_SCRIPT[demoStepIndex];
  document.getElementById("demo-step-text").textContent = step.text;
  step.action();

  demoStepIndex++;
  demoTimer = setTimeout(runNextDemoStep, 4500);
}

function cancelDemo() {
  isDemoRunning = false;
  clearTimeout(demoTimer);
  const banner = document.getElementById("demo-banner");
  if (banner) banner.classList.add("hidden");
}

// ==============================================
// 10. PRESENTATION MODE TOGGLE
// ==============================================
function togglePresentationMode() {
  const isPres = document.body.classList.toggle("presentation-mode");
  const btn = document.getElementById("btn-pres");
  if (btn) {
    btn.classList.toggle("active", isPres);
  }
  if (mapInstance) {
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 300);
  }
}