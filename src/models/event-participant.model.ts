import { ObjectId, type Filter } from "mongodb";
import { getDb } from "../config/db";
import type { EventDocument } from "./event.model";

export type ParticipantIdentity = {
  email: string;
  id?: string;
};

export type EventParticipant = {
  _id: ObjectId;
  eventId: ObjectId;
  userId?: string;
  userEmail: string;
  joinedAt: Date;
};

export type JoinedEventSummary = {
  _id: ObjectId;
  title: string;
  description: string;
  category: EventDocument["category"];
  imageUrl: string;
  location: string;
  eventDate: Date;
  eventTime: string;
};

export type JoinedEventRecord = {
  joinedAt: Date;
  event: JoinedEventSummary;
};

let indexesReady: Promise<void> | undefined;

async function getParticipantCollection() {
  const collection = getDb().collection<EventParticipant>("eventParticipants");
  if (!indexesReady) {
    indexesReady = (async () => {
      await collection.createIndex(
        { eventId: 1, userId: 1 },
        {
          unique: true,
          partialFilterExpression: { userId: { $type: "string" } },
          name: "event_participants_event_user_id_unique",
        },
      );
      await collection.createIndex(
        { eventId: 1, userEmail: 1 },
        {
          unique: true,
          name: "event_participants_event_user_email_unique",
        },
      );
    })().catch((error: unknown) => {
      indexesReady = undefined;
      throw error;
    });
  }

  await indexesReady;
  return collection;
}

function participantOwnerFilter(
  identity: ParticipantIdentity,
): Filter<EventParticipant> {
  const conditions: Filter<EventParticipant>[] = [];
  if (identity.id) {
    conditions.push({ userId: identity.id });
  }
  // Include legacy participant records created before a user ID was stored.
  conditions.push({
    userEmail: identity.email,
    userId: { $exists: false },
  });
  return { $or: conditions };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function addEventParticipant(
  eventId: ObjectId,
  identity: ParticipantIdentity,
): Promise<EventParticipant | null> {
  const collection = await getParticipantCollection();
  const participant: EventParticipant = {
    _id: new ObjectId(),
    eventId,
    ...(identity.id ? { userId: identity.id } : {}),
    userEmail: identity.email,
    joinedAt: new Date(),
  };

  try {
    await collection.insertOne(participant);
    return participant;
  } catch (error) {
    if (isDuplicateKeyError(error)) return null;
    throw error;
  }
}

export async function findJoinedEvents(
  identity: ParticipantIdentity,
): Promise<JoinedEventRecord[]> {
  const collection = await getParticipantCollection();
  return collection
    .aggregate<JoinedEventRecord>([
      { $match: participantOwnerFilter(identity) },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      // Missing/deleted events have no lookup result and are omitted.
      { $unwind: "$event" },
      {
        $match: {
          "event._id": { $type: "objectId" },
          "event.eventDate": { $type: "date" },
          "event.eventTime": { $type: "string" },
        },
      },
      { $sort: { "event.eventDate": 1, "event.eventTime": 1, joinedAt: 1 } },
      {
        $project: {
          _id: 0,
          joinedAt: 1,
          event: {
            _id: "$event._id",
            title: "$event.title",
            description: "$event.description",
            category: "$event.category",
            imageUrl: "$event.imageUrl",
            location: "$event.location",
            eventDate: "$event.eventDate",
            eventTime: "$event.eventTime",
          },
        },
      },
    ])
    .toArray();
}
