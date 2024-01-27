import { NumHits } from "@/app/types";
import { Message, getSSLHubRpcClient } from "@farcaster/hub-nodejs";
import { kv } from "@vercel/kv";
import type { NextApiRequest, NextApiResponse } from "next";

const HUB_URL = process.env["HUB_URL"] || "nemes.farcaster.xyz:2283";
const client = getSSLHubRpcClient(HUB_URL);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Process the vote
    // For example, let's assume you receive an option in the body
    try {
      const numHitsId = req.query["id"];
      const results = req.query["results"] === "true";
      let voted = req.query["voted"] === "true";

      if (!numHitsId) {
        return res.status(400).send("Missing num hits ID");
      }

      let validatedMessage: Message | undefined = undefined;

      try {
        const frameMessage = Message.decode(Buffer.from(req.body?.trustedData?.messageBytes || "", "hex"));
        const result = await client.validateMessage(frameMessage);
        if (result.isOk() && result.value.valid) {
          validatedMessage = result.value.message;
        }
      } catch (e) {
        return res.status(400).send(`Failed to validate message: ${e}`);
      }

      const fid = validatedMessage?.data?.fid || 0;
      const alreadyVoted = await kv.get(`num_hits:${numHitsId}:votes:${fid}`);
      voted = voted || !!alreadyVoted;

      if (!results && !voted) {
        let multi = kv.multi();
        multi.hincrby(`num_hits:${numHitsId}`, `numHits`, 1);
        multi.set(`num_hits:${numHitsId}:votes:${fid}`, true);
        await multi.exec();
      }

      let numHits: NumHits | null = await kv.hgetall(`num_hits:${numHitsId}`);

      if (!numHits) {
        return res.status(400).send("Missing num hits ID");
      }

      const imageUrl = `${process.env["HOST"]}/api/image?id=${numHits.id}&results=${results ? "false" : "true"}&date=${Date.now()}${fid > 0 ? `&fid=${fid}` : ""}`;
      let button1Text = `u good`;

      if (!voted && !results) {
        button1Text = numHits.title;
      } else if (voted && !results) {
        button1Text = `u good?`;
      } else if (voted && results) {
        button1Text = `u good`;
      }

      // Return an HTML response
      res.setHeader("Content-Type", "text/html");
      res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${numHits.title} recorded</title>
          <meta property="og:title" content="${numHits.title} recorded">
          <meta property="og:image" content="${imageUrl}">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="${imageUrl}">
          <meta name="fc:frame:post_url" content="${process.env["HOST"]}/api/vote?id=${numHits.id}&voted=true&results=${results ? "false" : "true"}">
          <meta name="fc:frame:button:1" content="${button1Text}">
        </head>
        <body>
          <p>${results || voted ? `You have already said ${numHits.title}` : `Your ${numHits.title} has been recorded for fid ${fid}.`}</p>
        </body>
      </html>
    `);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating image");
    }
  } else {
    // Handle any non-POST requests
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
