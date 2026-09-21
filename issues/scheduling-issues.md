1. Trying to get the total number of fixed hours from a list of time ranges without overlap

   I particularly struggled with this one, the idea was **Given a list of time ranges, get the total number of hours, whilst accounting for overlapping intervals.**

   Failure 1: My original mistake was simply adding the ranges together before I realised the above edge case.

   Failure 2: I sorted the ranges in ascending order based on start time. Then I went through the list of sorted time ranges, if the previous end time is greater than the current start time, then I simply did `currentEndTime - prevEndTime` and kept doing this throughout the array. Then I had claude run through it and look for failures. It found that this doesn't account for multiple ranges within an interval and gave negative numbers if the currentEndTime is within prevEndTime. For example, if range A has a range of 1 - 7, range B from 2 - 3 and range C from 3 - 5, the correct total is 6, but with this failure it's:

   `First pass = 7 - 1 (range A)`
   `Second pass = 3 (range B end) - 7 (range A end) = -4`
   `Third pass = 5 (range C end) - 3 (range B end) = 2`
   Adding all together:
   `Range = 6 + (-4) + 2 = 4` which is wrong.

   Side Note: I could have easily just gotten claude to do this for me, but just like every other issue I've faced here, I chose to do it myself. Only used claude to find and flag things I may have missed, so I can fix it myself.

   My solution:
   I found the best approach for me was to put it in words before attempting it, without using the word "time" itself, so it was easier to understand. So I wrote this comment:

   // Sort the ranges by start time in ascending order.

   // For range in ranges

   // if start of range is greater than previous highest end range in the list or the first range,
   // then get the difference, end of range - start of range,
   // and add to list of range differences

   // else if end of range is less or equal to end of range of previous ranges in list,
   // then pass/return early with no addition

   // else go through the list of previous ranges, and get the highest end range
   // subtract the highest previous end range from the end of the current range
   // and add to list of range differences

   Then this was converted to code.
