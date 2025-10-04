from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
import json
import os
import time
from math import radians, sin, cos, sqrt, atan2
import random

app = Flask(__name__)
CORS(app)

#grafodirigido
G = nx.DiGraph()

#rutabsjson
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ruta_json = os.path.join(BASE_DIR, "data", "airports.json")

#formhaversine(km entre coordenadas) 
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

#funcionparacargarlosaeropuertos
def cargar_aeropuertos():
    if not os.path.exists(ruta_json):
        raise FileNotFoundError(f"No se encontró el archivo: {ruta_json}")

    with open(ruta_json, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return datos

#funcionparaconstruirlosgrafos
def construir_grafo(airports_data):
    G.clear()

    #agregarnodos
    for airport in airports_data:
        G.add_node(
            airport["code"],
            name=airport["name"],
            city=airport["city"],
            country=airport["country"],
            lat=airport["lat"],
            lng=airport["lng"]
        )

    #crearrutasconhaversine
    codes = [a["code"] for a in airports_data]
    for origen in airports_data:
        posibles_destinos = [a for a in airports_data if a["code"] != origen["code"]]
        destinos = random.sample(posibles_destinos, k=min(5, len(posibles_destinos)))  #hasta5rutasporaeropuerto
        for destino in destinos:
            km = haversine(origen["lat"], origen["lng"], destino["lat"], destino["lng"])
            horas = round(km / 850, 2)  #promedioavion ~850 km/h
            G.add_edge(origen["code"], destino["code"], km=round(km, 2), horas=horas)

#inicializardatos
airports_data = cargar_aeropuertos()
ultimo_mod = os.path.getmtime(ruta_json)
construir_grafo(airports_data)

#endpoints
@app.route("/airports", methods=["GET"])
def get_airports():
    return jsonify(airports_data)

@app.route("/route", methods=["POST"])
def get_route():
    global airports_data, ultimo_mod

    #verificamoseljson
    mod_actual = os.path.getmtime(ruta_json)
    if mod_actual != ultimo_mod:
        print("[INFO] airports.json modificado, recargando datos...")
        airports_data = cargar_aeropuertos()
        construir_grafo(airports_data)
        ultimo_mod = mod_actual

    data = request.json
    origen = data.get("origen")
    destino = data.get("destino")
    criterio = data.get("criterio", "km")

    try:
        path = nx.shortest_path(G, source=origen, target=destino, weight=criterio)
        dist = nx.shortest_path_length(G, source=origen, target=destino, weight=criterio)
        return jsonify({"ruta": path, "costo": dist, "criterio": criterio})
    except nx.NetworkXNoPath:
        return jsonify({"error": "No existe ruta entre los aeropuertos"}), 404
    except nx.NodeNotFound:
        return jsonify({"error": "Aeropuerto no encontrado"}), 404

if __name__ == "__main__":
    print(f"Iniciando servidor Flask con {len(G.nodes)} aeropuertos y {G.number_of_edges()} rutas...")
    app.run(debug=True, host="127.0.0.1", port=5000)
