"use client";

import React, { createContext, useContext } from "react";

interface HomeroomContextValue {
  isHomeroomTeacher: boolean;
}

const HomeroomContext = createContext<HomeroomContextValue>({
  isHomeroomTeacher: false,
});

export function useHomeroom() {
  return useContext(HomeroomContext);
}

export function HomeroomProvider({
  children,
  isHomeroomTeacher,
}: {
  children: React.ReactNode;
  isHomeroomTeacher: boolean;
}) {
  return (
    <HomeroomContext.Provider value={{ isHomeroomTeacher }}>
      {children}
    </HomeroomContext.Provider>
  );
}
