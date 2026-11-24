import { ObjectId, type Filter } from "mongodb";
import { getDb } from "../config/db.js";
import { AppError } from "../utils/app-error.js";
import type { EventCategory } from "../constants/event-categories.js";
import type {
  CreateEventInput,
  UpdateEventInput,
} from "../validators/event.validator.js";

export type EventDocument = {
  _id: ObjectId;
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  location: string;
  eventDate: Date;
  eventTime: string;
  /** Absolute start instant. Event date/time inputs use Bangladesh's +06:00 offset. */
  startsAt?: Date;
  createdBy: string;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EventCreator = {
  email: string;
  id?: string;
};

const BANGLADESH_OFFSET = "+06:00";

export function getEventStartsAt(
  event: Pick<EventDocument, "eventDate" | "eventTime" | "startsAt">,
): Date {
  if (event.startsAt instanceof Date && !Number.isNaN(event.startsAt.getTime())) {
    return event.startsAt;
  }

  const date = event.eventDate.toISOString().slice(0, 10);
  return new Date(`${date}T${event.eventTime}:00${BANGLADESH_OFFSET}`);
}

function toStartsAt(eventDate: string, eventTime: string): Date {
  return new Date(`${eventDate}T${eventTime}:00${BANGLADESH_OFFSET}`);
}

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
    startsAt: toStartsAt(input.eventDate, input.eventTime),
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

  const startsAt = getEventStartsAt(event);
  return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > now.getTime();
}

export async function findUpcomingEvents(
  now = new Date(),
  limit?: number,
): Promise<EventDocument[]> {
  const cursor = getDb()
    .collection<EventDocument>("events")
    .find({ startsAt: { $gt: now } })
    .sort({ startsAt: 1, _id: 1 });

  // The home page passes six explicitly; the public events page lists every
  // upcoming event when it omits the query limit.
  return (limit === undefined ? cursor : cursor.limit(limit)).toArray();
}

export async function updateOwnedEvent(
  id: string,
  input: UpdateEventInput,
  creator: EventCreator,
  existingEvent: EventDocument,
): Promise<EventDocument | null> {
  const { eventDate, eventTime, ...fields } = input;
  const nextDate = eventDate ?? existingEvent.eventDate.toISOString().slice(0, 10);
  const nextTime = eventTime ?? existingEvent.eventTime;
  const startsAt = toStartsAt(nextDate, nextTime);
  const scheduleChanged = eventDate !== undefined || eventTime !== undefined;

  if (
    scheduleChanged &&
    (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now())
  ) {
    throw new AppError(
      400,
      "EVENT_NOT_UPCOMING",
      "Event date and time must be in the future.",
    );
  }

  const setFields: Partial<EventDocument> = {
    ...fields,
    ...(eventDate
      ? { eventDate: new Date(`${eventDate}T00:00:00.000Z`) }
      : {}),
    ...(eventTime ? { eventTime } : {}),
    startsAt:
      scheduleChanged || !existingEvent.startsAt
        ? startsAt
        : existingEvent.startsAt,
    updatedAt: new Date(),
  };

  return getDb()
    .collection<EventDocument>("events")
    .findOneAndUpdate(
      {
        _id: new ObjectId(id),
        ...eventOwnerFilter(creator),
        updatedAt: existingEvent.updatedAt,
      },
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
  if (result.deletedCount === 1) {
    await getDb()
      .collection("eventParticipants")
      .deleteMany({ eventId: new ObjectId(id) });
  }
  return result.deletedCount === 1;
}
