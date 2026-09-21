type TimeRange = {
  start: Date;
  end: Date;
};

const freeTime = (
  fixedTime: TimeRange[],
  buffer: number, // in hours
  dailyCapacity: number, // in hours
  sleepTime: number, // in hours
) => {
  // Calculate the free time in a day in hours

  // Dealing with "interval overlap" or "range intersection" problem
  // 1. Sort the ranges by start time in ascending order.
  const sortedFixedTime = fixedTime.sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const uniqueTimeDifferences = sortedFixedTime.map(
    (timeRange: TimeRange, index) => {
      const prevHigestEndTime = sortedFixedTime
        .slice(0, index)
        .reduce((currentValue, sortedTimeRange) => {
          if (sortedTimeRange.end.getTime() > currentValue) {
            return sortedTimeRange.end.getTime();
          }
          return currentValue;
        }, 0);

      if (timeRange.start.getTime() > prevHigestEndTime) {
        // if start time is greater than previous highest end time in the list
        // or the first range,
        // get the difference, end time - start time,
        // and add to list of time differences
        return timeRange.end.getTime() - timeRange.start.getTime();
      } else if (timeRange.end.getTime() <= prevHigestEndTime) {
        // if current end time is less or equal to highest previous end time,
        // then pass/return early with no addition
        return 0;
      } else {
        // else subtract the previous highest end time from the current end time
        // and add to list of time differences
        return timeRange.end.getTime() - prevHigestEndTime;
      }
    },
  );

  const unavailableTimeInMs = uniqueTimeDifferences.reduce(
    (currentValue, duration) => {
      return currentValue + duration;
    },
    0,
  );
  const unavailableHours = unavailableTimeInMs / 1000 / 60 / 60;

  const totalAwakeHours = 24 - sleepTime;
  const freeTimeHours = totalAwakeHours - unavailableHours - buffer;

  if (freeTimeHours < 0) {
    return 0;
  }

  return Math.min(dailyCapacity, freeTimeHours);
};
