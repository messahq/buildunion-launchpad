
# PDF Megjelenítési Javítás a Quick Mode-ban

## Probléma
A feltöltött PDF fájlok nem jelennek meg helyesen a Quick Mode felületen. A rendszer minden fájlt `<img>` tagként próbál megjeleníteni, ami PDF-eknél törött képet eredményez.

## Megoldás

### 1. Fájltípus Felismerés Hozzáadása
A komponensben meg kell különböztetni a képeket és a PDF fájlokat:
- Új állapotváltozó: `isPdfFile` (boolean)
- A `handleImageSelect` függvényben beállítjuk a fájl típusa alapján

### 2. Feltételes Megjelenítés
A preview területen:
- **Ha PDF**: PDF ikon + fájlnév megjelenítése (a PDF thumbnail generálás bonyolult és nem szükséges)
- **Ha kép**: Eredeti `<img>` tag megtartása

### 3. Vizuális Visszajelzés PDF-nél
```text
+----------------------------------+
|  [PDF IKON]                      |
|                                  |
|  blueprint.pdf                   |
|  PDF Document Ready for Analysis |
|                           [X]    |
+----------------------------------+
```

## Érintett Fájl
- `src/components/quick-mode/QuickModePhotoEstimate.tsx`

## Változtatások Részletei

### Új State Változó
```typescript
const [isPdfFile, setIsPdfFile] = useState(false);
```

### Módosított handleImageSelect Függvény
- Ellenőrzi a `file.type === 'application/pdf'`
- Beállítja az `isPdfFile` értékét
- A fájl nevét is elmenti megjelenítéshez

### Módosított Preview Megjelenítés
Ha `isPdfFile === true`:
- FileText ikon (Lucide)
- Fájlnév megjelenítése
- "PDF Document - Ready for Analysis" szöveg

Ha `isPdfFile === false`:
- Eredeti `<img>` tag megmarad

## Tesztelési Lépések
1. Feltölteni egy PDF fájlt → PDF ikon és fájlnév jelenik meg
2. Feltölteni egy képet → Kép előnézet jelenik meg
3. "Get AI Estimate" gomb működik mindkét esetben
4. Törlés gomb mindkét típusnál működik
