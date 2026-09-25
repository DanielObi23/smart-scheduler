"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { tasks } from "@/db/schema";
import { requireUserId } from "@/lib/auth/require-user-id";

const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  notes: z.string().trim().optional(),
  estimatedTime: z.coerce.number().int().positive("Must be at least 1 minute"),
  importance: z.coerce.number().int().min(1).max(5),
  dueDateTime: z.coerce.date(),
  state: z.enum(["todo", "in_progress", "done"]),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

function revalidateTaskPages() {
  revalidatePath("/calendar");
  revalidatePath("/board");
  revalidatePath("/overdue");
}

export async function createTask(input: TaskInput) {
  const userId = await requireUserId();

  const data = taskInputSchema.parse(input);

  await db.insert(tasks).values({
    id: crypto.randomUUID(),
    userId,
    title: data.title,
    notes: data.notes,
    estimatedTime: data.estimatedTime,
    importance: data.importance,
    dueDateTime: data.dueDateTime,
    state: data.state,
  });

  revalidateTaskPages();
}

export async function updateTask(id: string, input: TaskInput) {
  const userId = await requireUserId();

  const data = taskInputSchema.parse(input);

  await db
    .update(tasks)
    .set({
      title: data.title,
      notes: data.notes,
      estimatedTime: data.estimatedTime,
      importance: data.importance,
      dueDateTime: data.dueDateTime,
      state: data.state,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  revalidateTaskPages();
}

export async function deleteTask(id: string) {
  const userId = await requireUserId();

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  revalidateTaskPages();
}

export async function setTaskState(id: string, state: TaskInput["state"]) {
  const userId = await requireUserId();

  await db
    .update(tasks)
    .set({ state, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  revalidateTaskPages();
}
