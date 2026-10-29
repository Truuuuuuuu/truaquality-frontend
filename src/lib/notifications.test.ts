/// <reference types="node" />
import assert from "node:assert/strict"
import { test } from "node:test"
import type { AppNotification } from "@/lib/api"
import {
  describeNotification,
  notificationPond,
  notificationStatus,
} from "@/lib/notifications"

function event(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: "review-notification",
    kind: "ALERT_OPENED",
    severity: "WARNING",
    value: 5,
    recordedAt: "2026-10-29T09:00:00Z",
    readAt: null,
    createdAt: "2026-10-29T09:00:00Z",
    direction: "low",
    alert: {
      id: "review-alert",
      parameter: "dissolvedOxygen",
      resolvedAt: null,
      pond: { id: "review-pond", name: "Review pond", pondType: null },
    },
    device: null,
    ...overrides,
  }
}

test("DO low notifications retain server warning and critical event semantics", () => {
  assert.deepEqual(describeNotification(event()), {
    title: "Dissolved oxygen too low",
    reading: "5.00 mg/L",
    status: "warning",
  })
  assert.deepEqual(
    describeNotification(
      event({ kind: "ALERT_ESCALATED", severity: "CRITICAL", value: 0 })
    ),
    {
      title: "Dissolved oxygen critically low",
      reading: "0.00 mg/L",
      status: "critical",
    }
  )
  assert.equal(
    notificationStatus(event({ severity: "CRITICAL", value: 7.23 })),
    "critical"
  )
})

test("resolved DO event is nominal because of the server event, not its value", () => {
  assert.deepEqual(
    describeNotification(
      event({ kind: "ALERT_RESOLVED", severity: "CRITICAL", value: 7.23 })
    ),
    {
      title: "Dissolved oxygen back to normal",
      reading: "7.23 mg/L",
      status: "nominal",
    }
  )
  assert.equal(
    describeNotification(event({ kind: "ALERT_RESOLVED", value: 0 })).status,
    "nominal"
  )
})

test("null or unknown direction uses neutral event wording", () => {
  for (const direction of [null, "unexpected"] as const) {
    const notification = event({
      direction: direction as AppNotification["direction"],
    })
    assert.equal(
      describeNotification(notification).title,
      "Dissolved oxygen alert"
    )
    assert.equal(
      describeNotification({ ...notification, kind: "ALERT_ESCALATED" }).title,
      "Dissolved oxygen alert escalated"
    )
  }
  assert.equal(
    describeNotification(event({ direction: "high" })).title,
    "Dissolved oxygen too high"
  )
})

test("legacy temperature, turbidity and pH titles and precision stay unchanged", () => {
  const cases = [
    ["temperature", "high", 33.4, "Temperature too high", "33.4 °C"],
    ["turbidity", "high", 60, "Turbidity too high", "60.0 NTU"],
    ["ph", "low", 6.2, "pH too low (acidic)", "6.2"],
    ["ph", "high", 9.2, "pH too high (alkaline)", "9.2"],
  ] as const
  for (const [parameter, direction, value, title, reading] of cases) {
    const notification = event({ direction, value })
    notification.alert!.parameter = parameter
    assert.deepEqual(describeNotification(notification), {
      title,
      reading,
      status: "warning",
    })
  }
})

test("missing/nonfinite values stay absent and unknown parameter names are safe", () => {
  for (const value of [null, NaN, Infinity])
    assert.equal(
      describeNotification(event({ value })).reading,
      "No value recorded"
    )
  const notification = event({ value: 1.25 })
  notification.alert!.parameter = "constructor"
  assert.equal(describeNotification(notification).title, "constructor too low")
  assert.equal(describeNotification(notification).reading, "1.25")
})

test("describing reference-colored values cannot mutate notification state", () => {
  const notification = event({ value: 7.23 })
  const before = structuredClone(notification)
  assert.equal(describeNotification(notification).status, "warning")
  assert.deepEqual(notification, before)
  assert.equal(notificationPond(notification).id, "review-pond")
})

test("device offline and online wording stays independent of parameter metadata", () => {
  const notification = event({
    kind: "DEVICE_OFFLINE",
    severity: "CRITICAL",
    value: null,
    direction: null,
    alert: null,
    device: {
      id: "review-device",
      serial: "REVIEW-UNIT",
      label: "Review unit",
      pond: { id: "review-pond", name: "Review pond" },
    },
  })
  assert.deepEqual(describeNotification(notification), {
    title: "Review unit went offline",
    reading: "Review unit",
    status: "critical",
  })
  assert.equal(
    describeNotification({ ...notification, kind: "DEVICE_ONLINE" }).title,
    "Review unit back online"
  )
  assert.equal(notificationPond(notification).id, "review-pond")
})
