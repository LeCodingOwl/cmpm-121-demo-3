import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

/*
const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});
*/

class CoordinateConverter {
  coordinatesMap: Map<string, { i: number; j: number }>;

  constructor() {
    this.coordinatesMap = new Map();
  }

  convertToGameCell(latitude: number, longitude: number) {
    const i = Math.floor(latitude * 0.0001);
    const j = Math.floor(longitude * 0.0001);

    if (this.coordinatesMap.has("${i}:${j}")) {
      return this.coordinatesMap.get("${i}:${j}");
    }
    this.coordinatesMap.set("${i}:${j}", { i, j });
    return { i, j };
  }
}
// Base coordinates of NULL Island
const NULL_ISLAND = {
  lat: 0,
  lng: 0,
};

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(NULL_ISLAND);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    const playerLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    playerMarker.setLatLng(playerLocation);
    map.setView(playerLocation);

    makeCells(playerLocation);
  });
});

let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function makePit(i: number, j: number) {
  const bounds = leaflet.latLngBounds([
    [NULL_ISLAND.lat + i * TILE_DEGREES, NULL_ISLAND.lng + j * TILE_DEGREES],
    [
      NULL_ISLAND.lat + (i + 1) * TILE_DEGREES,
      NULL_ISLAND.lng + (j + 1) * TILE_DEGREES,
    ],
  ]);

  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  pit.bindPopup(() => {
    const UNIQUE_ID = "${i}:${j}#${Math.floor(Math.random() * 1000)}"; //This creates a unique identifier for the pit
    let value = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at i: "${i}, j: ${j}". It has value <span id="value">${value}</span>. Unique ID: ${UNIQUE_ID}</div>
                <button id="take">Take</button><button id="putIn">Put in</button>`;

    const take = container.querySelector<HTMLButtonElement>("#take")!;
    take.addEventListener("click", () => {
      if (value > 0) {
        value--;
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          value.toString();
        points++;
        statusPanel.innerHTML = `${points} points accumulated`;
      }
    });

    const putIn = container.querySelector<HTMLButtonElement>("#putIn")!;
    putIn.addEventListener("click", () => {
      if (points > 0) {
        value++;
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          value.toString();
        points--;
        statusPanel.innerHTML = `${points} points accumulated`;
      }
    });

    return container;
  });
  pit.addTo(map);
}

function makeCells(playerLocation: { lat: number; lng: number }) {
  const coordinateConverter = new CoordinateConverter();
  const playerCell = coordinateConverter.convertToGameCell(
    playerLocation.lat,
    playerLocation.lng
  );
  if (playerCell) {
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
      for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
          makePit(i, j);
        }
      }
    }
  }
}
