import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";

function App() {
  const [airports, setAirports] = useState([]);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [criterio, setCriterio] = useState("km");
  const [ruta, setRuta] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/airports")
      .then((res) => res.json())
      .then((data) => setAirports(data))
      .catch((err) => console.error("Error cargando aeropuertos:", err));
  }, []);

  const calcularRuta = () => {
    fetch("http://localhost:5000/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origen, destino, criterio }),
    })
      .then((res) => res.json())
      .then((data) => setRuta(data))
      .catch((err) => console.error("Error calculando ruta:", err));
  };

  //darkmode
  const toggleDarkMode = () => {
    document.body.classList.toggle("dark-mode");
    setDarkMode(!darkMode);
  };

  //coordsdelaruta
  const rutaCoords =
    ruta && ruta.ruta
      ? ruta.ruta.map((code) => {
          const a = airports.find((ap) => ap.code === code);
          return [a.lat, a.lng];
        })
      : [];

  //icons
  const defaultIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });

  const origenIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149060.png",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -30],
  });

  const destinoIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149059.png",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -30],
  });

  const getAirportInfo = (code) => airports.find((a) => a.code === code);

  return (
    <div className="app-container">
      {/*sidebar*/}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>✈️ LATAM Airlines Peru S.A.</h1>
          <button className="dark-toggle" onClick={toggleDarkMode}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <label>Origen</label>
        <select onChange={(e) => setOrigen(e.target.value)} value={origen}>
          <option value="">Seleccionar</option>
          {airports.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} - {a.city}
            </option>
          ))}
        </select>

        <label>Destino</label>
        <select onChange={(e) => setDestino(e.target.value)} value={destino}>
          <option value="">Seleccionar</option>
          {airports.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} - {a.city}
            </option>
          ))}
        </select>

        <label>Criterio</label>
        <select onChange={(e) => setCriterio(e.target.value)} value={criterio}>
          <option value="km">Distancia (km)</option>
          <option value="horas">Tiempo (horas)</option>
        </select>

        <button onClick={calcularRuta} disabled={!origen || !destino}>
          Calcular Ruta
        </button>

        {ruta && !ruta.error && (
          <div className="ruta-box">
            <h2>Ruta Calculada:</h2>
            <div className="ruta-list">
              {ruta.ruta.map((code) => {
                const airport = getAirportInfo(code);
                return (
                  <div key={code} className="ruta-item">
                    <span className="ruta-icon">✈️</span>
                    <div>
                      <b>{code}</b> - {airport?.city} ({airport?.country})
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="ruta-costo">
              {ruta.criterio}: {ruta.costo.toFixed(2)}
            </p>
          </div>
        )}

        {ruta && ruta.error && (
          <div className="ruta-box">
            <h2>Error</h2>
            <p>{ruta.error}</p>
          </div>
        )}
      </div>

      {/*mapa*/}
      <div className="main">
        <MapContainer center={[-12.0219, -77.1143]} zoom={3}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {airports.map((a) => {
            let iconToUse = defaultIcon;
            if (a.code === origen) iconToUse = origenIcon;
            if (a.code === destino) iconToUse = destinoIcon;

            return (
              <Marker key={a.code} position={[a.lat, a.lng]} icon={iconToUse}>
                <Popup>
                  <b>{a.name}</b>
                  <br />
                  {a.city}, {a.country}
                  <br />
                  <i>Código: {a.code}</i>
                </Popup>
              </Marker>
            );
          })}

          {rutaCoords.length > 1 && <Polyline positions={rutaCoords} color="red" />}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
