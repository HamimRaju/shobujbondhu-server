import {
  addEventParticipant,
  countEventParticipants,
  findJoinedEvents,
  hasJoinedEvent,
} from "../models/event-participant.model.js";
import {
  findEventById,
  getEventStartsAt,
  isEventUpcoming,
} from "../models/event.model.js";
import type { AuthContext } from "../middleware/require-auth.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";

function participantIdentity(res: {
  locals: Record<string, unknown>;
}) {
  const { user } = res.locals.auth as AuthContext;
  return { id: user.id, email: user.email };
}

export const joinEvent = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params as { id: string };
  const event = await findEventById(eventId);
  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }
  if (!isEventUpcoming(event)) {
    throw new AppError(
      400,
      "EVENT_NOT_UPCOMING",
      "Only upcoming events can be joined.",
    );
  }

  const participant = await addEventParticipant(
    event._id,
    participantIdentity(res),
  );
  if (!participant) {
    throw new AppError(
      409,
      "EVENT_ALREADY_JOINED",
      "You have already joined this event.",
    );
  }

  res.status(201).json({
    message: "Joined event successfully.",
    data: {
      participation: {
        eventId: participant.eventId.toHexString(),
        joinedAt: participant.joinedAt,
      },
    },
  });
});

export const getEventParticipation = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const event = await findEventById(id);
  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  const identity = participantIdentity(res);
  const [joined, participantCount] = await Promise.all([
    hasJoinedEvent(event._id, identity),
    countEventParticipants(event._id),
  ]);

  res.setHeader("Cache-Control", "no-store");
  res.json({
    data: {
      participation: {
        joined,
        participantCount,
        isUpcoming: isEventUpcoming(event),
      },
    },
  });
});

export const getJoinedEvents = asyncHandler(async (_req, res) => {
  const records = await findJoinedEvents(participantIdentity(res));
  res.setHeader("Cache-Control", "no-store");
  res.json({
    data: {
      joinedEvents: records.map(({ event, joinedAt }) => ({
        joinedAt,
        event: {
          ...event,
          _id: event._id.toHexString(),
          startsAt: getEventStartsAt(event),
        },
      })),
    },
  });
});
