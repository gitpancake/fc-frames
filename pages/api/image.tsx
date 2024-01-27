import { NumHits } from "@/app/types";
import { kv } from "@vercel/kv";
import * as fs from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import { join } from "path";
import satori from "satori";
import sharp from "sharp";

const fontPath = join(process.cwd(), "Roboto-Regular.ttf");
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

    const showResults = req.query["results"] === "true";
    // let votedOption: number | null = null
    // if (showResults && fid > 0) {
    //     votedOption = await kv.hget(`poll:${pollId}:votes`, `${fid}`) as number
    // }

    const numHitsOptions = [hits.title].filter((option) => option !== "");

    const totalVotes = numHitsOptions
      // @ts-ignore
      .map((_option, _index) => parseInt(hits[`numHits`]))
      .reduce((a, b) => a + b, 0);
    const pollData = {
      question: showResults ? `Results for ${hits.title}` : hits.title,
      options: numHitsOptions.map((option, index) => {
        // @ts-ignore
        const votes = hits[`numHits`];

        const percentOfTotal = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
        let text = showResults ? `${percentOfTotal}%: ${option} (${votes} hits)` : `${index + 1}. ${option}`;
        return { option, votes, text, percentOfTotal };
      }),
    };

    const svg = await satori(
      <div
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "f4f4f4",
          padding: 50,
          lineHeight: 1.2,
          fontSize: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 20,
          }}
        >
          <h2 style={{ textAlign: "center", color: "lightgray" }}>{hits.title}</h2>
          {pollData.options.map((opt, index) => {
            return (
              <div
                style={{
                  backgroundColor: showResults ? "#007bff" : "",
                  color: "#fff",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 4,
                  width: `${showResults ? opt.percentOfTotal : 100}%`,
                  whiteSpace: "nowrap",
                  overflow: "visible",
                }}
              >
                {opt.text}
              </div>
            );
          })}
          {/*{showResults ? <h3 style={{color: "darkgray"}}>Total votes: {totalVotes}</h3> : ''}*/}
        </div>
      </div>,
      {
        width: 600,
        height: 400,
        fonts: [
          {
            data: fontData,
            name: "Roboto",
            style: "normal",
            weight: 400,
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
