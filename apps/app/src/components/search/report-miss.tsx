"use client";

import type { SearchResponse } from "@workspace/shared";
import { useEffect } from "react";
import { reportMiss } from "@/lib/search";

/** Tells the crew, anonymously, if this search found nothing or little. Shows nothing. */
export function ReportMiss({ response }: { response: SearchResponse }) {
  useEffect(() => reportMiss(response), [response]);
  return null;
}
