import assert from "node:assert/strict";
import test from "node:test";
import { createEventSchema, updateEventSchema } from "../validators/event.validator";

function todayInBangladesh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount))
    .toISOString()
    .slice(0, 10);
}

const validEvent = {
  title: "Neighbourhood tree planting",
  description: "Plant native trees in the local park.",
  category: "Tree Plantation",
  imageUrl: "https://images.example.org/trees.jpg",
  location: "Mirpur 10, Dhaka",
  eventDate: shiftDate(todayInBangladesh(), 2),
  eventTime: "09:00",
};

test("create event accepts a future Bangladesh date and time", () => {
  assert.equal(createEventSchema.safeParse(validEvent).success, true);
});

test("create event rejects today even when the selected time is later", () => {
  assert.equal(
    createEventSchema.safeParse({
      ...validEvent,
      eventDate: todayInBangladesh(),
      eventTime: "23:59",
    }).success,
    false,
  );
});

test("create event rejects past dates", () => {
  assert.equal(
    createEventSchema.safeParse({
      ...validEvent,
      eventDate: shiftDate(todayInBangladesh(), -1),
    }).success,
    false,
  );
});

test("event update requires at least one valid field", () => {
  assert.equal(updateEventSchema.safeParse({}).success, false);
  assert.equal(
    updateEventSchema.safeParse({ title: "Updated neighbourhood event" }).success,
    true,
  );
});
