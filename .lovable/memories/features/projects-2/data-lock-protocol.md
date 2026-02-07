# Memory: features/projects-2/data-lock-protocol
Updated: 2026-02-07

A mentett pénzügyi tételek (mennyiség, egység, egységár) védelmére a rendszer 'Data Lock' (állapot-zárolás) protokollt alkalmaz. Ez megakadályozza, hogy háttérfolyamatok, AI-következtetések vagy automatikus szinkronizációk módosítsák a rögzített adatokat ('No Ghost Changes'). 

## FONTOS MEGKÜLÖNBÖZTETÉS (2026-02-07 frissítés):

### ❌ Blokkolt műveletek (saved data esetén):
- `background_sync` - Automatikus szinkronizáció
- `ai_inference` - AI-alapú következtetések
- `default_override` - Alapértelmezések felülírása

### ✅ Mindig engedélyezett műveletek:
- `display_calculation` - A frontend DISPLAY kalkulációk SOHA nincsenek blokkolva
- `user_edit` - Manuális szerkesztés (Owner/Foreman jogosultsággal)

## OPERATIONAL TRUTH elv:
A `totalPrice` MINDIG dinamikusan számolódik: `quantity × unitPrice`. A mentett `savedTotalPrice` értéket NEM használjuk közvetlenül a megjelenítéshez, csak fallback-ként ha hiányzik a quantity/unitPrice.

Ez biztosítja, hogy:
1. A matematika mindig helyes a UI-on (pl. 1350 × $0.33 = $445.50)
2. Az Owner és Foreman nézetek konzisztensek
3. A 3 Vastörvény (Iron Laws) nem sérül

A zárolt adatok feloldása csak manuális szerkesztéssel lehetséges; a rendszerszintű változtatások (pl. adókulcs módosítása) pedig egy 'Impact Warning' dialógust váltanak ki a pénzügyi integritás megőrzése érdekében.
