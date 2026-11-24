import { getDb } from "./db";

/**
 * Bring older records onto the current date/time representation and establish
 * the indexes used by the public and per-user event lists.
 */
export async function prepareEventCollections() {
  const db = getDb();
  const events = db.collection("events");
  const participants = db.collection("eventParticipants");

  await events.updateMany(
    {
      startsAt: { $exists: false },
      eventDate: { $type: "date" },
      eventTime: { $type: "string" },
    },
    [
      {
        $set: {
          startsAt: {
            $dateFromString: {
              dateString: {
                $concat: [
                  {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$eventDate",
                      timezone: "UTC",
                    },
                  },
                  "T",
                  "$eventTime",
                  ":00",
                ],
              },
              timezone: "Asia/Dhaka",
              onError: null,
              onNull: null,
            },
          },
        },
      },
    ],
  );

  await Promise.all([
    events.createIndex({ startsAt: 1, _id: 1 }, { name: "events_upcoming_starts_at" }),
    events.createIndex(
      { createdById: 1, eventDate: 1, eventTime: 1 },
      { name: "events_creator_date" },
    ),
    participants.createIndex(
      { eventId: 1, userId: 1 },
      {
        unique: true,
        partialFilterExpression: { userId: { $type: "string" } },
        name: "event_participants_event_user_id_unique",
      },
    ),
    participants.createIndex(
      { eventId: 1, userEmail: 1 },
      { unique: true, name: "event_participants_event_user_email_unique" },
    ),
    participants.createIndex(
      { userId: 1, eventId: 1 },
      { name: "event_participants_user_id" },
    ),
    participants.createIndex(
      { userEmail: 1, eventId: 1 },
      { name: "event_participants_user_email" },
    ),
  ]);
}
