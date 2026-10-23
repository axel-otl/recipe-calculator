import { NextResponse } from "next/server";
import { z } from "zod";
import { tagOffers } from "@/lib/pricing";
import { getOffers } from "@/lib/providers";
import { CHAIN_LABELS, type Chain } from "@/lib/types";

const MAX_STORES = 10;

const StoreSchema = z.object({
  id: z.string(),
  chain: z.enum(Object.keys(CHAIN_LABELS) as [Chain, ...Chain[]]),
  chainStoreId: z.string().max(64),
  name: z.string().max(200),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  lat: z.number(),
  lng: z.number(),
  source: z.enum(["live", "sample"]),
});

const BodySchema = z.object({ stores: z.array(StoreSchema).max(MAX_STORES) });

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: `Send up to ${MAX_STORES} stores` }, { status: 400 });
  }
  const { data, notices } = await getOffers(body.data.stores);
  return NextResponse.json({ offers: tagOffers(data), notices });
}
