import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMapboxToken(inputValue);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = () => {
      if (!mapboxToken) return;
      
      try {
        mapboxgl.accessToken = mapboxToken;
        
        const newMap = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v11",
          center: [-74.5, 40],
          zoom: 9,
        });

        // Add navigation controls
        newMap.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.current = newMap;
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  return (
    <div className="relative w-full h-full">
      {!mapboxToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
          <form onSubmit={handleSubmit} className="space-y-4 p-4 w-full max-w-md">
            <p className="text-sm text-gray-600">Please enter your Mapbox token:</p>
            <Input
              type="text"
              value={inputValue}
              className="w-full"
              placeholder="Enter Mapbox token"
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Set Token
            </button>
            <p className="text-xs text-gray-500">
              Get your token at{" "}
              <a
                href="https://www.mapbox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </form>
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;