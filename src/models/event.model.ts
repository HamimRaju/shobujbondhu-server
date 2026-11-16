import { ObjectId, type Filter } from "mongodb";
import { getDb } from "../config/db";
import type { EventCategory } from "../constants/event-categories";
import type {
  CreateEventInput,
  UpdateEventInput,
} from "../validators/event.validator";

export type EventDocument = {
  _id: ObjectId;
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  location: string;
  eventDate: Date;
  eventTime: string;
  createdBy: string;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EventCreator = {
  email: string;
  id?: string;
};

function eventOwnerFilter(creator: EventCreator): Filter<EventDocument> {
  const conditions: Filter<EventDocument>[] = [];
  if (creator.id) {
    conditions.push({ createdById: creator.id });
  }
  // Support legacy events that have an email but no stable creator ID.
  conditions.push({
    createdBy: creator.email,
    createdById: { $exists: false },
  });
  return { $or: conditions };
}

export function isEventOwnedBy(
  event: EventDocument,
  creator: EventCreator,
): boolean {
  if (event.createdById !== undefined) {
    return Boolean(creator.id) && event.createdById === creator.id;
  }
  return event.createdBy === creator.email;
}

export async function createEvent(
  input: CreateEventInput,
  creator: EventCreator,
): Promise<EventDocument> {
  const now = new Date();
  const event: EventDocument = {
    _id: new ObjectId(),
    ...input,
    eventDate: new Date(`${input.eventDate}T00:00:00.000Z`),
    createdBy: creator.email,
    ...(creator.id ? { createdById: creator.id } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await getDb().collection<EventDocument>("events").insertOne(event);
  return event;
}

export async function findEventsByCreator(
  creator: EventCreator,
): Promise<EventDocument[]> {
  return getDb()
    .collection<EventDocument>("events")
    .find(eventOwnerFilter(creator))
    .sort({ eventDate: 1, eventTime: 1 })
    .toArray();
}

export async function findEventById(id: string): Promise<EventDocument | null> {
  return getDb()
    .collection<EventDocument>("events")
    .findOne({ _id: new ObjectId(id) });
}

export function isEventUpcoming(
  event: EventDocument,
  now = new Date(),
): boolean {
  if (
    !(event.eventDate instanceof Date) ||
    Number.isNaN(event.eventDate.getTime()) ||
    typeof event.eventTime !== "string"
  ) {
    return false;
  }

  const date = event.eventDate.toISOString().slice(0, 10);
  const startsAt = new Date(`${date}T${event.eventTime}:00.000Z`);
  return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > now.getTime();
}

export async function updateOwnedEvent(
  id: string,
  input: UpdateEventInput,
  creator: EventCreator,
): Promise<EventDocument | null> {
  const { eventDate, ...fields } = input;
  const setFields: Partial<EventDocument> = {
    ...fields,
    ...(eventDate
      ? { eventDate: new Date(`${eventDate}T00:00:00.000Z`) }
      : {}),
    updatedAt: new Date(),
  };

  return getDb()
    .collection<EventDocument>("events")
    .findOneAndUpdate(
      { _id: new ObjectId(id), ...eventOwnerFilter(creator) },
      { $set: setFields },
      { returnDocument: "after" },
    );
}

export async function deleteOwnedEvent(
  id: string,
  creator: EventCreator,
): Promise<boolean> {
  const result = await getDb()
    .collection<EventDocument>("events")
    .deleteOne({ _id: new ObjectId(id), ...eventOwnerFilter(creator) });
  return result.deletedCount === 1;
}
