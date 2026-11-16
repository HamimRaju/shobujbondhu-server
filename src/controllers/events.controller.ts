import {
  createEvent as saveEvent,
  deleteOwnedEvent,
  findEventById,
  findEventsByCreator,
  isEventOwnedBy,
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
  };
}

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

  const event = await updateOwnedEvent(id, req.body, creator);
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
