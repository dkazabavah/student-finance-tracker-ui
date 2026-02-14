# Student Finance Tracker (Vanilla HTML/CSS/JS)

## Theme
Student Finance Tracker

## Features
- Semantic layout: header/nav/main/section/footer + headings
- Mobile-first responsive UI with 3 breakpoints (≈360px, 768px, 1024px)
- Records rendered as cards on mobile and table on desktop
- Add/Edit form with regex validation + error UI
- Inline edit + delete with confirm
- Sorting (date, description, amount)
- Live regex search with safe compiler (try/catch) + match highlighting using <mark>
- Stats dashboard: total records, total spent, top category, last-7-days trend chart
- Cap/Target: remaining/overage announced via ARIA live (polite vs assertive)
- Persistence: localStorage autosave
- Settings: base currency + manual rates + categories + cap
- JSON import/export with structure validation
- Tests page with small assertions (tests.html)

## Regex Catalog (patterns + examples)
1) Description/title: no leading/trailing spaces  
- Pattern: `/^\S(?:.*\S)?$/`
- Example valid: `Lunch at cafeteria`
- Invalid: `" Lunch"` or `"Lunch "`

2) Advanced: duplicate word back-reference  
- Pattern: `/\b(\w+)\s+\1\b/i`
- Example invalid: `coffee coffee`

3) Amount: number with up to 2 decimals  
- Pattern: `/^(0|[1-9]\d*)(\.\d{1,2})?$/`
- Valid: `0`, `10`, `10.5`, `10.50`
- Invalid: `01`, `10.555`

4) Date: YYYY-MM-DD with ranges  
- Pattern: `/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/`

5) Category: letters, spaces, hyphens  
- Pattern: `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/`
- Valid: `Bus Pass`, `School-Fees`
- Invalid: `Food!`

## Keyboard Map
- Tab / Shift+Tab: move through controls
- Enter/Space: activate buttons
- Skip link: jump to main content
- Visible focus ring on all interactive elements

## Accessibility Notes
- ARIA live regions:
  - `role="status"` polite for normal updates
  - assertive live for cap exceeded + form blocking errors
- Labels bound to inputs
- Focus-visible styles
- Mobile cards keep actions accessible without hover

## How to run
Open `index.html` in a browser.

## How to run tests
Open `tests.html` in a browser and view the results.

## Import/Export
- Export: Settings → Export
- Import: paste JSON array → Validate & Import

## Deployment
Use GitHub Pages (required).
