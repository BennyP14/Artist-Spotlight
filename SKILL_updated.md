---
name: show-and-tell-slide
description: >
  Generate a Show & Tell (sprint review) PPTX slide for Audio Network product teams.
  Use this skill whenever the user wants to create, draft, or generate a Show & Tell slide,
  sprint review slide, or show and tell update. Also trigger when the user pastes sprint goals
  and asks for a slide, deck update, or "show and tell". Always use this skill — even if
  the user just says "make my show and tell slide" or "write up this sprint for show and tell".
---

# Show & Tell Slide Skill

Generates a formatted Show & Tell PPTX slide from sprint goals pasted by the user.

## What This Skill Does

Takes raw sprint goal input and produces a correctly formatted slide that matches the Audio Network Show & Tell deck template. The output is a `.pptx` file ready to drop into the existing deck.

---

## Input Format

The user will paste sprint goals in free text. Goals will be marked "done" if complete. Example:

```
Project: Improving Downloads
Sprint: Discovery
Goals summary: To prototype an improved download UX
Vision: Improving the download experience to make our website more usable for high value TV customers, enabling acquisition and retention.

- Show the prototype to customers and synthesise findings — done
- Define how we want to build the download API
- (Stretch) Agree the preferred technical approach for stems delivery

Why This Matters: Validating the prototype with real customers, resolving the Download API architecture, and unblocking stems delivery are the three decisions that determine what we build — getting them right now means the team can move into full build with confidence rather than course-correcting later.

Stay Connected:
- Teams: [link]
- Miro: [link]
- See our three swimlanes of work: [link]
```

If the user does not provide a **sprint name**, omit the em dash suffix from the title.
If the user does not provide a **goals summary sentence**, write one — a plain-English sentence summarising what the sprint is trying to achieve.
If the user does not provide a **vision statement**, write one — 2–3 sentences, plain English, outcome-focused.
If the user does not provide **Why This Matters**, write one — a short paragraph (2–4 sentences) explaining the business/customer value. No waffle.
The **Stay Connected** section is always included automatically — links are hardcoded in the skill and do not need to be provided by the user.

---

## Goal Status Rules

Map goal status to emoji as follows:

| Status | Emoji | When to apply |
|--------|-------|---------------|
| ✅ | Done | Goal explicitly marked "done" |
| 🕐 | In progress | No status marker present — default |
| ❌ | Cancelled / not done | Goal explicitly marked "cancelled", "dropped", "not done", or "won't do" |

---

## Slide Layout

The slide replicates the structure from the Audio Network Show & Tell template (`Show___Tell_template.pptx`).

### Layout overview (all measurements in EMU; 914400 EMU = 1 inch):

| Element | Position (x, y) | Size (w, h) | Style |
|---------|----------------|-------------|-------|
| "SHOW & TELL" label | 394135, 277715 | 4964674, 430887 | Aptos, 11pt, bold, white |
| Horizontal rule | x=487017, y=569142, width=11171583 | — | White, 0.5pt |
| Project title | 487017, 976281 | 7500000, 500000 | Aptos, 20pt, bold, white. Format: `PROJECT NAME — SPRINT NAME` (ALL CAPS, em dash) |
| Goals text box | 487017, 1441922 | 7805645, 5148461 | Aptos, 14pt, white |
| Vision box border | 8410199, 1145271 | 3248401, 1966364 | Rounded rect, no fill, grey border |
| Vision text | 8727535, 1608627 | 2613728, 1015663 | Aptos, 12pt, white, centered |
| Category pill (teal) | 8751524, 976281 | 2613729, 322804 | Rounded rect, fill #00C896, dark text |
| Stay Connected pill (teal outline) | 8751524, 3200000 | 2613729, 322804 | Rounded rect, no fill, teal border #00C896, white text |
| Stay Connected text box | 8727535, 3600000 | 2613728, 1500000 | Aptos, 12pt, white, centered; links underlined |

### Background
Dark background: scheme colour `tx1` with `lumMod=85000, lumOff=15000` (near-black).

---

## Goals Text Box Content

Format the goals text box content as follows:

```
Goals: [summary sentence — bold, on the same line as "Goals:"]

✅ Goal one text
🕐 Goal two text
🕐 (Stretch) Goal three text

Why This Matters: [paragraph text — "Why This Matters:" is NOT bold; full paragraph is plain weight]
```

### Formatting rules:
- **`Goals: [summary]`** — the entire line is bold. "Goals:" label and the summary sentence are in the same paragraph, same run, all bold.
- Goal bullet lines — NOT bold. Each goal is its own `<a:p>` paragraph.
- A blank line (empty `<a:p>`) separates the goals block from Why This Matters.
- **`Why This Matters:`** — label and body are NOT bold. Plain weight throughout.
- All text is white (`bg1`).
- Line spacing: 150% (`<a:spcPct val="150000"/>`).

---

## Right Panel Layout

The right panel has two sections stacked vertically:

### Section 1 — Vision
- **Category pill** (teal fill `#00C896`, dark text): project name label, e.g. "Improving Downloads"
- **Rounded rect border** (no fill, grey border): contains vision text
- **Vision text**: 2–3 sentences, centered, Aptos 12pt, white

### Section 2 — Stay Connected (always include)

Always include the Stay Connected section. The three links are fixed and hardcoded — do not ask the user for them:

| Label | URL |
|-------|-----|
| Teams | `https://teams.microsoft.com/l/channel/19%3Af46bbff15f824ab9a5257e08a2cf06ca%40thread.tacv2/Improving%20Downloads?groupId=c63836f5-3b29-480b-b097-7fd79f45bf6c&tenantId=3fb51930-ad9b-4d35-9a9d-54f7c22f75bb` |
| Miro | `https://miro.com/app/board/uXjVGTvYhfQ=/?share_link_id=858429241708` |
| See our three swimlanes of work | `https://miro.com/app/board/uXjVGTvYhfQ=/?moveToWidget=3458764661222980194&cot=14` |

- **Stay Connected pill** (no fill, teal outline `#00C896`, white text): label "Stay Connected"
- **Text box below**: centered, Aptos 12pt, white; each label is underlined and hyperlinked using `<a:hlinkClick r:id="rIdX"/>` with the URL registered as a relationship in `slide5.xml.rels`.

---

## Step-by-Step Instructions

### 1. Parse the user's input

Extract:
- **Project name** → slide title prefix (ALL CAPS)
- **Sprint name** → slide title suffix after em dash (ALL CAPS), e.g. `IMPROVING DOWNLOADS — DISCOVERY`
- **Goals summary sentence** → bold line after "Goals:" label
- **Goal bullets** → list with status emoji
- **Why This Matters** → plain paragraph below goals
- **Vision** → right panel vision box text
- **Stay Connected links** → right panel second section (omit if not provided)

### 2. Read the PPTX skill

```
Read /mnt/skills/public/pptx/SKILL.md → then read editing.md for the unpack/edit/pack workflow
```

### 3. Copy and unpack the template

```bash
cp /mnt/skills/user/show-and-tell-slide/Show___Tell_template.pptx /home/claude/show_and_tell_output.pptx
python /mnt/skills/public/pptx/scripts/office/unpack.py /home/claude/show_and_tell_output.pptx /home/claude/sat_unpacked/
```

### 4. Use slide 5 as base

Use slide 5 (`slide5.xml`) as the structural base — it contains all required elements.

Edit the following:
- Project title text → `PROJECT NAME — SPRINT NAME`
- Category pill fill → `#00C896` (teal), text colour → dark (`tx1`)
- Goals text box content → Goals summary line + bullets + Why This Matters
- Vision text box content
- Add Stay Connected pill + text box if links provided (position below vision box)

### 5. Build the goals XML

**Goals summary line (bold):**
```xml
<a:p>
  <a:pPr><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>
  <a:r>
    <a:rPr lang="en-GB" sz="1400" b="1" dirty="0">
      <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
      <a:latin typeface="Aptos"/>
    </a:rPr>
    <a:t>Goals: To prototype an improved download UX</a:t>
  </a:r>
</a:p>
```

**Blank separator line:**
```xml
<a:p>
  <a:pPr><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>
  <a:endParaRPr lang="en-GB" sz="1400"/>
</a:p>
```

**Goal bullet line (not bold):**
```xml
<a:p>
  <a:pPr><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>
  <a:r>
    <a:rPr lang="en-GB" sz="1400" dirty="0">
      <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
      <a:latin typeface="Aptos"/>
    </a:rPr>
    <a:t>✅ Goal text here</a:t>
  </a:r>
</a:p>
```

**Why This Matters line (not bold):**
```xml
<a:p>
  <a:pPr><a:lnSpc><a:spcPct val="150000"/></a:lnSpc></a:pPr>
  <a:r>
    <a:rPr lang="en-GB" sz="1400" dirty="0">
      <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
      <a:latin typeface="Aptos"/>
    </a:rPr>
    <a:t>Why This Matters: Full paragraph text here.</a:t>
  </a:r>
</a:p>
```

### 6. Update the category pill to teal

Change the pill fill from `#FFADAD` to `#00C896` and set text colour to dark (`tx1`):

```xml
<a:solidFill>
  <a:srgbClr val="00C896"/>
</a:solidFill>
```

### 7. Add Stay Connected section (always include)

Always add the Stay Connected section. First, register the three URLs as relationships in `ppt/slides/_rels/slide5.xml.rels` by adding:

```xml
<Relationship Id="rIdTeams" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
  Target="https://teams.microsoft.com/l/channel/19%3Af46bbff15f824ab9a5257e08a2cf06ca%40thread.tacv2/Improving%20Downloads?groupId=c63836f5-3b29-480b-b097-7fd79f45bf6c&amp;tenantId=3fb51930-ad9b-4d35-9a9d-54f7c22f75bb"
  TargetMode="External"/>
<Relationship Id="rIdMiro" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
  Target="https://miro.com/app/board/uXjVGTvYhfQ=/?share_link_id=858429241708"
  TargetMode="External"/>
<Relationship Id="rIdSwimlanes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
  Target="https://miro.com/app/board/uXjVGTvYhfQ=/?moveToWidget=3458764661222980194&amp;cot=14"
  TargetMode="External"/>
```

Then add two new shapes to `slide5.xml`:

**Stay Connected pill (teal outline, no fill):**
```xml
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="9" name="Stay Connected Pill"/>
    <p:cNvSpPr/><p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="8751524" y="3200000"/><a:ext cx="2613729" cy="322804"/></a:xfrm>
    <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 50000"/></a:avLst></a:prstGeom>
    <a:noFill/>
    <a:ln><a:solidFill><a:srgbClr val="00C896"/></a:solidFill></a:ln>
  </p:spPr>
  <p:txBody>
    <a:bodyPr rtlCol="0" anchor="ctr"/>
    <a:lstStyle/>
    <a:p>
      <a:pPr algn="ctr"/>
      <a:r>
        <a:rPr lang="en-US" sz="1000">
          <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
          <a:latin typeface="Aptos"/>
        </a:rPr>
        <a:t>Stay Connected</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
```

**Stay Connected text box (three hardcoded hyperlinks, centered, underlined):**
```xml
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="10" name="Stay Connected Links"/>
    <p:cNvSpPr txBox="1"/><p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="8727535" y="3580000"/><a:ext cx="2613728" cy="1400000"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:noFill/>
  </p:spPr>
  <p:txBody>
    <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
    <a:lstStyle/>
    <a:p>
      <a:pPr algn="ctr"/>
      <a:r>
        <a:rPr lang="en-US" sz="1200" u="sng">
          <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
          <a:latin typeface="Aptos"/>
          <a:hlinkClick r:id="rIdTeams"/>
        </a:rPr>
        <a:t>Teams</a:t>
      </a:r>
    </a:p>
    <a:p>
      <a:pPr algn="ctr"/>
      <a:r>
        <a:rPr lang="en-US" sz="1200" u="sng">
          <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
          <a:latin typeface="Aptos"/>
          <a:hlinkClick r:id="rIdMiro"/>
        </a:rPr>
        <a:t>Miro</a:t>
      </a:r>
    </a:p>
    <a:p>
      <a:pPr algn="ctr"/>
      <a:r>
        <a:rPr lang="en-US" sz="1200" u="sng">
          <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
          <a:latin typeface="Aptos"/>
          <a:hlinkClick r:id="rIdSwimlanes"/>
        </a:rPr>
        <a:t>See our three swimlanes of work</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
```

### 8. Pack and QA

```bash
python /mnt/skills/public/pptx/scripts/office/pack.py /home/claude/sat_unpacked/ /home/claude/show_and_tell_output.pptx --original /home/claude/show_and_tell_output.pptx
```

Convert to image and visually inspect:
```bash
python /mnt/skills/public/pptx/scripts/office/soffice.py --headless --convert-to pdf /home/claude/show_and_tell_output.pptx
pdftoppm -jpeg -r 150 /home/claude/show_and_tell_output.pdf /home/claude/sat_slide
ls -1 /home/claude/sat_slide*.jpg
```

Check:
- Title format: `PROJECT — SPRINT` in ALL CAPS
- Goals summary line is bold; goal bullets and Why This Matters are NOT bold
- Category pill is teal (`#00C896`), not pink
- Vision text present and centered
- Stay Connected section always present with Teams, Miro, and swimlanes links
- No placeholder text remaining

### 9. Deliver

```bash
cp /home/claude/show_and_tell_output.pptx /mnt/user-data/outputs/show_and_tell_output.pptx
```

Use `present_files` to share with the user.

---

## Notes

- Output only slide 5. Delete all other slides from the presentation before packing. The user wants a single-slide file to drop into their own deck.
- Never add new design elements not present in this spec.
- If a goal has no emoji and no "done" marker, always default to 🕐 (clock).
- Why This Matters is a paragraph, not a single sentence — match the length and specificity the user provides. Do not truncate.
- Vision statement: plain English, outcome-focused, 2–3 sentences. Avoid jargon.
- Stay Connected links are hardcoded — Teams, Miro, and swimlanes. Always render them; never ask the user for URLs.
