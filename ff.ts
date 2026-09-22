// const freeTime = (
//   fixedTime: TimeRange[], // includes sleep time
//   buffer: number, // in hours
//   dailyCapacity: number, // in hours
// ) => {
//   // Calculate the free time in a day in hours

//   // Dealing with "interval overlap" or "range intersection" problem
//   // 1. Sort the ranges by start time in ascending order.
//   const sortedFixedTime = fixedTime.sort(
//     (a, b) => a.start.getTime() - b.start.getTime(),
//   );

//   const uniqueTimeDifferences = sortedFixedTime.map(
//     (timeRange: TimeRange, index) => {
//       const prevHigestEndTime = sortedFixedTime
//         .slice(0, index)
//         .reduce((currentValue, sortedTimeRange) => {
//           if (sortedTimeRange.end.getTime() > currentValue) {
//             return sortedTimeRange.end.getTime();
//           }
//           return currentValue;
//         }, 0);

//       if (timeRange.start.getTime() > prevHigestEndTime) {
//         // if start time is greater than previous highest end time in the list
//         // or the first range,
//         // get the difference, end time - start time,
//         // and add to list of time differences
//         return timeRange.end.getTime() - timeRange.start.getTime();
//       } else if (timeRange.end.getTime() <= prevHigestEndTime) {
//         // if current end time is less or equal to highest previous end time,
//         // then pass/return early with no addition
//         return 0;
//       } else {
//         // else subtract the previous highest end time from the current end time
//         // and add to list of time differences
//         return timeRange.end.getTime() - prevHigestEndTime;
//       }
//     },
//   );

//   const uniqueTimeRanges = sortedFixedTime.map(
//     (timeRange: TimeRange, index) => {
//       const prevHigestEndTime = sortedFixedTime
//         .slice(0, index)
//         .reduce((currentValue, sortedTimeRange) => {
//           if (sortedTimeRange.end.getTime() > currentValue) {
//             return sortedTimeRange.end.getTime();
//           }
//           return currentValue;
//         }, 0);

//       if (index === 0 || timeRange.start.getTime() > prevHigestEndTime) {
//         // if start time is greater than previous highest end time in the list
//         // or if it's the first range,
//         // return the range

//         return {
//           start: timeRange.start,
//           end: timeRange.end,
//         };
//       } else if (timeRange.end.getTime() <= prevHigestEndTime) {
//         // if current end time is less or equal to highest previous end time,
//         // then pass/return early with no addition
//         return null;
//       } else {
//         // else return previous highest end time as the start time
//         // and current end time as end time
//         // and add to list of time differences
//         return {
//           start: prevHigestEndTime,
//           end: timeRange.end,
//         };
//       }
//     },
//   );

//   const filteredRanges = uniqueTimeRanges.filter((r) => r !== null);

//   const unavailableTimeInMs = uniqueTimeDifferences.reduce(
//     (currentValue, duration) => {
//       return currentValue + duration;
//     },
//     0,
//   );
//   const unavailableHours = unavailableTimeInMs / 1000 / 60 / 60;
//   const hoursInADay = 24;
//   const freeTimeHours = hoursInADay - unavailableHours - buffer;

//   if (freeTimeHours < 0) {
//     return 0;
//   }

//   return Math.min(dailyCapacity, freeTimeHours);
// };
