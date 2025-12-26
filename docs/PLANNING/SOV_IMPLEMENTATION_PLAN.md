# 📊 Share of Voice (SoV) Implementation Plan

## Översikt
Detta dokument beskriver steg-för-steg planen för att implementera Share of Voice (SoV) analys i Geoffrey.ai systemet.

---

## 🎯 Mål

### Primära Mål
1. **Beräkna SoV korrekt**: Brand mentions vs competitor mentions
2. **Visa SoV som nyckeltal**: Tydlig visualisering i dashboard
3. **Förklara SoV**: Användarvänliga förklaringar om beräkning och betydelse
4. **Spåra SoV över tid**: Historisk data och trender

### Success Criteria
- SoV beräknas korrekt baserat på faktiska mentions
- SoV visas tydligt i resultat och dashboard
- Användare förstår vad SoV betyder och varför det är viktigt
- SoV kan jämföras över tid

---

## 📐 SoV Beräkningsmetodik

### Definition
**Share of Voice (SoV)** = (Brand Mentions / Total Mentions) × 100%

Där:
- **Brand Mentions** = Antal gånger brand nämns i AI-svar
- **Total Mentions** = Brand Mentions + Alla Competitor Mentions
- **Resultat** = Procentuell andel av totala mentions

### Beräkningssteg

**Steg 1: Räkna Brand Mentions**
- För varje prompt: Räkna om brand nämns (med multiple runs)
- Använd mention rate från aggregated results
- Summa över alla prompts

**Steg 2: Räkna Competitor Mentions**
- För varje prompt: Identifiera vilka competitors som nämns
- Räkna mentions per competitor
- Summa totala competitor mentions

**Steg 3: Beräkna Total Mentions**
- Total Mentions = Brand Mentions + Summa av alla Competitor Mentions

**Steg 4: Beräkna SoV**
- SoV = (Brand Mentions / Total Mentions) × 100
- Om Total Mentions = 0, SoV = 0% (ingen data)

### Exempel

**Scenario:**
- 10 prompts testade
- Brand nämns i 6 prompts (60% mention rate)
- Competitor A nämns i 8 prompts (80% mention rate)
- Competitor B nämns i 4 prompts (40% mention rate)
- Competitor C nämns i 2 prompts (20% mention rate)

**Beräkning:**
- Brand Mentions = 6
- Competitor Mentions = 8 + 4 + 2 = 14
- Total Mentions = 6 + 14 = 20
- **SoV = (6 / 20) × 100 = 30%**

---

## 🏗️ Implementation Steg

### Steg 1: Förbättra SoV Beräkning (Backend)
**Status**: 🔄 Delvis implementerat, behöver förbättras

**Uppgifter:**
- [ ] Förbättra competitor mention detection
- [ ] Hantera edge cases (inga mentions, bara brand, etc.)
- [ ] Lägg till validering av SoV beräkningar
- [ ] Testa med olika scenarion

**Filer att ändra:**
- `src/index.ts` - Förbättra `detectCompetitorMentions()` och SoV beräkning
- `src/types.ts` - Lägg till SoV-specifika typer

**Tidsåtgång**: 2-3 timmar

---

### Steg 2: Lägg till SoV Metadata
**Status**: 📋 Ny funktion

**Uppgifter:**
- [ ] Lägg till detaljerad SoV metadata i AnalysisResult
- [ ] Inkludera:
  - SoV procent
  - Brand mention count
  - Total mention count
  - Competitor breakdown
  - SoV trend (om historisk data finns)

**Filer att ändra:**
- `src/types.ts` - Utöka ShareOfVoice interface
- `src/index.ts` - Lägg till metadata i beräkning

**Tidsåtgång**: 1-2 timmar

---

### Steg 3: SoV Visualisering i Results
**Status**: 🔄 Delvis implementerat, behöver förbättras

**Uppgifter:**
- [ ] Förbättra SoV-sektion i Results-komponenten
- [ ] Lägg till SoV som huvudnyckeltal (stor, prominent)
- [ ] Visa SoV jämfört med competitors
- [ ] Lägg till visuell indikator (progress bar, gauge, etc.)

**Filer att ändra:**
- `frontend/src/components/Results.tsx` - Förbättra SoV-visualisering

**Tidsåtgång**: 2-3 timmar

---

### Steg 4: SoV i Dashboard
**Status**: 📋 Ny funktion

**Uppgifter:**
- [ ] Visa SoV i dashboard overview
- [ ] Lägg till SoV-kort med trend
- [ ] Visa SoV jämfört med tidigare scans
- [ ] Lägg till SoV i scan history

**Filer att ändra:**
- `frontend/src/pages/dashboard/Overview.tsx` - Lägg till SoV-kort
- `frontend/src/pages/dashboard/NewScan.tsx` - Spara SoV i databas

**Tidsåtgång**: 2-3 timmar

---

### Steg 5: SoV Förklaringar & Help Text
**Status**: 📋 Ny funktion

**Uppgifter:**
- [ ] Skapa SoV förklaringskomponent
- [ ] Förklara hur SoV beräknas
- [ ] Förklara varför SoV är viktigt
- [ ] Lägg till tooltips och help icons
- [ ] Skapa FAQ om SoV

**Filer att skapa/ändra:**
- `frontend/src/components/SovExplanation.tsx` - Ny komponent
- `frontend/src/components/Results.tsx` - Integrera förklaringar
- `frontend/src/pages/dashboard/Overview.tsx` - Lägg till help text

**Tidsåtgång**: 2-3 timmar

---

### Steg 6: SoV Trend Tracking
**Status**: 📋 Ny funktion

**Uppgifter:**
- [ ] Spara SoV i databas per scan
- [ ] Hämta historisk SoV data
- [ ] Visa SoV trend över tid (graf)
- [ ] Identifiera SoV förändringar (alerts)

**Filer att ändra:**
- `schema/migrations.sql` - Lägg till SoV kolumn i scans tabell
- `frontend/src/pages/dashboard/Overview.tsx` - Visa trend
- `src/server.ts` - Spara SoV i databas

**Tidsåtgång**: 3-4 timmar

---

### Steg 7: SoV Benchmarking
**Status**: 📋 Framtida funktion

**Uppgifter:**
- [ ] Jämför SoV med industry benchmarks
- [ ] Visa om SoV är bra/dålig relativt bransch
- [ ] Föreslå SoV mål

**Tidsåtgång**: 4-5 timmar (framtida)

---

## 📊 SoV Beräkningslogik (Detaljerad)

### Nuvarande Implementation
```typescript
// I src/index.ts - detectCompetitorMentions()
// Detekterar competitors i answer text
// Men behöver förbättras för mer exakt räkning
```

### Förbättrad Implementation

**1. Brand Mention Counting:**
```typescript
function countBrandMentions(results: PromptResult[]): number {
  let brandMentions = 0;
  
  for (const result of results) {
    const aggregated = result.aggregatedResult;
    if (aggregated && aggregated.mentionRate >= 0.5) {
      brandMentions += 1; // Counted as mentioned
    } else if (result.judgeResult.isMentioned) {
      brandMentions += 1;
    }
  }
  
  return brandMentions;
}
```

**2. Competitor Mention Counting:**
```typescript
function countCompetitorMentions(
  results: PromptResult[],
  competitors: string[],
  brandName: string
): Map<string, number> {
  const competitorCounts = new Map<string, number>();
  
  for (const competitor of competitors) {
    competitorCounts.set(competitor, 0);
  }
  
  for (const result of results) {
    const detections = detectCompetitorMentions(
      result.responderAnswer,
      competitors,
      brandName
    );
    
    for (const detection of detections) {
      if (detection.mentioned) {
        const current = competitorCounts.get(detection.competitor) || 0;
        competitorCounts.set(detection.competitor, current + 1);
      }
    }
  }
  
  return competitorCounts;
}
```

**3. SoV Calculation:**
```typescript
function calculateShareOfVoice(
  brandMentions: number,
  competitorMentions: Map<string, number>
): number {
  const totalCompetitorMentions = Array.from(competitorMentions.values())
    .reduce((sum, count) => sum + count, 0);
  
  const totalMentions = brandMentions + totalCompetitorMentions;
  
  if (totalMentions === 0) {
    return 0; // No mentions at all
  }
  
  return (brandMentions / totalMentions) * 100;
}
```

---

## 🎨 UI/UX Design

### SoV som Nyckeltal

**Placering:**
1. **Results Page**: Stor SoV-visualisering efter huvudscore
2. **Dashboard**: SoV-kort med trend
3. **Scan History**: SoV per scan

**Visualisering:**
- Stor procentuell siffra (t.ex. "35%")
- Progress bar som visar SoV vs competitors
- Färgkodning:
  - Grön: >50% (dominant)
  - Gul: 25-50% (bra)
  - Röd: <25% (lägre än genomsnitt)

**Komponenter:**
- SoV Gauge/Donut Chart
- SoV Progress Bar
- SoV Trend Graph
- SoV Comparison Table

---

## 📝 Förklaringar & Help Text

### SoV Förklaring (Text)

**Vad är Share of Voice?**
Share of Voice (SoV) mäter din brands andel av alla mentions i AI-svar jämfört med dina konkurrenter. Om din brand nämns 3 gånger och konkurrenter nämns 7 gånger totalt, är din SoV 30% (3 av 10 totala mentions).

**Hur beräknas SoV?**
1. Vi räknar antal gånger din brand nämns i AI-svar
2. Vi räknar antal gånger varje konkurrent nämns
3. Vi beräknar totala mentions (brand + alla competitors)
4. SoV = (Brand Mentions / Total Mentions) × 100%

**Varför är SoV viktigt?**
- **Marknadsposition**: Visar din position relativt konkurrenter
- **Synlighet**: Högre SoV = mer synlig i AI-svar
- **Konkurrenskraft**: Identifiera var konkurrenter vinner
- **Mätbarhet**: Konkret siffra att förbättra över tid

**Vad är en bra SoV?**
- **>50%**: Utmärkt - du dominerar marknaden
- **25-50%**: Bra - du är väl representerad
- **<25%**: Förbättringspotential - konkurrenter är mer synliga

---

## 🗄️ Databas Schema

### Uppdateringar

**scans tabell:**
```sql
ALTER TABLE scans ADD COLUMN IF NOT EXISTS share_of_voice DECIMAL(5,2);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS brand_mentions INTEGER;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS total_mentions INTEGER;
```

**Ny tabell för SoV trends:**
```sql
CREATE TABLE IF NOT EXISTS sov_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  share_of_voice DECIMAL(5,2) NOT NULL,
  brand_mentions INTEGER NOT NULL,
  total_mentions INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## ✅ Test Scenarion

### Test Case 1: Basic SoV
- Brand: 5 mentions
- Competitor A: 3 mentions
- Competitor B: 2 mentions
- **Expected SoV**: 50% (5/10)

### Test Case 2: No Competitors
- Brand: 5 mentions
- No competitors provided
- **Expected SoV**: 100% (eller N/A om inga competitors)

### Test Case 3: Brand Not Mentioned
- Brand: 0 mentions
- Competitor A: 5 mentions
- **Expected SoV**: 0% (0/5)

### Test Case 4: Multiple Runs
- Brand: Mentioned in 6/10 prompts (60% mention rate)
- Competitor A: Mentioned in 8/10 prompts (80% mention rate)
- **Expected SoV**: 42.9% (6/14)

---

## 📅 Implementation Timeline

### Vecka 1: Core SoV
- [x] Steg 1: Förbättra SoV beräkning
- [ ] Steg 2: Lägg till SoV metadata
- [ ] Steg 3: SoV visualisering i Results

### Vecka 2: Dashboard & Förklaringar
- [ ] Steg 4: SoV i Dashboard
- [ ] Steg 5: SoV förklaringar
- [ ] Steg 6: SoV trend tracking

### Vecka 3: Polish & Testing
- [ ] Testing av alla scenarion
- [ ] UI/UX förbättringar
- [ ] Dokumentation

---

## 🎯 Success Metrics

### Tekniska Metrics
- SoV beräknas korrekt i 100% av test cases
- SoV visas korrekt i UI
- SoV sparas korrekt i databas

### Användar Metrics
- Användare förstår vad SoV betyder (80%+)
- Användare anser SoV är värdefullt (70%+)
- SoV används för att fatta beslut (60%+)

---

**Senast uppdaterad**: 2025-01-XX
**Status**: Planering & Implementation

