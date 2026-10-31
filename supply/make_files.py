"""Builds the free downloads in assets/downloads/ for siren.watch/prep-downloads.html.

    node supply/export-data.mjs > /tmp/supply-data.json
    python3 supply/make_files.py /tmp/supply-data.json

No file contains an affiliate link: Amazon's Associates agreement does not allow
them in downloadable documents. The files point to siren.watch in plain text.
Needs openpyxl and reportlab (authoring only; the site build does not run this).
"""
import csv
import json
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent.parent / "assets" / "downloads"
SITE = "siren.watch"

F = "Arial"
H_FONT = Font(name=F, bold=True, color="FFFFFF")
H_FILL = PatternFill("solid", fgColor="0E131D")
INPUT = Font(name=F, color="0000FF")
INPUT_FILL = PatternFill("solid", fgColor="FFFF00")
BODY = Font(name=F)
BOLD = Font(name=F, bold=True)
TITLE = Font(name=F, bold=True, size=14)
NOTE = Font(name=F, italic=True, size=9, color="555555")
THIN = Border(bottom=Side(style="thin", color="DDDDDD"))
WRAP = Alignment(wrap_text=True, vertical="top")


def header(ws, row, names, widths):
    for i, (n, w) in enumerate(zip(names, widths), 1):
        c = ws.cell(row=row, column=i, value=n)
        c.font, c.fill, c.alignment = H_FONT, H_FILL, Alignment(vertical="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def footer_note(ws, row, text):
    ws.cell(row=row, column=1, value=text).font = NOTE


# ── 1. The full Supply Depot as a spreadsheet ─────────────────────────────
def supply_xlsx(catalog):
    wb = Workbook()
    ws = wb.active
    ws.title = "Checklist"
    ws["A1"] = "SIREN Supply Depot checklist"
    ws["A1"].font = TITLE
    ws["A2"] = ("How to use: in column D pick Have or Need; columns E and F are optional. "
                "Yellow cells are yours to fill in. Row 5 is an example. Live list: " + SITE + "/supply-depot.html")
    ws["A2"].font = NOTE
    header(ws, 4, ["Category", "Item", "Why", "Have / Need", "Qty on hand", "Qty wanted", "Notes"],
           [30, 42, 52, 13, 12, 12, 30])
    dv = DataValidation(type="list", formula1='"Have,Need"', allow_blank=True)
    ws.add_data_validation(dv)
    r = 5
    first = True
    for _id, title, _intro, items in catalog:
        for item in items:
            name, why = item[0], item[1]
            ws.cell(row=r, column=1, value=title).font = BODY
            ws.cell(row=r, column=2, value=name).font = BODY
            ws.cell(row=r, column=3, value=why).font = BODY
            for col in (4, 5, 6, 7):
                c = ws.cell(row=r, column=col)
                c.font, c.fill = INPUT, INPUT_FILL
            if first:  # one example row showing the expected format
                ws.cell(row=r, column=4, value="Have")
                ws.cell(row=r, column=5, value=4)
                ws.cell(row=r, column=6, value=6)
                ws.cell(row=r, column=7, value="Example row: replace with your own")
                first = False
            r += 1
    last = r - 1
    dv.add(f"D5:D{last}")
    ws.conditional_formatting.add(f"A5:C{last}", FormulaRule(formula=['$D5="Have"'], font=Font(name=F, color="888888", strike=True)))
    ws.auto_filter.ref = f"A4:G{last}"

    s = wb.create_sheet("Summary", 0)
    s["A1"] = "Supply Depot summary"
    s["A1"].font = TITLE
    s["A2"] = "Counts update as you mark items Have on the Checklist sheet."
    s["A2"].font = NOTE
    header(s, 4, ["Category", "Items", "Have", "Still need", "% done"], [32, 10, 10, 12, 10])
    rr = 5
    for _id, title, _intro, _items in catalog:
        s.cell(row=rr, column=1, value=title).font = BODY
        s.cell(row=rr, column=2, value=f"=COUNTIF(Checklist!$A$5:$A${last},A{rr})").font = BODY
        s.cell(row=rr, column=3, value=f'=COUNTIFS(Checklist!$A$5:$A${last},A{rr},Checklist!$D$5:$D${last},"Have")').font = BODY
        s.cell(row=rr, column=4, value=f"=B{rr}-C{rr}").font = BODY
        c = s.cell(row=rr, column=5, value=f"=IF(B{rr}=0,0,C{rr}/B{rr})")
        c.font, c.number_format = BODY, "0%"
        rr += 1
    s.cell(row=rr, column=1, value="Total").font = BOLD
    for col, f in ((2, f"=SUM(B5:B{rr-1})"), (3, f"=SUM(C5:C{rr-1})"), (4, f"=SUM(D5:D{rr-1})")):
        s.cell(row=rr, column=col, value=f).font = BOLD
    c = s.cell(row=rr, column=5, value=f"=IF(B{rr}=0,0,C{rr}/B{rr})")
    c.font, c.number_format = BOLD, "0%"
    footer_note(s, rr + 2, "General preparedness information, not professional advice. From " + SITE)
    wb.save(OUT / "siren-supply-depot-checklist.xlsx")

    with open(OUT / "siren-supply-depot-checklist.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["Category", "Item", "Why", "Have / Need", "Qty on hand", "Qty wanted", "Notes"])
        for _id, title, _intro, items in catalog:
            for item in items:
                w.writerow([title, item[0], item[1], "", "", "", ""])


# ── 2. Water and food calculator ──────────────────────────────────────────
def water_food_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Calculator"
    ws.column_dimensions["A"].width = 46
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 64
    ws["A1"] = "Water and food calculator"
    ws["A1"].font = TITLE
    ws["A2"] = "Change the yellow cells. Everything below them recalculates."
    ws["A2"].font = NOTE
    rows = [
        ("Your household", None, None, None),
        ("People", 4, "Your number", "in"),
        ("Pets (mid-size dogs or equivalent)", 1, "Your number", "in"),
        ("Days to plan for", 14, "Ready.gov: at least several days; two weeks for staying at home", "in"),
        ("Assumptions", None, None, None),
        ("Gallons of water per person per day", 1, "Ready.gov: at least one gallon per person per day", "in"),
        ("Gallons of water per pet per day", 0.5, "Assumption: about half a gallon a day for a mid-size dog", "in"),
        ("Calories per person per day", 2000, "Assumption: a common planning figure; adjust for age and activity", "in"),
        ("Meals per person per day", 3, "Assumption", "in"),
        ("Gallons per storage container", 5, "Size of the jugs you use", "in"),
        ("What you need", None, None, None),
        ("Water, gallons", "=B5*B9*B7+B6*B10*B7", "People + pets, for every day", "out"),
        ("Containers to fill", "=ROUNDUP(B15/B13,0)", "Rounded up", "out"),
        ("Meals", "=B5*B12*B7", "", "out"),
        ("Calories", "=B5*B11*B7", "", "out"),
        ("Water if it is hot or someone is nursing or sick (x2)", "=B15*2", "Ready.gov: hot weather and illness raise need", "out"),
    ]
    r = 3
    for label, val, note, kind in rows:
        r += 1
        a = ws.cell(row=r, column=1, value=label)
        if val is None:
            a.font = BOLD
            continue
        a.font = BODY
        b = ws.cell(row=r, column=2, value=val)
        if kind == "in":
            b.font, b.fill = INPUT, INPUT_FILL
        else:
            b.font, b.number_format = BOLD, "#,##0"
        ws.cell(row=r, column=3, value=note).font = NOTE
    footer_note(ws, r + 2, "General preparedness information, not professional advice. Sources: ready.gov/water, ready.gov/food. From " + SITE)
    wb.save(OUT / "siren-water-food-calculator.xlsx")
    return ws


# ── 3. Pantry inventory with expiry tracking ──────────────────────────────
def pantry_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Pantry"
    ws["A1"] = "Pantry and supply inventory"
    ws["A1"].font = TITLE
    ws["A2"] = ("Fill in yellow cells. 'Days left' and 'Status' calculate from the expiry date. "
                "Row 5 is an example; overwrite it. Use By and Expired rows turn amber and red.")
    ws["A2"].font = NOTE
    header(ws, 4, ["Item", "Category", "Qty", "Unit", "Location", "Bought", "Expires", "Days left", "Status"],
           [32, 16, 8, 10, 16, 12, 12, 11, 14])
    cats = DataValidation(type="list", allow_blank=True,
                          formula1='"Water,Food,Medicine,Batteries,Fuel,Hygiene,Baby,Pet,Other"')
    ws.add_data_validation(cats)
    last = 504
    for r in range(5, last + 1):
        for col in range(1, 8):
            c = ws.cell(row=r, column=col)
            c.font, c.fill = INPUT, INPUT_FILL
        ws.cell(row=r, column=6).number_format = "yyyy-mm-dd"
        ws.cell(row=r, column=7).number_format = "yyyy-mm-dd"
        ws.cell(row=r, column=8, value=f'=IF(G{r}="","",G{r}-TODAY())').font = BODY
        ws.cell(row=r, column=9, value=f'=IF(G{r}="","",IF(H{r}<0,"Expired",IF(H{r}<=90,"Use soon","OK")))').font = BODY
    cats.add(f"B5:B{last}")
    ex = ["Canned black beans", "Food", 12, "cans", "Pantry shelf 2", "2026-10-01", "2028-10-01"]
    import datetime as dt
    for col, v in enumerate(ex, 1):
        if col in (6, 7):
            v = dt.date.fromisoformat(v)
        ws.cell(row=5, column=col, value=v)
    ws.conditional_formatting.add(f"A5:I{last}", FormulaRule(formula=['$I5="Expired"'], fill=PatternFill("solid", fgColor="F8C9C6")))
    ws.conditional_formatting.add(f"A5:I{last}", FormulaRule(formula=['$I5="Use soon"'], fill=PatternFill("solid", fgColor="FFE3A8")))
    ws.auto_filter.ref = f"A4:I{last}"
    footer_note(ws, last + 2, "Use soon = 90 days or fewer left. Change 90 in column I if you rotate on a different schedule. From " + SITE)
    wb.save(OUT / "siren-pantry-inventory.xlsx")


# ── 4. Off-grid power budget ──────────────────────────────────────────────
def power_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Power budget"
    ws["A1"] = "Off-grid power budget"
    ws["A1"].font = TITLE
    ws["A2"] = ("List what you want to run in an outage. Watts are on the device label or a plug-in power meter. "
                "The example devices are typical figures; replace them with your own.")
    ws["A2"].font = NOTE
    header(ws, 4, ["Device", "Watts", "Hours per day", "Watt-hours per day"], [36, 10, 14, 18])
    devices = [("Phone charging (x2)", 20, 3), ("Wi-Fi router and modem", 15, 24), ("LED lights (x3)", 30, 5),
               ("Laptop running Survival LLM", 60, 3), ("Box fan", 50, 6), ("CPAP machine (check yours)", 40, 8),
               ("Full-size fridge (average draw)", 60, 24), ("", None, None), ("", None, None), ("", None, None)]
    r = 5
    for name, w, h in devices:
        for col, v in ((1, name or None), (2, w), (3, h)):
            c = ws.cell(row=r, column=col, value=v)
            c.font, c.fill = INPUT, INPUT_FILL
        ws.cell(row=r, column=4, value=f"=B{r}*C{r}").font = BODY
        ws.cell(row=r, column=4).number_format = "#,##0"
        r += 1
    end = r - 1
    ws.cell(row=r, column=1, value="Total per day").font = BOLD
    t = ws.cell(row=r, column=4, value=f"=SUM(D5:D{end})")
    t.font, t.number_format = BOLD, "#,##0"
    total = r
    r += 2
    ws.cell(row=r, column=1, value="Your battery or power station").font = BOLD
    inputs = [("Battery capacity (Wh)", 1000, "From the product label"),
              ("Usable share of capacity", 0.85, "Assumption: inverter and conversion losses; LiFePO4 stations run about 85%"),
              ("Solar panel rating (W)", 200, "From the panel label"),
              ("Peak sun hours per day", 4, "Assumption: varies by place and season; look up your area"),
              ("Solar efficiency in real use", 0.75, "Assumption: angle, heat and cloud cut output")]
    refs = {}
    for label, v, note in inputs:
        r += 1
        ws.cell(row=r, column=1, value=label).font = BODY
        c = ws.cell(row=r, column=2, value=v)
        c.font, c.fill = INPUT, INPUT_FILL
        if v < 1:
            c.number_format = "0%"
        ws.cell(row=r, column=3, value=note).font = NOTE
        refs[label] = f"B{r}"
    ws.column_dimensions["C"].width = 14
    r += 2
    ws.cell(row=r, column=1, value="Results").font = BOLD
    cap, use, pw, sun, eff = (refs[k] for k in ("Battery capacity (Wh)", "Usable share of capacity", "Solar panel rating (W)",
                                                 "Peak sun hours per day", "Solar efficiency in real use"))
    results = [("Days the battery lasts with no sun", f"=IF(D{total}=0,0,{cap}*{use}/D{total})", "0.0"),
               ("Solar watt-hours per day", f"={pw}*{sun}*{eff}", "#,##0"),
               ("Daily balance with solar (Wh)", f"={pw}*{sun}*{eff}-D{total}", "#,##0;[Red]-#,##0"),
               ("Solar watts needed to cover every day", f"=IF({sun}*{eff}=0,0,D{total}/({sun}*{eff}))", "#,##0")]
    for label, f, fmt in results:
        r += 1
        ws.cell(row=r, column=1, value=label).font = BODY
        c = ws.cell(row=r, column=2, value=f)
        c.font, c.number_format = BOLD, fmt
    footer_note(ws, r + 2, "A negative daily balance means the battery runs down each day: cut loads or add solar. General information, not electrical advice. From " + SITE)
    wb.save(OUT / "siren-power-budget.xlsx")


# ── PDFs ──────────────────────────────────────────────────────────────────
INK = HexColor("#111111")
DIM = HexColor("#555555")
RULE = HexColor("#BBBBBB")
GREEN = HexColor("#1F8A4C")
W, H = letter
M = 48


class Doc:
    def __init__(self, path, title, subtitle):
        self.c = canvas.Canvas(str(path), pagesize=letter)
        self.c.setTitle(title)
        self.c.setAuthor("SIREN")
        self.title, self.subtitle, self.page = title, subtitle, 0
        self.new_page(first=True)

    def new_page(self, first=False):
        if not first:
            self.c.showPage()
        self.page += 1
        c = self.c
        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(M, H - 34, "SIREN FIELD MANUAL  ·  " + SITE.upper())
        c.setFillColor(DIM)
        c.setFont("Helvetica", 8)
        c.drawRightString(W - M, 28, f"Page {self.page}")
        c.drawString(M, 28, "General preparedness information, not professional advice.")
        self.y = H - 56
        if first:
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 22)
            c.drawString(M, self.y - 12, self.title)
            c.setFont("Helvetica", 10)
            c.setFillColor(DIM)
            self.y -= 32
            for line in wrap(self.subtitle, 100):
                c.drawString(M, self.y, line)
                self.y -= 13
            self.y -= 8

    def need(self, h):
        if self.y - h < 48:
            self.new_page()

    def heading(self, text):
        self.need(40)
        c = self.c
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(M, self.y - 10, text)
        c.setStrokeColor(RULE)
        c.line(M, self.y - 15, W - M, self.y - 15)
        self.y -= 26

    def box_item(self, text, detail=None, x=M, width=W - 2 * M, size=10):
        lines = wrap(text, int(width / (size * 0.5)))
        dl = wrap(detail, int(width / 4.2)) if detail else []
        h = 13 * len(lines) + 10 * len(dl) + 5
        self.need(h)
        c = self.c
        c.setStrokeColor(INK)
        c.rect(x, self.y - 9, 8, 8)
        c.setFillColor(INK)
        c.setFont("Helvetica", size)
        yy = self.y - 8
        for ln in lines:
            c.drawString(x + 15, yy, ln)
            yy -= 13
        c.setFillColor(DIM)
        c.setFont("Helvetica", 8)
        for ln in dl:
            c.drawString(x + 15, yy + 2, ln)
            yy -= 10
        self.y -= h

    def blank(self, label, lines=1):
        self.need(22 * lines + 6)
        c = self.c
        c.setFillColor(DIM)
        c.setFont("Helvetica", 9)
        c.drawString(M, self.y - 8, label)
        c.setStrokeColor(RULE)
        for i in range(lines):
            c.line(M + 210, self.y - 10 - i * 22, W - M, self.y - 10 - i * 22)
        self.y -= 22 * lines + 4

    def save(self):
        self.c.save()


def wrap(text, n):
    words, out, cur = str(text).split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > n and cur:
            out.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        out.append(cur)
    return out


def checklist_pdf(checklist, only72, path, title, subtitle):
    d = Doc(path, title, subtitle)
    for _sid, name, why, items in checklist:
        rows = [i for i in items if (i[3] or not only72)]
        if not rows:
            continue
        d.heading(name)
        for i in rows:
            # The page's "calculator above" is the spreadsheet in a printout.
            d.box_item(i[1], (i[2] or "").replace("the calculator above", "the SIREN water and food calculator"))
        d.y -= 6
    d.save()


def family_plan_pdf(path):
    d = Doc(path, "Family emergency plan",
            "Fill this in together, keep one copy in every go-bag and one at home. Based on the Ready.gov family plan.")
    d.heading("Household")
    for _ in range(5):
        d.blank("Name / date of birth / phone")
    d.blank("Medical needs, medicines, allergies", 3)
    d.heading("Contacts")
    for label in ("Out-of-area contact (everyone calls them)", "Local contact", "Doctor / pharmacy", "Insurance and policy number",
                  "School or daycare", "Workplaces", "Veterinarian", "Utility companies (power, gas, water)"):
        d.blank(label)
    d.heading("Where we meet")
    for label in ("Just outside the house", "In the neighbourhood", "Outside town", "Evacuation route 1", "Evacuation route 2"):
        d.blank(label)
    d.heading("The house")
    for label in ("Water shut-off is at", "Gas shut-off is at (and the wrench)", "Electrical panel is at",
                  "Fire extinguishers are at", "Go-bags are at", "Spare keys are with"):
        d.blank(label)
    d.heading("Pets")
    d.blank("Names, microchip numbers, food, medicines", 2)
    d.heading("Agreed rules")
    for t in ("Text first; calls clog the network.", "If separated, call the out-of-area contact.",
              "Never run a generator, grill or camp stove indoors.", "Practise this plan twice a year."):
        d.box_item(t)
    d.save()


def supply_pdf(catalog, path):
    total = sum(len(c[3]) for c in catalog)
    d = Doc(path, f"Supply Depot: {total:,} supplies",
            f"A printable checklist in {len(catalog)} categories. Tick what you have; circle what you need. "
            f"The searchable version is at {SITE}/supply-depot.html")
    colw = (W - 2 * M - 16) / 2
    for _id, title, intro, items in catalog:
        d.heading(f"{title}  ({len(items)})")
        half = (len(items) + 1) // 2
        left, right = items[:half], items[half:]
        for a, b in zip(left, right + [None] * (len(left) - len(right))):
            d.need(14)
            y0 = d.y
            d.box_item(a[0], None, x=M, width=colw, size=9)
            if b:
                d.y = y0
                d.box_item(b[0], None, x=M + colw + 16, width=colw, size=9)
            d.y = min(d.y, y0 - 14)
        d.y -= 6
    d.save()


def main():
    data = json.load(open(sys.argv[1]))
    OUT.mkdir(parents=True, exist_ok=True)
    supply_xlsx(data["catalog"])
    water_food_xlsx()
    pantry_xlsx()
    power_xlsx()
    checklist_pdf(data["checklist"], True, OUT / "siren-72-hour-kit-checklist.pdf", "72-hour kit checklist",
                  "The grab-and-go bag: what each person needs for three days away from home. Based on Ready.gov.")
    checklist_pdf(data["checklist"], False, OUT / "siren-two-week-home-checklist.pdf", "Two weeks at home checklist",
                  "Everything for a 72-hour kit and two weeks at home without power, water or the internet. Based on Ready.gov.")
    family_plan_pdf(OUT / "siren-family-emergency-plan.pdf")
    supply_pdf(data["catalog"], OUT / "siren-supply-depot-checklist.pdf")
    for p in sorted(OUT.iterdir()):
        print(f"{p.name}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
