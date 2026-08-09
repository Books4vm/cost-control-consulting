/**
 * CCC Scheduler
 * File: CalendarEngine.gs
 *
 * Calendar access, connection testing, event retrieval,
 * conflict checking, and event creation.
 */

function cccCalendar_() {
  var calendars = CalendarApp.getCalendarsByName(CCC.CALENDAR_NAME);

  if (!calendars.length) {
    throw new Error("Calendar not found: " + CCC.CALENDAR_NAME);
  }

  if (calendars.length > 1) {
    throw new Error("More than one calendar has the same name.");
  }

  return calendars[0];
}


/**
 * Manual connectivity test.
 *
 * File: CalendarEngine.gs
 * Function: testCCCConnections
 */
function testCCCConnections() {
  var spreadsheet = cccSpreadsheet_();
  var calendar = cccCalendar_();

  var result = {
    spreadsheetName: spreadsheet.getName(),
    spreadsheetId: spreadsheet.getId(),
    spreadsheetTimeZone: spreadsheet.getSpreadsheetTimeZone(),
    calendarName: calendar.getName(),
    calendarId: calendar.getId(),
    calendarTimeZone: calendar.getTimeZone(),
    effectiveUser: Session.getEffectiveUser().getEmail()
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}


/**
 * Returns calendar events for one calendar day.
 */
function cccEventsForDate_(date) {
  var start = cccStartOfDay_(date);
  var end = new Date(start);

  end.setDate(end.getDate() + 1);

  return cccCalendar_().getEvents(start, end);
}


/**
 * Returns calendar events for an entire date range in ONE
 * Calendar call.
 *
 * This is the key availability-performance improvement.
 */
function cccEventsForRange_(startDate, endDate) {
  return cccCalendar_().getEvents(
    new Date(startDate),
    new Date(endDate)
  );
}


/**
 * Checks a proposed appointment against an already-loaded
 * collection of Calendar events.
 *
 * This prevents getAvailableDates from calling Calendar
 * repeatedly for every possible 30-minute slot.
 */
function cccSlotAvailableAgainstEvents_(slotStart, slotEnd, events) {
  var bufferMilliseconds = CCC.BUFFER_MINUTES * 60000;

  return !events.some(function (event) {
    var eventStart = event.getStartTime();
    var eventEnd = event.getEndTime();

    /*
     * All-day events block the affected day, but must not
     * accidentally block every date in a multi-week query.
     */
    if (event.isAllDayEvent()) {
      return (
        slotStart.getTime() < eventEnd.getTime() &&
        slotEnd.getTime() > eventStart.getTime()
      );
    }

    var blockedStart =
      eventStart.getTime() - bufferMilliseconds;

    var blockedEnd =
      eventEnd.getTime() + bufferMilliseconds;

    return (
      slotStart.getTime() < blockedEnd &&
      slotEnd.getTime() > blockedStart
    );
  });
}


/**
 * Real-time slot check.
 *
 * Used during final booking so the Calendar is checked again
 * immediately before an appointment is committed.
 */
function cccSlotAvailable_(slotStart, slotEnd) {
  var events = cccEventsForDate_(slotStart);

  return cccSlotAvailableAgainstEvents_(
    slotStart,
    slotEnd,
    events
  );
}


/**
 * Creates the confirmed CCC Calendar appointment.
 */
function cccCreateEvent_(booking, appointmentId) {
  var description = [
    "Reference Number: " + appointmentId,
    "Company: " + booking.companyName,
    "Contact: " + booking.firstName + " " + booking.lastName,
    "Email: " + booking.email,
    "Phone: " + (booking.phone || ""),
    "Industry: " + (booking.industry || ""),
    "Employees: " + (booking.employeeRange || ""),
    "Annual Revenue: " + (booking.annualRevenueRange || ""),
    "Primary Service: " + booking.primaryAreaOfInterest,
    "Business Challenges: " + booking.businessChallenges.join(", "),
    "",
    "Business Challenge Description:",
    booking.businessChallengeDescription,
    "",
    "Desired Outcome:",
    booking.desiredOutcome
  ].join("\n");

  var event = cccCalendar_().createEvent(
    "CCC Consultation - " + booking.companyName,
    booking.slotStart,
    booking.slotEnd,
    {
      description: description,
      guests: booking.email,
      sendInvites: true
    }
  );

  return {
    event: event,
    eventId: event.getId(),
    eventUrl: ""
  };
}
