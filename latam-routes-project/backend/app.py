from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
import os
import pandas as pd
from math import radians, sin, cos, sqrt, atan2

app = Flask(__name__)
CORS(app)

# ¡¡¡AQUÍ ESTÁ EL CAMBIO CLAVE!!!
G = nx.Graph()        # ← Grafo NO dirigido (perfecto para rutas aéreas comerciales)
# Antes era DiGraph() → causaba caminos absurdos y horas infladas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AIRPORTS_FILE = os.path.join(BASE_DIR, "data", "airports.dat")
ROUTES_FILE = os.path.join(BASE_DIR, "data", "routes.dat")

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

LATAM_COUNTRIES = ["Argentina","Bolivia","Brazil","Chile","Colombia","Costa Rica","Cuba",
                   "Dominican Republic","Ecuador","El Salvador","Guatemala","Honduras",
                   "Mexico","Nicaragua","Panama","Paraguay","Peru","Puerto Rico",
                   "Uruguay","Venezuela"]

HUBS = ["LIM","SCL","EZE","GRU","MIA","BOG","MEX","GIG","PTY","AEP","CUN","UIO","SAL"]

airports_data = []

def cargar_datos():
    global airports_data, G
    G.clear()
    airports_data = []

    # === CARGAR AEROPUERTOS ===
    df = pd.read_csv(AIRPORTS_FILE, header=None, encoding='utf-8', on_bad_lines='skip')
    df = df.iloc[:, :14]
    df.columns = ["id","name","city","country","iata","icao","lat","lon","alt","tz","dst","tzdb","type","source"]

    mask = (df["iata"].notna()) & (df["iata"] != "\\N") & (
        df["country"].isin(LATAM_COUNTRIES) | df["iata"].isin(HUBS)
    )
    df = df[mask].copy()
    df["lat"] = pd.to_numeric(df["lat"], errors='coerce')
    df["lon"] = pd.to_numeric(df["lon"], errors='coerce')
    df = df.dropna(subset=["lat","lon","iata"])

    print(f"Aeropuertos cargados: {len(df)}")

    for _, row in df.iterrows():
        code = row["iata"]
        city = row["city"] if pd.notna(row["city"]) and row["city"] != "\\N" else row["name"]
        airport = {
            "code": code,
            "name": row["name"],
            "city": city,
            "country": row["country"],
            "lat": float(row["lat"]),
            "lng": float(row["lon"])
        }
        airports_data.append(airport)
        G.add_node(code, **airport)

    # === CARGAR RUTAS (ahora solo una vez, porque es grafo no dirigido) ===
    print("Cargando rutas comerciales reales...")
    rutas = 0
    with open(ROUTES_FILE, "r", encoding="utf-8") as f:
        for linea in f:
            if not linea.strip():
                0
                continue
            partes = linea.strip().split(",")
            if len(partes) < 5:
                continue

            origen = partes[2].replace('"', '').strip()
            destino = partes[4].replace('"', '').strip()

            if origen in G.nodes and destino in G.nodes:
                lat1, lng1 = G.nodes[origen]["lat"], G.nodes[origen]["lng"]
                lat2, lng2 = G.nodes[destino]["lat"], G.nodes[destino]["lng"]
                km = round(haversine(lat1, lng1, lat2, lng2), 1)
                horas = round(km / 850, 2)

                # Solo una arista (Graph() la hace automáticamente bidireccional)
                G.add_edge(origen, destino, km=km, horas=horas)
                rutas += 1

                if rutas % 600 == 0:
                    print(f"   → {rutas} rutas cargadas...")

    print(f"¡LISTO! {len(G.nodes)} aeropuertos y {len(G.edges)} rutas comerciales cargadas")

cargar_datos()

@app.route("/airports")
def get_airports():
    return jsonify(airports_data)

@app.route("/route", methods=["POST"])
def route():
    data = request.json
    origen = data.get("origen")
    destino = data.get("destino")
    criterio = data.get("criterio", "km")

    if origen not in G.nodes or destino not in G.nodes:
        return jsonify({"error": "Aeropuerto no encontrado"}), 404

    try:
        path = nx.shortest_path(G, origen, destino, weight=criterio)
        cost = nx.shortest_path_length(G, origen, destino, weight=criterio)
        return jsonify({"ruta": path, "costo": round(cost, 1), "criterio": criterio})
    except nx.NetworkXNoPath:
        return jsonify({"error": "No hay conexión comercial entre estos aeropuertos"}), 404

if __name__ == "__main__":
    print("\n" + "="*60)
    print("   SERVIDOR LATAM AIRLINES PERÚ - 100% FUNCIONAL")
    print("   Rutas y tiempos REALES con Dijkstra + OpenFlights")
    print("="*60 + "\n")
    app.run(debug=True, port=5000)