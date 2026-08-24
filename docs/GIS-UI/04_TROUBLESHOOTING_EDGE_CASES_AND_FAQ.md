# 04. Troubleshooting, Edge Cases & GIS FAQs

This document documents all edge cases, pitfalls ("ifs and buts"), common error codes, and technical solutions encountered in the GIS tile pipeline.

---

## 1. Edge Case: `TileOutsideBounds` (500 Server Error)

### The Problem:
When the user zooms out or pans around the globe, Leaflet requests map tiles for the whole screen viewport. If a tile coordinate $(z, x, y)$ is outside the GeoTIFF's bounding box, `rio-tiler` throws:
```
rio_tiler.errors.TileOutsideBounds: Tile(x=2914, y=1619, z=12) is outside bounds
```
If unhandled, FastAPI turns this into a `500 Internal Server Error` in the console.

### The Solution:
Catch `TileOutsideBounds` in the route handler and return a **1x1 transparent PNG** with `HTTP 200`:
```python
EMPTY_TRANSPARENT_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x03\x00\x08\xfc\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND\xaeB`\x82"
)

try:
    img = src.tile(x, y, z)
    return Response(content=img.render(img_format="PNG"), media_type="image/png")
except TileOutsideBounds:
    return Response(content=EMPTY_TRANSPARENT_PNG, media_type="image/png")
```

---

## 2. Edge Case: Vite Asset 404 (`/assets/index-....js`)

### The Problem:
When building a React frontend with Vite (`npm run build`), Vite creates bundled files in `dist/assets/index-....js` and injects root-relative script tags (`<script src="/assets/index-....js">`).
When hosting the React app via FastAPI under `/app`, the browser requests `/assets/...` from the root, causing a `404 Not Found`.

### The Solution:
In `server.py`, mount `dist/assets` directly at `/assets`:
```python
dist_path = Path("dist").resolve()
assets_path = dist_path / "assets"
if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
```

---

## 3. Coordinate Order Trap: `[Lat, Lon]` vs `[Lon, Lat]`

This is the #1 source of bugs in geospatial software:

| Standard / Library | Coordinate Order | Example |
| :--- | :--- | :--- |
| **Leaflet (`L.latLng`, `fitBounds`)** | **`[Latitude, Longitude]`** | `[34.800, 76.520]` |
| **GeoJSON (`Point`, `coordinates`)** | **`[Longitude, Latitude]`** | `[76.520, 34.800]` |
| **TiTiler (`/point/{lon},{lat}`)** | **`[Longitude, Latitude]`** | `/api/inspect?lon=76.52&lat=34.80` |
| **Rasterio Bounding Box** | **`[West, South, East, North]`** | `[76.09, 34.26, 76.99, 34.98]` |

> **Best Practice Rule**: Always check if a library expects `(Y, X)` or `(X, Y)`. When passing bounds to Leaflet `fitBounds()`, use `[[South_Lat, West_Lon], [North_Lat, East_Lon]]`.

---

## 4. NoData Values vs. Zero Pixel Values

* **Zero Value (`value = 0`)**: Represents a real measured physical value of zero (e.g. elevation at sea level $0\text{ m}$, flat slope $0^\circ$, or constant data).
* **NoData Value (`nodata = 127` or `-9999`)**: Represents unmeasured or non-evaluated terrain (such as areas outside the satellite swath).

### How to Prevent NoData from Turning Black:
In `server.py`, `rio-tiler` reads the `nodata` tag from the GeoTIFF header and assigns an alpha transparency mask (`mask = 0`) so NoData pixels remain 100% invisible over the map.

---

## 5. Performance Optimization: Overviews vs. On-the-Fly Warping

* **Bad Practice**: Attempting to serve a raw un-tiled TIFF directly. The server re-projects and resamples the whole 65 MB on every single tile request, spiking CPU to 100%.
* **Best Practice (What we implemented)**: Convert to COG with `rio-cogeo` ahead of time:
  ```python
  cog_translate("raw_data/input.tif", "output/input_cog.tif", cog_profiles.get("deflate"))
  ```
  This creates internal 256x256 tiles and overview pyramids ($1/2, 1/4, 1/8, 1/16$), cutting tile generation response times from $2,500\text{ ms}$ down to **$15\text{ ms}$**.
