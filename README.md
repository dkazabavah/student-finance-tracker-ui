# Student Finance Tracker

A simple, accessible finance tracker that helps students record daily spending and stay organized.  
This responsive web app works fully offline and stores data locally in your browser.

## Overview

Student Finance Tracker allows users to:

- record daily expenses
- categorize spending
- monitor totals and trends
- search using regex patterns
- export and import data
- set spending caps

All data is stored locally for privacy and offline use.

## Setup Guide

### Clone repository

git clone https://github.com/dkazabavah/student-finance-tracker-ui.git

### Open project folder

cd student-finance-tracker-ui

### Run the app

Right-click **index.html** → Open with Live Server

## Features

### Expense Management
- Add, edit, and delete transactions
- Optional receipt image link
- Automatic timestamps

### Categories
Default:
Food, Books, Transport, Entertainment, Fees, Other  
Editable in settings.

### Dashboard & Statistics
- Total records
- Total spending
- Top category
- 7-day spending trend
- Monthly spending cap alerts

### Currency Support
- Base currency: RWF
- USD & EUR conversion
- Manual exchange rates

### Regex Search
Live search with match highlighting.

### Import / Export
- Export records to JSON
- Import JSON with validation

### Dark Mode
Light mode default with optional dark mode.

### Offline Storage
Data saved using localStorage.

## Regex Catalog

Description format  
^\S(?:.*\S)?$

Valid amount  
^(0|[1-9]\d*)(\.\d{1,2})?$

Date format  
^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$

Category format  
^[A-Za-z]+(?:[ -][A-Za-z]+)*$

Duplicate word detection  
\b(\w+)\s+\1\b

Cents search example  
\.\d{2}\b

Beverage search example  
(coffee|tea)

## Accessibility Notes

- Semantic HTML landmarks used
- Labels connected to inputs
- Visible focus indicators
- ARIA live regions for updates
- Keyboard-only navigation supported
- Screen reader friendly messages
- Adequate color contrast

## Testing

Open:

tests.html

This checks:

- regex validation
- duplicate word detection
- URL validation
- form rules

If all checks show ✓, validation is working.

## Data Storage

Data is saved in browser localStorage.

Export: Settings → Export JSON  
Import: Settings → Import JSON

## Tech Stack

HTML5  
CSS3  
Vanilla JavaScript  
localStorage  

No frameworks used

## Demo Video

https://drive.google.com/file/d/1ANUiNYifmuhVJHgJFOeY3tKpV9DN6BAs/view?usp=sharing

## Author

David Kazabavaho

GitHub: https://github.com/dkazabavah  
Email: d.kazabavah@alustudent.com