[README.md](https://github.com/user-attachments/files/25889420/README.1.md)
# OpsPulse — Quick Commerce Intelligence Dashboard

OpsPulse is a real-time health monitoring dashboard built specifically for the fast-paced world of quick commerce. Unlike conventional dashboards that simply display raw numbers, OpsPulse goes a step further by computing a live **Business Stress Score** — giving operators an instant sense of how close (or far) they are from an operational crisis.

The platform was designed with the "10-minute delivery" promise in mind, transforming fragmented operational data into a single, actionable command center for business owners and ops managers alike.

---

## The Core Idea: Business Stress Score

The stress score is the heartbeat of OpsPulse. It's a weighted algorithm that continuously tracks four operational pillars:

- **Inventory Health** — Monitors real-time stock levels across product categories
- **Delivery Velocity** — Flags SLA breaches against the committed delivery window
- **Demand Pressure** — Measures incoming order rate against total fulfillment capacity
- **Customer Friction** — Tracks cancellation rates and sudden spikes in support tickets

As the score falls, the dashboard escalates its response — culminating in a full **War Room** mode when things get critical.

---

## Features

### Adaptive Role-Based Views

OpsPulse recognizes who's logged in and restructures itself accordingly:

- **Business Owner View** — Surfaces the big picture: revenue trends, rolling 14-point delivery averages, and cancellation radar charts
- **Operations Manager View** — Focuses on what's happening right now: live category stock levels, active delivery partner status, and a prioritized action item queue

### Intelligent Incident Response

When the Stress Score dips below **40**, OpsPulse switches into a high-alert Red State — commonly called **War Room Mode**. This triggers:

- A structured emergency response checklist for the ops team
- A live scrolling ticker surfacing system-wide anomalies
- A toast notification system for time-sensitive alerts

### Built-in Scenario Engine (Demo Mode)

To make the demo experience worthwhile, we built a scenario simulation engine. With a single toggle, you can switch between three business states:

- **Normal Ops** — Everything is green; standard monitoring is active
- **Delivery Meltdown** — Simulates SLA breaches and a rising stress score
- **Peak Opportunity** — High order volume with surge pricing indicators active

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI & Styling | HTML5, CSS3 with custom properties for a dynamic theming engine |
| Charts | Chart.js (line, radar, and stacked bar charts) |
| Logic | Vanilla JavaScript for state management and scoring algorithm |
| Typography | IBM Plex Mono (data readability) + Plus Jakarta Sans (UI copy) |

No build tools. No frameworks. Just clean, fast client-side code.

---

## Getting Started

Since OpsPulse runs entirely in the browser, setup is minimal:

1. Clone the repository
2. Open `opspulse_final.html` directly in your browser
3. Log in using one of the demo accounts below:

| Role | Email | Password |
|---|---|---|
| Business Owner | owner@opspulse.com | owner123 |
| Operations Manager | manager@opspulse.com | ops2024 |

---

## Reflections

Building OpsPulse taught us a lot, not just about code, but also about the complexity hidden inside products we take for granted every day. Making a dashboard feel truly *live* and *responsive* (not just visually, but in how it thinks about data) turned out to be a much deeper challenge than we initially expected.

We also learned that design decisions aren't just about how things look — they're about what information earns the right to be on screen, and for whom. Tailoring the same underlying data into two different role-based views forced us to think carefully about what each person actually needs in a high-pressure moment.

This project pushed us to take ownership of something end-to-end, and that feeling of accountability — for every bug, every layout decision, every edge case — is something we're taking forward.

---

*-----------------------------------------------------------Built by Team Parallax---------------------------------------------------------*
