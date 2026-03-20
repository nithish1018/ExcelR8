# ExcelR8

ExcelR8 is a fast Excel data duplication tool for generating bulk rows from a small sample.

You can paste one or more rows, choose a duplication count, and instantly produce output that is ready for:
- direct paste into an existing Excel sheet
- CSV download for import/open in Excel

## Project Motive

Many real-world Excel workflows require repeated rows for testing, demo data, migration prep, or manual process simulation.

Doing this by hand is slow and error-prone.

ExcelR8 exists to remove repetitive work and help users create accurate, scalable, spreadsheet-ready data in seconds.

## Primary Use Cases

- QA and testing teams creating large sample datasets
- Operations teams preparing repeat entries for process checks
- Product demos where realistic table sizes are needed quickly
- Data migration dry-runs with controlled duplicate data
- Anyone needing quick bulk row generation from a single source row or multiple source rows

## Key Features

- Paste single or multiple rows as input
- Supports tab-separated Excel paste and comma-separated values
- Optional header row support (collapsed by default)
- Quick duplication presets: 50, 100, 150, 200
- Custom duplication count input
- Copy for Excel (tab-separated output for proper column paste)
- Download CSV file
- Preview table before generation
- Modern, responsive UI with interactive guidance and animations

## How It Works

1. (Optional) Add a header row if your output needs column names.
2. Paste one or more source rows.
3. Choose a duplicate count (preset or custom).
4. Click Generate Data.
5. Use either:
- Copy for Excel to paste directly into an existing sheet
- Download .csv to open/import as a file

## Usage

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Output Notes

- Excel direct paste works best with the Copy for Excel action because it uses tab-separated values.
- CSV download is ideal when you want to open data as a separate file in Excel.

## Tech Stack

- React
- Vite
- Tailwind CSS
