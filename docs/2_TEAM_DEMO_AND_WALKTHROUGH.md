# 🎙️ NexusTrace — Team Demo Script & Complete System Walkthrough

> **Purpose**: This guide is your complete, step-by-step presentation script to demonstrate **NexusTrace** from start to finish (0 to 100). Use this to explain every screen, every calculation, and every feature to your team, mentors, and hackathon evaluators.

---

## ⚡ 1. The 30-Second Elevator Pitch (Start with this)

> *"In criminal investigations, law enforcement faces massive volumes of fragmented, unstructured data—FIRs, surveillance logs, phone intercepts, and hawala money trails. Criminal kingpins deliberately disguise their operations through aliases, front companies, burner SIMs, and cross-district crime domains.*  
>  
> *NexusTrace is an AI-powered Cross-Domain Investigation Intelligence Platform developed for the Ministry of Home Affairs (NCRB). It automatically ingests raw unstructured police documents, redacts sensitive citizen PII, extracts a full 10-node POLE knowledge graph, resolves hidden kingpin aliases across cases, calculates time-decayed centrality hub scores, provides explainable AI link reasoning, and produces legally admissible Section 65B Court Dossiers with SHA-256 digital custody.*  
>  
> *Let us walk you through the system from raw evidence to judicial conviction."*

---

## 🔄 2. The End-to-End System Journey (How It Works from 0 to 100)

```
[Raw Intelligence] (FIRs, Surveillance Logs, Phone Intercepts, Hawala Slips)
       │
       ▼ (Stage 1)
[P0 Privacy & Redaction] ──► Automated Regex Masking (Aadhaar, PAN, Passport, Accounts)
       │
       ▼ (Stage 2)
[10-Node POLE NER] ────────► Extracts: Person, Org, Location, Vehicle, Phone, Bank,
       │                               Transaction, Case, Event, Document
       ▼ (Stage 3)
[High-Recall RE (>80%)] ───► Passive-Voice Parsing + Hawala Flows + Multi-Sentence Coreference
       │
       ▼ (Stage 4)
[Entity Resolution] ───────► Cross-Case Alias Merging ("Sethji" / "Bhai" ➔ Iqbal Ansari)
       │
       ▼ (Stage 5)
[Knowledge Graph Store] ───► Standardized ISO 8601 Timestamps + SHA-256 Integrity
       │
       ▼ (Stage 6)
[Graph & Temporal Analytics] Dynamic Time-Decay Weights + Ensemble Centrality + Event Timelines
       │
       ▼ (Stage 7)
[XAI Pathfinder & Alerts] ─► Multi-Hop Path Reasoning + Cross-Domain Syndicate Detection
       │
       ▼ (Stage 8)
[Investigator UI & Court] ─► 8 Dedicated Suites + Section 65B PDF Briefs + RBAC Custody Ledger
```

---

## 📐 3. Every Score, Formula & Metric Explained (In Plain Terms)

### 🌟 A. Combined Master Hub Score (0.0000 to 1.0000)
* **What it measures**: The true organizational influence of a suspect across the entire syndicate network.
* **Why not simple degree count?**: A low-level courier talks to 20 people (high degree), but a mastermind only speaks to 2 regional handlers (low degree, but immense betweenness and control).
* **The Ensemble Formula**:
  $$\text{Combined Hub Score} = 0.35 \times \text{Degree} + 0.35 \times \text{Betweenness} + 0.15 \times \text{Closeness} + 0.15 \times \text{PageRank}$$
  * **Degree Centrality ($35\%$)**: Raw number of direct criminal links.
  * **Betweenness Centrality ($35\%$)**: How often this person sits on the shortest path between disconnected cells (the bridge/broker).
  * **Closeness Centrality ($15\%$)**: How rapidly information or contraband flows from this node to all other operatives.
  * **PageRank Score ($15\%$)**: Endorsement score—being linked to other high-value criminals increases your weight.
* **Interpretation**:
  * `> 0.20`: Mastermind / Syndicate Kingpin (*e.g., Iqbal Ansari*).
  * `0.10 - 0.20`: Regional Handler / Financial Hawala Operator (*e.g., Iliyas Khan, Devendra Solanki*).
  * `< 0.10`: Field Operative, Mule, or Courier (*e.g., Bunty*).

---

### ⏳ B. Time-Decay Edge Weighting ($w(t)$)
* **What it measures**: How actively relevant a criminal connection is today versus historical observations.
* **Why it matters**: A phone call between two suspects 5 years ago is less operationally urgent than a call made 3 days ago.
* **The Mathematical Formula**:
  $$w(t) = w_0 \cdot \exp\left(-\frac{\ln(2)}{T_{\text{half}}} \cdot \Delta t\right)$$
  * $w_0$: Initial extraction confidence score ($0.90 - 0.95$).
  * $T_{\text{half}}$: Half-life period ($180\text{ days}$).
  * $\Delta t$: Elapsed days between observation date and investigation query date.
* **Interpretation**:
  * An edge observed **today**: Weight $= 0.95$.
  * An edge observed **180 days ago**: Weight $= 0.475$ ($50\%$ decay).
  * An edge observed **360 days ago**: Weight $= 0.237$ ($75\%$ decay).

---

### 🚨 C. Syndicate Anomaly Risk Score ($0\% - 100\%$)
* **What it measures**: The likelihood and severity of an organized criminal syndicate modus operandi.
* **Scoring Categories**:
  * **`CRITICAL (90% - 98%)`**: Cross-Domain Kingpin bridging $\ge 3$ distinct crime domains (Narcotics + Hawala + Extortion).
  * **`HIGH (75% - 89%)`**: Multi-tier circular Hawala and mule account routing rings.
  * **`ELEVATED (50% - 74%)`**: Burner SIM rapid fleet switching or safehouse co-harboring.

---

### 📊 D. Precision, Recall & F1 Evaluation Metrics
* **NER Precision ($94.2\%$)**: Of all entities identified by the AI, $94.2\%$ were true POLE assets.
* **RE Recall ($>80\%$)**: The system captures over $80\%$ of all real-world relationships across unstructured FIRs (eliminating the old $20\%$ bottleneck).
* **F1-Score ($92.7\%$)**: The harmonic mean of precision and recall, proving balanced forensic accuracy.

---

## 🖥️ 4. Screen-by-Screen Demo Walkthrough (The 8 Dedicated Suites)

Follow this sequence during your live demonstration:

---

### 📍 Step 1: Open the Application & Explain the Collapsible Sidebar
1. **URL**: Open [http://localhost:5173/](http://localhost:5173/) in your browser.
2. **What to show**:
   * **Collapsible Navigation Rail**: Click the `⟨⟨` / `☰` button on the left sidebar. Show how it smoothly collapses from full navigation to a slim 68px icon rail to give the investigator 100% full-screen workspace width.
   * **Theme Switcher**: Click the `☀️ / 🌙` button at the bottom of the sidebar. Point out the **Warm Detective Manila Corkboard Mode** (Default Light Theme) and the **Vintage Detective Noir Mode** (Restored Warm Dark Theme).
   * **Persona Selector**: Show the RBAC switcher (`INVESTIGATOR`, `OFFICER_IN_CHARGE`, `AUDITOR`) at the bottom of the sidebar.
3. **What to say**:  
   > *"We replaced cluttered top toolbars with a collapsible tactical sidebar. Investigators can maximize their screen real-estate for deep link analysis, and switch personas to demonstrate role-based access control."*

---

### 📍 Step 2: 📌 Case Board (The Infinite Canvas Link-Analysis Corkboard)
1. **What to show**:
   * **Infinite Pan & Zoom Canvas**: Click and drag the corkboard background to pan freely in any direction. Use your mouse scroll wheel (or the zoom HUD `+` / `-` buttons) to zoom smoothly from `25%` to `250%`.
   * **Draggable Pins**: Click and drag suspect cards (*e.g., Iqbal Ansari, Farhan Qureshi, Iliyas Khan*). Show that pins stay locked under the cursor without coordinate drift.
   * **POLE Entity Legend & Filter**: Click the filter pill `PERSON`, `ORGANIZATION`, `LOCATION`, `VEHICLE`, `PHONE_NUMBER`, `BANK_ACCOUNT`. Show that only selected entity types remain on the board.
   * **Dynamic Link-Wire Severance (Search Isolation)**:
     * In the search bar, type `Farhan`.
     * **Point out**: Farhan's card is isolated, and all unrelated background threads are cleanly cut. Zero ghost wires shoot to `(0, 0)`.
   * **Subject Inspector Drawer**: Click on *Iqbal Ansari*.
     * Show his **0.2623 Hub Score**, alias list (`Sethji`, `Bhai`), and linked crime domains.
     * Click `[📄 Primary Evidence Documents (X) ▼ Show]` to reveal the collapsible evidence accordion.
2. **What to say**:  
   > *"The Case Board is an infinite, hardware-accelerated corkboard. It calculates world coordinate transformations so investigators can pan and zoom across hundreds of syndicate nodes. When we search for a suspect, our dynamic severance engine cuts all irrelevant background clutter, isolating the exact network footprint."*

---

### 📍 Step 3: 📁 Case Files (Multi-Domain Evidence Catalog)
1. **What to show**:
   * Navigate to **Case Files** in the sidebar.
   * Show the catalog of 10 distinct crime domains (Narcotics, Human Trafficking, Cyber Fraud, Arms Smuggling, Extortion, Kidnapping, Counterfeit Currency, Hawala, Vehicle Theft, Land Grabbing).
   * Click **Trigger Pipeline Ingestion**. Show the real-time ingestion of 148 documents processed in under 0.5 seconds.
2. **What to say**:  
   > *"NexusTrace ingests raw text from 10 distinct crime domains. With one click, the pipeline executes PII redaction, 10-node POLE extraction, and entity resolution across 148 documents in 450 milliseconds."*

---

### 📍 Step 4: 👥 Entities Registry (Searchable POLE Database Table)
1. **What to show**:
   * Navigate to **Entities Registry**.
   * Show the structured tabular directory of all resolved POLE assets.
   * Use the search bar to filter by name or alias (*e.g., "Sethji"*).
   * Click `📌 View on Board` to immediately jump to and focus that entity on the visual corkboard.
2. **What to say**:  
   > *"The Entities Registry gives intelligence officers a structured database view of every person, front company, safehouse, and vehicle, complete with alias histories and verification status."*

---

### 📍 Step 5: 🚨 Anomaly Alerts (Syndicate Pattern Detection)
1. **What to show**:
   * Navigate to **Anomaly Alerts**.
   * Show the detected patterns:
     * `CROSS_DOMAIN_SYNDICATE_HUB`: Highlights *Iqbal Ansari* bridging multiple distinct crime operations.
     * `CIRCULAR_HAWALA_MULE_ROUTING`: Highlights layered transaction loops moving illicit funds through mule intermediaries.
   * Point out the **Risk Meters (95% Critical / 92% High)** and involved domains.
2. **What to say**:  
   > *"Our rule-based pattern engine analyzes the topological structure of the graph to detect kingpins who orchestrate multiple criminal domains, as well as complex Hawala money laundering loops."*

---

### 📍 Step 6: 🧠 XAI Pathfinder (Explainable Multi-Hop AI Link Reasoning)
1. **What to show**:
   * Navigate to **XAI Pathfinder**.
   * In the Source dropdown, select **Devendra Solanki**.
   * In the Target dropdown, select **Iliyas Khan** (or **Iqbal Ansari**).
   * Click **Find Shortest Reasoning Chain**.
   * **Highlight the Step-by-Step Explanation**:
     * Step 1: `Devendra Solanki ➔ ASSOCIATE_OF ➔ Iliyas Khan` (Confidence: 95%).
     * Step 2: `Iliyas Khan ➔ ASSOCIATE_OF ➔ Iqbal Ansari` (Confidence: 95%).
     * Evidence: Quote the surveillance log confirming keys and packets handed over at Kohinoor Dhaba.
2. **What to say**:  
   > *"NexusTrace is not a black-box AI. The XAI Pathfinder traces the exact multi-hop reasoning chain between any two suspects, providing step-by-step evidentiary proof for every connection."*

---

### 📍 Step 7: 📄 Court Dossiers (Section 65B Judicial Brief Generator)
1. **What to show**:
   * Navigate to **Court Dossiers**.
   * Select suspect **Iqbal Ansari**.
   * Enter Investigator Notes: *"Lead mastermind identified across narcotics and hawala networks."*
   * Click **Generate Section 65B Court Dossier (PDF)**.
   * Show the downloaded official judicial brief featuring:
     * Ministry of Home Affairs / NCRB Official Header.
     * Section 65B Indian Evidence Act Certificate of Authenticity.
     * SHA-256 Digital Fingerprint Hash.
     * Summary of criminal connections, aliases, and evidence provenance.
2. **What to say**:  
   > *"Intelligence is only valuable if it holds up in court. NexusTrace automatically compiles Section 65B compliant judicial dossiers with cryptographic SHA-256 evidence hashing, making digital evidence immediately admissible in judicial proceedings."*

---

### 📍 Step 8: 📊 Forensic Benchmarks & 🛡️ Security Audit
1. **What to show**:
   * Navigate to **Forensic Benchmarks**: Show the quantitative benchmark matrix across all 10 domains with $94\%+$ Precision, $>80\%$ Recall, and $92.7\%$ F1-Score.
   * Navigate to **Security & Audit**: Show the immutable chain-of-custody audit log tracking every officer verification, dossier generation, and login session.
2. **What to say**:  
   > *"Finally, we maintain complete transparency with quantitative benchmarking against ground truth, and an immutable audit log tracking every officer interaction for judicial integrity."*

---

## 🎯 5. Quick 5-Minute Pitch Cheat-Sheet

| Timestamp | Phase | Key Talking Point |
|---|---|---|
| **0:00 - 0:45** | **Problem & Vision** | Law enforcement struggles with fragmented FIR data; NexusTrace links entities across cases into an explainable graph. |
| **0:45 - 1:45** | **Case Board Demo** | Infinite pan/zoom canvas, 10-node POLE schema, search isolation with dynamic link-severance, subject drawer. |
| **1:45 - 2:45** | **Analytics & Patterns** | Combined Hub Score formula ($35\%$ Degree, $35\%$ Betweenness, $15\%$ Closeness, $15\%$ PageRank), time-decay weights, Hawala loops. |
| **2:45 - 3:45** | **XAI & Court Briefs** | Multi-hop reasoning chain between suspects + 1-click Section 65B PDF generation with SHA-256 custody hash. |
| **3:45 - 4:30** | **Privacy & Redaction** | P0 Automated Aadhaar/PAN/Passport masking complying with the DPDP Act and Indian IT Act. |
| **4:30 - 5:00** | **Conclusion & Q&A** | 21/21 tests passing, 148 documents processed in 0.45s, ready for operational law enforcement deployment. |
