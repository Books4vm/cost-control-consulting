/**
 * CCC Scheduler
 * File: BookingEngine.gs
 *
 * Availability calculation and appointment confirmation.
 */


/**
 * NEW CALENDAR API
 *
 * Returns exactly five calendar weeks for display.
 *
 * Calendar events are loaded ONCE for the full display range
 * rather than repeatedly for every individual appointment slot.
 */
function getCalendarAvailability(sessionToken, visitorId) {
  try {
    cccValidateSession_(sessionToken, visitorId);

    var today = cccStartOfDay_(cccNow_());

    /*
     * Start on Sunday so the visitor always receives five
     * complete Sunday-Saturday calendar rows.
     */
    var displayStart = new Date(today);
    displayStart.setDate(
      displayStart.getDate() - displayStart.getDay()
    );

    var displayEnd = new Date(displayStart);
    displayEnd.setDate(
      displayEnd.getDate() + CCC.CALENDAR_DISPLAY_DAYS
    );

    var earliestBookable =
      cccAddBusinessDays_(
        today,
        CCC.MIN_BUSINESS_DAYS
      );

    var latestBookable = new Date(today);
    latestBookable.setDate(
      latestBookable.getDate() +
      CCC.BOOKING_HORIZON_DAYS
    );
    latestBookable = cccStartOfDay_(latestBookable);

    /*
     * One Calendar call for the complete display range.
     */
    var events =
      cccEventsForRange_(displayStart, displayEnd);

    var dates = [];

    for (
      var i = 0;
      i < CCC.CALENDAR_DISPLAY_DAYS;
      i++
    ) {
      var date = new Date(displayStart);
      date.setDate(displayStart.getDate() + i);
      date = cccStartOfDay_(date);

      var status = "";
      var availableSlots = [];

      if (date < today) {
        status = "past";
      } else if (cccIsWeekend_(date)) {
        status = "weekend";
      } else if (date < earliestBookable) {
        status = "lead";
      } else if (date > latestBookable) {
        status = "outside";
      } else {
        availableSlots =
          cccGenerateSlotsForEvents_(date, events);

        status =
          availableSlots.length > 0
            ? "available"
            : "full";
      }

      dates.push({
        isoDate: cccIsoDate_(date),
        displayDate: cccLongDate_(date),
        dayNumber: Number(
          Utilities.formatDate(
            date,
            CCC.TIME_ZONE,
            "d"
          )
        ),
        monthShort: Utilities.formatDate(
          date,
          CCC.TIME_ZONE,
          "MMM"
        ),
        weekdayShort: Utilities.formatDate(
          date,
          CCC.TIME_ZONE,
          "EEE"
        ),
        status: status,
        availableSlotCount: availableSlots.length,
        selectable: status === "available"
      });
    }

    return cccResult_(
      true,
      {
        rangeStart: cccIsoDate_(displayStart),
        rangeEnd: cccIsoDate_(
          new Date(
            displayEnd.getTime() - 86400000
          )
        ),
        timeZone: CCC.TIME_ZONE,
        timeZoneLabel: "Pacific Time",
        dates: dates
      },
      ""
    );

  } catch (error) {
    return cccResult_(
      false,
      null,
      cccSafeClientError_(error)
    );
  }
}


/**
 * Kept for compatibility with the original Scheduler.
 *
 * It now uses the optimized calendar data instead of performing
 * the former repeated calendar-query loop.
 */
function getAvailableDates(sessionToken, visitorId) {
  var result =
    getCalendarAvailability(
      sessionToken,
      visitorId
    );

  if (!result.success) {
    return result;
  }

  var availableDates =
    result.data.dates
      .filter(function (date) {
        return date.status === "available";
      })
      .map(function (date) {
        return {
          isoDate: date.isoDate,
          displayDate: date.displayDate,
          availableSlotCount:
            date.availableSlotCount
        };
      });

  return cccResult_(
    true,
    availableDates,
    ""
  );
}


/**
 * Returns exact times only AFTER the visitor selects a date.
 */
function getAvailableTimes(
  sessionToken,
  visitorId,
  isoDate
) {
  try {
    cccValidateSession_(
      sessionToken,
      visitorId
    );

    var date = cccParseDate_(isoDate);
    var today = cccStartOfDay_(cccNow_());

    var earliestBookable =
      cccAddBusinessDays_(
        today,
        CCC.MIN_BUSINESS_DAYS
      );

    var latestBookable = new Date(today);
    latestBookable.setDate(
      latestBookable.getDate() +
      CCC.BOOKING_HORIZON_DAYS
    );
    latestBookable =
      cccStartOfDay_(latestBookable);

    if (
      date < earliestBookable ||
      date > latestBookable ||
      cccIsWeekend_(date)
    ) {
      throw new Error(
        "The selected date is not available."
      );
    }

    /*
     * Load this day's events ONCE.
     */
    var events = cccEventsForDate_(date);

    var slots =
      cccGenerateSlotsForEvents_(
        date,
        events
      );

    cccWriteSlotCache_(date, slots);

    return cccResult_(
      true,
      slots,
      ""
    );

  } catch (error) {
    return cccResult_(
      false,
      null,
      cccSafeClientError_(error)
    );
  }
}


/**
 * Compatibility helper.
 *
 * Other Scheduler code can still ask for slots for a date.
 */
function cccGenerateSlots_(date) {
  var events = cccEventsForDate_(date);

  return cccGenerateSlotsForEvents_(
    date,
    events
  );
}


/**
 * Generates the six possible CCC appointment starts using an
 * already-loaded Calendar event collection.
 */
function cccGenerateSlotsForEvents_(
  date,
  events
) {
  var result = [];

  var start =
    cccDateTimeFromParts_(
      date,
      CCC.START_HOUR,
      CCC.START_MINUTE
    );

  var finalStart =
    cccDateTimeFromParts_(
      date,
      CCC.FINAL_START_HOUR,
      CCC.FINAL_START_MINUTE
    );

  var now = cccNow_();

  while (start <= finalStart) {
    var end =
      cccAddMinutes_(
        start,
        CCC.SLOT_MINUTES
      );

    if (
      start > now &&
      cccSlotAvailableAgainstEvents_(
        start,
        end,
        events
      )
    ) {
      result.push({
        slotId:
          "SLOT-" +
          cccDateKey_(start) +
          "-" +
          Utilities.formatDate(
            start,
            CCC.TIME_ZONE,
            "HHmm"
          ),

        start: cccIsoDateTime_(start),
        end: cccIsoDateTime_(end),

        displayTime:
          cccTime_(start) +
          " - " +
          cccTime_(end)
      });
    }

    start =
      cccAddMinutes_(
        start,
        CCC.SLOT_MINUTES
      );
  }

  return result;
}


/**
 * CONFIRM APPOINTMENT
 *
 * Existing production behavior is preserved:
 * - validate booking
 * - claim submission token
 * - acquire lock
 * - re-check Calendar in real time
 * - generate IDs
 * - create Calendar event
 * - write database records
 * - audit
 * - send internal/client email
 */
function confirmConsultation(payload) {
  var submissionKey = "";
  var calendarEvent = null;

  try {
    var booking =
      cccNormalizeBooking_(payload);

    cccValidateSession_(
      booking.sessionToken,
      booking.visitorId
    );

    cccValidateBooking_(booking);

    submissionKey =
      cccClaimSubmission_(
        booking.submissionToken
      );

    var lock =
      LockService.getScriptLock();

    lock.waitLock(
      CCC.LOCK_TIMEOUT_MS
    );

    try {
      /*
       * IMPORTANT:
       * Final real-time Calendar check.
       */
      if (
        !cccSlotAvailable_(
          booking.slotStart,
          booking.slotEnd
        )
      ) {
        throw new Error(
          "The selected appointment is no longer available. Please choose another time."
        );
      }

      var appointmentId =
        cccNextAppointmentId_();

      var requestId =
        cccGenerateId_("REQ");

      var businessId =
        cccUpsertBusiness_(
          booking,
          requestId
        );

      var calendar =
        cccCreateEvent_(
          booking,
          appointmentId
        );

      calendarEvent = calendar.event;

      var now = cccNow_();

      try {
        cccAppendObject_(
          CCC.SHEETS.REQUESTS,
          {
            "Request ID": requestId,
            "Submitted At": now,
            "Request Status": "Scheduled",

            "First Name": booking.firstName,
            "Last Name": booking.lastName,
            "Job Title": booking.jobTitle,

            "Company Name": booking.companyName,
            "Legal Name": booking.legalName,
            "DBA / Trade Name": booking.dbaTradeName,

            "Business Type": booking.businessType,
            "Industry": booking.industry,

            "Business Website": booking.website,
            "LinkedIn Profile": booking.linkedInProfile,

            "Address Line 1": booking.addressLine1,
            "Address Line 2": booking.addressLine2,
            "City": booking.city,
            "State / Province": booking.stateProvince,
            "ZIP / Postal Code": booking.postalCode,
            "Country": booking.country,

            "Email": booking.email,
            "Phone": booking.phone,

            "Preferred Contact Method":
              booking.preferredContactMethod,

            "Best Time to Contact":
              booking.bestTimeToContact,

            "Employee Range":
              booking.employeeRange,

            "Annual Revenue Range":
              booking.annualRevenueRange,

            "Years in Business":
              booking.yearsInBusiness,

            "Accounting Software":
              booking.accountingSoftware,

            "ERP System":
              booking.erpSystem,

            "Payroll System":
              booking.payrollSystem,

            "Primary Area of Interest":
              booking.primaryAreaOfInterest,

            "Business Challenges":
              booking.businessChallenges.join(", "),

            "Business Challenge Description":
              booking.businessChallengeDescription,

            "Desired Outcome":
              booking.desiredOutcome,

            "Additional Information":
              booking.additionalInformation,

            "Consent to Contact":
              booking.consentToContact,

            "Selected Slot Start":
              booking.slotStart,

            "Selected Slot End":
              booking.slotEnd,

            "Appointment ID":
              appointmentId,

            "Calendar Event ID":
              calendar.eventId,

            "Source Page":
              booking.sourcePage,

            "Submission Token":
              booking.submissionToken,

            "Last Updated": now
          }
        );

        cccAppendObject_(
          CCC.SHEETS.APPOINTMENTS,
          {
            "Appointment ID":
              appointmentId,

            "Request ID":
              requestId,

            "Business ID":
              businessId,

            "Appointment Status":
              "Confirmed",

            "Company Name":
              booking.companyName,

            "Contact First Name":
              booking.firstName,

            "Contact Last Name":
              booking.lastName,

            "Contact Email":
              booking.email,

            "Contact Phone":
              booking.phone,

            "Primary Area of Interest":
              booking.primaryAreaOfInterest,

            "Business Challenges":
              booking.businessChallenges.join(", "),

            "Appointment Date":
              cccStartOfDay_(
                booking.slotStart
              ),

            "Start Time":
              booking.slotStart,

            "End Time":
              booking.slotEnd,

            "Appointment Start":
              booking.slotStart,

            "Appointment End":
              booking.slotEnd,

            "Time Zone":
              CCC.TIME_ZONE,

            "Calendar Name":
              CCC.CALENDAR_NAME,

            "Calendar Event ID":
              calendar.eventId,

            "Created At":
              now,

            "Confirmed At":
              now,

            "Last Updated":
              now
          }
        );

        cccAudit_({
          actorType: "CLIENT",
          actorIdentifier:
            booking.email,

          action:
            "CONFIRM_APPOINTMENT",

          module:
            "BookingEngine",

          recordType:
            "Appointment",

          recordId:
            appointmentId,

          requestId:
            requestId,

          businessId:
            businessId,

          appointmentId:
            appointmentId,

          calendarEventId:
            calendar.eventId,

          result:
            "SUCCESS",

          details:
            "Appointment confirmed"
        });

        cccCompleteSubmission_(
          submissionKey,
          appointmentId
        );

        try {
          cccSendInternalEmail_(
            booking,
            {
              appointmentId:
                appointmentId,
              requestId:
                requestId
            }
          );
        } catch (emailError) {
          cccAuditError_(
            "SEND_INTERNAL_EMAIL",
            "EmailEngine",
            appointmentId,
            emailError
          );
        }

        try {
          cccSendClientEmail_(
            booking,
            {
              appointmentId:
                appointmentId,
              requestId:
                requestId
            }
          );
        } catch (emailError) {
          cccAuditError_(
            "SEND_CLIENT_EMAIL",
            "EmailEngine",
            appointmentId,
            emailError
          );
        }

        return cccResult_(
          true,
          {
            appointmentId:
              appointmentId,

            companyName:
              booking.companyName,

            contactName:
              booking.firstName +
              " " +
              booking.lastName,

            appointmentDate:
              cccLongDate_(
                booking.slotStart
              ),

            appointmentTime:
              cccTime_(
                booking.slotStart
              ) +
              " - " +
              cccTime_(
                booking.slotEnd
              ),

            timeZone:
              "Pacific Time"
          },
          "Your consultation has been scheduled."
        );

      } catch (saveError) {
        /*
         * If the Calendar event was created but the database
         * transaction fails, remove the Calendar event.
         */
        if (calendarEvent) {
          try {
            calendarEvent.deleteEvent();
          } catch (ignored) {}
        }

        throw saveError;
      }

    } finally {
      lock.releaseLock();
    }

  } catch (error) {
    cccReleaseSubmission_(
      submissionKey
    );

    cccAuditError_(
      "CONFIRM_APPOINTMENT",
      "BookingEngine",
      "",
      error
    );

    return cccResult_(
      false,
      null,
      cccSafeClientError_(error)
    );
  }
}


/**
 * Generates the next daily CCC confirmation number.
 */
function cccNextAppointmentId_() {
  var sheet =
    cccSheet_(
      CCC.SHEETS.APPOINTMENTS
    );

  var dateKey =
    cccDateKey_(cccNow_());

  var prefix =
    "CCC-" + dateKey + "-";

  var highest =
    dateKey ===
    CCC.INITIAL_SEQUENCE_DATE
      ? CCC.INITIAL_SEQUENCE_NUMBER - 1
      : 0;

  if (sheet.getLastRow() >= 2) {
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        1
      )
      .getDisplayValues()
      .forEach(function (row) {
        var id =
          cccClean_(row[0]);

        if (
          id.indexOf(prefix) === 0
        ) {
          var number =
            Number(
              id.substring(
                prefix.length
              )
            );

          if (
            Number.isInteger(number) &&
            number > highest
          ) {
            highest = number;
          }
        }
      });
  }

  var next = highest + 1;

  if (next > 999) {
    throw new Error(
      "The daily appointment sequence has reached its maximum."
    );
  }

  return (
    prefix +
    String(next).padStart(3, "0")
  );
}


/**
 * Creates or updates the business record.
 */
function cccUpsertBusiness_(
  booking,
  requestId
) {
  var sheet =
    cccSheet_(
      CCC.SHEETS.BUSINESSES
    );

  var headers =
    cccHeaders_(
      CCC.SHEETS.BUSINESSES
    );

  var rowNumber = 0;

  if (sheet.getLastRow() >= 2) {
    var values =
      sheet
        .getRange(
          2,
          1,
          sheet.getLastRow() - 1,
          sheet.getLastColumn()
        )
        .getDisplayValues();

    for (
      var i = 0;
      i < values.length;
      i++
    ) {
      var company =
        cccClean_(
          values[i][
            headers.map["Company Name"]
          ]
        ).toLowerCase();

      var email =
        cccClean_(
          values[i][
            headers.map["Email"]
          ]
        ).toLowerCase();

      if (
        company ===
          booking.companyName.toLowerCase() &&
        email === booking.email
      ) {
        rowNumber = i + 2;
        break;
      }
    }
  }

  var now = cccNow_();

  var update = {
    "Legal Name":
      booking.legalName,

    "DBA / Trade Name":
      booking.dbaTradeName,

    "Business Type":
      booking.businessType,

    "Industry":
      booking.industry,

    "Business Website":
      booking.website,

    "Address Line 1":
      booking.addressLine1,

    "Address Line 2":
      booking.addressLine2,

    "City":
      booking.city,

    "State / Province":
      booking.stateProvince,

    "ZIP / Postal Code":
      booking.postalCode,

    "Country":
      booking.country,

    "Primary Contact First Name":
      booking.firstName,

    "Primary Contact Last Name":
      booking.lastName,

    "Job Title":
      booking.jobTitle,

    "Email":
      booking.email,

    "Phone":
      booking.phone,

    "Employee Range":
      booking.employeeRange,

    "Annual Revenue Range":
      booking.annualRevenueRange,

    "Years in Business":
      booking.yearsInBusiness,

    "Accounting Software":
      booking.accountingSoftware,

    "ERP System":
      booking.erpSystem,

    "Payroll System":
      booking.payrollSystem,

    "Latest Request ID":
      requestId,

    "Last Updated":
      now
  };

  if (rowNumber) {
    var existing =
      cccReadObject_(
        CCC.SHEETS.BUSINESSES,
        rowNumber
      );

    cccUpdateObject_(
      CCC.SHEETS.BUSINESSES,
      rowNumber,
      update
    );

    return existing["Business ID"];
  }

  var businessId =
    cccGenerateId_("BUS");

  update["Business ID"] =
    businessId;

  update["Company Name"] =
    booking.companyName;

  update["First Request ID"] =
    requestId;

  cccAppendObject_(
    CCC.SHEETS.BUSINESSES,
    update
  );

  return businessId;
}


/**
 * Writes displayed availability to the Available Slots sheet.
 */
function cccWriteSlotCache_(
  date,
  slots
) {
  var now = cccNow_();

  slots.forEach(function (slot) {
    var start =
      cccParseDateTime_(
        slot.start
      );

    var end =
      cccParseDateTime_(
        slot.end
      );

    cccAppendObject_(
      CCC.SHEETS.SLOTS,
      {
        "Slot ID":
          slot.slotId,

        "Slot Date":
          cccStartOfDay_(start),

        "Day":
          Utilities.formatDate(
            start,
            CCC.TIME_ZONE,
            "EEEE"
          ),

        "Start Time":
          start,

        "End Time":
          end,

        "Slot Start":
          start,

        "Slot End":
          end,

        "Slot Status":
          "Available",

        "Generated At":
          now,

        "Last Checked":
          now
      }
    );
  });
}