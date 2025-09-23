import { useMemo, useState, useRef, useEffect } from "react";
import { SafeAreaView, StyleSheet, View, Pressable, Alert } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedSwitch } from "@/components/ThemedSwitch";
import { buildFirmwarePayload } from "@/libs/firmwareHelpers"; // ⬅️ se till att denna fil finns
import {useShooterApiContext} from "@/contexts/ShooterAPIContext";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/AppNavigation";


type Nav = NativeStackNavigationProp<RootStackParamList, "NewRoutineWizard">;

// --- Lokala UI-typer ---
type Segment = { start: number; end: number; on: boolean };
type OutputConfig = {
  id: number;
  label: string;
  enabled: boolean;
  segments: Segment[];
};
type RoutineDraft = {
  name: string;
  totalDuration: number;
  outputs: OutputConfig[];
};

// --- Hjälpare för UI-logik ---
const parseSeconds = (s: string) =>
  Math.max(0, Number(String(s).replace(",", ".")) || 0);
const initialSegments = (total: number): Segment[] =>
  total > 0 ? [{ start: 0, end: total, on: false }] : [];
const segmentsCoverTotal = (total: number, segs: Segment[]) => {
  if (total <= 0) return false;
  const sorted = [...segs].sort((a, b) => a.start - b.start);
  let t = 0;
  for (const s of sorted) {
    if (Math.abs(s.start - t) > 1e-6 || s.end <= s.start) return false;
    t = s.end;
  }
  return Math.abs(t - total) < 1e-6;
};

export default function NewRoutineWizardScreen() {
  const navigation = useNavigation<Nav>();
    const { programApi } = useShooterApiContext();
  const [enabled1, setEnabled1] = useState(false);
  const [enabled2, setEnabled2] = useState(false);
  const [enabled3, setEnabled3] = useState(false);
  const [enabled4, setEnabled4] = useState(false);

  const [name, setName] = useState("");
  const [totalStr, setTotalStr] = useState("");
  const total = parseSeconds(totalStr);

  const [step, setStep] = useState(0);

  const [draft, setDraft] = useState<RoutineDraft>({
    name: "",
    totalDuration: 0,
    outputs: [
      { id: 1, label: "Utgång 1", enabled: false, segments: [] },
      { id: 2, label: "Utgång 2", enabled: false, segments: [] },
      { id: 3, label: "Utgång 3", enabled: false, segments: [] },
      { id: 4, label: "Utgång 4", enabled: false, segments: [] },
    ],
  });

  // steps = [base, ...valda utgångar]
  const steps = useMemo(() => {
    const base = [{ type: "base" as const }];
    const outs = draft.outputs
      .filter((o) => o.enabled)
      .map((o) => ({ type: "output" as const, id: o.id }));
    return [...base, ...outs];
  }, [draft.outputs]);

  const canGoNextBase = name.trim().length > 0 && total > 0;

  const onToggleOutput = (idx: number, val: boolean) => {
    setDraft((d) => {
      const copy = { ...d, outputs: d.outputs.map((o) => ({ ...o })) };
      copy.outputs[idx].enabled = val;
      if (
        val &&
        copy.totalDuration > 0 &&
        copy.outputs[idx].segments.length === 0
      ) {
        copy.outputs[idx].segments = initialSegments(copy.totalDuration);
      }
      return copy;
    });
  };

  // ref som OutputStep skriver in sina nuvarande segment i
  const currentSegsRef = useRef<Segment[] | null>(null);

  const goNext = () => {
    const currentLocal = steps[step];
    if (currentLocal.type === "base") {
      if (!canGoNextBase) return;
      setDraft((d) => {
        const copy = {
          ...d,
          name: name.trim(),
          totalDuration: total,
          outputs: d.outputs.map((o) => ({ ...o })),
        };
        copy.outputs.forEach((o) => {
          if (o.enabled && o.segments.length === 0)
            o.segments = initialSegments(total);
          if (o.enabled && !segmentsCoverTotal(total, o.segments))
            o.segments = initialSegments(total);
        });
        return copy;
      });
    } else {
      const outId = (currentLocal as any).id;
      const segs = currentSegsRef.current ?? [];
      if (!segmentsCoverTotal(draft.totalDuration, segs)) return;
      setDraft((d) => {
        const copy = { ...d, outputs: d.outputs.map((o) => ({ ...o })) };
        const idx = copy.outputs.findIndex((o) => o.id === outId);
        if (idx !== -1) copy.outputs[idx].segments = segs;
        return copy;
      });
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => {
    const currentLocal = steps[step];
    if (currentLocal.type === "output") {
      const outId = (currentLocal as any).id;
      const segs = currentSegsRef.current ?? [];
      setDraft((d) => {
        if (!segmentsCoverTotal(d.totalDuration, segs)) return d;
        const copy = { ...d, outputs: d.outputs.map((o) => ({ ...o })) };
        const idx = copy.outputs.findIndex((o) => o.id === outId);
        if (idx !== -1) copy.outputs[idx].segments = segs;
        return copy;
      });
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const SaveButton = ({
    onPress,
    label,
  }: {
    onPress: () => void;
    label: string;
  }) => (
    <Pressable onPress={onPress} style={styles.button}>
      <ThemedText type="defaultSemiBold" style={{ textAlign: "center" }}>
        {label}
      </ThemedText>
    </Pressable>
  );

  function OutputStep({
    out,
    onCommit,
  }: {
    out: OutputConfig;
    onCommit: (segs: Segment[]) => void;
  }) {
    const [localSegs, setLocalSegs] = useState<Segment[]>(() => [
      ...out.segments,
    ]);
    const [splitAt, setSplitAt] = useState("");

    // resync om utgångens segment ändras utifrån (t.ex. total ändrad)
    useEffect(() => {
      setLocalSegs([...out.segments]);
    }, [out.segments]);

    const sortedSegs = useMemo(
      () => [...localSegs].sort((a, b) => a.start - b.start),
      [localSegs]
    );

    const setOnValue = (idx: number, val: boolean) => {
      setLocalSegs((prev) => {
        const segs = [...prev].sort((a, b) => a.start - b.start);
        segs[idx] = { ...segs[idx], on: val };
        return segs;
      });
    };

    const resetToSingle = () => {
      setLocalSegs(initialSegments(draft.totalDuration));
    };

    const addSplitAt = (t: number) => {
      if (!(t > 0 && t < draft.totalDuration)) return;
      setLocalSegs((prev) => {
        const segs = [...prev].sort((a, b) => a.start - b.start);
        const i = segs.findIndex((s) => t > s.start && t < s.end);
        if (i === -1) return segs; // inget segment hittat
        const s = segs[i];
        return [
          ...segs.slice(0, i),
          { start: s.start, end: t, on: s.on },
          { start: t, end: s.end, on: s.on },
          ...segs.slice(i + 1),
        ];
      });
    };

    // låt parent “se” de aktuella segmenten och kunna committa på “Nästa”/"Slutför"
    useEffect(() => {
      onCommit(sortedSegs);
    }, [sortedSegs, onCommit]);

    const valid = segmentsCoverTotal(draft.totalDuration, sortedSegs);

    return (
      <ThemedView style={{ gap: 16 }}>
        <ThemedText type="subtitle">{out.label}</ThemedText>
        <ThemedText>Totalt: {draft.totalDuration.toFixed(2)} s</ThemedText>

        {/* Lista över segment */}
        <View style={{ gap: 8 }}>
          {sortedSegs.map((s, i) => (
            <ThemedView
              key={`${s.start}-${s.end}-${i}`}
              style={styles.segmentRow}
            >
              <ThemedText style={{ width: 140 }}>
                {s.start.toFixed(2)}s → {s.end.toFixed(2)}s
              </ThemedText>
              <ThemedText style={{ marginRight: 8 }}>
                {s.on ? "På" : "Av"}
              </ThemedText>
              <ThemedSwitch
                value={s.on}
                onValueChange={(v) => setOnValue(i, v)}
              />
            </ThemedView>
          ))}
        </View>

        {/* Snabbkontroller: dela vid tidpunkt */}
        <ThemedView style={{ flexDirection: "row", gap: 8 }}>
          <ThemedInput
            variant="outline"
            placeholder="Dela vid s (t.ex. 3.5)"
            inputMode="decimal"
            value={splitAt}
            onChangeText={setSplitAt}
            onSubmitEditing={(e) => {
              const t = parseSeconds(e.nativeEvent.text);
              if (t > 0 && t < draft.totalDuration) addSplitAt(t);
              setSplitAt(""); // 👈 rensa efter submit
            }}
            blurOnSubmit={false}
            style={{ flex: 1 }}
          />
          <Pressable style={styles.smallBtn} onPress={resetToSingle}>
            <ThemedText style={styles.smallBtnText}>Reset</ThemedText>
          </Pressable>
        </ThemedView>

        {!valid && (
          <ThemedText type="defaultSemiBold" style={{ color: "#D92D20" }}>
            Segmenten måste täcka hela {draft.totalDuration.toFixed(2)} sekunder
            utan glapp/överlapp.
          </ThemedText>
        )}
      </ThemedView>
    );
  }

  const finalize = () => {
    const currentLocal = steps[step];

    // Bygg en kopia som vi kan uppdatera deterministiskt
    let finalDraft: RoutineDraft = {
      ...draft,
      outputs: draft.outputs.map((o) => ({ ...o })),
    };

    // Om vi är på ett output-steg: committa de senaste segmenten
    if (currentLocal.type === "output") {
      const outId = (currentLocal as any).id;
      const segs = currentSegsRef.current ?? [];
      if (!segmentsCoverTotal(finalDraft.totalDuration, segs)) {
        console.warn("Segmenten täcker inte totalen – avbryter Slutför.");
        return;
      }
      const idx = finalDraft.outputs.findIndex((o) => o.id === outId);
      if (idx !== -1) finalDraft.outputs[idx].segments = segs;
    }

    // Bygg firmware-payload och visa/posta
    const payload = buildFirmwarePayload(finalDraft);
    console.log("Spara:", JSON.stringify(payload));

    programApi
      .createOrUpdate(payload)
      .then((res) => {
        console.log("save res", res);
        Alert.alert("Rutin sparad", undefined, 
          [
            {
              text: 'Ok',
              onPress: () => navigation.navigate("RoutineList")
            }
          ])
      })
      .catch((err) => console.warn("Error saving program", err));
    // Exempel-POST (avkommentera när du vill testa mot ESP:n)
    // fetch("http://192.168.4.1/save", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // })
    //   .then(r => r.json())
    //   .then(res => console.log("ESP svar:", res))
    //   .catch(err => console.warn("POST misslyckades:", err));

    setDraft(finalDraft); // håll state i synk om du navigerar vidare
  };

  const current = steps[step];
  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={{ textAlign: "center" }}>
          Ny rutin
        </ThemedText>

        {current.type === "base" && (
          <ThemedView style={{ gap: 16 }}>
            {/* Namn */}
            <ThemedView style={styles.row}>
              <ThemedText type="subtitle" style={{ flex: 1 }}>
                Namn
              </ThemedText>
              <ThemedInput
                variant="outline"
                style={{ flex: 1 }}
                value={name}
                onChangeText={setName}
                placeholder="A-Vapen"
              />
            </ThemedView>

            {/* Skjuttid */}
            <ThemedView style={styles.row}>
              <ThemedText type="subtitle" style={{ flex: 1 }}>
                Skjuttid
              </ThemedText>
              <ThemedInput
                variant="outline"
                style={{ flex: 1 }}
                inputMode="decimal"
                value={totalStr}
                onChangeText={setTotalStr}
                placeholder="10.2"
              />
            </ThemedView>

            {/* Utgångar */}
            <ThemedText type="subtitle">Utgångar</ThemedText>
            {[1, 2, 3, 4].map((i) => (
              <ThemedView key={i} style={styles.toggleRow}>
                <ThemedText type="defaultSemiBold">{`Utgång ${i}`}</ThemedText>
                <ThemedSwitch
                  value={[enabled1, enabled2, enabled3, enabled4][i - 1]}
                  onValueChange={(v) => {
                    [setEnabled1, setEnabled2, setEnabled3, setEnabled4][i - 1](
                      v
                    );
                    onToggleOutput(i - 1, v);
                  }}
                />
              </ThemedView>
            ))}
          </ThemedView>
        )}

        {current.type === "output" && (
          <OutputStep
            key={(current as any).id}
            out={draft.outputs.find((o) => o.id === (current as any).id)!}
            onCommit={(segs) => {
              // håll ref:en uppdaterad; commit sker i goNext/finalize
              currentSegsRef.current = segs;
            }}
          />
        )}

        <View style={styles.navRow}>
          <SaveButton onPress={goBack} label="Tillbaka" />
          {step < steps.length - 1 ? (
            <SaveButton onPress={goNext} label="Nästa" />
          ) : (
            <SaveButton onPress={finalize} label="Slutför" />
          )}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleContainer: {
    flex: 1,
    alignItems: "stretch",
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
  },
  row: { flexDirection: "row", gap: 12, width: "100%", alignItems: "center" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentRow: { flexDirection: "row", alignItems: "center" },
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: { textAlign: "center" },
});
