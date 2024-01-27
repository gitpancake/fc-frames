import { HitForm } from "@/app/form";
import { NumHits } from "@/app/types";
import { kv } from "@vercel/kv";
import { Metadata, ResolvingMetadata } from "next";
import Head from "next/head";

async function getNumHits(id: string): Promise<NumHits> {
  let nullHits = {
    id: "",
    title: "No hits found",
    numHits: 0,
    created_at: 0,
  };

  try {
    let numHits: NumHits | null = await kv.hgetall(`num_hits:${id}`);

    if (!numHits) {
      return nullHits;
    }

    return numHits;
  } catch (error) {
    console.error(error);
    return nullHits;
  }
}

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  // read route params
  const id = params.id;
  const poll = await getNumHits(id);

  const fcMetadata: Record<string, string> = {
    "fc:frame": "vNext",
    "fc:frame:post_url": `${process.env["HOST"]}/api/vote?id=${id}`,
    "fc:frame:image": `${process.env["HOST"]}/api/image?id=${id}`,
  };
  [poll.title]
    .filter((o) => o !== "")
    .map((option, index) => {
      fcMetadata[`fc:frame:button:${index + 1}`] = option;
    });

  return {
    title: poll.title,
    openGraph: {
      title: poll.title,
      images: [`/api/image?id=${id}`],
    },
    other: {
      ...fcMetadata,
    },
    metadataBase: new URL(process.env["HOST"] || ""),
  };
}
function getMeta(poll: NumHits) {
  // This didn't work for some reason
  return (
    <Head>
      <meta property="og:image" content="" key="test"></meta>
      <meta property="og:title" content="My page title" key="title" />
    </Head>
  );
}

export default async function Page({ params }: { params: { id: string } }) {
  const numHits = await getNumHits(params.id);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-20 text-center">
          <HitForm numHits={numHits} />
        </main>
      </div>
    </>
  );
}
