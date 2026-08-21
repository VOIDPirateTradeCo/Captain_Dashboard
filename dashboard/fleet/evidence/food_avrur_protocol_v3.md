# 🍳⚔️ FOOD-AVRUR PROTOCOL v3.0
## Culinary Decision Cycle for Fleet Operations

*Developed by Sir Green, refined for Captain's approval*

### 🎯 MISSION PURPOSE
Standardize culinary decision-making across all fleet vessels using the extended OODA Loop framework. Transform "what's for dinner?" into a precise, repeatable, and continuously improving process.

### 🔄 THE 9-PHASE FOOD-AVRUR CYCLE

#### 1. FIND — Locate Food Needs
**Objective:** Identify hunger signals, nutritional gaps, ingredient availability
- Scan crew hunger levels (scale 1-10)
- Inventory available ingredients in galley/fridge/pantry
- Note dietary restrictions, allergies, preferences
- Check time constraints and prep capacity
- Assess upcoming schedule for meal planning

**Output:** "Hunger profile vector" — e.g., "Moderate hunger, protein needed, 30 min prep window"

#### 2. OBSERVE — Kitchen Intelligence Gathering
**Objective:** Collect real-time data from environment
- Fridge temperature and organization state
- Pantry inventory levels (starches, proteins, vegetables)
- Equipment readiness (stove, oven, microwave, grill)
- Crew morale/mood (affects flavor perception)
- Weather conditions (soup vs salad decision matrix)

**Output:** "Kitchen state snapshot" — e.g., "Stove hot, pantry low on starches, crew stressed"

#### 3. ORIENT — Decision Matrix Construction
**Objective:** Filter observations through experience and constraints
**Priority Vector (PVS):**

| Priority | Factor | Weight |
|----------|--------|--------|
| P0 | Critical dietary needs (allergies, medical) | 100% |
| P1 | Time urgency (crew schedule) | 90% |
| P2 | Nutritional balance | 80% |
| P3 | Ingredient availability | 70% |
| P4 | Crew preferences | 60% |
| P5 | Cost efficiency | 50% |

**Decision Rules:**
- Blockers (empty pantry, broken stove) override all other factors
- If P0-P2 cannot be satisfied, escalate ("Order takeout")
- Cross-reference against Recipe Knowledge Base

**Output:** "Decision pathway ranked list"

#### 4. DECIDE — Meal Selection Protocol
**Objective:** Choose optimal meal path from ranked options
**Selection Algorithm:**
1. Filter recipes by available ingredients (>70% match)
2. Rank by Priority Vector score
3. Apply "novelty factor" (don't repeat meals within 48 hours)
4. Consider "prep complexity vs time available"
5. Select top candidate OR escalate if no viable options

**Output:** "Selected meal action" — e.g., "Make scrambled eggs with leftover vegetables"

#### 5. ACT — Meal Execution
**Objective:** Execute the selected meal preparation
**Execution Protocol:**
- Prep phase: Set timers, gather ingredients, preheat equipment
- Active phase: Follow recipe steps in sequence
- Adaptation phase: Modify based on real-time conditions
- Quality checkpoints: Taste testing at 3 key stages

**Safety Check:** Allergen cross-contamination protocols MUST be followed
**Time Check:** If execution exceeds 2x estimated time, reassess

**Output:** "Meal in progress / completed"

#### 6. VERIFY — Taste and Quality Validation
**Objective:** Confirm meal meets expectations
**Verification Checklist:**
□ Temperature appropriate (hot food hot, cold food cold)
□ Seasoning balanced (salt, acid, umami, sweet)
□ Texture satisfactory (not too mushy/crispy/dry)
□ Presentation acceptable (crew morale matters)
□ Nutritional target met (protein/carbs/veg ratio)

**Failure Protocol:**
- Minor issues → "Quick fix" (add hot sauce, extra salt, etc.)
- Major issues → "Fallback option" (order food, make PB&J)
- Repeated failures → Update Recipe Knowledge Base

**Output:** "Meal approved / needs adjustment / fallback triggered"

#### 7. RECORD — Documentation and Logging
**Objective:** Capture learnings for future cycles
**Records Created:**
1. **Eye Log Entry** (real-time JSON):
```json
{
  "timestamp": "2026-08-20T06:30:00Z",
  "cycle_id": "FOOD-AVRUR_001",
  "inputs": {"hunger_level": 6, "available_time": 1800},
  "decision": "scrambled_eggs_with_veg",
  "verification": {"taste": 8, "effort": 3},
  "outcome": "approved"
}
```

2. **Recipe Update** (if modifications made):
- Log ingredient substitutions
- Note timing adjustments
- Record crew feedback scores

3. **Kitchen State Update**:
- Updated pantry inventory
- Equipment usage log
- Cleaning task triggers

**Output:** "Documentation complete"

#### 8. UPDATE — System Refinement
**Objective:** Improve future decision-making
**Updates Performed:**
- Add successful recipe to frequent rotation
- Remove failed recipe from consideration
- Update ingredient preference weights based on crew feedback
- Adjust time estimates for prep phases
- Update kitchen inventory cache
- Flag equipment maintenance needs

**Learning Engine:**
- Each cycle adds to Recipe Knowledge Base
- Crew approval ratings influence future decisions
- Ingredient availability trends inform shopping lists

**Output:** "System knowledge updated"

#### 9. REPEAT — Continuous Cycle
**Objective:** Maintain ongoing culinary excellence
**Cycle Triggers:**
- Scheduled: Every 4-6 hours (breakfast, lunch, dinner, snacks)
- Event-based: Crew expresses hunger (level ≥ 4)
- Condition-based: Pantry restocked, new ingredients acquired

**Emergency Protocols:**
- **"Kitchen Fire"** — Stop all cycles, evacuate, call fire department
- **"Hunger Strike"** — Crew refusal to eat triggers "Force Feed" protocol (escalate to Captain)
- **"Empty Galley"** — All ingredients exhausted triggers "Procurement Emergency"

**Output:** "Awaiting next trigger event"

---

### ⚙️ FLEET-SPECIFIC ADAPTATIONS

#### SQUIDSTATION (192.168.0.39) — Central Galley
- Multi-crew coordination required
- Bulk ingredient procurement
- Advanced cooking equipment available
- Meal prep for entire team

#### PINKCADY (192.168.0.3) — Solo Operations  
- Single-serving recipes prioritized
- Minimal cleanup protocols
- Quick prep focus (under 15 minutes)
- Leftover optimization (no waste)

#### STEALTHATTACK (100.110.238.68) — High-Performance Rig
- High-calorie dense meals preferred
- Nutrient timing for GPU cooling efficiency
- Batch cooking during low-load periods
- Caffeine optimization protocols

---

### 📋 CREW ROLLOUT CHECKLIST

**For Captain Deployment:**
- [ ] Print Food-AVRUR Quick Reference Card
- [ ] Train all crew members on FIND-OBSERVE-ORIENT phases
- [ ] Customize Priority Vector weights for each vessel
- [ ] Establish communication channels for cross-vessel recipe sharing
- [ ] Set up Recipe Knowledge Base template
- [ ] Schedule monthly Food-AVRUR review meetings
- [ ] Integrate with existing OODAVRUR monitoring (shared dashboard)

**Training Mantra:**
*"Find the need, Observe the state, Orient to constraints, Decide the path, Act with precision, Verify the outcome, Record the learning, Update your wisdom, Repeat forever."*

---

### 🎯 MISSION COMPLETE

Protocol perfected. Ready for crew instruction. Sir Green has practiced what he preaches.

**Captain — how's this for Food-AVRUR v3.0? Perfect enough to lead the fleet yet?** 🍳⚔️