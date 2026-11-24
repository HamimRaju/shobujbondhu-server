import {
  createEvent as saveEvent,
  deleteOwnedEvent,
  findEventById,
  findEventsByCreator,
  findUpcomingEvents,
  getEventStartsAt,
  isEventOwnedBy,
  isEventUpcoming,
  updateOwnedEvent,
  type EventCreator,
  type EventDocument,
} from "../models/event.model";
import { asyncHandler } from "../utils/async-handler";
import type { AuthContext } from "../middleware/require-auth";
import { AppError } from "../utils/app-error";

function creatorFromResponse(res: {
  locals: Record<string, unknown>;
}): EventCreator {
  const { user } = res.locals.auth as AuthContext;
  return { email: user.email, id: user.id };
}

function eventResponse(event: EventDocument) {
  return {
    ...event,
    _id: event._id.toHexString(),
    startsAt: getEventStartsAt(event),
    isUpcoming: isEventUpcoming(event),
  };
}

function publicEventResponse(event: EventDocument) {
  return {
    _id: event._id.toHexString(),
    title: event.title,
    description: event.description,
    category: event.category,
    imageUrl: event.imageUrl,
    location: event.location,
    eventDate: event.eventDate,
    eventTime: event.eventTime,
    startsAt: getEventStartsAt(event),
    isUpcoming: isEventUpcoming(event),
  };
}

export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const rawLimit = req.query.limit;
  if (rawLimit !== undefined && typeof rawLimit !== "string") {
    throw new AppError(400, "INVALID_LIMIT", "Limit must be a single integer.");
  }
  const parsedLimit = rawLimit === undefined ? 100 : Number(rawLimit);
  if (
    (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)
  ) {
    throw new AppError(400, "INVALID_LIMIT", "Limit must be an integer from 1 to 100.");
  }

  const events = await findUpcomingEvents(new Date(), parsedLimit);
  res.setHeader("Cache-Control", "no-store");
  res.json({ data: { events: events.map(publicEventResponse) } });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await findEventById(req.params.id as string);
  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({ data: { event: publicEventResponse(event) } });
});

function assertEventExistsAndIsOwned(
  event: EventDocument | null,
  creator: EventCreator,
): asserts event is EventDocument {
  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }
  if (!isEventOwnedBy(event, creator)) {
    throw new AppError(403, "FORBIDDEN", "You do not own this event.");
  }
}

export const createEvent = asyncHandler(async (req, res) => {
  const event = await saveEvent(req.body, creatorFromResponse(res));

  res.status(201).json({
    message: "Event created successfully.",
    data: {
      event: eventResponse(event),
    },
  });
});

export const getMyEvents = asyncHandler(async (_req, res) => {
  const events = await findEventsByCreator(creatorFromResponse(res));
  res.json({
    data: {
      events: events.map(eventResponse),
    },
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const creator = creatorFromResponse(res);
  const id = req.params.id as string;
  const existingEvent = await findEventById(id);
  assertEventExistsAndIsOwned(existingEvent, creator);

  const event = await updateOwnedEvent(id, req.body, creator, existingEvent);
  if (!event) {
    const currentEvent = await findEventById(id);
    assertEventExistsAndIsOwned(currentEvent, creator);
    throw new AppError(
      409,
      "EVENT_UPDATE_CONFLICT",
      "The event could not be updated. Please try again.",
    );
  }

  res.json({
    message: "Event updated successfully.",
    data: {
      event: eventResponse(event),
    },
  });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const creator = creatorFromResponse(res);
  const id = req.params.id as string;
  const existingEvent = await findEventById(id);
  assertEventExistsAndIsOwned(existingEvent, creator);

  const deleted = await deleteOwnedEvent(id, creator);
  if (!deleted) {
    const currentEvent = await findEventById(id);
    assertEventExistsAndIsOwned(currentEvent, creator);
    throw new AppError(
      409,
      "EVENT_DELETE_CONFLICT",
      "The event could not be deleted. Please try again.",
    );
  }

  res.json({ message: "Event deleted successfully." });
});
