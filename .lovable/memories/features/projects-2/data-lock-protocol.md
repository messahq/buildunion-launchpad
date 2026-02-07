# Memory: features/projects-2/data-lock-protocol
Updated: 2026-02-07

A mentett pénzügyi tételek (baseQuantity, egység, egységár) védelmére a rendszer 'Data Lock' (állapot-zárolás) protokollt alkalmaz. Ez megakadályozza, hogy háttérfolyamatok módosítsák a rögzített alapadatokat ('No Ghost Changes'). 

## FONTOS MEGKÜLÖNBÖZTETÉS (2026-02-07 frissítés):

### ❌ Blokkolt műveletek (saved data esetén):
- `background_sync` - Automatikus szinkronizáció (pl. underlayment sync)
- `ai_inference` - AI-alapú következtetések
- `default_override` - Alapértelmezések felülírása

### ✅ Mindig engedélyezett műveletek:
- `display_calculation` - A frontend DISPLAY kalkulációk SOHA nincsenek blokkolva
- `user_edit` - Manuális szerkesztés (Owner/Foreman jogosultsággal)

## IRON LAW #1 DYNAMIC CALCULATION:
A `grossQuantity` és `totalPrice` MINDIG dinamikusan számolódik a mentett `baseQuantity`-ból:
- **grossQuantity** = baseQuantity × (1 + wastePercent/100)
- **totalPrice** = grossQuantity × unitPrice

Példa: baseQuantity=1350, waste=10%, unitPrice=$0.33
- grossQuantity = 1350 × 1.10 = 1485 sq ft
- totalPrice = 1485 × $0.33 = $490.05

## UI megjelenítés:
A Materials tab-on mindkét érték látható:
- NET (baseQuantity): Az eredeti/mentett mennyiség
- GROSS (quantity): A waste%-kal növelt mennyiség (ez kerül megrendelésre)

A zárolt adatok feloldása csak manuális szerkesztéssel lehetséges; a rendszerszintű változtatások (pl. adókulcs módosítása) pedig egy 'Impact Warning' dialógust váltanak ki a pénzügyi integritás megőrzése érdekében.
