# 🎯 Competitor Detection Strategy - Geoffrey.ai

## Overview
This document outlines a comprehensive plan for AI-powered competitor detection. The goal is to automatically identify relevant competitors that users can then review, edit, and refine before analysis.

---

## 🎯 Detection Objectives

### Primary Goals
1. **Identify Direct Competitors**: Same industry, same region, similar services
2. **Identify Indirect Competitors**: Different approach but serve same customer needs
3. **Identify Market Leaders**: Well-known brands customers might compare against
4. **Prioritize by Relevance**: Most relevant competitors first

### Success Criteria
- 5-10 relevant competitors per business
- Mix of direct (60-70%) and indirect (30-40%) competitors
- Include both local and national/international brands
- Avoid false positives (unrelated businesses)

---

## 📊 Multi-Source Detection Strategy

### Phase 1: Content-Based Detection (Current Implementation)
**Status**: ✅ Implemented in Pass 5/5

**Approach**:
- Analyze website content for competitor mentions
- Extract industry keywords and service categories
- Use LLM to infer competitors from business description

**Strengths**:
- Fast and cost-effective
- Works with just website URL
- Can identify competitors mentioned on the site

**Limitations**:
- May miss competitors not mentioned on site
- Limited to what's on the website
- May include outdated information

**Enhancement Ideas**:
- Extract competitor mentions from blog posts, case studies, "vs" pages
- Analyze FAQ sections for comparison questions
- Look for "alternatives to" or "competitors" content

---

### Phase 2: Industry & Market Intelligence (Recommended Next Step)
**Status**: 🔄 To Implement

**Approach**:
Use LLM's knowledge base to identify competitors based on:
- Industry classification (NAICS/SIC codes)
- Geographic market (city, region, country)
- Service/product categories
- Target customer segments

**Implementation**:
```typescript
// Pseudo-code
const industryPrompt = `
Based on this business profile:
- Industry: ${industry}
- Location: ${region}
- Services: ${services.join(", ")}
- Target Market: ${targetAudience}

Identify 8-12 competitors:
1. Direct competitors (same services, same region)
2. Indirect competitors (different approach, same need)
3. Market leaders (well-known brands in this space)
4. Emerging competitors (newer players)

Return JSON with:
- Company name
- Type (direct/indirect/leader/emerging)
- Why they're a competitor
- Confidence score (0-1)
`;
```

**Data Sources**:
- LLM's training data (general knowledge)
- Industry databases (if accessible)
- Business directories knowledge

**Strengths**:
- Leverages LLM's broad knowledge
- Can identify well-known brands
- Understands market context

**Limitations**:
- May include outdated information
- Might miss very local/small competitors
- Knowledge cutoff date limitations

---

### Phase 3: Geographic & Local Search (High Value)
**Status**: 📋 Future Enhancement

**Approach**:
For local businesses, identify competitors in the same geographic area:
- Same city/region
- Similar service radius
- Local market leaders

**Implementation Strategy**:
1. **Geographic Expansion**:
   - Extract location from business data
   - Identify competitors in same city/region
   - Consider service area (local vs. national)

2. **Local Business Directories**:
   - Google Business Profile competitors
   - Yelp similar businesses
   - Industry-specific directories

3. **Search-Based Discovery**:
   - Query: "[Service] in [City]"
   - Query: "Best [Service] [City]"
   - Query: "[Business Type] near [Location]"

**API Integration Options**:
- Google Places API (if budget allows)
- Yelp Fusion API
- Foursquare Places API
- SerpApi for local search results

**Strengths**:
- Highly relevant for local businesses
- Finds actual competitors in market
- Real-time data

**Limitations**:
- Requires API access (costs)
- May miss online-only competitors
- Geographic data quality varies

---

### Phase 4: Semantic Similarity & Market Positioning
**Status**: 📋 Future Enhancement

**Approach**:
Use embeddings/semantic search to find businesses with:
- Similar value propositions
- Similar target audiences
- Similar pricing models
- Similar brand positioning

**Implementation Strategy**:
1. **Embedding-Based Search**:
   - Generate embeddings for business description
   - Find similar businesses in embedding space
   - Use vector databases (Pinecone, Weaviate, etc.)

2. **Market Positioning Analysis**:
   - Analyze brand positioning keywords
   - Find businesses with similar positioning
   - Identify competitive differentiators

3. **Customer Journey Overlap**:
   - Businesses customers consider at same stage
   - Alternative solutions to same problem
   - Substitute products/services

**Strengths**:
- Finds indirect competitors effectively
- Understands market positioning
- Can identify emerging competitors

**Limitations**:
- Requires embedding infrastructure
- More complex to implement
- May include less relevant matches

---

### Phase 5: Online Presence & SEO Overlap
**Status**: 📋 Future Enhancement

**Approach**:
Identify competitors based on:
- Similar SEO keywords
- Similar content topics
- Overlapping search rankings
- Similar social media presence

**Implementation Strategy**:
1. **Keyword Overlap**:
   - Extract target keywords from website
   - Find businesses ranking for same keywords
   - Use SEO tools APIs (Ahrefs, SEMrush - if available)

2. **Content Similarity**:
   - Analyze blog topics and content themes
   - Find businesses writing about similar topics
   - Identify thought leadership competitors

3. **Social Media Analysis**:
   - Find businesses with similar audiences
   - Identify businesses mentioned together
   - Analyze follower overlap

**Strengths**:
- Finds digital competitors
- Identifies content competitors
- SEO-focused insights

**Limitations**:
- Requires SEO tool APIs (costs)
- May miss offline competitors
- Data access limitations

---

## 🔄 Multi-Pass Detection Algorithm

### Recommended Approach: Hybrid Multi-Pass

**Pass 1: Content Analysis** (Current)
- Extract competitor mentions from website
- Analyze business description for industry/service keywords
- Use LLM to infer competitors from context

**Pass 2: Industry Intelligence** (Next to implement)
- Use LLM knowledge to identify market players
- Query: "Top [Industry] companies in [Region]"
- Query: "Competitors to [Business Type] in [Location]"
- Query: "Alternatives to [Service]"

**Pass 3: Validation & Ranking** (Important)
- Cross-reference findings from multiple passes
- Rank by relevance score
- Remove duplicates
- Filter out false positives

**Pass 4: Enrichment** (Optional)
- Add competitor metadata (website, location, size)
- Categorize by type (direct/indirect/leader)
- Add confidence scores

---

## 🎯 Implementation Priority

### MVP (Current)
✅ **Pass 1: Content-Based Detection**
- Already implemented
- Works with just website URL
- Good starting point

### Phase 1 (Recommended Next)
🔄 **Enhanced LLM-Based Detection**
- Expand prompts to query LLM knowledge
- Multiple query variations
- Better industry/market understanding
- **Effort**: 2-3 days
- **Impact**: High

### Phase 2 (Future)
📋 **Geographic & Local Search**
- Integrate with Google Places API or similar
- Local competitor discovery
- **Effort**: 1 week
- **Impact**: High for local businesses

### Phase 3 (Future)
📋 **Semantic Similarity**
- Embedding-based competitor discovery
- Market positioning analysis
- **Effort**: 1-2 weeks
- **Impact**: Medium-High

### Phase 4 (Future)
📋 **SEO & Online Presence**
- Keyword overlap analysis
- Content similarity
- **Effort**: 1 week
- **Impact**: Medium

---

## 🧠 Enhanced LLM Detection Strategy (Recommended Next Step)

### Query Variations

**1. Industry-Based Queries**:
```
"What are the top [Industry] companies in [Region]?"
"Who are the main competitors in [Industry] market?"
"List [Industry] businesses in [City/Region]"
```

**2. Service-Based Queries**:
```
"Companies that offer [Service] in [Location]"
"Alternatives to [Service] providers"
"Best [Service] companies for [Target Audience]"
```

**3. Market Position Queries**:
```
"Market leaders in [Industry]"
"Emerging competitors in [Industry]"
"Established players vs new entrants in [Industry]"
```

**4. Comparative Queries**:
```
"Businesses similar to [Business Type]"
"Companies competing with [Business Model]"
"[Industry] companies targeting [Customer Segment]"
```

### Multi-Query Aggregation

**Strategy**:
1. Run 4-6 different query variations
2. Extract competitor names from each response
3. Aggregate and deduplicate
4. Rank by frequency (mentioned in multiple queries = more relevant)
5. Add confidence scores

**Example Implementation**:
```typescript
const competitorQueries = [
  `What are the top ${industry} companies in ${region}?`,
  `Who are the main competitors in the ${industry} market?`,
  `List ${industry} businesses in ${city}`,
  `Companies that offer ${services.join(" or ")} in ${region}`,
  `Alternatives to ${businessName} in ${industry}`,
  `Market leaders in ${industry} for ${targetAudience}`
];

// Run all queries in parallel
const responses = await Promise.all(
  competitorQueries.map(query => runResponder(query))
);

// Extract competitor names from each response
const allCompetitors = extractCompetitorNames(responses);

// Aggregate and rank
const rankedCompetitors = rankCompetitors(allCompetitors);
```

---

## 🔍 Competitor Extraction & Validation

### Extraction Methods

**1. Named Entity Recognition (NER)**:
- Use LLM to extract company names from text
- Identify business entities
- Filter out non-competitor mentions

**2. List Detection**:
- Identify numbered/bulleted lists
- Extract list items that are company names
- Validate against business name patterns

**3. Comparative Language Detection**:
- Find phrases like "vs", "compared to", "alternative to"
- Extract mentioned companies
- Context-aware extraction

### Validation Rules

**1. Relevance Filtering**:
- Must be in same or related industry
- Must serve same or overlapping market
- Must offer similar or substitute services

**2. Duplicate Removal**:
- Normalize company names (remove Inc., LLC, etc.)
- Match variations (e.g., "Company" vs "Company Inc.")
- Remove the target business itself

**3. Quality Scoring**:
- Confidence score based on:
  - Mention frequency across queries
  - Explicit competitor language ("competitor", "alternative")
  - Industry match strength
  - Geographic relevance

---

## 📊 Competitor Ranking & Prioritization

### Ranking Factors

**1. Relevance Score** (0-1):
- Industry match: 0.3
- Service overlap: 0.3
- Geographic relevance: 0.2
- Market positioning similarity: 0.2

**2. Mention Frequency**:
- Mentioned in multiple queries = higher relevance
- Weighted by query type (direct vs. indirect)

**3. Market Position**:
- Market leaders: +0.2
- Established players: +0.1
- Emerging competitors: +0.05

**4. Type Classification**:
- Direct competitor: Higher priority
- Indirect competitor: Medium priority
- Market leader: Include for context
- Emerging: Lower priority but include

### Final Ranking Algorithm

```typescript
function rankCompetitor(competitor, businessProfile) {
  let score = 0;
  
  // Industry match
  score += industryMatch(competitor, businessProfile) * 0.3;
  
  // Service overlap
  score += serviceOverlap(competitor, businessProfile) * 0.3;
  
  // Geographic relevance
  score += geographicRelevance(competitor, businessProfile) * 0.2;
  
  // Market positioning
  score += positioningSimilarity(competitor, businessProfile) * 0.2;
  
  // Mention frequency bonus
  score += Math.min(competitor.mentionCount / 5, 0.1);
  
  // Market position bonus
  if (competitor.isMarketLeader) score += 0.2;
  
  return score;
}
```

---

## 🎨 User Experience Flow

### Current Flow
1. User enters website URL
2. System scans website
3. AI suggests competitors (Pass 5)
4. User reviews/edits competitors
5. Analysis runs with competitors

### Enhanced Flow (Recommended)
1. User enters website URL
2. System scans website
3. **Multi-pass competitor detection**:
   - Pass 1: Content analysis
   - Pass 2: Industry intelligence (multiple queries)
   - Pass 3: Validation & ranking
4. **Show detection progress** to user
5. **Present ranked list** with:
   - Competitor name
   - Type (Direct/Indirect/Leader)
   - Confidence score
   - Why it's a competitor
6. User reviews/edits/approves
7. Analysis runs with final competitor list

---

## 🚀 Recommended Implementation Plan

### Step 1: Enhance Current Detection (1-2 days)
- Add multiple query variations
- Improve competitor extraction
- Add validation rules
- Implement ranking algorithm

### Step 2: Improve User Experience (1 day)
- Show detection progress
- Display competitor metadata
- Add confidence indicators
- Better editing interface

### Step 3: Add Geographic Intelligence (1 week)
- Integrate local search APIs
- Geographic filtering
- Service area matching

### Step 4: Advanced Features (Future)
- Semantic similarity
- SEO overlap analysis
- Real-time competitor monitoring

---

## 📝 Key Considerations

### Accuracy vs. Coverage
- **Balance**: Include more competitors, let user filter
- **Default**: Show top 8-10, allow user to add more
- **Confidence**: Show confidence scores, let user decide

### Performance
- **Parallel queries**: Run multiple queries simultaneously
- **Caching**: Cache competitor data per industry/region
- **Rate limits**: Respect API rate limits

### Cost
- **LLM calls**: Multiple queries = higher cost
- **Optimization**: Batch queries, use cheaper models where possible
- **Caching**: Cache results to reduce repeat calls

### Edge Cases
- **New businesses**: May have few/no competitors
- **Niche markets**: Limited competitor pool
- **Local vs. National**: Different competitor sets
- **Online vs. Offline**: Different competitor types

---

## ✅ Success Metrics

### Detection Quality
- **Relevance**: 80%+ of suggested competitors are relevant
- **Coverage**: Identifies 70%+ of actual competitors
- **User Approval**: 60%+ of suggestions are kept by users

### User Experience
- **Time Saved**: Reduces manual competitor entry by 80%+
- **Satisfaction**: Users find suggestions helpful
- **Edit Rate**: Users edit <30% of suggestions

---

**Last Updated**: 2025-01-XX
**Status**: Planning Phase

