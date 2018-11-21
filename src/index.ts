#!/usr/bin/env node

import * as yargs from "yargs";

import { getDeparturesByQuayId, searchForQuayByName } from "entur-departures";
import { ZonedDateTime, DateTimeFormatter } from "js-joda";

import { path, identity, compose, tap, insert, join, split, last } from "ramda";
import chalk from "chalk";

const MUNKELIA_TOWARDS_CITY_CENTER = "NSR:Quay:10667";

const getQuayName = path<string>(["quay", "name"]);
const getTransportMode = path<string>([
  "serviceJourney",
  "line",
  "transportMode"
]);
const getLineNumber = compose<string, string[], string>(last, split(":"));

const formatAsTime = compose<string, string[], string[], string, string>(
  (dateString: string): string =>
    ZonedDateTime.parse(dateString).format(
      DateTimeFormatter.ofPattern("HH:mm")
    ),
  // Damn you ENTUR for not being ISO-compliant with your DateType :P
  join(""),
  insert(22, ":"),
  split("")
);

async function printDepartures(quayId: string, n: number) {
  const quayInfo = await getDeparturesByQuayId(quayId, n);
  quayInfo.quay.estimatedCalls.forEach(dep => {
    console.log(
      chalk`The {magenta ${getTransportMode(
        dep
      )}} will depart from {yellow ${getQuayName(
        quayInfo
      )}} at {green ${formatAsTime(
        dep.expectedDepartureTime
      )}} -> {cyan ${getLineNumber(dep.serviceJourney.line.id)}: ${
        dep.destinationDisplay.frontText
      }}`
    );
  });
}

async function printSearchResults(searchQuery: string) {
  const searchResults = await searchForQuayByName(searchQuery);
  console.log(JSON.stringify(searchResults, null, 2));
}

yargs
  .command(
    "departures <quayId>",
    "Show departures from the given quay",
    yargs =>
      yargs
        .positional("quayId", {
          description: "The ID of the quay of which to list departures",
          type: "string"
        })
        .option("n", {
          description: "The number of departures to list",
          default: 1,
          type: "number"
        }),
    ({ quayId, n }) => {
      printDepartures(quayId, n).catch(err => {
        console.error(err);
      });
    }
  )
  .command(
    "search <searchQuery>",
    "Search for a quay",
    yargs =>
      yargs.positional("searchQuery", {
        description: "The search query string",
        type: "string"
      }),
    ({ searchQuery }) => {
      printSearchResults(searchQuery).catch(err => {
        console.error(err);
      });
    }
  )
  .help().argv;
