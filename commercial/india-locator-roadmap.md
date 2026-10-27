# India Locator: the build queue and the money

*Internal planning note. The counts in section 1 were taken from the shipped data on 22 October 2026. Nothing in section 3 is built.*

## 1. Where the tool stands

Touchpoint Maps lives at `#/tools/touchpoints` and has two halves.

The map: pick a State, walk down to district, sub-district, block, village. Once a village is on screen, the ladder beside it marks the rung the citizen actually stands on and turns the rungs above it into the escalation path.

The ladder: 13 schemes, 19 situations, 95 rungs. Each rung names the office, the post that sits at it, what that office decides, what to carry, how firm the claim is, and where it was read. 12 rungs come out of a statute, 36 out of a page the scheme owner publishes, 38 name a post that differs by State, and 9 are a portal rather than an office.

The delivery maps carry 2 policies and 21 escalation steps, each with the office, the reach, and a flag for whether the step was read off an official page or still needs checking.

The geography is the Local Government Directory of the Ministry of Panchayati Raj, taken through geoBoundaries gbOpen under ODbL 1.0. It covers 36 States and Union Territories, 735 districts, 6,824 sub-districts, 7,143 blocks and 649,708 village names, in 72 chunks and 12 MB on disk. The Uttar Pradesh village chunk ships as 1.25 MB, 512 kB of it over the wire, and it arrives only when somebody picks UP.

**Shipped 26 October 2026, as the first Pillar B slice.** Every rung in the chosen path shows a directory key for this build and its official LGD code, and the path exports as CSV with its parent chain. The codes come from the 26 October 2026 Local Government Directory snapshot, joined by name with an explicit rename table for districts that have moved since the geoBoundaries extract: 36/36 States, 719/735 districts, 6,906/7,143 blocks and 562,404 of 649,708 village names now carry one. A repeated or unmatched name stays blank rather than taking a neighbour's code, and 3,583 codes that two different names tried to claim were cleared. The 87,304 villages still blank (75,833 ambiguous or absent, 11,471 inside a block with no code) need the panchayat-level mapping, not more name matching.

## 2. The gaps a citizen can still feel

**The tool names an office, not a place.** "Programme Officer at the intermediate Panchayat" is the right job. Where is the counter, what is the phone number, which room, when is it open? The last two hundred metres of the visit are missing.

**The rules are national, the offices are local.** 38 of the 95 rungs say the post name varies by State. The tool admits it does not know the local name. The citizen is back to asking a neighbour what to call the officer.

**There is no clock.** The ladder says who decides. It does not say by when, and it does not say what to do once the deadline has passed. MGNREGA puts a limit on how long the Gram Panchayat may sit on a work request, and a further limit on the block, and a third on the district. A citizen who arrives after the remedy has lapsed loses the claim, and the tool does not warn them.

**Nothing to hand over.** The citizen leaves with knowledge. A page of knowledge stays in their head. A one-page written complaint, naming the right office and quoting the section, gets taken to the counter.

**English only.** 13 schemes and 95 rungs, all in English. The people who most need this are the ones least likely to read it.

**A place cannot be shared.** There is no way to send a relative or a helpline volunteer a link to the rung for a particular village.

## 3. What to add, in order

### 3.1 The office directory

Addresses, counter numbers, phone numbers and office hours for the office at the citizen's own rung, at village, block and district level.

The data is not in one place. The LGD directory entries carry a contact and an address for a good number of local bodies, the Know Your Panchayat service carries the rest of the panchayat side, and the State eGovernance directories carry the block and district offices. That has to be checked before anything is promised, because a phone number that has been wrong for three years is worse than no number.

Size: three days for the model and the panel, then a long collection tail. Ship the offices with a verified contact and mark the rest "address not yet verified" rather than guessing. Every contact carries the date it was checked, shown to the citizen.

### 3.2 The post names, State by State

For each of the 38 rungs marked "post name varies", the name the post actually has in each State, with the departmental order that created it.

"Ask for the post by the job it does" is good advice and a weak substitute for the name. This is a research job, not a code job: 13 schemes across 36 States and Union Territories, read out of the States' own orders and notifications. Budget two days per scheme, worked from a checklist.

This is the dataset institutions will pay for, because the centre does not have it either.

### 3.3 The clock

For each situation, the statutory timeline, the date the clock started, and the next step once it has run out. The citizen types the date they applied; the tool says which deadline is live and what the law says happens if it passes. No account and no server: the date lives in the URL or in local storage.

MGNREGA is the test case because the timings are in the Act. Fifteen days to be given work, a stated period for the block to answer a complaint, and a further period for the district to take it after that. PM-JAY has published timelines on the same pattern.

### 3.4 The written complaint

A one-page letter, pre-filled, that names the office, quotes the section, states the date of the first application, lists what is enclosed, and leaves room for the date and signature. Printable, and copyable into WhatsApp. The legal pipeline already exports a Word document, so the machinery exists.

No watermark, no account, no expiry. A citizen who cannot pay must get the same letter as a citizen who can.

### 3.5 Hindi, and then the languages after Hindi

The 95 rungs already live in one file, `src/data/schemes.js`, so the content work is translation rather than a rewrite. The interface needs a language switch, which the site does not have yet. Four days for Hindi once the switch is in place, then Marathi, Tamil, Bengali, Telugu and Kannada for the States where the tool is most used.

Every rung gets a human check before it goes out under the house name, and the page says who checked it. A machine translation published as ours is a claim we cannot make.

### 3.6 The sheet to carry

A printable one-pager for the chosen place and situation: the rung, the office, the address, what to carry, the deadline, and the line above for escalation. One day, once 3.1 and 3.3 are in.

### 3.7 A link that carries the place

The chosen place and situation in the URL, so a citizen can send it to a relative or send it to a volunteer at a helpline desk. The router is hash-based already, so the place becomes one more route segment. Half a day.

### 3.8 Low bandwidth

The map is the heaviest thing on the page. The Uttar Pradesh village chunk is 512 kB over the wire before a single village is picked. Split the village chunk per block or per district, so the first paint costs tens of kilobytes and the rest arrives when it is needed. Three days in the build script and one in the loader.

A citizen on a 2G connection in a block office should not wait for a megabyte to find out which officer to ask for.

### 3.9 Names from the ground

A way for someone who cannot find their village to say so, and for a volunteer to fix the name in the chunk. The directory lags: blocks get re-numbered and villages get renamed, and some of it will be wrong for the people who use it most. The fix has to come from them.

One day for a correction form with no account, no email and a visible public queue. The queue is the moderation.

### 3.10 A voice line

The same question answered by phone, in Hindi, over IVR: press 1 for a job card, 2 for work under MGNREGA, 3 for a PM-KISAN instalment, then the name of the village. The data is already in the chunks, so the work is the telephony wiring and a script.

The person who most needs this tool often has a feature phone and no data. A voice line reaches them, and it can be sponsored.

Never sell the caller's number and never route it to a marketing list.

### 3.11 Evidence that the tool is used

A voluntary, no-account tick on the result page, and aggregate counts of which States, situations and rungs get opened. The institutional sale needs usage evidence, and today we can only say the tool exists.

Aggregate counts only. No fingerprinting and no third-party analytics: the site has no tracker now and should keep it that way.

## 4. The money

Two rules come first.

The public tool stays free. No account, no card, no expiry, no watermark, no ads, no sale of the citizen's data. That is the published promise on the licensing page, it is in the mission lock, and it is why a State department can hand this to its citizens without going through a procurement process.

A paid tier changes the packaging, not the answer. If the State edition names a different office than the public one, the public one is a lie and the whole thing collapses. The free tier gets the same rungs, the same sources, the same printing.

Then five lines.

**The State edition.** Sold to a State rural development, labour, health or housing department, or to a District Collector's office. It is the public tool with four changes: the State's own post names from 3.2, the State's own circular numbers in place of the national guideline, the State's helpline and grievance portal, and their name on the printed sheet. Plus a small API, so a 12345 or CPGRAMS desk can ask which authority holds a complaint in a given village and get a rung back.

Price it on Tier 2 of the published card: USD 15,000 to 25,000 a year for a State, INR 3 to 7.5 lakh. A district buys the same thing for less, but do not invent a per-district price until three districts have asked for one. Arithmetic, not a forecast: ten States at USD 20,000 is USD 200,000 a year, and the market document's month-36 base case is USD 510,000 across five streams, so ten States would be two-fifths of the whole plan. Treat that as a ceiling.

**CSR funding the free tier.** The footer already says the free tier is paid for by the institutions that can afford to pay. A CSR foundation or a philanthropic fund pays for the maintenance of the public tool and the translations, and gets a quarterly usage report: which States were opened, which situations, what the correction queue produced, what it cost. No logo on the page and no naming rights over the content. The report is the return.

This is the smallest ticket that pays for the whole thing, and it needs no procurement and no security review, so it should be the first target. The agreement must say that the grant buys no editorial control.

**Civil society and legal aid, at cost.** NGOs running citizen help desks want the data offline, printed field guides, and their volunteers trained. The engine is free to them under the mission lock. Sell the print run, the training day at the published USD 400 to 600, and the offline package. A small, honest, recurring line.

**The grievance API for companies.** Banks, insurers and fintechs running rural schemes have to route a complaint to the right local authority. The same rung data answers that question. A metered API with a monthly floor, sold to a buyer who is not the State and is not competing with the State for the same budget.

**Commissioned modules, entering the public engine.** A foundation or a CSR trust commissions a scheme we do not cover: social security, pension, ration, tribal welfare, or the urban counterparts of the 13 we have. Per the licence terms, commissioned modules enter the public engine by default and the commissioning terms are published. Tier 4 pricing, USD 25,000 to 75,000 a module.

Three things are deliberately not for sale. The locality data is public ODbL data, and selling it as a dataset is a licence claim we do not hold. Anything about a citizen's complaint is not for sale, because the tool collects no citizen data and a commercial version that starts collecting it stops being free for the people who need it. A ranking or score for any office is not for sale, because it would become what the tool is known for, and it would be wrong.

The order to approach them in: the CSR grant first, because it closes fastest and pays for the free work; the State edition next, because it is the biggest line and the longest cycle; the API and the modules after that.

## 5. What not to build

A complaint-tracking system, which would hold identifiable people waiting on a government reply. That is a data-protection liability and a different product.

A rating for any office.

Scraped live status from State portals, republished. The terms are not ours and the pages change without notice.

A login, on any tier.

More schemes before the 38 varying rungs are fixed. Depth first: 13 schemes right in every State beat 30 schemes right in one.

A native app. The browser tool and a printed sheet reach the same person for a fraction of the cost, the mission lock says the tools are free forever, and an app store breaks that promise.

A country-wide map of every district at once. The chunks are lazy, and they should stay lazy.

## 6. Caveats to publish with it

The directory is a snapshot. Districts get split, blocks get re-numbered, villages get renamed. Publish the vintage and the method next to the tool.

63 villages in the source could not be placed inside a block and are not indexed.

Village names here are administrative names. A citizen's postal address may not match the list, and the tool should say so where it can.

38 of the 95 rungs name a post that differs by State. They are prompts to look up the local name, not answers.

The ODbL share-alike attaches to the derived locality database. The code and the ladder are separate.

## 7. Build order

1. A link that carries the place. Half a day.
2. Chunk splitting for low bandwidth. Three days.
3. The clock for MGNREGA and PM-JAY. Two days.
4. The language switch and the Hindi strings. Four days.
5. The sheet to carry. One day.
6. The written complaint. Three days.
7. The office directory for three pilot States. A week.
8. The post names for MGNREGA in five States. A week.
9. A voice line pilot in one State. A week.
10. The correction queue. One day.

Items 1 to 6 are about two weeks of work, and they take the tool from naming the office to handing over a sheet. That is the point at which a CSR fund has something worth sponsoring.

Then pick three pilot States, one from the north, one from the south, and one where the directory is hardest, and do items 7 and 8 for them. A State edition that is right in three States is worth more than a tool that is nominally right in thirty-six.

## 8. Naming the Gram Panchayat

**Built and verified 27 October 2026, as the second Pillar B slice.** A selected village now names its Gram Panchayat and GP code, the hierarchy CSV carries `gp_code` and `gp_name` on the village row, and the letter reads village, panchayat, block and district. The join resolves 522,517 of 562,404 coded village entries (92.9%) to exactly one panchayat; 12,338 conflicting village edges are dropped, and the rest have no panchayat recorded. The data tree is now 29 MB across the district chunks, and only the selected district loads. A shared link for Ashoknagar exposed a district id of `0` being read as "no district"; that is fixed and tested.

The codes made a village identifiable. They did not name the office the ladder already calls the first rung. `LADDER_RUNG_NOTE.village` told a citizen that their Gram Panchayat was the first stop, but the page could not say which panchayat that was. This slice names it, and says plainly when the directory records none.

**The data is current and in the same release.** `gp_mapping.26Oct2026.csv.7z` (10 MB compressed, 72 MB extracted) is the same 26 October 2026 snapshot as the codes. It carries 694,614 village-to-local-body rows, 620,155 distinct villages with a panchayat, across 255,655 Gram Panchayats in 31 States. Of the 562,404 coded village entries in this build, 522,517 (92.9%) resolve to exactly one GP. A further 12,338 village codes name more than one panchayat in the report, and those edges are dropped rather than picking one. Village code `500429` (Menai, Ashoknagar) resolves to GP Menai `131876`; `500587` (Muhal Dehar) has local body `0`, and the page says so rather than inventing one.

### 8.1 What it does

- A village selection shows `Gram Panchayat: Menai (GP 131876)` under the village row, or `No Gram Panchayat recorded`.
- The hierarchy CSV gains `gp_code` and `gp_name` on the village row; every other row keeps them blank.
- The written letter's place line becomes village, Gram Panchayat, block, district. When no GP is recorded it falls back to the current line.
- The ladder's village rung names the panchayat beside the note it already prints.

A shared place link carries only names and ids, so the GP is resolved from the village code when the link is opened. If the village name is ambiguous and the code cannot be resolved, the GP stays blank along with the code.

### 8.2 How it is stored

The village chunks already hold `VILLAGES` and `VILLAGE_CODES`, aligned by index. Add `GP_CODES` in the same shape, aligned with `VILLAGE_CODES`, plus one `GPS` map per district from GP code to GP name. The name is stored once per district, not once per village. The row stays positional; an empty string means no GP was recorded, never "same as the row above".

The join should live in the existing LGD build, or in a sibling script that is the only writer of the village chunks. Two scripts writing the same files is how the duplicate-export bug happened.

Rough size: 9 MB across all chunks (the data tree goes from 20 MB to 29 MB), and only the selected district's chunk loads.

### 8.3 Order and effort

1. Join and write the GP arrays, with coverage counts in `lgd-meta.js`. Assert the arrays are the same length as `VILLAGE_CODES`. Half a day.
2. Resolve the GP on village selection and on a shared link, and show it in the code panel. Half a day.
3. Add the two CSV columns and the letter line. Half a day.
4. Tests and the build. Half a day.

Two to three days, no new dependency and no new source.

### 8.4 Acceptance

- A village with a GP shows its name and official code; a village with local body 0, or one whose code names more than one panchayat, shows "not recorded" and a blank CSV cell.
- `gp_code` values are numeric, unique per GP, and one GP may hold many villages.
- Two panchayats in different districts may share a name; the code separates them and the UI never uses the name as the identity.
- The letter still reads correctly when there is no GP.
- `npm run test:india` and `npm run build:vercel` pass.

### 8.5 Boundaries

The GP is not a map level. The directory has no panchayat boundary geometry, so a polygon would be invented. Show the GP as a row in the place panel and in the export, not as a shape on the map.

Do not backfill from the 2022 `village-directory.csv`. Four years of mergers and renumbering sit between it and this snapshot; a stale GP is worse than a blank.

Do not infer a GP from the block or from a similar name. The same refusal rule as the code join applies.

The report covers 31 States because the other States and Union Territories do not run Panchayati Raj institutions in this frame. A blank there is correct.

### 8.6 After this

The office directory is the next gap: the LGD organisation tables carry addresses and contacts for a good number of local bodies, and the block and GP rows are where a citizen actually stands. After that, the 87,304 blank village names can be revisited with the GP report's own names and subdistricts, and the 16 unmatched districts and 237 blocks can be reviewed by hand.

The panchayat name is the smallest thing that turns a code into an address.
