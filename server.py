import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from titiler.core.factory import TilerFactory
import uvicorn
from rio_tiler.io import Reader
from rio_tiler.errors import TileOutsideBounds, PointOutsideBounds
from rasterio.warp import transform_bounds
import numpy as np

app = FastAPI(title="Wargaming Tactical Web GIS Tile Server")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard 1x1 transparent PNG bytes for tiles outside bounding box
EMPTY_TRANSPARENT_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x03\x00\x08\xfc\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND\xaeB`\x82"
)

# Standard TiTiler router
cog = TilerFactory()
app.include_router(cog.router, prefix="/cog", tags=["TiTiler COG"])

# Robust dynamic tile endpoint that gracefully handles tiles outside raster bounds
@app.get("/cog/tiles/{z}/{x}/{y}.png")
def get_cog_tile(
    z: int,
    x: int,
    y: int,
    url: str = Query(default="output/bridge_suitability_cog.tif"),
    rescale: Optional[str] = Query(default=None),
    colormap_name: Optional[str] = Query(default=None),
    min_class: Optional[int] = Query(default=None),
    max_class: Optional[int] = Query(default=None)
):
    cog_path = Path(url).resolve()
    if not cog_path.exists():
        return Response(content=EMPTY_TRANSPARENT_PNG, media_type="image/png")
    
    try:
        with Reader(str(cog_path)) as src:
            img = src.tile(x, y, z)
            
            # Apply thresholding if specified
            if min_class is not None or max_class is not None:
                min_c = min_class if min_class is not None else 1
                max_c = max_class if max_class is not None else 5
                mask = (img.data[0] >= min_c) & (img.data[0] <= max_c) & (img.mask > 0)
                img.mask = np.where(mask, 255, 0).astype(np.uint8)
                
                # If all pixels were filtered out in this tile, return transparent
                if not np.any(img.mask):
                    return Response(content=EMPTY_TRANSPARENT_PNG, media_type="image/png")
            
            if rescale:
                parts = [float(v.strip()) for v in rescale.split(",")]
                img.rescale([(parts[0], parts[1])])
            elif "bridge" in url.lower():
                img.rescale([(1, 5)])
                
            render_kwargs = {"img_format": "PNG"}
            if colormap_name:
                render_kwargs["colormap_name"] = colormap_name
            elif "bridge" in url.lower():
                render_kwargs["colormap_name"] = "rdylgn"
                
            content = img.render(**render_kwargs)
            return Response(content=content, media_type="image/png")
    except TileOutsideBounds:
        # Gracefully return transparent tile when Leaflet requests areas outside the raster boundary
        return Response(content=EMPTY_TRANSPARENT_PNG, media_type="image/png")
    except Exception as e:
        return Response(content=EMPTY_TRANSPARENT_PNG, media_type="image/png")

@app.get("/tiles/{z}/{x}/{y}.png")
def get_direct_tile(
    z: int,
    x: int,
    y: int,
    url: str = Query(default="output/bridge_suitability_cog.tif"),
    rescale: Optional[str] = Query(default=None),
    colormap_name: Optional[str] = Query(default=None),
    min_class: Optional[int] = Query(default=None),
    max_class: Optional[int] = Query(default=None)
):
    return get_cog_tile(z=z, x=x, y=y, url=url, rescale=rescale, colormap_name=colormap_name, min_class=min_class, max_class=max_class)

# Pixel Probe / Identify Endpoint
@app.get("/api/inspect")
def inspect_point(
    lon: float = Query(..., description="Longitude"),
    lat: float = Query(..., description="Latitude"),
    url: str = Query(default="output/bridge_suitability_cog.tif")
):
    cog_path = Path(url).resolve()
    if not cog_path.exists():
        raise HTTPException(status_code=404, detail="Raster file not found")
    
    try:
        with Reader(str(cog_path)) as src:
            pt = src.point(lon, lat)
            val = int(pt.data[0]) if len(pt.data) > 0 else None
            is_valid = bool(pt.mask[0] > 0) if len(pt.mask) > 0 else False
            
            class_labels = {
                1: {"label": "Very Low Suitability", "color": "#d73027", "desc": "Severe constraints: extreme slope, fast currents, or unstable rocky banks. Bridging not recommended."},
                2: {"label": "Low Suitability", "color": "#fc8d59", "desc": "Poor terrain: steep approaches or narrow channel with heavy scouring."},
                3: {"label": "Moderate Suitability", "color": "#fee08b", "desc": "Acceptable crossing: standard bridge erection with minor bank reinforcement."},
                4: {"label": "High Suitability", "color": "#91cf60", "desc": "Favorable terrain: wide shallow water, firm soil, gentle access slopes."},
                5: {"label": "Very High (Optimal)", "color": "#1a9850", "desc": "Ideal bridging site: firm bedrock/gravel, flat approach roads, minimal engineering prep needed."}
            }
            
            info = class_labels.get(val, {"label": f"Class {val}", "color": "#64748b", "desc": "Unclassified or outside study area"})
            
            return {
                "lon": round(lon, 6),
                "lat": round(lat, 6),
                "valid": is_valid,
                "raw_value": val if is_valid else None,
                "label": info["label"] if is_valid else "Outside Bounds",
                "color": info["color"] if is_valid else "#64748b",
                "description": info["desc"] if is_valid else "Clicked point is outside the surveyed dataset bounds."
            }
    except (PointOutsideBounds, Exception):
        return {
            "lon": round(lon, 6),
            "lat": round(lat, 6),
            "valid": False,
            "raw_value": None,
            "label": "Outside Study Area",
            "color": "#64748b",
            "description": "Selected coordinate is outside the Bridge Suitability coverage area."
        }

# Mount static build assets for React
dist_path = Path("dist").resolve()
assets_path = dist_path / "assets"
if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

# Serve React app at /app and /
if dist_path.exists():
    app.mount("/app", StaticFiles(directory=str(dist_path), html=True), name="react_app")

@app.get("/geojson-viewer.html")
@app.get("/viewer")
def get_viewer():
    viewer_path = Path("geojson-viewer.html").resolve()
    if viewer_path.exists():
        return FileResponse(viewer_path)
    raise HTTPException(status_code=404, detail="geojson-viewer.html not found")

@app.get("/")
def get_root():
    dist_index = dist_path / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    viewer_path = Path("geojson-viewer.html").resolve()
    if viewer_path.exists():
        return FileResponse(viewer_path)
    return {"message": "Wargaming Tactical Web GIS Running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
