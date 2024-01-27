import { NumHits } from "@/app/types";
import { kv } from "@vercel/kv";
import * as fs from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import { join } from "path";
import satori from "satori";
import sharp from "sharp";

const fontPath = join(process.cwd(), "Black Canvas.otf");
let fontData = fs.readFileSync(fontPath);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const numHitsId = req.query["id"];
    // const fid = parseInt(req.query['fid']?.toString() || '')
    if (!numHitsId) {
      return res.status(400).send("Missing Num Hits ID");
    }

    let hits: NumHits | null = await kv.hgetall(`num_hits:${numHitsId}`);

    if (!hits) {
      return res.status(400).send("Missing  Num Hits ID");
    }

    const numHitsOptions = [hits.title].filter((option) => option !== "");

    const totalVotes = numHitsOptions
      // @ts-ignore
      .map((_option, _index) => parseInt(hits[`numHits`]))
      .reduce((a, b) => a + b, 0);

    const svg = await satori(
      <div
        style={{
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#8BF31B",
          padding: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#CE2C97", fontSize: "150px", marginBottom: 0, marginTop: 0 }}>{hits.title}</h3>
          <h3 style={{ textAlign: "center", color: "#CE2C97", fontSize: "190px", marginBottom: 0, marginTop: 0 }}>{totalVotes}</h3>
        </div>
      </div>,
      {
        width: 600,
        height: 400,
        fonts: [
          {
            data: fontData,
            name: "Black Canvas",
            style: "normal",
            weight: 200,
          },
        ],
      }
    );

    // Convert SVG to PNG using Sharp
    const pngBuffer = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();

    // Set the content type to PNG and send the response
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "max-age=10");
    res.send(pngBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
}
