"use client";

import dynamic from "next/dynamic";

export const ClientOnly = dynamic(() => import("./NoSSRWrapper"), { 
  ssr: false 
});
