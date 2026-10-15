"use client";

import * as React from "react";

export function ReportDate({ className }: { className?: string }) {
  const [date, setDate] = React.useState<string>("");

  React.useEffect(() => {
    setDate(new Date().toLocaleDateString("pt-BR"));
  }, []);

  return <span className={className}>{date}</span>;
}