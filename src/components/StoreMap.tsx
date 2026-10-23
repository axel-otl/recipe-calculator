"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { CHAIN_LABELS, type StoreWithDistance } from "@/lib/types";
import { CHAIN_COLORS } from "./chainColors";

interface Props {
  center: { lat: number; lng: number };
  radiusKm: number;
  stores: StoreWithDistance[];
  selectedIds: Set<string>;
  onToggle: (store: StoreWithDistance) => void;
}

function Recenter({ center, radiusKm }: Pick<Props, "center" | "radiusKm">) {
  const map = useMap();
  useEffect(() => {
    // Fit the search radius: ~zoom 13 for 2 km, ~zoom 10 for 20 km.
    const zoom = Math.round(14 - Math.log2(Math.max(1, radiusKm)));
    map.setView([center.lat, center.lng], zoom);
  }, [map, center.lat, center.lng, radiusKm]);
  return null;
}

export default function StoreMap({ center, radiusKm, stores, selectedIds, onToggle }: Props) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-lg border border-border"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} radiusKm={radiusKm} />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#2f7d4a", weight: 1, fillOpacity: 0.04 }}
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={5}
        pathOptions={{ color: "#1c211b", fillColor: "#1c211b", fillOpacity: 1 }}
      />
      {stores.map((store) => {
        const selected = selectedIds.has(store.id);
        return (
          <CircleMarker
            key={store.id}
            center={[store.lat, store.lng]}
            radius={selected ? 10 : 7}
            pathOptions={{
              color: CHAIN_COLORS[store.chain],
              weight: selected ? 3 : 2,
              fillColor: CHAIN_COLORS[store.chain],
              fillOpacity: selected ? 0.9 : 0.25,
            }}
            eventHandlers={{ click: () => onToggle(store) }}
          >
            <Tooltip>
              <strong>{store.name}</strong>
              <br />
              {CHAIN_LABELS[store.chain]} · {store.distanceKm.toFixed(1)} km
              <br />
              {selected ? "Selected – click to remove" : "Click to select"}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
