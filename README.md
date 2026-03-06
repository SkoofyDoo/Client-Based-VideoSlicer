# VideoSlicer – React-Komponente zur Frame-Extraktion

Ein React-Komponente zur automatischen Extraktion von Einzelbildern (Frames) aus Videodateien – vollständig im Browser, ohne Backend oder externe Bibliotheken.

---

## Funktionsweise

Die Komponente lädt eine Videodatei über die native HTML5-`<video>`-API, springt sequenziell durch den Zeitstrahl und zeichnet jeden Frame auf ein virtuelles `<canvas>`-Element. Das Ergebnis wird als JPEG-Blob im Speicher gehalten und per `URL.createObjectURL()` als temporäre URL bereitgestellt.

Der gesamte Prozess läuft clientseitig – keine Uploads, keine Serverkosten.

---

## Features

- Frame-Extraktion direkt im Browser via Canvas API
- Konfigurierbare maximale Frame-Anzahl je nach Auswahltyp (`CID`, `CIDface`, `CID1rot` usw.)
- Fortschrittsanzeige in Echtzeit
- Timeout-Handling bei hängenden Seek-Operationen (15 Sekunden)
- Automatische Skalierung – konfigurierbare Ausgabebreite (Standard: 1024px)
- Speicherbereinigung via `URL.revokeObjectURL()` beim Unmount
- Konfigurierbare Frame-Qualität & Dateigrößenlimit: (Standard: FRAME_QUALITY:0.5 & MAX_FILE_SIZE: 500 MB)
- Kompatibel mit mobilen Browsern wie Safari usw. (touch-optimiert via `touchAction: 'manipulation'`)

---

## Technischer Stack

- React (Hooks: `useState`, `useEffect`, `useRef`)
- Canvas API (`drawImage`, `toBlob`)
- HTML5 Video API (`currentTime`, `onseeked`)
- i18next für Lokalisierung

---

## Verwendung

```jsx
<VideoSlicer
  videoFile={file}               // File-Objekt
  selection="CIDface"            // bestimmt max. Frame-Anzahl
  onSlicingComplete={(frames) => console.log(frames)}
  onDownloadComplete={() => console.log('fertig')}
  onError={(err) => console.error(err)}
  onCancel={() => console.log('abgebrochen')}
/>
```

### Props

| Prop | Typ | Beschreibung |
|---|---|---|
| `videoFile` | `File` | Die zu verarbeitende Videodatei |
| `selection` | `string` | Bestimmt die maximale Frame-Anzahl |
| `onSlicingComplete` | `function` | Callback mit Array der extrahierten Frames |
| `onDownloadComplete` | `function` | Wird nach Abschluss aufgerufen |
| `onError` | `function` | Fehler-Callback |
| `onCancel` | `function` | Wird beim Unmount aufgerufen |

### Frame-Objekt

```js
{
  url: "blob:https://...",  // temporäre Object-URL
  blob: Blob,               // JPEG-Blob
  index: 1                  // fortlaufende Nummer
}
```

---

## Frame-Konfiguration

| Selection | Max. Frames |
|---|---|
| `CID` | 200 |
| `CIDface` | 200 |
| `CIDhand` | 100 |
| `CIDarm` | 100 |
| `CIDtorso` | 100 |
| `CIDleg` | 100 |
| `CIDfoot` | 200 |
| `CID1rot` | 100 |
| `CID2rot` | 200 |
| `CID3rot` | 300 |

---

## Technische Entscheidungen

**Warum `onseeked` statt `ontimeupdate`?**  
`ontimeupdate` feuert während der Wiedergabe in unregelmäßigen Abständen. `onseeked` garantiert, dass der Frame vollständig dekodiert ist, bevor er auf das Canvas gezeichnet wird – wichtig für Bildqualität und Konsistenz.

**Warum `toBlob` statt `toDataURL`?**  
`toBlob` ist asynchron und speichereffizienter bei vielen Frames. `toDataURL` erzeugt große Base64-Strings, die den Hauptthread blockieren können.

**Warum virtuelles Canvas (kein DOM)?**  
Das Canvas-Element wird nie in den DOM eingehängt – es existiert nur im Speicher. Das vermeidet unnötige Reflows und hält die Komponente performant.

**Warum kein ffmpeg-wasm?**  
ffmpeg-wasm wäre eine naheliegende Alternative, bringt aber erhebliche Nachteile mit sich: Die WASM-Binary ist ca. 30 MB groß, erfordert `SharedArrayBuffer` (und damit spezielle HTTP-Header: `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`), was viele Hosting-Umgebungen nicht unterstützen. Die native Canvas+Video-API des Browsers reicht für Frame-Extraktion vollständig aus – ohne zusätzliche Abhängigkeiten, ohne Ladezeit, ohne Konfigurationsaufwand.  
Das Canvas-Element wird nie in den DOM eingehängt – es existiert nur im Speicher. Das vermeidet unnötige Reflows und hält die Komponente performant.

---

## Entwickelt während der Ausbildung

Diese Komponente entstand im Rahmen meiner Ausbildung zum Fachinformatiker für Anwendungsentwicklung (ab Januar 2026) als Teil eines produktiv eingesetzten Projekts.
