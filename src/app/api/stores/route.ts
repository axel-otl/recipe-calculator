import { NextResponse } from "next/server";
import { storesNear } from "@/lib/geo";
import { listStores } from "@/lib/providers";

const MAX_RADIUS_KM = 50;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get("source") === "live" ? "live" : "sample";
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radius = Math.min(MAX_RADIUS_KM, Math.max(1, Number(params.get("radius")) || 10));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !params.get("lat") || !params.get("lng")) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const { data, notices } = await listStores(source);
  return NextResponse.json({ stores: storesNear(data, lat, lng, radius), notices });
}
