import { NextResponse } from "next/server";
import { importProductsCsv } from "@/modules/catalog/actions";

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await importProductsCsv(formData);
  return NextResponse.json({ imported: true, result });
}
