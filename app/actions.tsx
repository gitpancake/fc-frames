"use server";

import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NumHits } from "./types";

export async function saveNumHits(numhits: NumHits, formData: FormData) {
  let newNumHits = {
    ...numhits,
    created_at: Date.now(),
    title: formData.get("title") as string,
  };

  await kv.hset(`num_hits:${numhits.id}`, numhits);
  await kv.zadd("num_hits_by_date", {
    score: Number(numhits.created_at),
    member: newNumHits.id,
  });

  revalidatePath("/num_hits");
  redirect(`/num_hits/${numhits.id}`);
}

export async function giveHit(numHits: NumHits, optionIndex: number) {
  await kv.hincrby(`num_hit:${numHits.id}`, `numHits${optionIndex}`, 1);

  revalidatePath(`/num_hits/${numHits.id}`);
  redirect(`/num_hits/${numHits.id}?results=true`);
}

export async function redirectToNumHits() {
  redirect("/num_hits");
}
