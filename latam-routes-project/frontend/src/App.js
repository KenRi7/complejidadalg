import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Fix de íconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function App() {
  const [airports, setAirports] = useState([]);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [criterio, setCriterio] = useState("km");
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(false);
// Leer el tema guardado al cargar la app
useEffect(() => {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");

    const toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.checked = true;
  }
}, []);

// Manejar cambio de tema
const toggleDark = () => {
  document.body.classList.toggle("dark");

  const darkMode = document.body.classList.contains("dark");
  localStorage.setItem("theme", darkMode ? "dark" : "light");
};

  useEffect(() => {
    fetch("http://localhost:5000/airports")
      .then((res) => res.json())
      .then((data) => setAirports(data));
  }, []);

  const calcularRuta = () => {
    setLoading(true);
    setRuta(null);

    fetch("http://localhost:5000/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origen, destino, criterio }),
    })
      .then((res) => res.json())
      .then((data) => {
        setRuta(data);
        setLoading(false);
      });
  };

  const rutaCoords =
    ruta?.ruta
      ?.map((code) => {
        const a = airports.find((ap) => ap.code === code);
        return a ? [a.lat, a.lng] : null;
      })
      .filter(Boolean) || [];

  // Íconos pro
  const defaultIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

  const origenIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3177/3177363.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  const destinoIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3177/3177393.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  function FitBounds() {
    const map = useMap();
    useEffect(() => {
      if (rutaCoords.length > 1) {
        map.fitBounds(rutaCoords, { padding: [40, 40] });
      }
    }, [rutaCoords]);
    return null;
  }

  return (
    <div className="layout">
      {/* PANEL LATERAL MODERNO */}
      <aside className="sidebar">
      <h1 className="sidebar-title">LATAM Route Finder</h1>

{/* Toggle debajo del título */}
<div className="theme-toggle-container">
  <input
    type="checkbox"
    id="theme-toggle"
    className="theme-toggle-input"
    onChange={toggleDark}
  />
  <label htmlFor="theme-toggle" className="theme-toggle-label">
    <span className="toggle-icon sun">☀️</span>
    <span className="toggle-icon moon">🌙</span>
    <span className="toggle-ball"></span>
  </label>
</div>

<p className="sidebar-subtitle">
  Encuentra la mejor ruta entre aeropuertos reales ✈
</p>


        <div className="input-group">
          <label>🛫 Origen</label>
          <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="">Seleccionar origen</option>
            {airports
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
          </select>
        </div>
        <div className="input-group">
          <label>🛬 Destino</label>
          <select value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Seleccionar destino</option>
            {airports
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
          </select>
        </div>

        <div className="input-group">
          <label>⚙ Criterio</label>
          <select
            value={criterio}
            onChange={(e) => setCriterio(e.target.value)}
          >
            <option value="km">Distancia (km)</option>
            <option value="horas">Tiempo (horas)</option>
          </select>
        </div>

        <button
          className="btn-calc"
          onClick={calcularRuta}
          disabled={!origen || !destino}
        >
          {loading ? "Calculando..." : "Calcular Ruta"}
        </button>

        {ruta && !ruta.error && (
          <div className="result-card animate">
            <h3>Ruta encontrada</h3>

            <div className="result-path">
              {ruta.ruta.map((code, i) => (
                <span key={code}>
                  {code}
                  {i < ruta.ruta.length - 1 && " → "}
                </span>
              ))}
            </div>

            <p className="result-cost">
              <strong>Total:</strong> {ruta.costo}{" "}
              {criterio === "km" ? "km" : "horas"}
            </p>
          </div>
        )}

        {ruta?.error && (
          <div className="result-card error animate">
            <h3>Error</h3>
            <p>{ruta.error}</p>
          </div>
        )}
      </aside>

      {/* MAPA */}
      <main className="main">
        <MapContainer
          center={[-15, -60]}
          zoom={4}
          style={{ height: "100vh", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {airports.map((a) => {
            let icon = defaultIcon;
            if (a.code === origen) icon = origenIcon;
            if (a.code === destino) icon = destinoIcon;

            return (
              <Marker key={a.code} position={[a.lat, a.lng]} icon={icon}>
                <Popup>
                  <strong>{a.name}</strong>
                  <br />
                  {a.city}, {a.country} <br />
                  <em>{a.code}</em>
                </Popup>
              </Marker>
            );
          })}

          {rutaCoords.length > 1 && (
            <Polyline
              positions={rutaCoords}
              color="#E63946"
              weight={5}
              opacity={0.9}
            />
          )}

          <FitBounds />
        </MapContainer>
      </main>
    </div>
  );
}

export default App;
