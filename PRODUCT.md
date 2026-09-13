# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The client is **BFAR Sorsogon** (Bureau of Fisheries and Aquatic Resources). The system handles
operations only for BFAR Sorsogon — it is not a multi-region or multi-office product. Primary users are
BFAR Sorsogon staff/operators responsible for a fish pond, monitoring water quality conditions to protect
stocked fish and support pond management decisions. Accounts are invite-only: an admin creates every user.

## Product Purpose

TruAquality is an IoT-based water quality monitoring system for fish ponds. ESP32-based hardware at the
pond reads water quality sensors and reports into a backend, which the frontend dashboard visualizes so
BFAR Sorsogon staff can see current and historical pond conditions without manual on-site testing.

## Positioning

A purpose-built monitoring pipeline for fish pond aquaculture (sensor hardware → backend → dashboard),
tracking the specific water parameters that matter for stocked fish health, rather than a generic
environmental-monitoring dashboard.

## Operating Context

- A real pond deployment site managed by BFAR Sorsogon exists for this system; exact site details are
  not yet recorded (TBD).
- Specific sensor hardware for the ESP32 has already been selected; exact modules/part numbers are not
  yet recorded (TBD).
- Firmware (`../firmware`) is currently unbuilt scaffold; the backend (`../backend`) is Express/Prisma/
  Supabase with auth in place but no pond/sensor data models yet.

## Capabilities and Constraints

- Currently monitored parameters: temperature, dissolved oxygen, and salinity. Additional water quality
  parameters are planned but not yet decided.
- Readings that fall outside a safe range must be visually flagged, not just displayed as plain numbers.
- Devices report frequently; the dashboard must show a per-reading last-updated time and flag a device as
  stale/offline when it stops reporting, rather than silently displaying an old value as current.
- Deployment site and sensor hardware are confirmed to exist but their specifics are undecided/unrecorded
  — do not invent site names, coordinates, or hardware part numbers.
- No sensor/pond data models, ingestion endpoints, or real-time data flow exist in the backend yet.

## Evidence on Hand

No real sensor data, historical readings, screenshots, or hardware documentation are available yet. Do
not fabricate sample readings, site names, or device specs presented as real; use clearly-marked
placeholder/sample data where a build needs example values.

## Product Principles

- Readings must be legible and trustworthy enough to support real pond-management decisions, not just
  look like a dashboard.
- Design around temperature, dissolved oxygen, and salinity now, but structure the system so additional
  water quality parameters can be added later without rework.
- Built for a government aquaculture agency's field/operations staff — clarity, reliability, and
  scanability outrank cosmetic flourish.
- Treat sensor/connectivity data as intermittent and hardware-sourced: surface staleness, gaps, and
  out-of-range readings rather than assuming a clean constant stream.

## Accessibility & Inclusion

Must meet WCAG 2.1 AA.
