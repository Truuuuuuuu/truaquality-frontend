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
- Temperature sensor hardware is confirmed: a DS18B20 waterproof probe, verified end-to-end on a real
  ESP32 unit (real readings landing in the database and dashboard). Turbidity is the next sensor to be
  added; its hardware is not yet selected/recorded (TBD).
- Firmware (`../firmware`) publishes real signed MQTT readings (see `../firmware/CLAUDE.md`); the backend
  (`../backend`) has full pond/device/reading data models and an MQTT subscriber (see `../backend/CLAUDE.md`).

## Capabilities and Constraints

- Currently monitored parameter: temperature. Turbidity is next; further water quality parameters are
  planned but not yet decided.
- Readings that fall outside a safe range must be visually flagged, not just displayed as plain numbers.
- Devices report frequently; the dashboard must show a per-reading last-updated time and flag a device as
  stale/offline when it stops reporting, rather than silently displaying an old value as current.
- Deployment site and sensor hardware are confirmed to exist but their specifics are undecided/unrecorded
  — do not invent site names, coordinates, or hardware part numbers.
- The system covers multiple ponds, each with at most one ESP32 device. Devices publish signed
  readings over MQTT to HiveMQ Cloud, and the backend subscribes and stores them. The dashboard polls the
  backend every 15 s; the browser never connects to the broker.

## Evidence on Hand

Real temperature readings from a DS18B20 probe on one ESP32 unit have been verified flowing end-to-end
(device → MQTT → backend → database → dashboard). No real turbidity data, historical
readings at scale, screenshots, or a deployment site exist yet. Do not fabricate sample readings, site
names, or device specs presented as real; use clearly-marked placeholder/sample data where a build needs
example values beyond that one verified reading.

## Product Principles

- Readings must be legible and trustworthy enough to support real pond-management decisions, not just
  look like a dashboard.
- Design around temperature now (turbidity next), but structure the system so additional
  water quality parameters can be added later without rework.
- Built for a government aquaculture agency's field/operations staff — clarity, reliability, and
  scanability outrank cosmetic flourish.
- Treat sensor/connectivity data as intermittent and hardware-sourced: surface staleness, gaps, and
  out-of-range readings rather than assuming a clean constant stream.

## Accessibility & Inclusion

Must meet WCAG 2.1 AA.
