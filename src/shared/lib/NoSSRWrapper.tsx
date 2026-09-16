"use client";
import React from "react";
export default function NoSSRWrapper({ children }: { children: React.ReactNode }) {
  return <React.Fragment>{children}</React.Fragment>;
}
