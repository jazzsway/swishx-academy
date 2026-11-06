"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { scenario as getScenario } from "@/data/scenarios";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/patterns/academy";
import { CallScreen, type CallOutcome } from "@/features/roleplay/call-screen";
import { Scorecard } from "@/features/roleplay/scorecard";

/** AS-3 AC5: the trainer calls the scenario themselves and sees the scorecard. Nothing is saved. */
export function TestCall() {
  const search = useSearchParams();
  const sc = getScenario(search.get("scenario") ?? "sc-kim");
  const back = search.get("back") ?? "/trainer/courses/c-lumora-launch/questions";
  const [result, setResult] = useState<CallOutcome | null>(null);
  const [key, setKey] = useState(0);
  if (result)
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-5">
        <Link href={back} className="self-start text-body font-semibold text-ink-3">← Roleplay setup</Link>
        <Text as="h1" size="display-lg" weight="extrabold">Test call · {sc.title}</Text>
        <Card><Scorecard result={result} mode="assessment" /></Card>
        <Button className="self-start" onClick={() => { setResult(null); setKey(key + 1); }}>Call again</Button>
      </div>
    );
  return (
    <div className="mx-auto h-[min(820px,calc(100dvh-140px))] max-w-[460px] overflow-hidden rounded-card shadow-float">
      <CallScreen key={key} scenario={sc} mode="test" voiceAllowed onExit={() => history.back()} onComplete={setResult} />
    </div>
  );
}
