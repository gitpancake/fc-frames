"use client";

import clsx from "clsx";
import { useOptimistic, useRef, useTransition } from "react";
import { v4 as uuidv4 } from "uuid";
import { giveHit, redirectToNumHits, saveNumHits } from "./actions";
import { NumHits } from "./types";

type NumHitsState = {
  newNumHits: NumHits;
  updatedPoll?: NumHits;
  pending: boolean;
  voted?: boolean;
};

export function NumHitsCreateForm() {
  let formRef = useRef<HTMLFormElement>(null);
  let [state, mutate] = useOptimistic({ pending: false }, function createReducer(state, newNumHits: NumHitsState) {
    if (newNumHits.newNumHits) {
      return {
        pending: newNumHits.pending,
      };
    } else {
      return {
        pending: newNumHits.pending,
      };
    }
  });

  let numHitsStub = {
    id: uuidv4(),
    created_at: new Date().getTime(),
    title: "",
    numHits: 0,
  };
  let saveWithNewPoll = saveNumHits.bind(null, numHitsStub);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="mx-8 w-full">
        <form
          className="relative my-8"
          ref={formRef}
          action={saveWithNewPoll}
          onSubmit={(event) => {
            event.preventDefault();
            let formData = new FormData(event.currentTarget);
            let newNumHit = {
              ...numHitsStub,
              title: formData.get("title") as string,
              numHits: 0,
            };

            formRef.current?.reset();

            startTransition(async () => {
              mutate({
                newNumHits: newNumHit,
                pending: true,
              });

              await saveNumHits(newNumHit, formData);
            });
          }}
        >
          <input
            aria-label="Title"
            className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
            maxLength={150}
            placeholder="Title..."
            required
            type="text"
            name="title"
          />

          <div className={"pt-2 flex justify-end"}>
            <button
              className={clsx(
                "flex items-center p-1 justify-center px-4 h-10 text-lg border bg-blue-500 text-white rounded-md w-24 focus:outline-none focus:ring focus:ring-blue-300 hover:bg-blue-700 focus:bg-blue-700",
                state.pending && "bg-gray-700 cursor-not-allowed"
              )}
              type="submit"
              disabled={state.pending}
            >
              Create
            </button>
          </div>
        </form>
      </div>
      <div className="w-full"></div>
    </>
  );
}

function PollResults({ poll }: { poll: NumHits }) {
  return (
    <div className="mb-4">
      <img src={`/api/image?id=${poll.id}&results=true&date=${Date.now()}`} alt="num hits" />
    </div>
  );
}

export function HitForm({ numHits, viewResults }: { numHits: NumHits; viewResults?: boolean }) {
  viewResults = false; // Only allow voting via the api

  let formRef = useRef<HTMLFormElement>(null);
  let voteOnPoll = giveHit.bind(null, numHits);
  let [isPending, startTransition] = useTransition();
  let [state, mutate] = useOptimistic({ showResults: viewResults }, function createReducer({ showResults }, state: NumHitsState) {
    if (state.voted || viewResults) {
      return {
        showResults: true,
      };
    } else {
      return {
        showResults: false,
      };
    }
  });

  return (
    <div className="max-w-sm rounded overflow-hidden shadow-lg p-4 m-4">
      <div className="font-bold text-xl mb-2">{numHits.title} </div>
      <form
        className="relative my-8"
        ref={formRef}
        action={() => voteOnPoll()}
        onSubmit={(event) => {
          event.preventDefault();

          let mutatedHits = {
            ...numHits,
            numHits: Number(numHits.numHits) + 1,
          };

          formRef.current?.reset();

          startTransition(async () => {
            mutate({
              newNumHits: mutatedHits,
              pending: false,
              voted: true,
            });

            await redirectToNumHits();
            //await voteOnPoll();
          });
        }}
      >
        {state.showResults ? <PollResults poll={numHits} /> : <></>}
        {state.showResults ? (
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="submit">
            Back
          </button>
        ) : (
          <button className={"bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"} type="submit" disabled={false}>
            {numHits.title}
          </button>
        )}
      </form>
    </div>
  );
}
